import { useEffect, useRef, useState } from 'react';
import { play, work, type WorkItem } from '../content';
import Lightbox from './Lightbox';

type Key = keyof WorkItem['filters'];
const KEYS: Key[] = ['interface', 'distribution', 'domain'];

type Mode = 'work' | 'play';
const MODE_EVENT = 'work-mode';
const PLAY_LANDING = 60; // px below the section top where the play grid lands
const SWAP_BACK = 20; // scrolling up above this line (px below the section top) swaps back to work
const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

// True while a dock/lever scroll is gliding; the work/play swap must not fire mid-flight.
let navigating = false;

// Dock and lever go through here. 'work' and 'play' both land at the top of the work section
// and tell the section which list to show.
export const scrollToId = (id: string) => {
  if (id === 'work' || id === 'play') dispatchEvent(new CustomEvent<Mode>(MODE_EVENT, { detail: id }));
  const el = document.getElementById(id === 'play' ? 'work' : id);
  if (!el) return;
  // Play lands a little inside the section, past the line that swaps back to work.
  const nudge = id === 'play' ? PLAY_LANDING : 0;
  navigating = true;
  const done = () => { navigating = false; removeEventListener('scrollend', done); };
  addEventListener('scrollend', done);
  setTimeout(done, 2000); // browsers without scrollend
  scrollTo({ top: el.getBoundingClientRect().top + scrollY + nudge, behavior: reduce() ? 'auto' : 'smooth' });
};

function WorkCard({ w }: { w: WorkItem }) {
  return (
    <article className="case" data-reveal>
      <a className="case__cover" href={w.href} aria-label={w.title} tabIndex={w.href ? 0 : -1}>
        <img src={w.cover} alt="" loading="lazy" />
      </a>
      <div className="case__info">
        <div className="case__brands">
          {w.brands.map((b, i) => (
            <span key={b.name}>{i > 0 && <span className="case__x">×</span>}<img src={b.src} alt={b.name} /></span>
          ))}
        </div>
        <h3 className="case__title">{w.title}</h3>
        <p className="case__desc">{w.description}</p>
        <ul className="tags">{w.tags.map((t) => <li key={t}>{t}</li>)}</ul>
        {w.href ? (
          <a className="case__cta" href={w.href}>
            <span className="case__cta-time">{w.readTime}</span>
            <span className="case__cta-label">{work.readLabel}</span>
            <span className="case__cta-arrow" aria-hidden>↗</span>
          </a>
        ) : <span className="case__soon">case study soon</span>}
      </div>
    </article>
  );
}

export default function Work() {
  const [mode, setMode] = useState<Mode>('work');
  const [filters, setFilters] = useState<Record<Key, string>>({ interface: 'All', distribution: 'All', domain: 'All' });
  const [cat, setCat] = useState('All');
  const [open, setOpen] = useState<number | null>(null);
  const section = useRef<HTMLElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const modeRef = useRef<Mode>('work');
  const lockUntil = useRef(0);

  // One content area, two lists. Scrolling past the end of the work list swaps in the play grid
  // and jumps back to the section top. Scrolling up past the top of the grid swaps back and lands
  // at the end of the work list.
  useEffect(() => {
    let lastY = scrollY;
    const swap = (next: Mode, landAt: () => number) => {
      modeRef.current = next;
      setMode(next);
      lockUntil.current = performance.now() + 500; // let layout settle before the next check
      requestAnimationFrame(() => requestAnimationFrame(() => scrollTo({ top: landAt(), behavior: 'instant' })));
      // Scrolls during the pause are skipped; check once more when it ends, or a fast jump back gets stuck.
      setTimeout(() => onScroll(), 520);
    };
    const sectionTop = () => section.current!.getBoundingClientRect().top + scrollY;
    const onScroll = () => {
      const y = scrollY, down = y > lastY;
      lastY = y;
      if (navigating || performance.now() < lockUntil.current || !body.current) return;
      const b = body.current.getBoundingClientRect();
      // Swap only while the end of the list is on screen; a jump far past it (deep link, dock) is not a "scroll past the end".
      if (modeRef.current === 'work' && down && b.bottom < innerHeight - 180 && b.bottom > innerHeight * 0.25) {
        swap('play', () => sectionTop() + PLAY_LANDING);
      } else if (modeRef.current === 'play' && !down && y < sectionTop() + SWAP_BACK) {
        // Near the section: land at the end of the work list. Far above it (a jump to the top): swap quietly, stay put.
        const near = y > sectionTop() - innerHeight * 0.5;
        swap('work', () => {
          if (!near) return scrollY;
          const end = body.current!.getBoundingClientRect().bottom + scrollY;
          return Math.max(sectionTop(), end - innerHeight + 200);
        });
      }
    };
    const onMode = (e: Event) => {
      const next = (e as CustomEvent<Mode>).detail;
      if (next === modeRef.current) return;
      modeRef.current = next;
      setMode(next);
      // Hold the swap checks until the smooth scroll to the section finishes.
      lockUntil.current = Infinity;
      const release = () => { lockUntil.current = performance.now() + 150; removeEventListener('scrollend', release); };
      addEventListener('scrollend', release);
      setTimeout(release, 2000); // browsers without scrollend
    };
    addEventListener('scroll', onScroll, { passive: true });
    addEventListener(MODE_EVENT, onMode);
    return () => { removeEventListener('scroll', onScroll); removeEventListener(MODE_EVENT, onMode); };
  }, []);

  const shown = work.items.filter((w) => KEYS.every((k) => filters[k] === 'All' || w.filters[k] === filters[k]));
  const tiles = play.items.filter((p) => cat === 'All' || p.cat === cat);
  const options = (k: Key) => ['All', ...new Set(work.items.map((w) => w.filters[k]))];

  return (
    <section className="work" id="work" ref={section} data-mode={mode}>
      <header className="work__head">
        <div className="lever" data-mode={mode}>
          <button type="button" className="lever__label lever__label--work" onClick={() => scrollToId('work')} aria-pressed={mode === 'work'}>{work.workLabel}</button>
          <button
            type="button"
            className="lever__switch"
            role="switch"
            aria-checked={mode === 'play'}
            aria-label="Switch between work and play"
            onClick={() => scrollToId(mode === 'work' ? 'play' : 'work')}
          >
            <span className="lever__track" /><span className="lever__knob" />
          </button>
          <button type="button" className="lever__label lever__label--play" onClick={() => scrollToId('play')} aria-pressed={mode === 'play'}>{work.playLabel}</button>
        </div>
        {mode === 'work' ? (
          <div className="filters">
            <span className="chip chip--on">{work.selectedLabel}({shown.length})</span>
            <span className="filters__sep" aria-hidden />
            {KEYS.map((k) => (
              <label key={k} className="chip chip--select">
                <span>{work.filterLabels[k]} :</span>
                <select value={filters[k]} onChange={(e) => setFilters({ ...filters, [k]: e.target.value })}>
                  {options(k).map((o) => <option key={o}>{o}</option>)}
                </select>
              </label>
            ))}
          </div>
        ) : (
          <div className="filters">
            {['All', ...play.categories].map((c, i) => (
              <span key={c} style={{ display: 'contents' }}>
                <button type="button" className={`chip${cat === c ? ' chip--on' : ''}`} aria-pressed={cat === c} onClick={() => setCat(c)}>
                  {c === 'All' ? `All(${play.items.length})` : c}
                </button>
                {i === 0 && <span className="filters__sep" aria-hidden />}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* key remounts the list, so a mode or filter change fades the new content in */}
      <div ref={body}>
        {mode === 'work' ? (
          <div className="cases" key={JSON.stringify(filters)}>
            {shown.map((w) => <WorkCard key={w.title} w={w} />)}
            {!shown.length && <p className="empty">Nothing matches those filters.</p>}
          </div>
        ) : (
          <div id="play" className="masonry" key={cat}>
            {tiles.map((t, i) => (
              <figure key={t.src + i} className="tile" data-reveal>
                <button type="button" className="tile__open" aria-label={`Open ${t.alt}`} onClick={() => setOpen(i)}>
                  <img src={t.src} alt={t.alt} loading="lazy" />
                  <figcaption>{t.alt} · {t.cat}</figcaption>
                </button>
              </figure>
            ))}
          </div>
        )}
      </div>
      {open !== null && (
        <Lightbox shots={tiles.map((t) => ({ src: t.src, caption: `${t.alt} · ${t.cat}` }))} index={open} onClose={() => setOpen(null)} />
      )}
    </section>
  );
}
