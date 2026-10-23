(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.HomeworkLogic = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var BATCH_SIZE = 10;

  var DEFAULT_TRICKY_WORDS = [
    "a", "after", "again", "any", "are", "ask", "bath", "be", "beautiful",
    "because", "behind", "both", "break", "busy", "by", "child", "children",
    "Christmas", "class", "climb", "clothes", "cold", "come", "could", "do",
    "door", "even", "every", "everybody", "eye", "fast", "father", "find",
    "floor", "friend", "full", "go", "gold", "grass", "great", "half", "has",
    "he", "here", "his", "sugar", "sure", "the", "there", "they", "to",
    "today", "told", "was", "water", "we", "were", "where", "who", "whole",
    "wild", "would", "you", "your"
  ];

  var DEFAULT_DATA = {
    name: "Weeks 7&8",
    spelling: {
      words: ["mum", "zap", "vans", "wins", "wet", "fox", "zip", "jug", "vet"]
    },
    phonics: {
      sounds: ["v", "w", "x", "b", "z"]
    },
    tricky: {
      words: DEFAULT_TRICKY_WORDS
    }
  };

  var DEFAULT_NUMBERS = ["1", "2", "3", "4", "5"];

  var PROFILE_IDS = ["tyler", "jackson"];

  var DEFAULT_JACKSON = {
    name: "Numbers 1-5",
    numbers: { values: DEFAULT_NUMBERS.slice() }
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Normalises one Tyler-style profile (or the old flat, single-profile data).
  function normalize(raw) {
    var out = clone(DEFAULT_DATA);
    if (!raw || typeof raw !== "object") return out;

    if (typeof raw.name === "string") {
      out.name = raw.name;
    } else if (raw.spelling && typeof raw.spelling.name === "string") {
      out.name = raw.spelling.name;
    }

    if (raw.spelling && typeof raw.spelling === "object") {
      if (Array.isArray(raw.spelling.words)) {
        out.spelling.words = raw.spelling.words.filter(function (w) { return typeof w === "string"; });
      }
    }
    if (raw.phonics && typeof raw.phonics === "object") {
      if (Array.isArray(raw.phonics.sounds)) {
        out.phonics.sounds = raw.phonics.sounds.filter(function (s) { return typeof s === "string"; });
      }
    }
    if (raw.tricky && typeof raw.tricky === "object") {
      if (raw.tricky.empty === true) {
        // The user deliberately cleared the list - keep it empty.
        out.tricky = { words: [], empty: true };
      } else if (Array.isArray(raw.tricky.words)) {
        var trickyWords = raw.tricky.words.filter(function (w) { return typeof w === "string"; });
        // An empty list without the marker means the list was never set up,
        // so fall back to the seeded words rather than leaving it blank.
        out.tricky.words = trickyWords.length ? trickyWords : clone(DEFAULT_TRICKY_WORDS);
      }
    }
    if (!out.tricky || !Array.isArray(out.tricky.words)) {
      out.tricky = { words: clone(DEFAULT_TRICKY_WORDS) };
    }
    return out;
  }

  function normalizeJackson(raw) {
    var out = clone(DEFAULT_JACKSON);
    if (!raw || typeof raw !== "object") return out;

    if (typeof raw.name === "string") {
      out.name = raw.name;
    }

    if (raw.numbers && typeof raw.numbers === "object") {
      if (raw.numbers.empty === true) {
        out.numbers = { values: [], empty: true };
      } else if (Array.isArray(raw.numbers.values)) {
        var values = raw.numbers.values.filter(function (v) {
          return typeof v === "string" || typeof v === "number";
        }).map(function (v) {
          return String(v).trim();
        }).filter(function (v) {
          return !!v;
        });
        if (values.length) {
          out.numbers = { values: values };
        }
      }
    }
    return out;
  }

  // The stored shape is now per-profile. Old flat data is Tyler's profile so
  // existing devices keep their saved words after the upgrade.
  function normalizeStore(raw) {
    var isStore = raw && typeof raw === "object" && raw.profiles && typeof raw.profiles === "object";
    return {
      profiles: {
        tyler: normalize(isStore ? raw.profiles.tyler : raw),
        jackson: normalizeJackson(isStore ? raw.profiles.jackson : null)
      }
    };
  }

  function parseList(text) {
    var seen = {};
    return String(text).split(/\r?\n|,/).map(function (s) {
      return s.trim();
    }).filter(function (s) {
      if (!s) return false;
      var key = s.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function countText(items, label) {
    if (!items.length) return "empty - tap to add";
    return items.length + " " + label + "s";
  }

  // A practice session shows at most `size` cards.
  function sessionBatch(items, size) {
    var n = typeof size === "number" && size > 0 ? size : BATCH_SIZE;
    return items.slice(0, n);
  }

  function screenUrl(base, name) {
    return base + (name === "home" ? "" : "#" + name);
  }

  function screenFromHash(hash) {
    var h = String(hash || "").replace("#", "");
    return h === "cards" || h === "manage" ? h : "home";
  }

  function routeUrl(base, profileId, screen) {
    if (!profileId) return base;
    var name = screen || "home";
    return base + "#" + profileId + (name === "home" ? "" : "/" + name);
  }

  function routeFromHash(hash) {
    var h = String(hash || "").replace(/^#/, "");
    if (!h) return { profile: null, screen: "profiles" };

    var parts = h.split("/");
    // Old bookmarks and links still land on Tyler's screens.
    if (parts[0] === "cards" || parts[0] === "manage") {
      return { profile: "tyler", screen: parts[0] };
    }
    if (PROFILE_IDS.indexOf(parts[0]) === -1) {
      return { profile: null, screen: "profiles" };
    }

    var screen = parts[1] || "home";
    if (screen !== "home" && screen !== "cards" && screen !== "manage") {
      screen = "home";
    }
    return { profile: parts[0], screen: screen };
  }

  return {
    BATCH_SIZE: BATCH_SIZE,
    DEFAULT_TRICKY_WORDS: DEFAULT_TRICKY_WORDS,
    DEFAULT_DATA: DEFAULT_DATA,
    DEFAULT_NUMBERS: DEFAULT_NUMBERS,
    DEFAULT_JACKSON: DEFAULT_JACKSON,
    PROFILE_IDS: PROFILE_IDS,
    clone: clone,
    normalize: normalize,
    normalizeJackson: normalizeJackson,
    normalizeStore: normalizeStore,
    parseList: parseList,
    shuffleArray: shuffleArray,
    countText: countText,
    sessionBatch: sessionBatch,
    screenUrl: screenUrl,
    screenFromHash: screenFromHash,
    routeUrl: routeUrl,
    routeFromHash: routeFromHash
  };
});
