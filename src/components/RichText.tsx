import type { Rich } from '../content';

const TILTS = [-6, 4, -3, 7, -5];

export default function RichText({ spans }: { spans: Rich }) {
  return (
    <>
      {spans.map((s, i) => {
        if (typeof s === 'string') return s;
        if ('img' in s)
          return (
            <span key={i} className="rt-sticker" tabIndex={0} style={{ '--tilt': `${TILTS[i % TILTS.length]}deg` } as React.CSSProperties}>
              <img src={s.img} alt={s.alt} draggable={false} />
            </span>
          );
        if (s.style === 'link') return <a key={i} className="rt-strong" href={s.href}>{s.text}</a>;
        if (s.style === 'accent') return <span key={i} className="rt-accent" style={{ color: s.color }}>{s.text}</span>;
        if (s.style === 'strike') return <s key={i} className="rt-strike">{s.text}</s>;
        return <span key={i} className={`rt-${s.style}`}>{s.text}</span>;
      })}
    </>
  );
}
