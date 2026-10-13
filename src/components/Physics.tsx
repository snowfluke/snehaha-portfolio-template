import { useEffect, useRef } from 'react';
import Matter from 'matter-js';

export type PhysicsItem = {
  src: string;
  alt: string;
  w: number; // px
  shape?: 'rect' | 'circle';
  x?: number; // 0..1 of arena width; random when unset
  y?: number; // 0..1 of arena height; below 0 starts above the arena and falls in (use with openTop)
};

export type PhysicsApi = { engine: Matter.Engine; bodies: Matter.Body[]; size: () => { W: number; H: number } };

const { Engine, Runner, Bodies, Body, Composite, Constraint } = Matter;

// DOM images driven by a matter-js world. Walls follow the arena's box.
// Drag uses pointer events with a spring constraint, so page scroll and wheel keep working.
// gravity 0 + high air friction = a top-down tray: things stay where you drop them.
// onTap fires for a press that barely moved (a click, not a drag). shake lets a phone shake scatter the items.
// openTop drops the ceiling so items can fall in from above. onReady hands the world to the caller
// (to add bodies or listen for collisions); it may return a cleanup.
export default function Physics({ items, className, gravity = 1, airFriction = 0.02, wallInset = 0, onTap, shake = false, openTop = false, onReady }: {
  items: PhysicsItem[];
  className?: string;
  gravity?: number;
  airFriction?: number;
  wallInset?: number;
  onTap?: (index: number) => void;
  shake?: boolean;
  openTop?: boolean;
  onReady?: (api: PhysicsApi) => void | (() => void);
}) {
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const tapRef = useRef(onTap);
  tapRef.current = onTap;
  const arena = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLImageElement | null)[]>([]);

  useEffect(() => {
    const box = arena.current!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const engine = Engine.create({ gravity: { y: gravity } });
    const runner = Runner.create();
    let walls: Matter.Body[] = [];
    let bodies: Matter.Body[] = [];
    let raf = 0;
    let alive = true; // StrictMode cleans up before the image promise resolves
    let readyCleanup: void | (() => void);

    const buildWalls = () => {
      Composite.remove(engine.world, walls);
      const { width: W, height: H } = box.getBoundingClientRect();
      const t = 200, i = wallInset;
      walls = [
        Bodies.rectangle(W / 2, H - i + t / 2, W * 3, t, { isStatic: true }),
        ...(openTop ? [] : [Bodies.rectangle(W / 2, i - t / 2, W * 3, t, { isStatic: true })]),
        Bodies.rectangle(i - t / 2, H / 2, t, H * 3, { isStatic: true }),
        Bodies.rectangle(W - i + t / 2, H / 2, t, H * 3, { isStatic: true }),
      ];
      Composite.add(engine.world, walls);
      return { W, H };
    };

    const start = () => {
      if (!alive) return;
      const { W, H } = buildWalls();
      const scale = Math.min(1, W / 900);
      bodies = items.map((it, n) => {
        const img = els.current[n]!;
        const w = it.w * Math.max(0.75, scale); // phones keep things big enough to grab
        const h = img.naturalWidth ? (w * img.naturalHeight) / img.naturalWidth : w;
        img.style.width = `${w}px`;
        const x = (it.x ?? 0.15 + Math.random() * 0.7) * W;
        const y = (it.y ?? 0.15 + Math.random() * 0.7) * H;
        const opts = { restitution: 0.45, friction: 0.3, frictionAir: airFriction, angle: (Math.random() - 0.5) * 0.5 };
        const b = it.shape === 'circle' ? Bodies.circle(x, y, w / 2, { ...opts, restitution: 0.75 }) : Bodies.rectangle(x, y, w, h, { ...opts, chamfer: { radius: 6 } });
        (b as Matter.Body & { size: [number, number] }).size = [w, h];
        return b;
      });
      Composite.add(engine.world, bodies);
      readyCleanup = readyRef.current?.({ engine, bodies, size: () => { const r = box.getBoundingClientRect(); return { W: r.width, H: r.height }; } });
      if (!reduce) Runner.run(runner, engine);
      else Engine.update(engine, 1000); // settle once, then stay still
      const draw = () => {
        bodies.forEach((b, n) => {
          const [w, h] = (b as Matter.Body & { size: [number, number] }).size;
          els.current[n]!.style.transform = `translate(${b.position.x - w / 2}px, ${b.position.y - h / 2}px) rotate(${b.angle}rad)`;
        });
        raf = requestAnimationFrame(draw);
      };
      draw();
    };

    // Wait for image sizes so bodies match the pictures.
    Promise.all(els.current.map((img) => (img!.complete ? 0 : new Promise((r) => (img!.onload = img!.onerror = r))))).then(start);

    // Drag: a stiff spring from the pointer to the grabbed point on the body.
    let drag: { c: Matter.Constraint; id: number; n: number; x: number; y: number; t: number } | null = null;
    const local = (e: PointerEvent) => {
      const r = box.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const down = (e: PointerEvent) => {
      const n = els.current.indexOf(e.target as HTMLImageElement);
      if (n < 0 || !bodies[n]) return;
      e.preventDefault();
      (e.target as Element).setPointerCapture(e.pointerId);
      const b = bodies[n], p = local(e);
      const off = Matter.Vector.rotate(Matter.Vector.sub(p, b.position), -b.angle);
      const c = Constraint.create({ pointA: p, bodyB: b, pointB: off, stiffness: 0.2, damping: 0.1, length: 0 });
      Composite.add(engine.world, c);
      drag = { c, id: e.pointerId, n, x: e.clientX, y: e.clientY, t: performance.now() };
      if (reduce) Runner.run(runner, engine);
      askMotion();
    };
    const move = (e: PointerEvent) => { if (drag?.id === e.pointerId) drag.c.pointA = local(e); };
    const up = (e: PointerEvent) => {
      if (drag?.id !== e.pointerId) return;
      Composite.remove(engine.world, drag.c);
      const still = Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6 && performance.now() - drag.t < 350;
      if (still && e.type === 'pointerup') tapRef.current?.(drag.n);
      drag = null;
      if (reduce) setTimeout(() => Runner.stop(runner), 1500);
    };
    box.addEventListener('pointerdown', down);
    box.addEventListener('pointermove', move);
    box.addEventListener('pointerup', up);
    box.addEventListener('pointercancel', up);

    // Shake to scatter. iOS asks permission, which needs a user gesture: the first press asks.
    let lastShake = 0;
    const onMotion = (e: DeviceMotionEvent) => {
      const a = e.acceleration ?? e.accelerationIncludingGravity;
      if (!a || Math.hypot(a.x ?? 0, a.y ?? 0, a.z ?? 0) < (e.acceleration ? 14 : 24)) return;
      if (performance.now() - lastShake < 300) return;
      lastShake = performance.now();
      bodies.forEach((b) => Body.applyForce(b, b.position, { x: (Math.random() - 0.5) * 0.06 * b.mass, y: (Math.random() - 0.5) * 0.06 * b.mass }));
      if (reduce) { Runner.run(runner, engine); setTimeout(() => Runner.stop(runner), 1500); }
    };
    let asked = false;
    const askMotion = () => {
      if (!shake || asked) return;
      asked = true;
      const DM = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
      DM.requestPermission?.().catch(() => {});
    };
    if (shake && 'DeviceMotionEvent' in window) addEventListener('devicemotion', onMotion);

    // Keep bodies inside when the arena resizes.
    const ro = new ResizeObserver(() => {
      if (!bodies.length) return;
      const { W, H } = buildWalls();
      bodies.forEach((b) => Body.setPosition(b, { x: Math.min(Math.max(b.position.x, 40), W - 40), y: Math.min(Math.max(b.position.y, openTop ? -H : 40), H - 40) }));
    });
    ro.observe(box);

    return () => {
      alive = false;
      readyCleanup?.();
      removeEventListener('devicemotion', onMotion);
      ro.disconnect();
      cancelAnimationFrame(raf);
      Runner.stop(runner);
      Engine.clear(engine);
      box.removeEventListener('pointerdown', down);
      box.removeEventListener('pointermove', move);
      box.removeEventListener('pointerup', up);
      box.removeEventListener('pointercancel', up);
    };
  }, [items, gravity, airFriction, wallInset, shake, openTop]);

  return (
    <div ref={arena} className={`physics ${className ?? ''}`}>
      {items.map((it, n) => (
        <img
          key={it.src + n}
          ref={(el) => { els.current[n] = el; }}
          className="physics__item"
          src={it.src}
          alt={it.alt}
          draggable={false}
          style={{ width: it.w }}
        />
      ))}
    </div>
  );
}
