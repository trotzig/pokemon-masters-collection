# Pokémon master collection placeholders

Generates printable sheets of binder placeholders for a "master collection" of
one Pokémon: every card it appears on, with a picture of the card and a label
saying which set it comes from. Each sheet holds 3×3 cards at real card size
(63×88 mm) with cut marks in the margins, followed by a checklist page.

Cards are grouped into **normal** cards (including reverse holo / 1st Edition
printings), **promo** cards and **stamped** cards.

## Usage

Needs Node 20+ and no dependencies. Chrome/Chromium is used to make the PDF.

```bash
npm run build -- mareep                  # A4 → output/mareep/mareep-a4.{html,pdf}
npm run build -- mareep --paper letter   # US Letter
npm run build -- mareep --refresh        # re-download the card list
```

Print the PDF at **100% / actual size** (not "fit to page"), cut along the
marks and slide the placeholders into the binder pockets.

## Adding a collection

```bash
npm run new -- Pikachu
npm run build -- pikachu
```

`npm run new` writes `collections/<name>.json`. Card data and images come from
[pokemontcg.io](https://pokemontcg.io) and are cached in `cache/`. The API does
not know about stamped cards, so those are listed by hand in the collection file:

| Key | Purpose |
| --- | --- |
| `name` | Title on the sheets |
| `masterCollection` | Set to `false` for a list of picked cards rather than a whole Pokémon: drops "master collection" from the titles |
| `description` | Line under the title on the website (defaults to "Every English <name> card…") |
| `site` | Set to `false` to leave the collection off the website (sheets can still be built) |
| `query` | pokemontcg.io search query, e.g. `nationalPokedexNumbers:179` |
| `options` | `reverseHolo` / `firstEdition`: set to `false` to leave those printings out. `firstEditionStamp`: where the 1st Edition stamp sits (see below), or `false` |
| `exclude` | Card ids to skip |
| `order` | Card ids to print first, in this order (e.g. to keep cards whose art connects on one sheet); the rest follow by release date |
| `overrides` | Per card id: `category` (`normal`, `promo`, `stamp`), `variants` (`normal`, `holofoil`, `reverseHolofoil`, `unlimited`, `1stEdition`, …), `image`, `note`, `cover`, `prices` (estimated USD value per variant, e.g. `{ "normal": 0.25 }`) |
| `stamps` | Stamped versions of a card in the results: `{ card, stamp, note?, image?, price? }` |
| `extras` | Cards missing from the API: `{ set, number, setTotal?, releaseDate?, category?, variant?, note?, price?, image? \| imageFrom? }` |

`image` is a URL or a path relative to the repo root; `imageFrom` borrows the
picture of another card id. Stamped cards use the picture of the unstamped card
unless you give them their own `image`.

Scans of WOTC-era cards are of the 1st Edition printing, so on the Unlimited
placeholder the stamp is covered with card texture copied from just below it.
The area is `{ x, y, w, h, dy }` as fractions of the card size (default fits
Base–Neo layouts). Override it per card with `cover` (one area or a list), turn
it off with `"cover": false`, or give the card a real Unlimited scan with `image`.

Card ids are printed in the pokemontcg.io data (`cache/api/<name>.json`), e.g.
`neo1-65`. Set `POKEMONTCG_API_KEY` if you hit the API rate limit.

## Tracking owned cards

List the cards you have in `owned/<name>.json`; they get a ✓ on the checklist
page and the totals show how far along the collection is:

```json
{
  "cards": [
    { "card": "neo2-58", "variant": "unlimited" },
    { "card": "me4-27", "variant": "reverseHolofoil" },
    { "card": "svp-107", "variant": "stamp:Pikachu stamp #19" }
  ]
}
```

`variant` is the printing (`normal`, `reverseHolofoil`, `holofoil`,
`unlimited`, `1stEdition`, …) or `stamp:<stamp name>` as written in the
collection file. Extras are listed as `{ "card": "<extra id>" }`, where the id
is the extra's `id` or `extra/<set>/<number>`. A typo fails the build and
lists the valid variants for that card.

Owned cards are also marked on the printed sheets with a green ✓.

## Website

```bash
npm run site   # → output/site/index.html + one page per collection
```

A shareable page per collection: progress bar, every card (owned ones in
colour with a ✓, missing ones greyed out) and a "Got it" / "Still need"
filter. Each card shows an estimated value: TCGplayer's market price from
pokemontcg.io, or the `price` / `prices` given in the collection file for
stamped cards, extras and cards without price data. The cards can be sorted by
price, release date or set name, and "Clear sorting" goes back to binder order.
Card pictures are loaded from the pokemontcg.io image CDN, so no
images are stored in the repo. `.github/workflows/pages.yml` rebuilds and
publishes it to GitHub Pages on every push to `main`.

## Layout

```
collections/   one JSON file per collection
owned/         cards you own, per collection
src/build.mjs  CLI: fetch → expand → render → PDF
src/new.mjs    CLI: scaffold a collection
src/site.mjs   CLI: build the website
src/lib/       api (fetch + cache), collection (config + owned → slots),
               expand (cards → placeholders), render (print HTML), site (web HTML)
```
