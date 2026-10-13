// What the comparator matches between the reference site and this template.
// Selectors on the left are the reference, on the right this template.

export default {
  reference: 'https://snehaha.fyi/',
  local: 'http://localhost:4174/', // started automatically with `vite preview` when nothing answers here

  viewports: {
    desktop: { width: 1440, height: 900 },
    mobile: { width: 390, height: 844 },
  },

  // Sections are walked in this order. Each one is scrolled top → bottom in `steps` screens.
  sections: [
    { name: 'hero', ref: 'section.about', local: 'section.hero' },
    { name: 'work', ref: 'section#work', local: 'section#work' },
    { name: 'timeline', ref: 'section#timeline', local: 'section#timeline' },
    { name: 'about', ref: 'section#about-me', local: 'section#about' },
    { name: 'footer', ref: 'footer.foot', local: 'footer.foot', atBottom: true },
  ],

  // Boxes measured on both sites. Size and position deltas show what to fix first.
  landmarks: [
    { name: 'chat column', ref: 'aside.chat', local: 'aside.chat' },
    { name: 'intro text', ref: '.about__copy', local: '.intro__body' },
    { name: 'portrait', ref: '.selfie', local: '.selfie' },
    { name: 'ticker', ref: 'footer.worked', local: '.ticker' },
    { name: 'work header', ref: '.work__head', local: '.work__head' },
    { name: 'mode switch', ref: '.modes', local: '.lever' },
    { name: 'first case', ref: '.card', local: '.case' },
    { name: 'first cover', ref: '.card__thumb', local: '.case__cover' },
    { name: 'timeline art', ref: '.tl__svg', local: '.tl__stage' },
    { name: 'doll', ref: '.collage__doll', local: '.doll' },
    { name: 'box area', ref: '.toybox', local: '.me__stage' },
    { name: 'dock', ref: 'nav.dock', local: 'nav.dock' },
  ],

  // Dock items. Each click must land in the named section on both sites.
  menu: [
    { name: 'work', ref: 'nav.dock button:has-text("work")', local: 'nav.dock button:has-text("work")', expect: 'work' },
    { name: 'play', ref: 'nav.dock button:has-text("play")', local: 'nav.dock button:has-text("play")', expect: 'work' },
    { name: 'timeline', ref: 'nav.dock button:has-text("timeline")', local: 'nav.dock button:has-text("timeline")', expect: 'timeline' },
    { name: 'about', ref: 'nav.dock button:has-text("about")', local: 'nav.dock button:has-text("about")', expect: 'about' },
  ],

  // Hover and click checks. The screenshot is clipped to `clip` (falls back to the target).
  interactions: [
    { name: 'sticker hover', action: 'hover', ref: '.icon-tile >> nth=0', local: '.rt-sticker >> nth=0' },
    { name: 'name chip hover', action: 'hover', ref: '.selfie', local: '.selfie' },
    { name: 'case hover', action: 'hover', ref: '.card >> nth=0', local: '.case >> nth=0' },
    { name: 'mode switch to play', action: 'click', ref: '.modes__label--play', local: '.lever__label--play', clip: { ref: '.work__head', local: '.work__head' } },
    { name: 'timeline', action: 'hover', ref: '.tl__svg', local: '.tl__stage' },
    { name: 'doll hover', action: 'hover', ref: '.collage__doll', local: '.doll' },
  ],
};
