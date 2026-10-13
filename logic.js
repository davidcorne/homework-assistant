(function (root, factory) {
  var api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.HomeworkLogic = api;
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var DEFAULT_DATA = {
    name: "Weeks 7&8",
    spelling: {
      words: ["mum", "zap", "vans", "wins", "wet", "fox", "zip", "jug", "vet"]
    },
    phonics: {
      sounds: ["v", "w", "x", "b", "z"]
    }
  };

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

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
    return out;
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

  function screenUrl(base, name) {
    return base + (name === "home" ? "" : "#" + name);
  }

  function screenFromHash(hash) {
    var h = String(hash || "").replace("#", "");
    return h === "cards" || h === "manage" ? h : "home";
  }

  return {
    DEFAULT_DATA: DEFAULT_DATA,
    clone: clone,
    normalize: normalize,
    parseList: parseList,
    shuffleArray: shuffleArray,
    countText: countText,
    screenUrl: screenUrl,
    screenFromHash: screenFromHash
  };
});
