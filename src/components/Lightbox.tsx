import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export type Shot = { src: string; caption?: string };

// Full-screen viewer. Grows open, slides between shots, sinks closed.
// Keys: ← → to move, Esc to close.
export default function Lightbox({ shots, index, onClose }: { shots: Shot[]; index: number; onClose: () => void }) {
  const [i, setI] = useState(index);
  const [dir, setDir] = useState<'none' | 'left' | 'right'>('none');
  const [leaving, setLeaving] = useState(false);

  const close = useCallback(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return onClose();
    setLeaving(true);
    setTimeout(onClose, 220);
  }, [onClose]);
  const go = useCallback((d: number) => {
    if (shots.length < 2) return;
    setDir(d > 0 ? 'right' : 'left');
    setI((v) => (v + d + shots.length) % shots.length);
  }, [shots.length]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', onKey); document.body.style.overflow = overflow; };
  }, [close, go]);

  const shot = shots[i];
  return createPortal(
    <div className={`lightbox${leaving ? ' is-leaving' : ''}`} role="dialog" aria-modal="true" aria-label="Image viewer" onClick={close}>
      <figure key={i} className={`lightbox__figure lightbox__figure--${dir}`} onClick={(e) => e.stopPropagation()}>
        <img src={shot.src} alt={shot.caption ?? ''} />
        {shot.caption && <figcaption>{shot.caption}</figcaption>}
      </figure>
      {shots.length > 1 && (
        <>
          <button type="button" className="lightbox__arrow lightbox__arrow--prev" aria-label="Previous" onClick={(e) => { e.stopPropagation(); go(-1); }}>‹</button>
          <button type="button" className="lightbox__arrow lightbox__arrow--next" aria-label="Next" onClick={(e) => { e.stopPropagation(); go(1); }}>›</button>
          <p className="lightbox__count">{i + 1} / {shots.length}</p>
        </>
      )}
      <button type="button" className="lightbox__close" aria-label="Close" onClick={close}>×</button>
    </div>,
    document.body,
  );
}
