// Fails when src/content.ts points at a file that is not in public/.
// Run: npm run check   (also runs before every build)
import { existsSync } from 'node:fs';
import * as content from '../src/content.ts';

const paths = new Set();
(function walk(v) {
  if (typeof v === 'string') { if (/^\/[^/].*\.[a-z0-9]+$/i.test(v)) paths.add(v); }
  else if (v && typeof v === 'object') Object.values(v).forEach(walk);
})(content);

const missing = [...paths].filter((p) => !existsSync(new URL(`../public${decodeURI(p)}`, import.meta.url)));
if (missing.length) {
  console.error(`content.ts points at ${missing.length} missing file(s) in public/:\n  ${missing.join('\n  ')}`);
  process.exit(1);
}
console.log(`content.ts: all ${paths.size} file paths exist.`);
