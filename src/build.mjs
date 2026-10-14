#!/usr/bin/env node
// Usage: node src/build.mjs <collection> [--paper a4|letter] [--refresh] [--no-pdf]
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs, promisify } from 'node:util';
import { ROOT, loadCards, localImage } from './lib/api.mjs';
import { CATEGORIES, expand } from './lib/expand.mjs';
import { PAPERS, renderHtml } from './lib/render.mjs';

const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Chromium.app/Contents/MacOS/Chromium',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

async function printPdf(htmlFile, pdfFile) {
  const chrome = CHROME_CANDIDATES.find((candidate) => existsSync(candidate));
  if (!chrome) return false;
  await promisify(execFile)(chrome, [
    '--headless=new',
    '--disable-gpu',
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdfFile}`,
    `file://${htmlFile}`,
  ]);
  return true;
}

const { values: flags, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    paper: { type: 'string', default: 'a4' },
    refresh: { type: 'boolean', default: false },
    'no-pdf': { type: 'boolean', default: false },
  },
});

const slug = positionals[0];
if (!slug || !(flags.paper in PAPERS)) {
  const available = (await readdir(path.join(ROOT, 'collections')))
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.basename(file, '.json'));
  console.error('Usage: npm run build -- <collection> [--paper a4|letter] [--refresh] [--no-pdf]');
  console.error(`Collections: ${available.join(', ')}`);
  process.exit(1);
}

const config = JSON.parse(await readFile(path.join(ROOT, 'collections', `${slug}.json`), 'utf8'));
const cards = await loadCards(slug, config.query, { refresh: flags.refresh });
const slots = expand(cards, config);

const outDir = path.join(ROOT, 'output', slug);
await mkdir(outDir, { recursive: true });

const relative = (file) => file && path.relative(outDir, file).split(path.sep).map(encodeURIComponent).join('/');
const cacheName = (url) => new URL(url).pathname.replace(/\.[a-z]+$/i, '').replace(/[^a-z0-9]+/gi, '-').replace(/^-/, '');
const resolveImage = async (ref) =>
  relative(await localImage(ref, /^https?:/.test(ref ?? '') ? cacheName(ref) : undefined));

for (const slot of slots) {
  slot.imageSrc = await resolveImage(slot.image);
  slot.symbolSrc = await resolveImage(slot.symbol);
}

const htmlFile = path.join(outDir, `${slug}-${flags.paper}.html`);
await writeFile(htmlFile, renderHtml({ title: config.name, slots, paper: flags.paper }));

for (const category of CATEGORIES) {
  console.log(`${category.padEnd(7)} ${slots.filter((slot) => slot.category === category).length}`);
}
console.log(`total   ${slots.length} placeholders on ${Math.ceil(slots.length / 9)} sheets`);
console.log(`HTML    ${path.relative(ROOT, htmlFile)}`);

if (!flags['no-pdf']) {
  const pdfFile = htmlFile.replace(/\.html$/, '.pdf');
  if (await printPdf(htmlFile, pdfFile)) console.log(`PDF     ${path.relative(ROOT, pdfFile)}`);
  else console.log('PDF     skipped: no Chrome found (set CHROME_PATH, or print the HTML at 100% scale)');
}
