// Turns raw API cards + a collection config into the flat list of
// placeholders ("slots") that end up on the printed sheets.

export const CATEGORIES = ['normal', 'promo', 'stamp'];

const VARIANT_LABELS = {
  normal: 'Normal',
  holofoil: 'Holo',
  reverseHolofoil: 'Reverse Holo',
  unlimited: 'Unlimited',
  unlimitedHolofoil: 'Unlimited Holo',
  '1stEdition': '1st Edition',
  '1stEditionHolofoil': '1st Edition Holo',
};

// Print order of variants of the same card.
const VARIANT_ORDER = Object.keys(VARIANT_LABELS);

const isFirstEdition = (variant) => variant.startsWith('1stEdition');
const isUnlimited = (variant) => variant.startsWith('unlimited');

// Card scans of WOTC-era cards are usually of the 1st Edition printing. On the
// unlimited placeholder the stamp (left of the Pokédex bar, below the artwork)
// is covered with card texture copied from just below it. Fractions of the
// card's width/height; `dy` is how far down the texture is taken from.
export const FIRST_EDITION_STAMP = { x: 0.035, y: 0.531, w: 0.09, h: 0.046, dy: 0.046 };
const isReverse = (variant) => variant === 'reverseHolofoil';

function isPromo(card) {
  const set = card.set;
  return (
    card.rarity === 'Promo' ||
    set.series === 'POP' ||
    /promo|trainer kit|mcdonald|\bpop\b/i.test(set.name)
  );
}

/** The printings pokemontcg.io knows about (it mirrors TCGplayer's list). */
function apiVariants(card) {
  const keys = Object.keys(card.tcgplayer?.prices ?? {}).filter((k) => k in VARIANT_LABELS);
  return keys.length ? keys : ['normal'];
}

function baseSlot(card) {
  return {
    cardId: card.id,
    name: card.name,
    number: card.number,
    setName: card.set.name,
    setTotal: card.set.printedTotal,
    series: card.set.series,
    releaseDate: card.set.releaseDate,
    image: card.images?.large ?? card.images?.small,
    symbol: card.set.images?.symbol,
  };
}

function compareSlots(a, b) {
  return (
    a.releaseDate.localeCompare(b.releaseDate) ||
    a.setName.localeCompare(b.setName) ||
    a.number.localeCompare(b.number, 'en', { numeric: true }) ||
    a.order - b.order
  );
}

export function expand(cards, config) {
  const options = {
    reverseHolo: true,
    firstEdition: true,
    firstEditionStamp: FIRST_EDITION_STAMP,
    ...config.options,
  };
  const overrides = config.overrides ?? {};
  const exclude = new Set(config.exclude ?? []);
  const byId = new Map(cards.map((card) => [card.id, card]));
  const slots = [];

  const requireCard = (id, where) => {
    const card = byId.get(id);
    if (!card) throw new Error(`${where}: card "${id}" is not in the search results`);
    return card;
  };

  for (const card of cards) {
    if (exclude.has(card.id)) continue;
    const override = overrides[card.id] ?? {};
    const category = override.category ?? (isPromo(card) ? 'promo' : 'normal');
    const variants = (override.variants ?? apiVariants(card))
      .filter((v) => options.reverseHolo || !isReverse(v))
      .filter((v) => options.firstEdition || !isFirstEdition(v));
    const hasFirstEdition = variants.some(isFirstEdition);
    for (const variant of variants) {
      const cover =
        override.cover ??
        (hasFirstEdition && isUnlimited(variant) && !override.image && options.firstEditionStamp
          ? [options.firstEditionStamp]
          : undefined);
      slots.push({
        ...baseSlot(card),
        category,
        variant: VARIANT_LABELS[variant] ?? variant,
        order: Math.max(0, VARIANT_ORDER.indexOf(variant)),
        note: override.note,
        ...(override.image && { image: override.image }),
        ...(cover && { cover: [cover].flat() }),
      });
    }
  }

  // Stamped versions of cards that are already in the search results.
  for (const [i, stamp] of (config.stamps ?? []).entries()) {
    const card = requireCard(stamp.card, `stamps[${i}]`);
    slots.push({
      ...baseSlot(card),
      category: 'stamp',
      variant: stamp.stamp,
      order: 100 + i,
      note: stamp.note,
      ...(stamp.image && { image: stamp.image }),
    });
  }

  // Cards the API doesn't know about at all.
  for (const [i, extra] of (config.extras ?? []).entries()) {
    const from = extra.imageFrom ? baseSlot(requireCard(extra.imageFrom, `extras[${i}]`)) : {};
    slots.push({
      cardId: `extra-${i}`,
      name: extra.name ?? from.name ?? config.name,
      number: String(extra.number ?? ''),
      setName: extra.set,
      setTotal: extra.setTotal,
      releaseDate: extra.releaseDate ?? from.releaseDate ?? '9999/12/31',
      image: extra.image ?? from.image,
      symbol: extra.symbol,
      category: extra.category ?? 'promo',
      variant: extra.variant ?? 'Normal',
      order: 0,
      note: extra.note,
    });
  }

  for (const slot of slots) {
    if (!CATEGORIES.includes(slot.category)) {
      throw new Error(`Unknown category "${slot.category}" for ${slot.cardId}`);
    }
  }

  return slots.sort(
    (a, b) =>
      CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category) || compareSlots(a, b),
  );
}
