import { useEffect, useMemo, useRef, useState } from 'react';
import { hero, person } from '../content';
import RichText from './RichText';
import Physics from './Physics';

export const mailto = (subject: string, body = '') =>
  `mailto:${person.email}?${new URLSearchParams({ subject, body }).toString().replace(/\+/g, '%20')}`;

function CopyEmail({ className }: { className: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className}
      aria-label={copied ? 'Email copied' : `Copy email address, ${person.email}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(person.email);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          location.href = `mailto:${person.email}`;
        }
      }}
    >
      {copied ? 'copied ✓' : 'Copy email'}
    </button>
  );
}

type Step = { from: 'me' | 'them'; body: React.ReactNode; className?: string; react?: boolean };

// Plays the chat like a real thread: "them" types first (dots), "me" just sends.
function useSequence(count: number) {
  const [shown, setShown] = useState(0);
  const [typing, setTyping] = useState(false);
  const steps = useRef<Step[]>([]);
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setShown(count); return; }
    let alive = true;
    const timers: number[] = [];
    const wait = (ms: number) => new Promise<void>((r) => timers.push(window.setTimeout(r, ms)));
    (async () => {
      await wait(500);
      for (let n = 0; n < count && alive; n++) {
        if (steps.current[n]?.from === 'them') { setTyping(true); await wait(900); setTyping(false); }
        else await wait(450);
        if (alive) setShown(n + 1);
      }
    })();
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, [count]);
  return { shown, typing, steps };
}

function Bubble({ step }: { step: Step }) {
  const [reaction, setReaction] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  return (
    <div className={`msg msg--${step.from}${picking ? ' is-open' : ''}`}>
      <div className={`bubble bubble--${step.from} ${step.className ?? ''}`}>
        {step.body}
        {reaction && <button type="button" className="reaction" onClick={() => setReaction(null)} aria-label={`Remove reaction ${reaction}`}>{reaction}</button>}
      </div>
      {step.react !== false && (
        <button type="button" className="react-btn" aria-label="React" aria-expanded={picking} onClick={() => setPicking(!picking)}>☺</button>
      )}
      {picking && (
        <div className="picker" role="menu">
          {hero.reactions.map((r) => (
            <button key={r} type="button" role="menuitem" onClick={() => { setReaction(r); setPicking(false); }}>{r}</button>
          ))}
        </div>
      )}
    </div>
  );
}

const Time = ({ t, read }: { t: string; read?: boolean }) => (
  <span className="bubble__time">{t}{read && <span className="bubble__ticks" aria-label="read"> ✓✓</span>}</span>
);

function Chat() {
  const [draft, setDraft] = useState('');
  const last = hero.chat[hero.chat.length - 1]?.time ?? '';
  const all: Step[] = [
    ...hero.chat.map((m) => ({ from: m.from, body: <><span className="bubble__text">{m.text}</span><Time t={m.time} read={m.from === 'me'} /></> })),
    {
      from: 'them', className: 'bubble--file', body: (
        <>
          <a className="file" href={person.resumeUrl} download={person.resumeFile}>
            <img className="file__preview" src={person.resumePreview} alt="" />
            <span className="file__row">
              <span><span className="file__name">{person.resumeFile}</span><span className="file__meta">{person.resumeMeta}</span></span>
              <span aria-hidden className="file__dl">↓</span>
            </span>
          </a>
          <span className="bubble__text">{hero.resumeReply}</span><Time t={last} />
        </>
      ),
    },
    {
      from: 'them', react: false, body: (
        <>
          <span className="bubble__text">{hero.emailReply}<br />{person.email}</span><Time t={last} />
          <CopyEmail className="bubble__action" />
        </>
      ),
    },
  ];
  const { shown, typing, steps } = useSequence(all.length);
  steps.current = all;

  return (
    <aside className="chat" aria-label="Chat">
      <div className="chat__thread" aria-live="polite">
        {all.slice(0, shown).map((st, i) => <Bubble key={i} step={st} />)}
        {typing && <div className="bubble bubble--them bubble--typing" aria-label="typing"><span /><span /><span /></div>}
      </div>
      <form
        className="compose"
        onSubmit={(e) => {
          e.preventDefault();
          location.href = mailto(`Hi ${person.name}`, draft);
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={hero.composePlaceholder} aria-label="Message" />
        <button type="submit" aria-label="Send as email" disabled={!draft.trim()}>➤</button>
      </form>
    </aside>
  );
}

function Ticker() {
  const reps = 4; // copies so the loop never shows a gap on wide screens
  return (
    <div className="ticker">
      <span className="ticker__label">{hero.workedWithLabel}</span>
      <div className="ticker__view">
        <div className="ticker__track">
          {Array.from({ length: reps }).flatMap((_, r) =>
            hero.logos.map((l) => <img key={`${r}-${l.name}`} className="ticker__logo" src={l.src} alt={r === 0 ? l.name : ''} draggable={false} />),
          )}
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  const ball = useMemo(() => [{ src: hero.ball, alt: 'ball, drag and throw it', w: 150, shape: 'circle' as const, x: 0.9, y: 0.75 }], []);
  return (
    <section className="hero" id="top" style={{ backgroundImage: `url("${hero.background}")` }}>
      <Chat />
      <div className="intro">
        <p className="intro__note">{hero.cornerNote.map((l) => <span key={l}>{l}</span>)}</p>
        <div className="intro__body">
          <div className="selfie" data-reveal>
            <img className="selfie__img" src={hero.portrait} alt={person.name} />
            <span className="selfie__star" aria-hidden>✦</span>
            <span className="selfie__star selfie__star--gold" aria-hidden>✦</span>
          </div>
          {hero.intro.map((p, i) => <p key={i} className="intro__p" data-reveal><RichText spans={p} /></p>)}
          <div className="intro__ctas">
            <a className="cta cta--pink" href={person.resumeUrl} download={person.resumeFile}>download resume ↓</a>
            <CopyEmail className="cta" />
          </div>
        </div>
        <Physics items={ball} className="intro__ball" wallInset={0} />
        <Ticker />
      </div>
    </section>
  );
}
