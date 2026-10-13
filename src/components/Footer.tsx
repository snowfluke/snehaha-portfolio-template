import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Matter from 'matter-js';
import Physics, { type PhysicsApi, type PhysicsItem } from './Physics';
import { footer, person } from '../content';

const LETTER_COLORS = ['#D97757', '#788C5D', '#6A9BCC', '#C46686', '#E3A63B', '#8A7FC4'];

// Where the round stands: waiting for the footer, icons falling, or landed with a score.
type Round = { phase: 'waiting' } | { phase: 'falling'; caught: number } | { phase: 'done'; caught: number };
const ROUND_MS = 4200; // icons have landed by then
const STEP = 0.06; // mascot move per key press, share of the field width

function CatchGame() {
  const n = footer.socials.length;
  const reduce = useRef(matchMedia('(prefers-reduced-motion: reduce)').matches).current;
  const [round, setRound] = useState(0); // bump to drop the icons again
  const [state, setState] = useState<Round>({ phase: 'waiting' });
  const mx = useRef(0.04); // mascot left edge, share of the field width
  const catcher = useRef<HTMLDivElement>(null);
  const mascot = useRef<HTMLImageElement>(null);
  const sensor = useRef<{ body: Matter.Body; place: () => void } | null>(null);

  const place = () => {
    catcher.current?.style.setProperty('--mx', String(mx.current));
    sensor.current?.place();
  };
  const move = (d: number) => { mx.current = Math.min(0.86, Math.max(0, mx.current + d * STEP)); place(); };
  const again = useCallback(() => { setRound((r) => r + 1); setState({ phase: 'falling', caught: 0 }); }, []);

  // First drop once most of the footer is uncovered.
  useEffect(() => {
    const check = () => {
      const bottom = document.querySelector('.sheet')?.getBoundingClientRect().bottom ?? Infinity;
      if (bottom > innerHeight * 0.5) return;
      removeEventListener('scroll', check);
      setState((s) => (s.phase === 'waiting' ? { phase: 'falling', caught: 0 } : s));
    };
    check();
    addEventListener('scroll', check, { passive: true });
    return () => removeEventListener('scroll', check);
  }, []);

  // ← → move the mascot, R drops the icons again.
  useEffect(() => {
    if (state.phase === 'waiting') return;
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); move(e.key === 'ArrowLeft' ? -1 : 1); }
      if (e.key.toLowerCase() === 'r' && state.phase === 'done') again();
    };
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [state.phase, again]);

  // End the round after the icons have landed.
  useEffect(() => {
    if (state.phase !== 'falling') return;
    const t = setTimeout(() => setState((s) => (s.phase === 'falling' ? { phase: 'done', caught: s.caught } : s)), ROUND_MS);
    return () => clearTimeout(t);
  }, [state.phase, round]);

  // Icons start above the footer and fall in. Reduced motion: they are just there.
  const items = useMemo<PhysicsItem[]>(
    () => footer.socials.map((s, i) => ({ src: s.icon, alt: s.name, w: 64, x: 0.18 + ((i * 0.23 + round * 0.11) % 0.7), y: reduce ? 0.8 : -0.15 - i * 0.18 })),
    [round, reduce],
  );

  // The mascot's paws are a sensor in the physics world; an icon touching them counts once and bounces off.
  const onReady = useCallback(({ engine, bodies, size }: PhysicsApi) => {
    const counted = new Set<Matter.Body>();
    const paws = Matter.Bodies.rectangle(0, 0, 10, 24, { isStatic: true, isSensor: true });
    const placePaws = () => {
      const { W, H } = size();
      const el = mascot.current;
      if (!el) return;
      const w = el.offsetWidth;
      Matter.Body.setVertices(paws, Matter.Vertices.fromPath(`0 0 ${w} 0 ${w} 24 0 24`, paws));
      Matter.Body.setPosition(paws, { x: mx.current * W + w / 2, y: H - el.offsetHeight + 30 });
    };
    placePaws();
    Matter.Composite.add(engine.world, paws);
    sensor.current = { body: paws, place: placePaws };
    const onHit = (ev: Matter.IEventCollision<Matter.Engine>) => {
      for (const { bodyA, bodyB } of ev.pairs) {
        const icon = bodyA === paws ? bodyB : bodyB === paws ? bodyA : null;
        if (!icon || !bodies.includes(icon) || counted.has(icon)) continue;
        counted.add(icon);
        Matter.Body.setVelocity(icon, { x: (Math.random() - 0.5) * 6, y: -9 });
        setState((s) => (s.phase === 'falling' ? { ...s, caught: s.caught + 1 } : s));
        const m = mascot.current; // happy bounce
        if (m) { m.classList.remove('is-squash'); void m.offsetWidth; m.classList.add('is-squash'); }
      }
    };
    Matter.Events.on(engine, 'collisionStart', onHit);
    addEventListener('resize', placePaws);
    return () => { Matter.Events.off(engine, 'collisionStart', onHit); removeEventListener('resize', placePaws); sensor.current = null; };
  }, []);

  const caught = state.phase === 'waiting' ? 0 : state.caught;
  return (
    <div className="game">
      {state.phase !== 'waiting' && (
        <Physics key={round} items={items} className="game__field" openTop onReady={onReady}
          onTap={(i) => window.open(footer.socials[i].href, '_blank', 'noopener')} />
      )}
      <div ref={catcher} className="catcher" style={{ '--mx': mx.current } as React.CSSProperties}>
        <img ref={mascot} className="game__mascot" src={footer.mascot} alt="" draggable={false} />
        <p key={`${state.phase}-${caught}`} className="game__status" aria-live="polite">
          {state.phase === 'falling' && (
            <>
              <button type="button" className="game__key" aria-label="Move left" onClick={() => move(-1)}>←</button>
              <button type="button" className="game__key" aria-label="Move right" onClick={() => move(1)}>→</button>
              {' '}{footer.gameHint}{caught > 0 && <b> · {caught}/{n}</b>}
            </>
          )}
          {state.phase === 'done' && (
            <>
              {caught === n ? footer.gameAll : caught === 0 ? footer.gameNone : <><b>{caught}/{n}</b> {footer.gameSome}</>}
              {caught < n && <> <button type="button" className="game__btn" onClick={again}>again <kbd>R</kbd></button></>}
            </>
          )}
        </p>
      </div>
    </div>
  );
}

// Pupils lean toward the pointer.
function Eyes() {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const onMove = (e: PointerEvent) => {
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const a = Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2));
      el.style.setProperty('--ex', `${Math.cos(a) * 3}px`);
      el.style.setProperty('--ey', `${Math.sin(a) * 3}px`);
    };
    addEventListener('pointermove', onMove);
    return () => removeEventListener('pointermove', onMove);
  }, []);
  return <span ref={ref} className="eyes" aria-hidden><i /><i /></span>;
}

export default function Footer() {
  return (
    <footer className="foot" style={{ backgroundImage: `url("${footer.background}")` }}>
      <div className="foot__head">
        {footer.stickers.map((src, i) => (
          <img key={src} className={`foot__sticker foot__sticker--${i + 1}`} src={src} alt="" draggable={false} style={{ animationDelay: `${i * -0.7}s` }} />
        ))}
        <a className="foot__pill" href={person.resumeUrl} download={person.resumeFile}>{footer.resumePill}<Eyes /></a>
        <p className="foot__lead">
          {footer.lead}{' '}
          <span className="foot__sel">{footer.selected}<i /><i /><i /><i /></span>
        </p>
        <h2 className="foot__word">
          <span className="foot__prefix">{footer.prefix}</span>
          {[...footer.word].map((ch, i) => (
            <span key={i} className="foot__letter" style={{ color: LETTER_COLORS[i % LETTER_COLORS.length], animationDelay: `${i * 90}ms` }}>{ch}</span>
          ))}
        </h2>
      </div>
      <CatchGame />
      <p className="foot__copy">{footer.copyright}</p>
      <p className="foot__credits">{footer.credits}</p>
    </footer>
  );
}
