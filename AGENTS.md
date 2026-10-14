# AGENTS.md

Generator for printable binder placeholder sheets for Pokémon TCG "master
collections": one placeholder per card a Pokémon appears on, with a picture of
the card and a label naming the set, number, year and variant. See
[README.md](README.md) for user-facing docs and the collection file format.

## Commands

```bash
npm run build -- mareep                 # → output/mareep/mareep-a4.{html,pdf}
npm run build -- mareep --paper letter  # US Letter
npm run build -- mareep --refresh       # re-fetch card data (otherwise cached)
npm run build -- mareep --no-pdf        # HTML only
npm run new -- Pikachu                  # scaffold collections/pikachu.json
```

Plain Node (>=20, ESM, `.mjs`), **no dependencies**. Keep it that way unless
there is a strong reason. The PDF is printed with headless Chrome
(`CHROME_PATH` overrides the lookup). There are no tests; verify changes by
building and looking at the result. Rendering the HTML with headless Chrome
`--screenshot` and cropping is a quick way to see a sheet.

## How it works

- `collections/<slug>.json`: one file per Pokémon. This is the only
  hand-curated data.
- `owned/<slug>.json`: the cards the user owns, as `{ card, variant }` entries
  matching a slot's `key` (`<cardId>/<variant>`, `<cardId>/stamp:<name>`, or an
  extra's id). Owned slots are ticked on the checklist. When the user says
  they have a card, add it here. Modern cards have no "Unlimited" printing, so
  "unlimited" from the user means `normal` there; only WOTC-era cards with a
  1st Edition have an `unlimited` variant.
- `src/lib/api.mjs`: pokemontcg.io search (`query`, usually
  `nationalPokedexNumbers:N`) and image download. Responses and images are
  cached in `cache/` (gitignored).
- `src/lib/expand.mjs`: turns API cards and the config into a flat, sorted list
  of slots (one per placeholder). Categories are `normal`, `promo` and `stamp`.
  Variants (reverse holo, 1st Edition, …) come from the keys of
  `card.tcgplayer.prices`. Promo detection is a heuristic (`isPromo`).
- `src/lib/render.mjs`: HTML with 3×3 cards at 63×88 mm per page, cut marks in
  the margins, a label overlay per card, and a checklist page at the end.
- `src/build.mjs`: the CLI that ties these together. Output goes to `output/`
  (gitignored).

## Data caveats

- pokemontcg.io has **no stamped cards**. They are researched by hand
  (price trackers such as Scrydex, Pokescope, Card Codex, TCGplayer listings)
  and listed under `stamps`, which reuse the unstamped card's image. TCGdex
  (`api.tcgdex.net/v2/en/cards/<id>`, `variants_detailed[].stamp`) has some
  stamp data and is worth checking, but its variant data is incomplete.
- Cards the API lacks entirely (for example the HS Trainer Kit) go in `extras`,
  usually with `imageFrom` pointing at the original printing.
- Some new cards have no price data, so their variants must be set with
  `overrides.<id>.variants`. Example: `me4-27` in `mareep.json`.
- WOTC-era scans are of the 1st Edition printing. The Unlimited slot covers
  the stamp with a CSS overlay that copies card texture from just below it
  (`FIRST_EDITION_STAMP` in `expand.mjs`, `coverHtml` in `render.mjs`).
- Only English cards are included. Japanese prints and TCG Pocket cards are
  out of scope.
- Card images are copyrighted. Never commit `cache/` or `output/`.
