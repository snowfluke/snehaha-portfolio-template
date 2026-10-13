import Hero from './components/Hero';
import Work from './components/Work';
import Timeline from './components/Timeline';
import About from './components/About';
import Footer from './components/Footer';
import Dock from './components/Dock';
import useReveal from './useReveal';
import { useEffect } from 'react';

// The page corner lifts further as the footer gets closer: --curl goes 0 → 1 over the last screen.
function useCurl() {
  useEffect(() => {
    const set = () => {
      const left = document.documentElement.scrollHeight - innerHeight - scrollY;
      const k = Math.min(1, Math.max(0, 1 - (left - innerHeight) / innerHeight));
      document.documentElement.style.setProperty('--curl', k.toFixed(3));
    };
    set();
    addEventListener('scroll', set, { passive: true });
    addEventListener('resize', set);
    return () => { removeEventListener('scroll', set); removeEventListener('resize', set); };
  }, []);
}

export default function App() {
  useReveal();
  useCurl();
  return (
    <>
      {/* The sheet scrolls over a fixed footer; its bottom edge reveals the footer like a lifted page. */}
      <main className="sheet">
        <Hero />
        <Work />
        <Timeline />
        <About />
        <div className="sheet__curl" aria-hidden />
      </main>
      <Footer />
      <Dock />
    </>
  );
}
