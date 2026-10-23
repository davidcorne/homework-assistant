# Homework Assistant

A tiny, offline-friendly flashcard site for practising spelling words, phonics
sounds, tricky words and numbers. Big paper-style cards, minimal interface,
built for phone and tablet.

No build step, no dependencies, no server. Just open `index.html`.

## Running it

- **On your computer:** double-click `index.html`. (Everything works, but
  install/offline caching needs a web server — see below.)
- **On your phone/tablet:** deploy the folder to any static host (GitHub Pages,
  Netlify, Vercel) and open the URL.

## Installing as an app (PWA)

It is a Progressive Web App: on a hosted (https) URL you can install it to the
home screen and it works offline afterwards.

- **Android / Chrome:** open the URL, then menu **Install app** (or **Add to
  Home screen**).
- **iPhone / Safari:** open the URL, tap **Share**, then **Add to Home Screen**.

The service worker (`sw.js`) caches the app shell, so once opened it loads with
no network. Notes:

- The service worker only runs over `https` or `localhost`; opening
  `index.html` from a file will not enable offline/install.
- To ship an update, bump the cache version in `sw.js` (e.g.
  `homework-assistant-v1` -> `v2`) so clients pick up the new files.

## Using it

1. **Profiles** is the entry screen: tap **T** for Tyler or **J** for Jackson.
   The app always opens here, and the small profile circle in the top-right of a
   home screen takes you back to the picker.
2. **Home** shows the active child's homework. Tyler has *Spelling*, *Phonics*
   and *Tricky Words*, each with the current set name and how many cards it has.
   Jackson has *Numbers*, seeded with 1 to 5.
3. **Cards** shows one big card at a time. Tyler's cards are shuffled into a
   random order each time; Jackson's number cards stay in order. Your child
   reads each one out loud to you.
   - Tap the card, or the right arrow, for the next card.
   - Left arrow goes back.
   - On a computer: `→` / `Space` = next, `←` = back, `Esc` = home.
   - **Tricky Words** are practised in batches of ten: the list is shuffled and
     handed out ten at a time, so every word is covered before any repeat. The
     progress reads `7 / 10`. After the tenth card a **Finished!** panel appears
     and the app returns to Home.
4. **Manage words** (link at the bottom of Home) is where you edit the active
   child's lists. Tyler's screen has spelling, phonics and tricky words;
   Jackson's has a Numbers box.

## Adding a new set every 2 weeks

1. Pick the child's profile on the entry screen.
2. Open **Manage words**.
3. Give the set a name, e.g. `Weeks 7&8` (one name covers every list).
4. Type or paste each list into its box, **one item per line** (commas also work).
5. Press **Save**.

Blank lines and duplicate entries are ignored. The set name is shown on the Home
screen and on the cards, so you can tell at a glance which fortnight you are on.

Each profile has its own lists and name, stored in the browser on the device you
are using. Tyler's existing saved words are carried over automatically the first
time the new version loads.

## Tests

The pure logic (parsing, storage migration, shuffle, routing helpers) lives in
`logic.js` and is covered by unit tests using Node's built-in test runner — no
dependencies.

```
npm test
```

Run `node --test` directly if you prefer.

## Deployment

Deployment is automated by GitHub Actions (`.github/workflows/deploy.yml`).
Every push and pull request runs the unit tests. A push to `main` deploys to
GitHub Pages **only if the tests pass** — a failing test blocks the deploy.
(The Pages source is set to **GitHub Actions**, not a branch.)

Because the service worker caches files, bump the cache version in `sw.js`
when you want installed devices to pick up a change.

## Files

- `index.html` - the profile picker, home, cards and manage screens
- `styles.css` - the paper-card look
- `logic.js` - pure, testable helpers shared by the app and the tests
- `app.js` - DOM wiring, storage, card logic, service worker registration
- `logic.test.js` - unit tests for `logic.js`
- `package.json` - `npm test` script
- `manifest.webmanifest` - PWA metadata (name, colors, icons)
- `sw.js` - service worker for offline caching
- `icons/` - app icons (192, 512, maskable, apple-touch)
- `.github/workflows/deploy.yml` - test, then deploy to Pages if tests pass

## Default (seed) content

- Phonics: `v, w, x, b, z`
- Spelling: `mum, zap, vans, wins, wet, fox, zip, jug, vet`
- Tricky Words: the full Year 1/2 tricky word list (practised in batches of ten)
- Numbers (Jackson): `1, 2, 3, 4, 5`
