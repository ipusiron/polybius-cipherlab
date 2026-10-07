# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Polybius CipherLab is a web-based educational tool for the Polybius cipher: it builds the square from a keyword, converts letters to number pairs, and shows the mapping character by character. Everything runs in the browser with no dependencies and no network traffic.

## Development Commands

- **Run locally**: open `index.html` directly in a browser, or serve the folder
  - Example: `python -m http.server 8000` or `npx serve`
- **Test**: `npm test` (Node.js 22+, `node --test`, no dependencies)
- **Deploy to GitHub Pages**: push to `main` (already configured with `.nojekyll`)

## Architecture

### Calculation layer (js/polybius-core.js)

Published as `globalThis.PolybiusCore`. It never touches the DOM, and the tests call it directly.

- `normalizeInput(raw)`: unifies line endings, drops control characters except tab and newline, caps the length at `MAX_INPUT` (10000) and reports what was cut
- `prepareKeyword(raw, mode)`: keeps only usable characters, applies the merge (J to I in 5x5), removes duplicates, reports dropped and merged characters
- `buildSquare({mode, keyword})`: pure function. Returns rows, `charToPair`, `pairToChar`, `keywordChars` and the keyword report. It does not mutate any shared state, so each tab can hold its own square
- `encrypt(square, text, options)`: returns tokens (`pair` / `sep` / `symbol`), the mapping, counters, and the formatted cipher
- `formatCipher(tokens, options)`: always separates a symbol from its neighbours, so a one-digit symbol cannot swallow a pair boundary
- `decrypt(square, raw)`: reads digits two at a time. Out-of-range pairs are wrapped in brackets, leftover digits and non-digit characters are kept in place, and every case is counted

Modes: `5x5` (25 letters, J merged into I) and `6x6` (A-Z plus 0-9).

### UI layer (script.js)

An IIFE that only reads the DOM and writes results. Each of the three tabs (encrypt, decrypt, matrix) builds its own square from its own inputs, so the keyword shown on screen always matches the keyword used for the calculation. The mapping list is built with `textContent` and capped at 200 rows; a newer run cancels the animation of an older one.

### Messages (js/messages.js)

`globalThis.PolybiusMessages.t(key, vars)` replaces `{name}` placeholders. All user-facing strings produced by JavaScript live here; `test/format.test.js` fails if a Japanese string literal is left in `script.js`.

### Tests (test/)

- `load.js`: loads the browser scripts with `vm.runInThisContext`, normalises CRLF, and holds reference implementations used to cross-check the square and the pairs
- `core.test.js`: round trips, known answers, boundaries (empty, max length, non-ASCII, surrogate pairs), invalid input
- `html.test.js`: CSP meta, no inline handlers or style attributes, script order, ids, tab/panel wiring, external links
- `contrast.test.js`: reads the CSS variables and checks every text/background pair at 4.5:1 or better in both themes
- `format.test.js`: guards against minified files and against the calculation layer touching the DOM
- `readme.test.js`: recomputes the squares and examples printed in README.md and index.html, checks the directory tree and the wording rules

## Conventions

- No dependencies, no build step, no CDN. Everything must keep working from `file://`
- Write to the DOM with `textContent` or element construction, never `innerHTML`
- Keep the CSP meta as strict as it is; do not add `unsafe-inline`
- Japanese text: polite form in prose, plain form in bullet lists and tables; long vowel marks (サーバー, ブラウザー); no space between Japanese and Latin characters
- Screenshots are taken with the script kept outside this repository (`day067_shots.py` in the working system)
