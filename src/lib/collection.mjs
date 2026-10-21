import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { ROOT, loadCards } from './api.mjs';
import { expand } from './expand.mjs';

export async function listCollections() {
  return (await readdir(path.join(ROOT, 'collections')))
    .filter((file) => file.endsWith('.json'))
    .map((file) => path.basename(file, '.json'))
    .sort();
}

/**
 * Marks the slots listed in owned/<slug>.json. Each entry is
 * { card, variant }: variant is a pokemontcg.io printing (normal,
 * reverseHolofoil, holofoil, unlimited, 1stEdition, …), "stamp:<stamp name>"
 * for a stamped card, or for extras just { card: <extra id> }.
 */
async function markOwned(slots, slug) {
  const file = path.join(ROOT, 'owned', `${slug}.json`);
  if (!existsSync(file)) return;
  const { cards: owned = [] } = JSON.parse(await readFile(file, 'utf8'));
  const byKey = new Map(slots.map((slot) => [slot.key, slot]));
  for (const entry of owned) {
    const key = entry.variant ? `${entry.card}/${entry.variant}` : entry.card;
    const slot = byKey.get(key);
    if (!slot) {
      const options = slots.filter((s) => s.cardId === entry.card).map((s) => s.key.slice(entry.card.length + 1));
      throw new Error(
        `owned/${slug}.json: no placeholder for ${key}` +
          (options.length ? ` (variants of ${entry.card}: ${options.join(', ')})` : ''),
      );
    }
    slot.owned = true;
  }
}

/** Heading for a collection: "<name> master collection" unless the config opts out. */
export const collectionTitle = (config) =>
  config.masterCollection === false ? config.name : `${config.name} master collection`;

/** Config + placeholder slots (with `owned` set) for collections/<slug>.json. */
export async function loadCollection(slug, { refresh = false } = {}) {
  const config = JSON.parse(await readFile(path.join(ROOT, 'collections', `${slug}.json`), 'utf8'));
  const cards = await loadCards(slug, config.query, { refresh });
  const slots = expand(cards, config);
  await markOwned(slots, slug);
  return { config, slots };
}
