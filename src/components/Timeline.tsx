import { useCallback, useEffect, useRef, useState } from 'react';
import { timeline } from '../content';
import RichText from './RichText';

const { start, end, milestones } = timeline;
const pct = (year: number) => ((year - start) / (end - start)) * 100;
const AMP = 70; // px height of the bump under the knob
const SPREAD = 9; // % of width the bump spreads over

// Fixed scatter slots so photos land in the same place on every render.
const SLOTS = [
  [4, 6, -6], [22, 2, 5], [41, 8, -3], [62, 0, 4], [80, 10, -5],
  [12, 52, 4], [31, 56, -4], [52, 50, 6], [71, 54, -3], [88, 48, 3],
];

const nearest = (year: number) =>
  milestones.reduce((best, m, i) => (Math.abs(m.year - year) < Math.abs(milestones[best].year - year) ? i : best), 0);

export default function Timeline() {
  const [pos, setPos] = useState(milestones[milestones.length - 1].year); // knob position, in years
  const [used, setUsed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const axis = useRef<HTMLDivElement>(null);
  const tween = useRef(0);

  const active = nearest(pos);
  const ax = pct(pos);
  const lift = (x: number) => AMP * Math.exp(-(((x - ax) / SPREAD) ** 2) * 2);
  const H = AMP + 10;
  const y = (x: number) => H - 4 - lift(x);

  // Glide the knob to a year (clicking a milestone).
  const glideTo = useCallback((target: number) => {
    cancelAnimationFrame(tween.current);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return setPos(target);
    const from = pos, t0 = performance.now(), dur = 600;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - (1 - k) ** 3;
      setPos(from + (target - from) * e);
      if (k < 1) tween.current = requestAnimationFrame(step);
    };
    tween.current = requestAnimationFrame(step);
  }, [pos]);
  useEffect(() => () => cancelAnimationFrame(tween.current), []);

  const yearAt = (clientX: number) => {
    const r = axis.current!.getBoundingClientRect();
    return start + Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * (end - start);
  };
  const onDown = (e: React.PointerEvent) => {
    cancelAnimationFrame(tween.current);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    setDragging(true); setUsed(true);
    setPos(yearAt(e.clientX));
  };
  const onMove = (e: React.PointerEvent) => { if (dragging) setPos(yearAt(e.clientX)); };
  const onUp = () => { setDragging(false); glideTo(milestones[nearest(pos)].year); };
  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
    if (!d) return;
    e.preventDefault(); setUsed(true);
    glideTo(milestones[Math.min(milestones.length - 1, Math.max(0, active + d))].year);
  };

  const d = Array.from({ length: 201 }, (_, i) => `${i ? 'L' : 'M'}${i / 2},${y(i / 2).toFixed(2)}`).join('');
  const years = Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const m = milestones[active];

  return (
    <section className="tl" id="timeline">
      <p className="lead" data-reveal><RichText spans={timeline.intro} /></p>

      <div className="tl__stage" data-reveal>
        <div className="tl__photos" aria-live="polite">
          {m.photos.map((src, i) => {
            const [x, top, r] = SLOTS[(i * 3 + active * 2) % SLOTS.length];
            return (
              <button key={`${active}-${i}`} type="button" className="tl__photo"
                style={{ left: `${x}%`, top: `${top}%`, rotate: `${r}deg`, animationDelay: `${i * 90}ms` } as React.CSSProperties}
                aria-label={`${m.title}, photo ${i + 1}`}>
                <img src={src} alt="" loading="lazy" />
              </button>
            );
          })}
        </div>

        <div ref={axis} className={`tl__axis${dragging ? ' is-dragging' : ''}`} style={{ height: H }}
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <svg className="tl__line" viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" aria-hidden>
            <path d={d} vectorEffect="non-scaling-stroke" />
          </svg>
          {years.map((yr) => <span key={yr} className="tl__dot" style={{ left: `${pct(yr)}%`, top: y(pct(yr)) }} aria-hidden />)}
          {milestones.map((ms, i) => (
            <button key={ms.year + ms.title} type="button" className={`tl__ms${i === active ? ' is-active' : ''}`}
              style={{ left: `${pct(ms.year)}%`, top: y(pct(ms.year)) }} aria-pressed={i === active}
              onPointerDown={(e) => e.stopPropagation()} onClick={() => { setUsed(true); glideTo(ms.year); }}>
              {ms.logo ? <img src={ms.logo} alt={ms.title} /> : <span>{ms.title}</span>}
            </button>
          ))}
          <span className={`tl__knob${used ? ' is-used' : ''}`} style={{ left: `${ax}%`, top: y(ax) }}
            role="slider" tabIndex={0} aria-label="Timeline" aria-valuemin={start} aria-valuemax={end}
            aria-valuenow={Math.round(pos)} aria-valuetext={`${m.year}, ${m.title}`} onKeyDown={onKey}>
            <span className="tl__knob-ring" aria-hidden />
            <span className="tl__knob-grip" aria-hidden>=</span>
            {!used && <span className="tl__knob-hint" aria-hidden>{timeline.knobHint}</span>}
          </span>
        </div>
        <div className="tl__years" aria-hidden>
          {[start, ...milestones.map((ms) => ms.year), end].filter((yr, i, a) => a.indexOf(yr) === i).map((yr) => (
            <span key={yr} style={{ left: `${pct(yr)}%` }}>{yr}</span>
          ))}
        </div>
        <p key={active} className="tl__caption">{m.text}</p>
      </div>

      {/* Phones: a vertical list instead of the wide axis. */}
      <ol className="tl__list">
        {milestones.map((ms) => (
          <li key={ms.year + ms.title} data-reveal>
            <span className="tl__list-year">{ms.year}</span>
            <div>
              {ms.logo ? <img className="tl__list-logo" src={ms.logo} alt={ms.title} /> : <h3>{ms.title}</h3>}
              <p>{ms.text}</p>
              <div className="tl__list-photos">{ms.photos.map((p) => <img key={p} src={p} alt="" loading="lazy" />)}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
