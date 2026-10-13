import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { dock, person } from '../content';
import { scrollToId } from './Work';
import { mailto } from './Hero';

// Floating nav. Shows after the hero; highlights the section in view.
export default function Dock() {
  const [shown, setShown] = useState(false);
  const [active, setActive] = useState('work');
  const nav = useRef<HTMLElement>(null);
  const pill = useRef<HTMLSpanElement>(null);

  // The dark pill slides to the active item with a spring (CSS transition on transform and width).
  useLayoutEffect(() => {
    const place = () => {
      const btn = nav.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
      if (!btn || !pill.current) return;
      pill.current.style.width = `${btn.offsetWidth}px`;
      pill.current.style.transform = `translateX(${btn.offsetLeft}px)`;
      pill.current.style.opacity = '1';
    };
    place();
    addEventListener('resize', place);
    return () => removeEventListener('resize', place);
  }, [active, shown]);

  useEffect(() => {
    const onScroll = () => {
      // Visible after the hero, hidden again once the footer shows under the sheet.
      const sheetBottom = document.querySelector('.sheet')?.getBoundingClientRect().bottom ?? Infinity;
      setShown(scrollY > innerHeight * 0.6 && sheetBottom > innerHeight - 40);
      const mid = innerHeight * 0.45;
      let cur = dock.sections[0].id;
      for (const s of dock.sections) {
        const el = document.getElementById(s.id);
        if (el && el.getBoundingClientRect().top < mid) cur = s.id;
      }
      // work and play share one section; its data-mode says which list is showing
      if (cur === 'work' || cur === 'play') cur = document.getElementById('work')?.dataset.mode === 'play' ? 'play' : 'work';
      setActive(cur);
    };
    onScroll();
    addEventListener('scroll', onScroll, { passive: true });
    // Lazy images and the work/play swap change the layout without a scroll event.
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);
    return () => { removeEventListener('scroll', onScroll); ro.disconnect(); };
  }, []);

  return (
    <nav ref={nav} className={`dock${shown ? ' is-shown' : ''}`} aria-label="Sections" inert={!shown}>
      <span ref={pill} className="dock__pill" aria-hidden />
      {dock.sections.map((s) => (
        <button key={s.id} type="button" data-id={s.id} className={`dock__btn${active === s.id ? ' is-active' : ''}`}
          aria-current={active === s.id ? 'true' : undefined} onClick={() => scrollToId(s.id)}>
          {s.label}
        </button>
      ))}
      <span className="dock__sep" aria-hidden />
      <a className="dock__btn dock__btn--resume" href={person.resumeUrl} download={person.resumeFile}>{dock.resumeLabel} <span className="dock__arrow" aria-hidden>↓</span></a>
      <a className="dock__btn dock__btn--hi" href={mailto(`Hi ${person.name}`)}>✉ <span className="dock__hi-label">{dock.sayHiLabel}</span></a>
    </nav>
  );
}
