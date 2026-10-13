# Portfolio template

A one-page portfolio built with Vite, React, TypeScript and plain CSS.
It has a chat-style hero, work and play lists, a timeline, a dress-up doll,
a box of things to drag around, and a footer catch game.

## Run it

```
npm install
npm run dev        # local dev server
npm run build      # checks asset paths, type-checks, builds to dist/
npm run preview    # serves the build
```

## Edit your content

All text, links and image paths live in one file:

```
src/content.ts
```

Change the name, email, intro, projects, timeline and links there.
The components contain no content.

## Change an asset

Every image is a placeholder in `public/placeholders/`.
Each placeholder shows its own file name in a corner,
so the page tells you which file to replace.

1. Put your image in `public/` (any folder, any format).
2. Open `src/content.ts`.
3. Change the path of that slot to your file.
4. Run `npm run check`. It fails if a path points at a missing file.

Example:

```
// before
cover: P('work-01.svg'),
// after (file at public/images/my-project.jpg)
cover: `${BASE}images/my-project.jpg`,
```

Use `${BASE}` in front of your own paths. It keeps the paths correct
when the site is served from a sub-folder, as on GitHub Pages.

You can also overwrite a placeholder file with your own file of the same name.
Keep the `.svg` name, or change the name in `src/content.ts` to match.

Also replace `public/resume.pdf` with your resume.

## Assets to change

| Slot | Files | Size (px) | Notes |
|---|---|---|---|
| Hero background | `hero-bg.svg` | 1920 x 1200 | Fills the first screen |
| Portrait | `hero-portrait.svg` | 102 x 142 | Next to the intro |
| Ball | `ball.svg` | 400 x 400 | Transparent; drawn as a circle |
| Intro stickers | `sticker-01` to `sticker-05` | 200 x 200 | Inside the intro text and around the footer headline |
| Resume preview | `resume-preview.svg` | 640 x 260 | Top of the chat file card |
| Logos | `logo-01` to `logo-05` | about 360 x 90 | Logo strip, project cards, timeline |
| Project covers | `work-01` to `work-03` | 1600 x 920 | Cropped to 16:9.2 |
| Play tiles | `play-01` to `play-12` | any ratio | Grid keeps each ratio |
| Timeline photos | `timeline-01` to `timeline-10` | 600 x 600 | Cropped square |
| About avatar | `about-avatar.svg` | 200 x 200 | Inline in the about text |
| Doll heads | `doll-head-01` to `doll-head-04` | 300 wide | Transparent; parts stack top to bottom |
| Doll tops | `doll-top-01` to `doll-top-03` | 300 wide | Transparent |
| Doll bottoms | `doll-bottom-01` to `doll-bottom-03` | 300 wide | Transparent |
| Doll shoes | `doll-shoes-01` to `doll-shoes-03` | 300 wide | Transparent |
| Box | `box-tray.svg` | 1840 x 1140 | A top-down photo of a box works best |
| Box items | `box-01` to `box-07` | any | Set the width with `w` in `content.ts` |
| Waving hand | `wave-hand.svg` | 160 x 200 | Phones only, under the box |
| Footer background | `footer-bg.svg` | 1920 x 1200 | Fills the footer screen |
| Footer mascot | `footer-mascot.svg` | 320 x 360 | Transparent; catches the icons |
| Social icons | `social-01` to `social-04` | 160 x 160 | Fall in the footer; a tap opens the link |
| Link preview | `og.svg` | 1600 x 965 | Use PNG or JPG; link previews skip SVG |
| Favicon | `favicon.svg` | 64 x 64 | Browser tab icon |
| Resume | `public/resume.pdf` | | Download link in the hero, dock and footer |

To add or remove items (projects, tiles, timeline entries, box items,
doll parts, social links), add or remove entries in the lists in
`src/content.ts`.

## Redraw the placeholders

```
npm run placeholders
```

This redraws every file in `public/placeholders/` and overwrites files
with the same names. Run it only before you replace them.

## Deploy to GitHub Pages

The workflow is in `.github/workflows/pages.yml`.
It builds on every push to `main` and publishes the site.

1. Push the project to a GitHub repo.
2. Open Settings, then Pages.
3. Set Source to "GitHub Actions".

## Compare with the reference site

```
npm run compare                   # report in compare-report/report.html
npm run compare -- --live         # two windows side by side, scrolling together
npm run compare -- --mode raw     # compare real pixels, not layout
npm run compare -- --viewport mobile --only work
```

Settings are in `tools/compare/compare.config.mjs`.
