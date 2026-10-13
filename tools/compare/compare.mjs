#!/usr/bin/env node
// Side-by-side comparator: reference site vs this template.
//
//   npm run compare                      all viewports, wireframe mode, report in compare-report/
//   npm run compare -- --live            two real windows side by side, scrolling slowly in sync
//   npm run compare -- --mode raw        diff real pixels (images and text included)
//   npm run compare -- --viewport mobile --only work --steps 5
//   npm run compare -- --skip-menu --skip-interactions
//   npm run compare -- --self-test       checks the diff maths, then exits
//
// Output: compare-report/report.html (open it), summary.json, and one PNG per step:
// [reference | template | difference]. Red in the difference panel = pixels that differ.
//
// Modes:
//   wireframe (default) images become flat silhouettes, background images drop out, text turns one colour.
//                       Content differs on purpose (placeholders), so this isolates layout.
//   raw                 the pages as they are.

import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import config from './compare.config.mjs';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const OUT = `${ROOT}compare-report/`;

// ---------- args ----------
const argv = process.argv.slice(2);
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => { const i = argv.indexOf(`--${n}`); return i >= 0 ? argv[i + 1] : d; };
const args = {
  live: flag('live'),
  mode: opt('mode', 'wireframe'),
  viewport: opt('viewport', 'all'),
  steps: Number(opt('steps', 3)),
  only: opt('only', null),
  skipMenu: flag('skip-menu'),
  skipInteractions: flag('skip-interactions'),
  selfTest: flag('self-test'),
  threshold: Number(opt('threshold', 40)), // 0..255 summed channel delta per pixel that counts as "different"
};

// ---------- styles injected into both pages ----------
const FREEZE = `*,*::before,*::after{animation-duration:0s!important;animation-delay:0s!important;animation-iteration-count:1!important;transition:none!important;caret-color:transparent!important}
[data-reveal]{opacity:1!important;translate:none!important}`;
const WIREFRAME = `img,video,canvas,picture,svg image{filter:brightness(0)!important;opacity:.14!important}
*{background-image:none!important;color:#222!important;-webkit-text-fill-color:#222!important;text-shadow:none!important}`;

// ---------- local server ----------
async function reachable(url) {
  try { const r = await fetch(url); return r.ok; } catch { return false; }
}
function run(cmd, a) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, a, { cwd: ROOT, stdio: 'inherit' });
    p.on('exit', (c) => (c === 0 ? res() : rej(new Error(`${cmd} ${a.join(' ')} exited ${c}`))));
  });
}
// Builds and serves the template when nothing answers at config.local. Returns a stop function.
async function ensureLocal() {
  if (await reachable(config.local)) return () => {};
  const port = new URL(config.local).port || '80';
  console.log(`· building and serving the template on ${config.local}`);
  await run('npx', ['vite', 'build', '--logLevel', 'warn']);
  const server = spawn('npx', ['vite', 'preview', '--port', port, '--strictPort'], { cwd: ROOT, stdio: 'ignore', detached: true });
  for (let i = 0; i < 60 && !(await reachable(config.local)); i++) await new Promise((r) => setTimeout(r, 250));
  if (!(await reachable(config.local))) throw new Error(`preview server did not start on ${config.local}`);
  console.log(`· preview server pid ${server.pid}`);
  return () => { try { process.kill(-server.pid); } catch {} };
}

// ---------- browsers ----------
async function launch(live, x, vp) {
  const opts = { headless: !live, args: live ? [`--window-position=${x},0`, `--window-size=${vp.width},${vp.height + 90}`] : [] };
  try { return await chromium.launch({ ...opts, channel: 'chrome' }); } // installed Chrome, no download
  catch { return chromium.launch(opts); } // bundled Chromium: `npx playwright install chromium`
}

async function prepare(page, url, vp) {
  await page.setViewportSize(vp);
  // 'load' plus a pause: some sites keep a request open, so 'networkidle' can hang.
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForTimeout(1500);
  // Walk the page once so lazy images and scroll reveals fire, then return to the top.
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  // 'instant': some sites set scroll-behavior: smooth, and a gliding page measures wrong.
  for (let y = 0; y < h; y += Math.round(vp.height * 0.6)) { await page.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), y); await page.waitForTimeout(70); }
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  // Some pages react to the jump by scrolling themselves (a mode swap that re-lands). Settle, then go back up.
  await page.waitForTimeout(700);
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  if (!args.live) await page.addStyleTag({ content: FREEZE });
  if (args.mode === 'wireframe' && !args.live) await page.addStyleTag({ content: WIREFRAME });
  await page.waitForTimeout(500);
}

// Document box of the first match, or null. Fixed elements (the dock) are measured against the viewport.
const box = (page, sel) => page.locator(sel).first().evaluate((e) => {
  const r = e.getBoundingClientRect();
  const fixed = getComputedStyle(e).position === 'fixed';
  return { x: Math.round(r.x + (fixed ? 0 : scrollX)), y: Math.round(r.y + (fixed ? 0 : scrollY)), w: Math.round(r.width), h: Math.round(r.height) };
}).catch(() => null);

// Wait (max 3s) until every image on screen has loaded, so lazy content is not captured half-drawn.
const settleImages = (page) => page.waitForFunction(() => [...document.images].every((i) => {
  const r = i.getBoundingClientRect();
  const onScreen = r.bottom > 0 && r.top < innerHeight && r.width > 0;
  return !onScreen || (i.complete && i.naturalWidth > 0);
}), null, { timeout: 3000 }).catch(() => {});

// Scroll to y. Live mode glides there slowly so you can watch both windows move together.
async function scrollBoth(pages, ys) {
  if (!args.live) {
    await Promise.all(pages.map((p, i) => p.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), ys[i])));
    await pages[0].waitForTimeout(350);
    return Promise.all(pages.map(settleImages));
  }
  const from = await Promise.all(pages.map((p) => p.evaluate(() => scrollY)));
  const n = 40;
  for (let k = 1; k <= n; k++) {
    const e = 0.5 - Math.cos((k / n) * Math.PI) / 2;
    await Promise.all(pages.map((p, i) => p.evaluate((v) => scrollTo({ top: v, behavior: 'instant' }), from[i] + (ys[i] - from[i]) * e)));
    await pages[0].waitForTimeout(30);
  }
  await pages[0].waitForTimeout(600);
  await Promise.all(pages.map(settleImages));
}

// ---------- diff ----------
// ponytail: per-pixel channel delta with a threshold, no anti-alias detection; swap for pixelmatch if edges get noisy.
async function diff(diffPage, a, b, label) {
  return diffPage.evaluate(async ({ a, b, threshold, label }) => {
    const load = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r(i); i.src = src; });
    const [ia, ib] = await Promise.all([load(a), load(b)]);
    // Compare at a shared size: both scaled to the same height, the narrower one padded.
    const H = Math.min(ia.height, ib.height, 1400);
    const wa = Math.round(ia.width * H / ia.height), wb = Math.round(ib.width * H / ib.height), W = Math.max(wa, wb);
    const get = (img, w) => { const c = new OffscreenCanvas(W, H); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(img, 0, 0, w, H); return x.getImageData(0, 0, W, H); };
    const da = get(ia, wa), db = get(ib, wb);
    const heat = new ImageData(W, H);
    let bad = 0;
    for (let i = 0; i < da.data.length; i += 4) {
      const d = Math.abs(da.data[i] - db.data[i]) + Math.abs(da.data[i + 1] - db.data[i + 1]) + Math.abs(da.data[i + 2] - db.data[i + 2]);
      const g = 0.3 * da.data[i] + 0.59 * da.data[i + 1] + 0.11 * da.data[i + 2];
      if (d > threshold) { bad++; heat.data.set([230, 40, 40, 255], i); }
      else heat.data.set([255 - (255 - g) * 0.25, 255 - (255 - g) * 0.25, 255 - (255 - g) * 0.25, 255], i);
    }
    const mismatch = bad / (W * H);
    // Composite: reference | template | difference, with a label strip on top.
    const gap = 12, top = 34;
    const c = new OffscreenCanvas(W * 3 + gap * 2, H + top);
    const x = c.getContext('2d');
    x.fillStyle = '#111'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(ia, 0, top, wa, H); x.drawImage(ib, W + gap, top, wb, H);
    const hc = new OffscreenCanvas(W, H); hc.getContext('2d').putImageData(heat, 0, 0); x.drawImage(hc, (W + gap) * 2, top);
    x.fillStyle = '#fff'; x.font = '600 16px ui-monospace, Menlo, monospace';
    x.fillText(`REFERENCE · ${label}`, 8, 23); x.fillText('TEMPLATE', W + gap + 8, 23);
    x.fillText(`DIFFERENCE ${(mismatch * 100).toFixed(1)}%`, (W + gap) * 2 + 8, 23);
    const blob = await c.convertToBlob({ type: 'image/png' });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return { mismatch, png: btoa(bin) };
  }, { a: `data:image/png;base64,${a.toString('base64')}`, b: `data:image/png;base64,${b.toString('base64')}`, threshold: args.threshold, label });
}

// ---------- self-test ----------
async function selfTest() {
  const browser = await launch(false, 0, { width: 400, height: 300 });
  const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
  const shot = async (html) => { await page.setContent(html); return page.screenshot(); };
  const plain = await shot('<body style="margin:0;background:#fff;width:400px;height:300px"></body>');
  const block = await shot('<body style="margin:0;background:#fff"><div style="width:200px;height:150px;background:#000"></div></body>');
  const same = await diff(page, plain, plain, 'same');
  const quarter = await diff(page, plain, block, 'quarter');
  await browser.close();
  const ok = same.mismatch === 0 && Math.abs(quarter.mismatch - 0.25) < 0.01;
  console.log(`self-test: identical=${same.mismatch} quarter-block=${quarter.mismatch.toFixed(4)} → ${ok ? 'PASS' : 'FAIL'}`);
  process.exit(ok ? 0 : 1);
}

// ---------- main ----------
async function main() {
  if (args.selfTest) return selfTest();
  const stopLocal = await ensureLocal();
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const rows = [];
  const summary = { mode: args.mode, viewports: {} };
  const vps = Object.entries(config.viewports).filter(([k]) => args.viewport === 'all' || k === args.viewport);

  try {
    for (const [vpName, vp] of vps) {
      console.log(`\n=== ${vpName} ${vp.width}×${vp.height} (${args.mode}${args.live ? ', live' : ''})`);
      const bRef = await launch(args.live, 0, vp);
      const bLoc = args.live ? await launch(true, vp.width + 8, vp) : bRef;
      const ref = await bRef.newPage(), loc = await bLoc.newPage();
      const diffPage = await (await launch(false, 0, vp)).newPage();
      const reset = () => Promise.all([prepare(ref, config.reference, vp), prepare(loc, config.local, vp)]);
      await reset();
      const pages = [ref, loc];
      const S = (summary.viewports[vpName] = { sections: [], landmarks: [], menu: [], interactions: [] });
      let n = 0;
      const save = async (kind, label, a, b) => {
        const d = await diff(diffPage, a, b, `${vpName} · ${label}`);
        const file = `${vpName}-${String(++n).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-')}.png`;
        writeFileSync(OUT + file, Buffer.from(d.png, 'base64'));
        rows.push({ vp: vpName, kind, label, file, mismatch: d.mismatch });
        return d.mismatch;
      };

      // 1. Geometry: sections and landmarks.
      for (const [list, key] of [[config.sections, 'sections'], [config.landmarks, 'landmarks']]) {
        for (const it of list) {
          if (args.only && key === 'sections' && it.name !== args.only) continue;
          const [r, l] = await Promise.all([box(ref, it.ref), box(loc, it.local)]);
          const delta = r && l ? { dx: l.x - r.x, dy: l.y - r.y, dw: l.w - r.w, dh: l.h - r.h } : null;
          S[key].push({ name: it.name, ref: r, local: l, delta });
        }
      }

      // 2. Synced section walk.
      for (const sec of config.sections) {
        if (args.only && sec.name !== args.only) continue;
        const rb = await box(ref, sec.ref), lb = await box(loc, sec.local);
        if (!rb || !lb) { console.log(`  ! ${sec.name}: missing on ${!rb ? 'reference' : 'template'}`); continue; }
        const steps = sec.atBottom ? 1 : args.steps;
        const vals = [];
        for (let k = 0; k < steps; k++) {
          const f = steps === 1 ? 0 : k / (steps - 1);
          const ys = sec.atBottom
            ? await Promise.all(pages.map((p) => p.evaluate(() => document.documentElement.scrollHeight - innerHeight)))
            : [rb, lb].map((b) => b.y + f * Math.max(0, b.h - vp.height));
          await scrollBoth(pages, ys);
          const [a, b] = await Promise.all(pages.map((p) => p.screenshot()));
          vals.push(await save('section', `${sec.name} ${Math.round(f * 100)}%`, a, b));
        }
        const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
        S.sections.find((x) => x.name === sec.name).mismatch = avg;
        console.log(`  section ${sec.name.padEnd(9)} diff ${(avg * 100).toFixed(1).padStart(5)}%  height ref ${rb.h} / template ${lb.h}`);
      }

      // 3. Menu: every dock item must land in the expected section on both sites.
      if (!args.skipMenu) {
        const landed = (p) => p.evaluate((secs) => {
          const y = innerHeight * 0.35;
          for (const s of secs) { const e = document.querySelector(s.sel); if (!e) continue; const r = e.getBoundingClientRect(); if (r.top <= y && r.bottom > y) return s.name; }
          return 'none';
        }, config.sections.map((s) => ({ name: s.name, sel: p === ref ? s.ref : s.local })));
        for (const m of config.menu) {
          await scrollBoth(pages, [vp.height * 1.5, vp.height * 1.5]);
          await pages[0].waitForTimeout(400);
          const clicked = await Promise.all([[ref, m.ref], [loc, m.local]].map(([p, s]) => p.locator(s).first().click({ timeout: 3000 }).then(() => true, () => false)));
          await pages[0].waitForTimeout(1600);
          const [lr, ll] = await Promise.all([landed(ref), landed(loc)]);
          const [a, b] = await Promise.all(pages.map((p) => p.screenshot()));
          const mm = await save('menu', `menu ${m.name}`, a, b);
          const pass = clicked[0] && clicked[1] && lr === m.expect && ll === m.expect;
          S.menu.push({ name: m.name, refLanded: lr, localLanded: ll, clicked, pass, mismatch: mm });
          console.log(`  menu ${m.name.padEnd(9)} ref→${lr.padEnd(9)} template→${ll.padEnd(9)} ${pass ? 'PASS' : 'FAIL'}`);
        }
      }

      // 4. Interactions: hover/click the same thing on both, compare the region.
      // Earlier steps change state (the play button and scroll swap modes), so start clean.
      if (!args.skipInteractions) await reset();
      if (!args.skipInteractions) {
        for (const it of config.interactions) {
          const shotOf = async (p, sel, clipSel) => {
            const t = p.locator(sel).first();
            if (!(await t.count())) return null;
            await t.evaluate((e) => e.scrollIntoView({ block: 'center', behavior: 'instant' }));
            await p.waitForTimeout(300);
            if (it.action === 'click') await t.click({ timeout: 3000 }).catch(() => {});
            else await t.hover({ timeout: 3000, force: true }).catch(() => {});
            await p.waitForTimeout(args.live ? 1500 : 700);
            const target = clipSel ? p.locator(clipSel).first() : t;
            const bb = await target.boundingBox();
            if (!bb || bb.width < 1 || bb.height < 1) return null; // hidden or collapsed
            const pad = 40, v = p.viewportSize();
            const x = Math.max(0, bb.x - pad), y = Math.max(0, bb.y - pad);
            return p.screenshot({ clip: { x, y, width: Math.min(v.width - x, bb.width + pad * 2), height: Math.min(v.height - y, bb.height + pad * 2) } });
          };
          let a, b;
          try { [a, b] = [await shotOf(ref, it.ref, it.clip?.ref), await shotOf(loc, it.local, it.clip?.local)]; }
          catch (e) { console.log(`  ! ${it.name}: ${e.message.split('\n')[0]}`); S.interactions.push({ name: it.name, error: e.message }); await reset(); continue; }
          if (!a || !b) { console.log(`  ! ${it.name}: target missing on ${!a ? 'reference' : 'template'}`); S.interactions.push({ name: it.name, missing: !a ? 'reference' : 'template' }); continue; }
          const mm = await save('interaction', it.name, a, b);
          S.interactions.push({ name: it.name, mismatch: mm });
          console.log(`  interaction ${it.name.padEnd(20)} diff ${(mm * 100).toFixed(1)}%`);
          if (it.action === 'click') await reset();
          else await Promise.all(pages.map((p) => p.mouse.move(1, 1)));
        }
      }

      // Geometry table, biggest offenders first.
      const geo = S.landmarks.filter((x) => x.delta).sort((p, q) => (Math.abs(q.delta.dw) + Math.abs(q.delta.dh)) - (Math.abs(p.delta.dw) + Math.abs(p.delta.dh)));
      console.log('  landmarks (template − reference, px):');
      for (const g of geo) console.log(`    ${g.name.padEnd(13)} dx ${String(g.delta.dx).padStart(5)} dy ${String(g.delta.dy).padStart(6)} dw ${String(g.delta.dw).padStart(5)} dh ${String(g.delta.dh).padStart(5)}`);
      for (const g of S.landmarks.filter((x) => !x.delta)) console.log(`    ${g.name.padEnd(13)} missing on ${!g.ref ? 'reference' : 'template'}`);

      await diffPage.context().browser().close();
      if (bLoc !== bRef) await bLoc.close();
      await bRef.close();
    }
  } finally {
    stopLocal();
  }

  writeFileSync(OUT + 'summary.json', JSON.stringify(summary, null, 2));
  writeFileSync(OUT + 'report.html', report(rows, summary));
  console.log(`\nreport: ${OUT}report.html`);
}

function report(rows, summary) {
  const pct = (v) => `${(v * 100).toFixed(1)}%`;
  const tone = (v) => (v < 0.05 ? '#16a34a' : v < 0.15 ? '#ca8a04' : '#dc2626');
  const geo = Object.entries(summary.viewports).map(([vp, s]) => `<h2>${vp} · geometry (template − reference)</h2><table><tr><th>box</th><th>dx</th><th>dy</th><th>dw</th><th>dh</th></tr>${
    [...s.sections, ...s.landmarks].map((g) => g.delta
      ? `<tr><td>${g.name}</td>${['dx', 'dy', 'dw', 'dh'].map((k) => `<td style="color:${Math.abs(g.delta[k]) > 12 ? '#dc2626' : '#16a34a'}">${g.delta[k]}</td>`).join('')}</tr>`
      : `<tr><td>${g.name}</td><td colspan=4>missing on ${!g.ref ? 'reference' : 'template'}</td></tr>`).join('')}</table>${
    s.menu.length ? `<h3>menu</h3><ul>${s.menu.map((m) => `<li>${m.pass ? '✅' : '❌'} ${m.name}: reference → ${m.refLanded}, template → ${m.localLanded}</li>`).join('')}</ul>` : ''}`).join('');
  return `<!doctype html><meta charset="utf-8"><title>compare report</title>
<style>body{font:14px system-ui;margin:24px;background:#fafaf9;color:#222}img{width:100%;border-radius:8px;margin:6px 0 28px}h2{margin-top:40px}
table{border-collapse:collapse}td,th{padding:4px 12px;border-bottom:1px solid #e7e5e4;text-align:right}td:first-child,th:first-child{text-align:left}
.row{display:flex;justify-content:space-between;font-weight:600}</style>
<h1>Reference vs template · ${summary.mode} mode</h1>${geo}
<h2>Screens</h2>${rows.map((r) => `<div class="row"><span>${r.vp} · ${r.kind} · ${r.label}</span><span style="color:${tone(r.mismatch)}">${pct(r.mismatch)}</span></div><img src="${r.file}" loading="lazy">`).join('')}`;
}

main().catch((e) => { console.error(e); process.exit(1); });
