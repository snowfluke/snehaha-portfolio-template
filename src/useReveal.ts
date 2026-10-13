import { useEffect } from 'react';

// Fades and lifts every [data-reveal] element the first time it scrolls into view.
// Elements entering together get a short stagger. Children of [data-reveal-children] are marked automatically.
export default function useReveal() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const root = document.documentElement;
    root.classList.add('js-reveal');
    const io = new IntersectionObserver((entries) => {
      let n = 0;
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).style.transitionDelay = `${Math.min(n++, 5) * 70}ms`;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });

    const scan = () => {
      document.querySelectorAll('[data-reveal-children]').forEach((p) => {
        for (const c of p.children) c.setAttribute('data-reveal', '');
      });
      document.querySelectorAll('[data-reveal]:not(.is-in)').forEach((el) => io.observe(el));
    };
    scan();
    // Filters and lightboxes add elements later; watch for them.
    const mo = new MutationObserver(scan);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => { io.disconnect(); mo.disconnect(); root.classList.remove('js-reveal'); };
  }, []);
}
