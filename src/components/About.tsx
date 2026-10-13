import { useMemo, useState } from 'react';
import { about } from '../content';
import RichText from './RichText';
import Physics from './Physics';
import Lightbox from './Lightbox';

type Part = keyof typeof about.doll;
const PARTS: Part[] = ['head', 'top', 'bottom', 'shoes'];

// Hover the doll: head wiggles, top sways, shoes run, stars twinkle. A swapped part pops in.
function Doll() {
  const [pick, setPick] = useState<Record<Part, number>>({ head: 0, top: 0, bottom: 0, shoes: 0 });
  const step = (p: Part, d: number) => {
    const n = about.doll[p].length;
    setPick({ ...pick, [p]: (pick[p] + d + n) % n });
  };
  return (
    <div className="doll">
      <span className="doll__star doll__star--a" aria-hidden>✶</span>
      <span className="doll__star doll__star--b" aria-hidden>✦</span>
      {PARTS.map((p) => (
        <div key={p} className={`doll__row doll__row--${p}`}>
          <button type="button" className="doll__arrow" aria-label={`Previous ${p}`} onClick={() => step(p, -1)}>‹</button>
          <img key={pick[p]} className="doll__part" src={about.doll[p][pick[p]]} alt="" draggable={false} />
          <button type="button" className="doll__arrow" aria-label={`Next ${p}`} onClick={() => step(p, 1)}>›</button>
        </div>
      ))}
    </div>
  );
}

export default function About() {
  // Items without a position start in a loose three-column grid, then physics takes over.
  const items = useMemo(() => about.box.map((b, i) => ({
    x: 0.2 + (i % 3) * 0.3,
    y: 0.2 + Math.floor(i / 3) * 0.28,
    ...b,
  })), []);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <section className="me" id="about">
      <p className="lead" data-reveal><RichText spans={about.intro} /></p>
      <div className="me__stage">
        <div className="me__doll" data-reveal>
          <p className="hand hand--doll">{about.dollNote}<span className="hand__arrow" aria-hidden>⤴</span></p>
          <Doll />
        </div>
        <div className="me__box" data-reveal>
          <p className="hand hand--box"><span className="hand__arrow" aria-hidden>⤻</span>{about.boxNote}</p>
          <p className="me__hint">{about.mobileHint}</p>
          <div className="box" style={{ backgroundImage: `url("${about.boxImage}")` }}>
            <Physics items={items} className="box__arena" gravity={0} airFriction={0.12} wallInset={18} shake onTap={setOpen} />
          </div>
          <div className="peek" aria-hidden>
            <img className="peek__hand peek__hand--l" src={about.peek.hand} alt="" />
            <img className="peek__head" src={about.peek.head} alt="" />
            <img className="peek__hand peek__hand--r" src={about.peek.hand} alt="" />
          </div>
        </div>
      </div>
      {open !== null && (
        <Lightbox shots={about.box.map((b) => ({ src: b.src, caption: b.alt }))} index={open} onClose={() => setOpen(null)} />
      )}
    </section>
  );
}
