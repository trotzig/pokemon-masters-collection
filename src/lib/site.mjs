// Web pages for sharing collections: one page per collection plus an index.
// Pictures are loaded straight from the card image CDN, never committed.
import { CATEGORIES } from './expand.mjs';
import { CATEGORY_TITLES, COLS, COVER_CSS, ROWS, badge, chunk, coverHtml, escapeHtml, numberLabel, year } from './render.mjs';

const progress = (slots) => {
  const owned = slots.filter((slot) => slot.owned).length;
  return { owned, total: slots.length, percent: slots.length ? Math.round((owned / slots.length) * 100) : 0 };
};

const STYLE = `
:root {
  --bg: #fbf7ec; --surface: #ffffff; --text: #1d1b16; --muted: #6b6455; --line: #e7dfcc;
  --accent: #f2b705; --good: #1f8a3b; --plain: #5b5b5b; --reverse: #1d6fd1; --first: #111; --promo: #b7791f; --stamp: #c0262d;
}
@media (prefers-color-scheme: dark) {
  :root { --bg: #17150f; --surface: #221f17; --text: #f3eedf; --muted: #a79f8b; --line: #3a3528; --plain: #7a7a7a; --first: #444; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 1180px; margin: 0 auto; padding: 32px 16px 64px; }
a { color: inherit; }
h1 { margin: 0; font-size: clamp(28px, 5vw, 44px); line-height: 1.1; }
.sub { margin: 6px 0 0; color: var(--muted); }
.bar { height: 14px; margin-top: 18px; border-radius: 99px; background: var(--line); overflow: hidden; }
.bar span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), #f7d24a); border-radius: 99px; }
.stats { display: flex; flex-wrap: wrap; gap: 8px 20px; margin-top: 10px; color: var(--muted); font-size: 14px; }
.stats b { color: var(--text); }
.filters { position: sticky; top: 0; z-index: 2; display: flex; gap: 8px; margin: 24px -16px 0; padding: 12px 16px; background: var(--bg); border-bottom: 1px solid var(--line); }
.filters button { font: inherit; font-size: 14px; padding: 6px 14px; border-radius: 99px; border: 1px solid var(--line); background: var(--surface); color: var(--text); cursor: pointer; }
.filters button[aria-pressed="true"] { background: var(--text); color: var(--bg); border-color: var(--text); }
.binder { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 480px), 1fr)); gap: 28px 20px; margin-top: 24px; }
.page { padding: 14px; border-radius: 14px; background: var(--surface); border: 1px solid var(--line); }
.page h2 { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: var(--muted); }
.page h2 small { font-weight: 400; }
.grid { display: grid; grid-template-columns: repeat(${COLS}, minmax(0, 1fr)); gap: 12px; }
.card { margin: 0; }
.pic { position: relative; aspect-ratio: 63 / 88; border-radius: 4.5% / 3.2%; overflow: hidden; background: var(--line); }
.pic img { display: block; width: 100%; height: 100%; object-fit: cover; }
.card:not(.owned) .pic { filter: grayscale(1); opacity: 0.45; }
.check { position: absolute; top: 6px; right: 6px; width: 30px; height: 30px; border-radius: 50%; background: var(--good); color: #fff; border: 2px solid #fff; display: grid; place-items: center; font-weight: 700; box-shadow: 0 1px 3px #0006; }
figcaption { padding-top: 6px; font-size: 12px; line-height: 1.3; overflow-wrap: anywhere; }
figcaption b { display: block; font-size: 13px; }
figcaption .meta { color: var(--muted); }
.badge { display: inline-block; margin-top: 5px; padding: 1px 8px; border-radius: 99px; font-size: 12px; font-weight: 600; color: #fff; background: var(--plain); }
.badge.reverse { background: var(--reverse); } .badge.first { background: var(--first); }
.badge.promo { background: var(--promo); } .badge.stamp { background: var(--stamp); }
/* Filtered-out cards leave their binder slot empty so positions match the real binder. */
body[data-filter="have"] .card:not(.owned) :is(.pic > *, figcaption), body[data-filter="need"] .card.owned :is(.pic > *, figcaption) { visibility: hidden; }
body[data-filter="have"] .card:not(.owned) .pic, body[data-filter="need"] .card.owned .pic { background: none; border: 2px dashed var(--line); filter: none; opacity: 1; }
body[data-filter="have"] .page:not(:has(.card.owned)), body[data-filter="need"] .page:not(:has(.card:not(.owned))) { display: none; }
@media (max-width: 520px) { .page { padding: 10px; } .grid { gap: 8px; } figcaption { font-size: 11px; } figcaption b { font-size: 12px; } .badge { font-size: 11px; padding: 1px 6px; } }

.collections { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 18px; margin-top: 28px; }
.collection { display: flex; gap: 14px; align-items: center; padding: 14px; border-radius: 14px; background: var(--surface); border: 1px solid var(--line); text-decoration: none; }
.collection img { width: 72px; border-radius: 4px; }
.collection .bar { height: 8px; margin-top: 8px; }
footer { margin-top: 48px; color: var(--muted); font-size: 13px; }
${COVER_CSS}
`;

const page = (title, body) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
<footer>Card pictures from <a href="https://pokemontcg.io">pokemontcg.io</a>. Pokémon and card images © Nintendo, Creatures, GAME FREAK and The Pokémon Company.</footer>
</main>
</body>
</html>
`;

function cardHtml(slot) {
  const { text, kind } = badge(slot);
  const meta = [numberLabel(slot), year(slot), slot.note].filter(Boolean).join(' · ');
  return `<figure class="card${slot.owned ? ' owned' : ''}">
  <div class="pic">${
    slot.image ? `<img src="${escapeHtml(slot.image)}" alt="${escapeHtml(`${slot.name}, ${slot.setName} ${numberLabel(slot)}`)}" loading="lazy">${coverHtml(slot, slot.image)}` : ''
  }${slot.owned ? '<span class="check" title="Got it">✓</span>' : ''}</div>
  <figcaption><b>${escapeHtml(slot.setName)}</b><span class="meta">${escapeHtml(meta)}</span><br><span class="badge ${kind}">${escapeHtml(text)}</span></figcaption>
</figure>`;
}

export function renderCollectionPage({ config, slots }) {
  const { owned, total, percent } = progress(slots);
  // Same 3×3 pages, in the same order, as the printed placeholder sheets.
  const pages = chunk(slots, COLS * ROWS);
  const binder = pages
    .map((pageSlots, i) => {
      const sections = [...new Set(pageSlots.map((slot) => CATEGORY_TITLES[slot.category]))].join(' + ');
      const p = progress(pageSlots);
      return `<section class="page"><h2>Page ${i + 1} · ${escapeHtml(sections)} <small>${p.owned}/${p.total}</small></h2>
<div class="grid">${pageSlots.map(cardHtml).join('\n')}</div></section>`;
    })
    .join('\n');
  const categoryStats = CATEGORIES.map((category) => {
    const group = slots.filter((slot) => slot.category === category);
    if (!group.length) return '';
    const p = progress(group);
    return `<span>${CATEGORY_TITLES[category]} <b>${p.owned}</b>/${p.total}</span>`;
  }).join('');

  return page(
    `${config.name} master collection`,
    `<header>
  <p class="sub"><a href="./">← All collections</a></p>
  <h1>${escapeHtml(config.name)} master collection</h1>
  <p class="sub">Every English ${escapeHtml(config.name)} card: normal, promo and stamped versions.</p>
  <div class="bar" role="progressbar" aria-valuenow="${owned}" aria-valuemin="0" aria-valuemax="${total}"><span style="width:${percent}%"></span></div>
  <div class="stats"><span><b>${owned}</b> of <b>${total}</b> collected (${percent}%)</span><span><b>${total - owned}</b> still to find</span>${categoryStats}</div>
</header>
<nav class="filters" aria-label="Filter">
  <button type="button" data-filter="" aria-pressed="true">All</button>
  <button type="button" data-filter="have" aria-pressed="false">Got it</button>
  <button type="button" data-filter="need" aria-pressed="false">Still need</button>
</nav>
<div class="binder">${binder}</div>
<script>
for (const button of document.querySelectorAll('.filters button')) {
  button.addEventListener('click', () => {
    if (button.dataset.filter) document.body.dataset.filter = button.dataset.filter;
    else delete document.body.dataset.filter;
    for (const b of document.querySelectorAll('.filters button')) b.setAttribute('aria-pressed', String(b === button));
  });
}
</script>`,
  );
}

export function renderIndexPage(collections) {
  const items = collections
    .map(({ slug, config, slots }) => {
      const { owned, total, percent } = progress(slots);
      const cover = slots.find((slot) => slot.owned && slot.image) ?? slots.find((slot) => slot.image);
      return `<a class="collection" href="${escapeHtml(slug)}.html">
  ${cover ? `<img src="${escapeHtml(cover.image)}" alt="">` : ''}
  <div style="flex:1"><b>${escapeHtml(config.name)}</b><div class="sub">${owned} of ${total} cards</div>
  <div class="bar"><span style="width:${percent}%"></span></div></div>
</a>`;
    })
    .join('\n');
  return page(
    'Pokémon master collections',
    `<h1>Pokémon master collections</h1>
<p class="sub">Every card of a Pokémon, and which ones are already in the binder.</p>
<div class="collections">${items}</div>`,
  );
}
