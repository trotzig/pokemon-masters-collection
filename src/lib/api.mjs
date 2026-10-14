import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

export const ROOT = path.resolve(import.meta.dirname, '../..');
export const CACHE_DIR = path.join(ROOT, 'cache');

const API = 'https://api.pokemontcg.io/v2';

const exists = (file) => access(file).then(() => true, () => false);

async function fetchRetry(url, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      const headers = process.env.POKEMONTCG_API_KEY
        ? { 'X-Api-Key': process.env.POKEMONTCG_API_KEY }
        : {};
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(60_000) });
      if (res.ok) return res;
      lastError = new Error(`${res.status} ${res.statusText} for ${url}`);
      if (res.status < 500 && res.status !== 429) break;
    } catch (err) {
      lastError = err;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500 * (i + 1)));
  }
  throw lastError;
}

/** Runs a pokemontcg.io card search (all pages). */
export async function searchCards(query) {
  const cards = [];
  for (let page = 1; ; page++) {
    const url = `${API}/cards?q=${encodeURIComponent(query)}&pageSize=250&page=${page}`;
    const json = await (await fetchRetry(url)).json();
    cards.push(...json.data);
    if (cards.length >= json.totalCount || json.data.length === 0) break;
  }
  return cards;
}

/** Card search results for a collection, cached in cache/api/<slug>.json. */
export async function loadCards(slug, query, { refresh = false } = {}) {
  const file = path.join(CACHE_DIR, 'api', `${slug}.json`);
  if (!refresh && (await exists(file))) {
    const cached = JSON.parse(await readFile(file, 'utf8'));
    if (cached.query === query) return cached.cards;
  }
  const cards = await searchCards(query);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify({ query, fetchedAt: new Date().toISOString(), cards }));
  return cards;
}

/**
 * Resolves an image reference to a local file. URLs are downloaded once into
 * cache/images; anything else is treated as a path relative to the repo root.
 */
export async function localImage(ref, cacheName) {
  if (!ref) return null;
  if (!/^https?:\/\//.test(ref)) return path.resolve(ROOT, ref);
  const ext = path.extname(new URL(ref).pathname) || '.png';
  const file = path.join(CACHE_DIR, 'images', `${cacheName}${ext}`);
  if (!(await exists(file))) {
    const res = await fetchRetry(ref);
    await mkdir(path.dirname(file), { recursive: true });
    await writeFile(file, Buffer.from(await res.arrayBuffer()));
  }
  return file;
}
