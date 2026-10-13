import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { site } from './src/content.ts';

// BASE_PATH is set by the Pages workflow ('/<repo>/'). Locally it is '/'.
const base = process.env.BASE_PATH ?? '/';

// Fills %TITLE% and friends in index.html from src/content.ts.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const withBase = (p: string) => base + p.replace(/^\//, '');
const meta: Record<string, string> = {
  TITLE: site.title,
  DESCRIPTION: site.description,
  URL: site.url,
  FAVICON: withBase(site.favicon),
  OG_IMAGE: new URL(withBase(site.ogImage), site.url).href, // scrapers need an absolute URL
};

export default defineConfig({
  base,
  plugins: [
    react(),
    { name: 'content-meta', transformIndexHtml: (html) => html.replace(/%([A-Z_]+)%/g, (m, k) => (k in meta ? esc(meta[k]) : m)) },
  ],
});
