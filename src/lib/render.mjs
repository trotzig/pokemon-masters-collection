import { CATEGORIES } from './expand.mjs';

// All measurements in millimetres.
export const PAPERS = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

const CARD = { width: 63, height: 88 }; // standard trading card
const COLS = 3;
const ROWS = 3;
const MARK = { gap: 1, length: 3 }; // cut marks sit just outside the grid

const CATEGORY_TITLES = { normal: 'Normal cards', promo: 'Promo cards', stamp: 'Stamped cards' };

const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const chunk = (items, size) =>
  Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, (i + 1) * size));

const year = (slot) => (slot.releaseDate.startsWith('9999') ? '' : slot.releaseDate.slice(0, 4));

function numberLabel(slot) {
  if (!slot.number) return '';
  const total = slot.setTotal && /^\d+$/.test(slot.number) ? `/${slot.setTotal}` : '';
  return `#${slot.number}${total}`;
}

/** Badge text + colour class for a slot. */
function badge(slot) {
  if (slot.category === 'stamp') return { text: slot.variant, kind: 'stamp' };
  if (slot.category === 'promo') {
    return { text: slot.variant === 'Normal' ? 'Promo' : `Promo · ${slot.variant}`, kind: 'promo' };
  }
  const kind = /reverse/i.test(slot.variant) ? 'reverse' : /1st/i.test(slot.variant) ? 'first' : 'plain';
  return { text: slot.variant, kind };
}

function cutMarks(paper, left, top) {
  const right = left + COLS * CARD.width;
  const bottom = top + ROWS * CARD.height;
  const lines = [];
  for (let c = 0; c <= COLS; c++) {
    const x = left + c * CARD.width;
    lines.push([x, top - MARK.gap - MARK.length, x, top - MARK.gap]);
    lines.push([x, bottom + MARK.gap, x, bottom + MARK.gap + MARK.length]);
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = top + r * CARD.height;
    lines.push([left - MARK.gap - MARK.length, y, left - MARK.gap, y]);
    lines.push([right + MARK.gap, y, right + MARK.gap + MARK.length, y]);
  }
  const svgLines = lines
    .map(([x1, y1, x2, y2]) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`)
    .join('');
  return `<svg class="marks" viewBox="0 0 ${paper.width} ${paper.height}">${svgLines}</svg>`;
}

/**
 * Hides part of a card picture (e.g. a 1st Edition stamp) by laying a copy of
 * the picture on top, shifted so that plain card texture shows through.
 */
function coverHtml(slot) {
  return (slot.cover ?? [])
    .map(({ x, y, w, h, dx = 0, dy = 0 }) => {
      const style = [
        `left:${x * CARD.width}mm`,
        `top:${y * CARD.height}mm`,
        `width:${w * CARD.width}mm`,
        `height:${h * CARD.height}mm`,
        `background-image:url("${escapeHtml(slot.imageSrc)}")`,
        `background-position:${-(x + dx) * CARD.width}mm ${-(y + dy) * CARD.height}mm`,
      ].join(';');
      return `<div class="cover" style='${style}'></div>`;
    })
    .join('');
}

function slotHtml(slot) {
  const { text, kind } = badge(slot);
  const meta = [numberLabel(slot), year(slot), slot.note].filter(Boolean).join(' · ');
  return `<div class="slot">
  ${slot.imageSrc ? `<img class="art" src="${escapeHtml(slot.imageSrc)}" alt="">${coverHtml(slot)}` : `<div class="art missing">${escapeHtml(slot.name)}</div>`}
  <div class="label">
    <div class="set">${slot.symbolSrc ? `<img src="${escapeHtml(slot.symbolSrc)}" alt="">` : ''}<span>${escapeHtml(slot.setName)}</span></div>
    <div class="meta">${escapeHtml(meta)}</div>
    <div class="badge ${kind}">${escapeHtml(text)}</div>
  </div>
</div>`;
}

function checklistHtml(title, slots) {
  const groups = CATEGORIES.map((category) => {
    const rows = slots
      .filter((slot) => slot.category === category)
      .map(
        (slot) =>
          `<li><span class="box"></span><span class="what"><b>${escapeHtml(slot.setName)}</b> ${escapeHtml(numberLabel(slot))}${
            slot.name === title ? '' : ` · ${escapeHtml(slot.name)}`
          }</span><span class="variant">${escapeHtml(badge(slot).text)}</span></li>`,
      );
    return rows.length ? `<h2>${CATEGORY_TITLES[category]} (${rows.length})</h2><ul>${rows.join('')}</ul>` : '';
  });
  return `<section class="checklist"><h1>${escapeHtml(title)} — master collection checklist (${slots.length})</h1>${groups.join('')}</section>`;
}

export function renderHtml({ title, slots, paper: paperName }) {
  const paper = PAPERS[paperName];
  const left = (paper.width - COLS * CARD.width) / 2;
  const top = (paper.height - ROWS * CARD.height) / 2;
  const pages = chunk(slots, COLS * ROWS);

  const pagesHtml = pages
    .map((pageSlots, i) => {
      const sections = [...new Set(pageSlots.map((slot) => CATEGORY_TITLES[slot.category]))].join(' + ');
      return `<section class="page">
<header>${escapeHtml(title)} master collection · ${sections} · ${i + 1}/${pages.length}</header>
${cutMarks(paper, left, top)}
<div class="grid">${pageSlots.map(slotHtml).join('\n')}</div>
</section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(title)} master collection placeholders</title>
<style>
@page { size: ${paper.width}mm ${paper.height}mm; margin: 0; }
@page checklist { size: ${paper.width}mm ${paper.height}mm; margin: 14mm; }
* { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body { margin: 0; font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color: #111; }
.page { position: relative; background: #fff; width: ${paper.width}mm; height: ${paper.height}mm; overflow: hidden; break-after: page; }
.page header { position: absolute; left: ${left}mm; top: ${Math.max(1.5, top - 11)}mm; font-size: 2.3mm; color: #666; }
.marks { position: absolute; inset: 0; width: 100%; height: 100%; }
.marks line { stroke: #000; stroke-width: 0.15; }
.grid { position: absolute; left: ${left}mm; top: ${top}mm; display: grid; grid-template-columns: repeat(${COLS}, ${CARD.width}mm); grid-auto-rows: ${CARD.height}mm; }
.slot { position: relative; width: ${CARD.width}mm; height: ${CARD.height}mm; outline: 0.1mm solid #bbb; overflow: hidden; }
.art { display: block; width: 100%; height: 100%; }
.cover { position: absolute; background-size: ${CARD.width}mm ${CARD.height}mm; background-repeat: no-repeat;
  mask-image: linear-gradient(to right, transparent, #000 0.6mm, #000 calc(100% - 0.6mm), transparent), linear-gradient(to bottom, transparent, #000 0.6mm, #000 calc(100% - 0.6mm), transparent);
  mask-composite: intersect; }
.art.missing { display: flex; align-items: center; justify-content: center; background: #eee; color: #888; font-size: 5mm; }
.label { position: absolute; left: 2.5mm; right: 2.5mm; bottom: 2.5mm; padding: 1.2mm 1.6mm; background: rgba(255, 255, 255, 0.94); border: 0.2mm solid #222; border-radius: 1.5mm; }
.set { display: flex; align-items: center; gap: 1mm; font-size: 3mm; font-weight: 700; line-height: 1.15; }
.set img { height: 3.2mm; width: auto; }
.meta { margin-top: 0.4mm; font-size: 2.3mm; color: #333; }
.badge { display: inline-block; margin-top: 0.8mm; padding: 0.4mm 1.4mm; border-radius: 3mm; font-size: 2.3mm; font-weight: 700; color: #fff; background: #555; }
.badge.reverse { background: #1d6fd1; }
.badge.first { background: #111; }
.badge.promo { background: #b7791f; }
.badge.stamp { background: #c0262d; }
.checklist { page: checklist; columns: 2; column-gap: 8mm; font-size: 2.9mm; }
.checklist h1 { column-span: all; font-size: 5mm; margin: 0 0 4mm; }
.checklist h2 { font-size: 3.6mm; margin: 3mm 0 1.5mm; break-after: avoid; }
.checklist ul { list-style: none; margin: 0; padding: 0; }
.checklist li { display: flex; align-items: center; gap: 1.5mm; padding: 0.7mm 0; border-bottom: 0.1mm solid #ddd; break-inside: avoid; }
.checklist .box { flex: none; width: 3mm; height: 3mm; border: 0.25mm solid #111; }
.checklist .what { flex: 1; }
.checklist .variant { color: #555; text-align: right; }
@media screen { body { background: #888; } .page, .checklist { margin: 8mm auto; background: #fff; } .checklist { width: ${paper.width}mm; padding: 14mm; } }
</style>
</head>
<body>
${pagesHtml}
${checklistHtml(title, slots)}
</body>
</html>
`;
}
