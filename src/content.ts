// Everything you edit lives here: every string and every image path.
// Images sit in public/placeholders/. Each placeholder prints its own file name in the corner.
// To replace one: drop your file into public/ and change its path below. `npm run check` catches typos.

// Vite sets BASE_URL: '/' locally, '/<repo>/' on GitHub Pages. Node scripts importing this file get '/'.
const BASE: string = (import.meta as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
const P = (file: string) => `${BASE}placeholders/${file}`;

// Rich text: plain strings, or a span with one style.
//   strong  – dark, heavier          strike – crossed out
//   name    – tinted chip            accent – coloured (set `color`)
//   img     – inline sticker image   link   – underlined link (set `href`)
export type Span =
  | string
  | { text: string; style: 'strong' | 'strike' | 'name' }
  | { text: string; style: 'accent'; color: string }
  | { text: string; style: 'link'; href: string }
  | { img: string; alt: string };
export type Rich = Span[];

export const site = {
  title: "fernandy's (mostly) tidy corner",
  description: 'a portfolio that doubles as a place to keep the things i like.',
  url: 'https://example.com/',
  ogImage: P('og.svg'), // link previews need PNG/JPG on a real deploy
  favicon: P('favicon.svg'),
};

export const person = {
  name: 'fernandy',
  fullName: 'Fernandy',
  role: 'Product Designer, Somewhere',
  email: 'hello@example.com',
  resumeUrl: `${BASE}resume.pdf`,
  resumeFile: 'Fernandy Resume.pdf',
  resumeMeta: '1 page · 40 KB · PDF',
  resumePreview: P('resume-preview.svg'),
};

export const hero = {
  background: P('hero-bg.svg'),
  portrait: P('hero-portrait.svg'),
  cornerNote: ['THIS LINE IS FOR A SMALL JOKE.', 'KEEP IT SHORT AND IN CAPS.'],
  intro: [
    ['i am ', { text: 'fernandy,', style: 'name' }, ' a ', { text: 'product designer', style: 'strong' }, ' from ',
      { text: 'hometown', style: 'strike' }, ' → ', { text: 'college town', style: 'strike' }, ' → ', { text: 'big city', style: 'strong' }],
    ['before design, i was a kid who took apart radios and glued them back ',
      { img: P('sticker-01.svg'), alt: 'star sticker' }, ' mostly wrong.'],
    ['these days, i work on ', { text: 'tools for small teams', style: 'strong' }, ' at ',
      { img: P('logo-01.svg'), alt: 'brand one' }, ' and have shipped a few things from ',
      { text: 'zero to one', style: 'strong' }, ' ',
      { img: P('sticker-02.svg'), alt: 'flower sticker' }, { img: P('sticker-03.svg'), alt: 'cup sticker' }],
    ['replace these lines with your story. keep them short, and ',
      { text: 'end on something you believe', style: 'accent', color: '#d6246e' }, '.'],
  ] as Rich[],
  ball: P('ball.svg'),
  chat: [
    { from: 'me', text: 'what are you up to?', time: '6:38 PM' },
    { from: 'them', text: 'making a messy thing feel simple', time: '6:38 PM' },
    { from: 'me', text: 'nice.\nwe could use someone like that.', time: '6:38 PM' },
  ] as { from: 'me' | 'them'; text: string; time: string }[],
  resumeReply: 'sure, here you go!',
  reactions: ['❤️', '😂', '🔥', '👏', '🙌'],
  emailReply: 'or email me at',
  composePlaceholder: 'Say hi, it opens as an email',
  workedWithLabel: 'WORKED WITH',
  logos: [
    { name: 'Brand One', src: P('logo-01.svg') },
    { name: 'Brand Two', src: P('logo-02.svg') },
    { name: 'Brand Three', src: P('logo-03.svg') },
    { name: 'Brand Four', src: P('logo-04.svg') },
    { name: 'Brand Five', src: P('logo-05.svg') },
  ],
};

export type WorkItem = {
  title: string;
  description: string;
  cover: string;
  brands: { name: string; src: string }[];
  tags: string[];
  href?: string; // no href → "case study soon"
  readTime?: string;
  filters: { interface: string; distribution: string; domain: string };
};

export const work = {
  readLabel: 'read case study',
  workLabel: 'all work',
  playLabel: 'some play',
  selectedLabel: 'Selected Works',
  filterLabels: { interface: 'Interface', distribution: 'Distribution', domain: 'Domain' },
  items: [
    {
      title: 'Project one: a short, concrete title',
      description: 'One or two sentences on what it is, who it was for, and what changed.',
      cover: P('work-01.svg'),
      brands: [{ name: 'Brand One', src: P('logo-01.svg') }, { name: 'Brand Two', src: P('logo-02.svg') }],
      tags: ['Kiosk', 'B2B2C', 'Commerce'],
      href: '#',
      readTime: '3 min read',
      filters: { interface: 'Kiosk', distribution: 'B2B2C', domain: 'Commerce' },
    },
    {
      title: 'Project two: the problem in plain words',
      description: 'Say what the team had before, and what you designed instead.',
      cover: P('work-02.svg'),
      brands: [{ name: 'Brand One', src: P('logo-01.svg') }, { name: 'Brand Three', src: P('logo-03.svg') }],
      tags: ['Web', 'B2B', 'Dashboard'],
      href: '#',
      readTime: '5 min read',
      filters: { interface: 'Web', distribution: 'B2B', domain: 'Support' },
    },
    {
      title: 'Project three: still in progress',
      description: 'Items without a link show "case study soon" instead of a read time.',
      cover: P('work-03.svg'),
      brands: [{ name: 'Brand Four', src: P('logo-04.svg') }],
      tags: ['Mobile', 'B2C', 'Finance'],
      filters: { interface: 'Mobile', distribution: 'B2C', domain: 'Finance' },
    },
  ] as WorkItem[],
};

export const play = {
  categories: ['Interfaces', 'Motion', 'Visuals', 'Art', 'Graphics'],
  // Any image ratio works; the grid is masonry. `cat` must match a category above.
  items: [
    { src: P('play-01.svg'), cat: 'Art', alt: 'Sketch' },
    { src: P('play-02.svg'), cat: 'Interfaces', alt: 'Screen' },
    { src: P('play-03.svg'), cat: 'Visuals', alt: 'Poster' },
    { src: P('play-04.svg'), cat: 'Graphics', alt: 'Graphic' },
    { src: P('play-05.svg'), cat: 'Art', alt: 'Sketch' },
    { src: P('play-06.svg'), cat: 'Motion', alt: 'Motion still' },
    { src: P('play-07.svg'), cat: 'Visuals', alt: 'Poster' },
    { src: P('play-08.svg'), cat: 'Interfaces', alt: 'Screen' },
    { src: P('play-09.svg'), cat: 'Graphics', alt: 'Graphic' },
    { src: P('play-10.svg'), cat: 'Art', alt: 'Sketch' },
    { src: P('play-11.svg'), cat: 'Motion', alt: 'Motion still' },
    { src: P('play-12.svg'), cat: 'Visuals', alt: 'Poster' },
  ],
};

export const timeline = {
  knobHint: 'drag me',
  intro: ["here's the short version. a quick tour, ", { text: '2000 to now', style: 'accent', color: '#f59e0b' }, '.'] as Rich,
  start: 2000,
  end: 2026,
  // One dot per year on the axis. Milestones sit on their year. Hover or tap a milestone to show its photos.
  milestones: [
    { year: 2004, title: 'childhood', text: 'Where it started.', photos: [P('timeline-01.svg'), P('timeline-02.svg')] },
    { year: 2019, title: 'B.Des, Some College', text: 'Four years of learning to look.', photos: [P('timeline-03.svg'), P('timeline-04.svg')] },
    { year: 2023, logo: P('logo-02.svg'), title: 'Brand Two', text: 'First job. Learned to ship.', photos: [P('timeline-05.svg'), P('timeline-06.svg'), P('timeline-07.svg')] },
    { year: 2025, logo: P('logo-01.svg'), title: 'Brand One', text: 'Working with people who care. Life is good.', photos: [P('timeline-08.svg'), P('timeline-09.svg'), P('timeline-10.svg')] },
  ] as { year: number; title: string; text: string; logo?: string; photos: string[] }[],
};

export const about = {
  intro: ['and for the ', { text: "things i don't put on my resume", style: 'accent', color: '#e11d48' },
    ' to keep up the look of a serious professional. (the professional in question ',
    { img: P('about-avatar.svg'), alt: 'avatar' }, ')'] as Rich,
  dollNote: 'a person who still\nbelieves in weekends\n(mostly)',
  // The character peeking out under the box, waving both hands.
  peek: { head: P('doll-head-01.svg'), hand: P('wave-hand.svg') },
  boxNote: 'dig through the box\nto know more about me',
  mobileHint: 'drag things around, or shake your phone',
  // The doll stacks head, top, bottom, shoes. Arrows cycle each list. Draw parts on a 300px-wide canvas.
  doll: {
    head: [P('doll-head-01.svg'), P('doll-head-02.svg'), P('doll-head-03.svg'), P('doll-head-04.svg')],
    top: [P('doll-top-01.svg'), P('doll-top-02.svg'), P('doll-top-03.svg')],
    bottom: [P('doll-bottom-01.svg'), P('doll-bottom-02.svg'), P('doll-bottom-03.svg')],
    shoes: [P('doll-shoes-01.svg'), P('doll-shoes-02.svg'), P('doll-shoes-03.svg')],
  },
  // The box itself: a top-down photo of a box or tray works best. Things below are dropped on top of it.
  boxImage: P('box-tray.svg'),
  // Things in the box. `w` is the width in px on desktop; height follows the image ratio.
  box: [
    { src: P('box-01.svg'), alt: 'camera', w: 170 },
    { src: P('box-02.svg'), alt: 'note', w: 140 },
    { src: P('box-03.svg'), alt: 'music player', w: 110 },
    { src: P('box-04.svg'), alt: 'photo', w: 140 },
    { src: P('box-05.svg'), alt: 'photo', w: 140 },
    { src: P('box-06.svg'), alt: 'book', w: 120 },
    { src: P('box-07.svg'), alt: 'photo', w: 150 },
  ],
};

export const footer = {
  background: P('footer-bg.svg'),
  // Headline: "<lead> [selected]" on the first line, then "<prefix> <word>". The selected word gets a design-tool selection box.
  lead: 'this page was',
  selected: 'drawn',
  prefix: '[to]',
  word: 'create',
  resumePill: 'grab my resume',
  mascot: P('footer-mascot.svg'),
  // Catch game. The social icons drop in when the footer shows; ← → move the mascot to catch them.
  // Icons can be dragged and thrown; a tap opens the link.
  gameHint: 'catch them before they land',
  gameAll: 'got all of them! tap one to say hi',
  gameNone: 'they slipped past',
  gameSome: 'caught',
  // Small stickers scattered around the headline.
  stickers: [P('sticker-01.svg'), P('sticker-02.svg'), P('sticker-03.svg'), P('sticker-04.svg'), P('sticker-05.svg')],
  socials: [
    { name: 'Social one', href: 'https://example.com/one', icon: P('social-01.svg') },
    { name: 'Social two', href: 'https://example.com/two', icon: P('social-02.svg') },
    { name: 'Social three', href: 'https://example.com/three', icon: P('social-03.svg') },
    { name: 'Social four', href: 'https://example.com/four', icon: P('social-04.svg') },
  ],
  copyright: '© fernandy, 2026',
  credits: 'PLACEHOLDER ART: CLAUDE-STYLE SVGS',
};

export const dock = {
  sections: [
    { id: 'work', label: 'work' },
    { id: 'play', label: 'play' },
    { id: 'timeline', label: 'timeline' },
    { id: 'about', label: 'about' },
  ],
  resumeLabel: 'resume',
  sayHiLabel: 'say hi',
};
