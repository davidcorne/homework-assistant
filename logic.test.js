"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BATCH_SIZE,
  DEFAULT_TRICKY_WORDS,
  DEFAULT_DATA,
  DEFAULT_NUMBERS,
  DEFAULT_JACKSON,
  PROFILE_IDS,
  clone,
  normalize,
  normalizeJackson,
  normalizeStore,
  parseList,
  shuffleArray,
  countText,
  sessionBatch,
  screenUrl,
  screenFromHash,
  routeUrl,
  routeFromHash
} = require("./logic.js");

test("parseList splits on lines and commas, trims, and drops blanks", () => {
  assert.deepEqual(parseList("sun, hat\n big , sun\n\n"), ["sun", "hat", "big"]);
});

test("parseList de-dupes case-insensitively, keeping first casing", () => {
  assert.deepEqual(parseList("Sun\nsun\nSUN"), ["Sun"]);
});

test("parseList handles an empty string", () => {
  assert.deepEqual(parseList(""), []);
});

test("normalize fills defaults for empty/invalid input", () => {
  assert.deepEqual(normalize(null), clone(DEFAULT_DATA));
  assert.deepEqual(normalize("nope"), clone(DEFAULT_DATA));
  assert.deepEqual(normalize(undefined), clone(DEFAULT_DATA));
});

test("normalize migrates a legacy per-list name to the shared name", () => {
  const d = normalize({ spelling: { name: "Weeks 7&8", words: ["a", "b"] } });
  assert.equal(d.name, "Weeks 7&8");
  assert.deepEqual(d.spelling.words, ["a", "b"]);
});

test("normalize prefers an explicit shared name", () => {
  const d = normalize({ name: "Current", spelling: { name: "Old" } });
  assert.equal(d.name, "Current");
});

test("normalize keeps valid arrays and filters non-strings", () => {
  const d = normalize({
    name: "Set",
    spelling: { words: ["cat", 5, null, "dog"] },
    phonics: { sounds: ["ai", {}, "ee"] }
  });
  assert.deepEqual(d.spelling.words, ["cat", "dog"]);
  assert.deepEqual(d.phonics.sounds, ["ai", "ee"]);
});

test("normalize falls back to default lists when arrays are missing", () => {
  const d = normalize({ name: "Set" });
  assert.deepEqual(d.spelling.words, DEFAULT_DATA.spelling.words);
  assert.deepEqual(d.phonics.sounds, DEFAULT_DATA.phonics.sounds);
  assert.deepEqual(d.tricky.words, DEFAULT_DATA.tricky.words);
});

test("normalize keeps tricky words and filters non-strings", () => {
  const d = normalize({ tricky: { words: ["because", 7, null, "beautiful"] } });
  assert.deepEqual(d.tricky.words, ["because", "beautiful"]);
});

test("normalize reseeds tricky words when the stored list is empty", () => {
  const d = normalize({ name: "Set", tricky: { words: [] } });
  assert.deepEqual(d.tricky.words, DEFAULT_TRICKY_WORDS);
});

test("normalize keeps an empty tricky list that was deliberately cleared", () => {
  const d = normalize({ name: "Set", tricky: { words: [], empty: true } });
  assert.deepEqual(d.tricky.words, []);
});

test("normalize seeds tricky words when the stored shape is wrong", () => {
  const d = normalize({ name: "Set", tricky: "nope" });
  assert.deepEqual(d.tricky.words, DEFAULT_TRICKY_WORDS);
});

test("default tricky words are seeded as a plain word list", () => {
  assert.ok(DEFAULT_TRICKY_WORDS.length > 0);
  assert.ok(DEFAULT_TRICKY_WORDS.every((w) => typeof w === "string" && w.length > 0));
  assert.equal(new Set(DEFAULT_TRICKY_WORDS).size, DEFAULT_TRICKY_WORDS.length);
});

test("sessionBatch caps a session at the batch size", () => {
  const items = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l"];
  assert.equal(BATCH_SIZE, 10);
  assert.equal(sessionBatch(items).length, 10);
  assert.deepEqual(sessionBatch(items), items.slice(0, 10));
});

test("sessionBatch returns fewer items when the list is short", () => {
  assert.deepEqual(sessionBatch(["a", "b"], 10), ["a", "b"]);
  assert.deepEqual(sessionBatch([], 10), []);
});

test("sessionBatch does not mutate the source list", () => {
  const items = ["a", "b", "c"];
  sessionBatch(items, 2);
  assert.deepEqual(items, ["a", "b", "c"]);
});

test("shuffleArray preserves the same members", () => {
  const arr = ["a", "b", "c", "d", "e"];
  shuffleArray(arr);
  assert.deepEqual([...arr].sort(), ["a", "b", "c", "d", "e"]);
});

test("shuffleArray handles empty and single-item arrays", () => {
  assert.deepEqual(shuffleArray([]), []);
  assert.deepEqual(shuffleArray(["only"]), ["only"]);
});

test("countText pluralises and reports empty sets", () => {
  assert.equal(countText([], "word"), "empty - tap to add");
  assert.equal(countText(["a"], "word"), "1 words");
  assert.equal(countText(["a", "b", "c"], "sound"), "3 sounds");
});

test("screenUrl adds a hash except for home", () => {
  assert.equal(screenUrl("/app/", "home"), "/app/");
  assert.equal(screenUrl("/app/", "cards"), "/app/#cards");
  assert.equal(screenUrl("/app/?x=1", "manage"), "/app/?x=1#manage");
});

test("screenFromHash maps hashes to known screens, defaulting to home", () => {
  assert.equal(screenFromHash("#cards"), "cards");
  assert.equal(screenFromHash("#manage"), "manage");
  assert.equal(screenFromHash(""), "home");
  assert.equal(screenFromHash("#unknown"), "home");
  assert.equal(screenFromHash(undefined), "home");
});

test("profile ids are Tyler and Jackson", () => {
  assert.deepEqual(PROFILE_IDS, ["tyler", "jackson"]);
});

test("Jackson defaults to the numbers 1 to 5", () => {
  assert.deepEqual(DEFAULT_JACKSON.numbers.values, ["1", "2", "3", "4", "5"]);
  assert.deepEqual(DEFAULT_NUMBERS, ["1", "2", "3", "4", "5"]);
  assert.deepEqual(normalizeJackson(null), clone(DEFAULT_JACKSON));
});

test("normalizeStore gives both profiles defaults for empty input", () => {
  const store = normalizeStore(null);
  assert.deepEqual(store.profiles.tyler, clone(DEFAULT_DATA));
  assert.deepEqual(store.profiles.jackson, clone(DEFAULT_JACKSON));
});

test("normalizeStore migrates old flat data into Tyler's profile", () => {
  const store = normalizeStore({
    name: "Weeks 9&10",
    spelling: { words: ["cat", "dog"] },
    tricky: { words: ["the", "because"] }
  });
  assert.equal(store.profiles.tyler.name, "Weeks 9&10");
  assert.deepEqual(store.profiles.tyler.spelling.words, ["cat", "dog"]);
  assert.deepEqual(store.profiles.tyler.tricky.words, ["the", "because"]);
  assert.deepEqual(store.profiles.jackson, clone(DEFAULT_JACKSON));
});

test("normalizeStore keeps each profile's own data", () => {
  const store = normalizeStore({
    profiles: {
      tyler: { name: "Tyler set", spelling: { words: ["sun"] } },
      jackson: { name: "Numbers 1-3", numbers: { values: ["1", "2", "3"] } }
    }
  });
  assert.equal(store.profiles.tyler.name, "Tyler set");
  assert.deepEqual(store.profiles.tyler.spelling.words, ["sun"]);
  assert.equal(store.profiles.jackson.name, "Numbers 1-3");
  assert.deepEqual(store.profiles.jackson.numbers.values, ["1", "2", "3"]);
});

test("normalizeJackson filters invalid values and trims strings", () => {
  const jackson = normalizeJackson({
    name: "Numbers",
    numbers: { values: ["1", 2, null, "", " 3 "] }
  });
  assert.equal(jackson.name, "Numbers");
  assert.deepEqual(jackson.numbers.values, ["1", "2", "3"]);
});

test("normalizeJackson reseeds an empty list that was not deliberately cleared", () => {
  const jackson = normalizeJackson({ numbers: { values: [] } });
  assert.deepEqual(jackson.numbers.values, DEFAULT_NUMBERS);
});

test("normalizeJackson keeps an empty list that was deliberately cleared", () => {
  const jackson = normalizeJackson({ numbers: { values: [], empty: true } });
  assert.deepEqual(jackson.numbers, { values: [], empty: true });
});

test("routeUrl includes the profile and screen in the hash", () => {
  assert.equal(routeUrl("/app/", null, "profiles"), "/app/");
  assert.equal(routeUrl("/app/", "tyler", "home"), "/app/#tyler");
  assert.equal(routeUrl("/app/", "jackson", "cards"), "/app/#jackson/cards");
  assert.equal(routeUrl("/app/?x=1", "tyler", "manage"), "/app/?x=1#tyler/manage");
});

test("routeFromHash parses profiles, screens, and legacy links", () => {
  assert.deepEqual(routeFromHash(""), { profile: null, screen: "profiles" });
  assert.deepEqual(routeFromHash("#jackson"), { profile: "jackson", screen: "home" });
  assert.deepEqual(routeFromHash("#jackson/cards"), { profile: "jackson", screen: "cards" });
  assert.deepEqual(routeFromHash("#tyler/manage"), { profile: "tyler", screen: "manage" });
  assert.deepEqual(routeFromHash("#cards"), { profile: "tyler", screen: "cards" });
  assert.deepEqual(routeFromHash("#manage"), { profile: "tyler", screen: "manage" });
  assert.deepEqual(routeFromHash("#jackson/nope"), { profile: "jackson", screen: "home" });
  assert.deepEqual(routeFromHash("#nope"), { profile: null, screen: "profiles" });
  assert.deepEqual(routeFromHash(undefined), { profile: null, screen: "profiles" });
});
