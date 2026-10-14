#!/usr/bin/env node
// Usage: node src/site.mjs [--refresh] [--out <dir>]
// Builds the shareable website (default: output/site) for all collections.
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { ROOT } from './lib/api.mjs';
import { listCollections, loadCollection } from './lib/collection.mjs';
import { renderCollectionPage, renderIndexPage } from './lib/site.mjs';

const { values: flags } = parseArgs({
  options: {
    refresh: { type: 'boolean', default: false },
    out: { type: 'string', default: path.join(ROOT, 'output', 'site') },
  },
});

const outDir = path.resolve(flags.out);
await mkdir(outDir, { recursive: true });

const collections = [];
for (const slug of await listCollections()) {
  const collection = { slug, ...(await loadCollection(slug, { refresh: flags.refresh })) };
  collections.push(collection);
  await writeFile(path.join(outDir, `${slug}.html`), renderCollectionPage(collection));
  console.log(`${slug.padEnd(12)} ${collection.slots.filter((slot) => slot.owned).length}/${collection.slots.length}`);
}
await writeFile(path.join(outDir, 'index.html'), renderIndexPage(collections));
console.log(`Site    ${path.relative(ROOT, outDir) || '.'}/index.html`);
