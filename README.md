# Homework Assistant

A tiny, offline-friendly flashcard site for practising spelling words and phonics
sounds. Big paper-style cards, minimal interface, built for phone and tablet.

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

1. **Home** shows two buttons, *Spelling* and *Phonics*, with the current set
   name and how many cards are in each.
2. **Cards** shows one big card at a time. Cards are always shuffled into a
   random order each time. Your child reads each one out loud to you.
   - Tap the card, or the right arrow, for the next card.
   - Left arrow goes back.
   - On a computer: `→` / `Space` = next, `←` = back, `Esc` = home.
3. **Manage words** (link at the bottom of Home) is where you edit the words.

## Adding a new set every 2 weeks

1. Open **Manage words**.
2. Give the set a name, e.g. `Weeks 7&8` (one name covers both lists).
3. Type or paste each list into its box, **one item per line** (commas also work).
4. Press **Save**.

Blank lines and duplicate entries are ignored. The set name is shown on the Home
screen and on the cards, so you can tell at a glance which fortnight you are on.

## Backups and moving between devices

- **Export backup** downloads a small JSON file with both lists.
- **Import backup** loads one back in.

Words are stored in the browser on the device you are using, so export before
switching phone/tablet, reinstalling, or clearing browser data.

## Files

- `index.html` - the three screens
- `styles.css` - the paper-card look
- `app.js` - storage, card logic, export/import, service worker registration
- `manifest.webmanifest` - PWA metadata (name, colors, icons)
- `sw.js` - service worker for offline caching
- `icons/` - app icons (192, 512, maskable, apple-touch)

## Default (seed) content

- Phonics: `v, w, x, b, z`
- Spelling: `mum, zap, vans, wins, wet, fox, zip, jug, vet`
