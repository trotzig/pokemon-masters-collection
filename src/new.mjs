#!/usr/bin/env node
// Usage: node src/new.mjs <pokemon name>
// Scaffolds collections/<name>.json for another Pokémon.
import { existsSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, searchCards } from './lib/api.mjs';

const name = process.argv.slice(2).join(' ').trim();
if (!name) {
  console.error('Usage: npm run new -- <pokemon name>');
  process.exit(1);
}

const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const file = path.join(ROOT, 'collections', `${slug}.json`);
if (existsSync(file)) {
  console.error(`${path.relative(ROOT, file)} already exists`);
  process.exit(1);
}

// Searching by Pokédex number also finds "Dark X", "Team Rocket's X", "X δ", ...
const matches = await searchCards(`name:"${name}" supertype:pokemon`);
const exact = matches.find((card) => card.name.toLowerCase() === name.toLowerCase()) ?? matches[0];
const dex = exact?.nationalPokedexNumbers?.[0];
if (!dex) {
  console.error(`No Pokémon card found for "${name}"`);
  process.exit(1);
}

const config = {
  name: exact.name,
  query: `nationalPokedexNumbers:${dex}`,
  options: { reverseHolo: true, firstEdition: true },
  exclude: [],
  overrides: {},
  stamps: [],
  extras: [],
};
await writeFile(file, `${JSON.stringify(config, null, 2)}\n`);
console.log(`Created ${path.relative(ROOT, file)} — now run: npm run build -- ${slug}`);
