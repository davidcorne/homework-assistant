(function () {
  "use strict";

  var STORAGE_KEY = "homework-assistant.v1";

  var DEFAULT_DATA = {
    name: "Weeks 7&8",
    spelling: {
      words: ["mum", "zap", "vans", "wins", "wet", "fox", "zip", "jug", "vet"]
    },
    phonics: {
      sounds: ["v", "w", "x", "b", "z"]
    }
  };

  var els = {};
  var data = null;

  // ---- Storage ----------------------------------------------------------

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

  function load() {
    var stored = null;
    try {
      stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    } catch (e) {
      stored = null;
    }
    return normalize(stored);
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      setMessage("Could not save on this device (storage blocked).", true);
    }
  }

  // ---- Screen routing ---------------------------------------------------

  function showScreen(id) {
    var screens = document.querySelectorAll(".screen");
    for (var i = 0; i < screens.length; i++) {
      screens[i].classList.toggle("is-active", screens[i].id === id);
    }
  }

  function updateHome() {
    els.homeSetName.textContent = data.name;
    els.homeSpellingMeta.textContent = countText(data.spelling.words, "word");
    els.homePhonicsMeta.textContent = countText(data.phonics.sounds, "sound");
  }

  function countText(items, label) {
    if (!items.length) return "empty - tap to add";
    return items.length + " " + label + "s";
  }

  // ---- Cards ------------------------------------------------------------

  var deck = { mode: null, items: [], index: 0 };

  function openDeck(mode) {
    var list = mode === "spelling" ? data.spelling.words : data.phonics.sounds;
    if (!list.length) {
      openManage();
      setMessage("Add some " + (mode === "spelling" ? "spelling words" : "phonics sounds") + " first.", true);
      return;
    }
    deck.mode = mode;
    deck.items = list.slice();
    shuffleArray(deck.items);
    deck.index = 0;
    els.cardsName.textContent = data.name;
    showScreen("screen-cards");
    renderCard();
  }

  function shuffleArray(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
  }

  function renderCard() {
    var total = deck.items.length;
    els.cardWord.textContent = deck.items[deck.index];
    els.cardsProgress.textContent = (deck.index + 1) + " / " + total;
    els.cardsPrev.disabled = deck.index === 0;
    els.cardsNext.disabled = deck.index === total - 1;
    els.cardsHint.textContent = deck.index === total - 1 ? "Last one" : "Say it out loud";
    fitCard();
  }

  function fitCard() {
    var card = els.paperCard;
    var word = els.cardWord;
    var maxW = card.clientWidth - 48;
    if (maxW <= 0) return;

    word.style.fontSize = "";
    var size = card.clientHeight - 48;
    if (deck.mode === "phonics") size = Math.min(size, 150);
    word.style.fontSize = size + "px";

    var guard = 0;
    while (word.scrollWidth > maxW && size > 14 && guard < 300) {
      size -= 2;
      word.style.fontSize = size + "px";
      guard++;
    }
  }

  function nextCard() {
    if (deck.index < deck.items.length - 1) {
      deck.index++;
      renderCard();
    }
  }

  function prevCard() {
    if (deck.index > 0) {
      deck.index--;
      renderCard();
    }
  }

  // ---- Manage -----------------------------------------------------------

  function openManage() {
    els.setName.value = data.name;
    els.spellingInput.value = data.spelling.words.join("\n");
    els.phonicsInput.value = data.phonics.sounds.join("\n");
    showScreen("screen-manage");
  }

  function parseList(text) {
    var seen = {};
    return text.split(/\r?\n|,/).map(function (s) {
      return s.trim();
    }).filter(function (s) {
      if (!s) return false;
      var key = s.toLowerCase();
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  function saveManage() {
    var words = parseList(els.spellingInput.value);
    var sounds = parseList(els.phonicsInput.value);

    if (!words.length && !sounds.length) {
      setMessage("Add at least one word or sound before saving.", true);
      return;
    }

    data.name = els.setName.value.trim() || "Untitled set";
    data.spelling.words = words;
    data.phonics.sounds = sounds;

    persist();
    updateHome();
    setMessage("Saved. " + words.length + " words, " + sounds.length + " sounds.", false);
  }

  function exportBackup() {
    var payload = {
      name: data.name,
      spelling: data.spelling,
      phonics: data.phonics,
      exported: new Date().toISOString()
    };
    var blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    var stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = "homework-backup-" + stamp + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setMessage("Backup downloaded.", false);
  }

  function importBackup(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch (e) {
        setMessage("That file is not valid backup JSON.", true);
        return;
      }
      data = normalize(parsed);
      persist();
      openManage();
      updateHome();
      setMessage("Backup imported.", false);
    };
    reader.onerror = function () {
      setMessage("Could not read that file.", true);
    };
    reader.readAsText(file);
  }

  function setMessage(text, isError) {
    els.manageMsg.textContent = text;
    els.manageMsg.classList.toggle("is-error", !!isError);
  }

  // ---- Init -------------------------------------------------------------

  function cacheEls() {
    els.homeSetName = document.getElementById("home-set-name");
    els.homeSpellingMeta = document.getElementById("home-spelling-meta");
    els.homePhonicsMeta = document.getElementById("home-phonics-meta");
    els.goManage = document.getElementById("go-manage");

    els.cardsBack = document.getElementById("cards-back");
    els.cardsName = document.getElementById("cards-name");
    els.cardsProgress = document.getElementById("cards-progress");
    els.paperCard = document.getElementById("paper-card");
    els.cardWord = document.getElementById("card-word");
    els.cardsHint = document.getElementById("cards-hint");
    els.cardsPrev = document.getElementById("cards-prev");
    els.cardsNext = document.getElementById("cards-next");

    els.manageBack = document.getElementById("manage-back");
    els.setName = document.getElementById("set-name");
    els.spellingInput = document.getElementById("spelling-input");
    els.phonicsInput = document.getElementById("phonics-input");
    els.manageMsg = document.getElementById("manage-msg");
    els.manageSave = document.getElementById("manage-save");
    els.manageExport = document.getElementById("manage-export");
    els.manageImport = document.getElementById("manage-import");
    els.importFile = document.getElementById("import-file");
  }

  function bindEvents() {
    var modeBtns = document.querySelectorAll(".mode-btn");
    for (var i = 0; i < modeBtns.length; i++) {
      modeBtns[i].addEventListener("click", function () {
        openDeck(this.getAttribute("data-mode"));
      });
    }

    els.goManage.addEventListener("click", function () { setMessage("", false); openManage(); });
    els.cardsBack.addEventListener("click", function () { showScreen("screen-home"); });
    els.manageBack.addEventListener("click", function () { showScreen("screen-home"); });

    els.paperCard.addEventListener("click", nextCard);
    els.cardsNext.addEventListener("click", nextCard);
    els.cardsPrev.addEventListener("click", prevCard);

    els.manageSave.addEventListener("click", saveManage);
    els.manageExport.addEventListener("click", exportBackup);
    els.manageImport.addEventListener("click", function () { els.importFile.click(); });
    els.importFile.addEventListener("change", function () {
      if (this.files && this.files[0]) importBackup(this.files[0]);
      this.value = "";
    });

    window.addEventListener("resize", function () {
      if (document.getElementById("screen-cards").classList.contains("is-active")) fitCard();
    });
    window.addEventListener("orientationchange", function () {
      setTimeout(fitCard, 250);
    });

    document.addEventListener("keydown", function (e) {
      var onCards = document.getElementById("screen-cards").classList.contains("is-active");
      if (!onCards) return;
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); nextCard(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prevCard(); }
      else if (e.key === "Escape") { showScreen("screen-home"); }
    });
  }

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol !== "http:" && location.protocol !== "https:") return;
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }

  function init() {
    cacheEls();
    data = load();
    bindEvents();
    updateHome();
    showScreen("screen-home");
    registerServiceWorker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
