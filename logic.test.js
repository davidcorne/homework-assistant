"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  BATCH_SIZE,
  DEFAULT_TRICKY_WORDS,
  DEFAULT_DATA,
  clone,
  normalize,
  parseList,
  shuffleArray,
  countText,
  sessionBatch,
  screenUrl,
  screenFromHash
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
