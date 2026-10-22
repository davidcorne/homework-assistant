(function () {
  "use strict";

  var STORAGE_KEY = "homework-assistant.v1";

  var Logic = (typeof window !== "undefined" && window.HomeworkLogic) || {};

  var normalize = Logic.normalize;
  var parseList = Logic.parseList;
  var shuffleArray = Logic.shuffleArray;
  var countText = Logic.countText;
  var sessionBatch = Logic.sessionBatch;

  var els = {};
  var data = null;
  var trickyPool = [];
  var doneTimer = null;

  // ---- Storage ----------------------------------------------------------

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

  function screenUrl(name) {
    return Logic.screenUrl(location.pathname + location.search, name);
  }

  function pushScreen(name) {
    history.pushState({ screen: name }, "", screenUrl(name));
  }

  function screenFromHash() {
    return Logic.screenFromHash(location.hash);
  }

  function goBack() {
    if (history.state && history.state.screen && history.state.screen !== "home") {
      history.back();
    } else {
      showScreen("screen-home");
    }
  }

  function handlePopState(event) {
    var screen = (event.state && event.state.screen) || screenFromHash();
    if (screen === "cards" && deck.items.length) {
      showScreen("screen-cards");
    } else if (screen === "manage") {
      populateManage();
      showScreen("screen-manage");
    } else {
      showScreen("screen-home");
    }
  }

  function updateHome() {
    els.homeSetName.textContent = data.name;
    els.homeSpellingMeta.textContent = countText(data.spelling.words, "word");
    els.homePhonicsMeta.textContent = countText(data.phonics.sounds, "sound");
    els.homeTrickyMeta.textContent = countText(data.tricky.words, "word");
  }

  // ---- Cards ------------------------------------------------------------

  var deck = { mode: null, items: [], index: 0 };

  function listForMode(mode) {
    if (mode === "spelling") return data.spelling.words;
    if (mode === "phonics") return data.phonics.sounds;
    if (mode === "tricky") return data.tricky.words;
    return [];
  }

  function labelForMode(mode) {
    if (mode === "spelling") return "spelling words";
    if (mode === "phonics") return "phonics sounds";
    if (mode === "tricky") return "tricky words";
    return "words";
  }

  // Tricky words are practised in batches: the pool is shuffled once, then
  // handed out ten at a time so every word is covered before any repeats.
  function nextTrickyBatch() {
    if (!trickyPool.length) {
      trickyPool = shuffleArray(data.tricky.words.slice());
    }
    var batch = sessionBatch(trickyPool, Logic.BATCH_SIZE);
    trickyPool = trickyPool.slice(batch.length);
    return batch;
  }

  function openDeck(mode) {
    var list = listForMode(mode);
    if (!list.length) {
      openManage();
      setMessage("Add some " + labelForMode(mode) + " first.", true);
      return;
    }
    hideDone();
    deck.mode = mode;
    deck.items = mode === "tricky" ? nextTrickyBatch() : list.slice();
    shuffleArray(deck.items);
    deck.index = 0;
    els.cardsName.textContent = data.name;
    showScreen("screen-cards");
    renderCard();
    pushScreen("cards");
  }

  function renderCard() {
    var total = deck.items.length;
    var isLast = deck.index === total - 1;
    var isTricky = deck.mode === "tricky";
    els.cardWord.textContent = deck.items[deck.index];
    els.cardsProgress.textContent = (deck.index + 1) + " / " + total;
    els.cardsPrev.disabled = deck.index === 0;
    els.cardsNext.disabled = isLast && !isTricky;
    els.cardsNext.textContent = isLast && isTricky ? "✓" : "→";
    els.cardsNext.setAttribute("aria-label", isLast && isTricky ? "Finish" : "Next card");
    els.cardsHint.textContent = isLast ? (isTricky ? "Last one - tap to finish" : "Last one") : "Say it out loud";
    fitCard();
  }

  function fitCard() {
    var card = els.paperCard;
    var word = els.cardWord;
    var maxW = card.clientWidth - 48;
    if (maxW <= 0) return;

    word.style.fontSize = "";
    var size = card.clientHeight - 48;
    if (deck.mode === "phonics" || deck.mode === "tricky") size = Math.min(size, 150);
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
      return;
    }
    if (deck.mode === "tricky") finishBatch();
  }

  function prevCard() {
    if (deck.index > 0) {
      deck.index--;
      renderCard();
    }
  }

  // ---- Finished ---------------------------------------------------------

  function finishBatch() {
    var count = deck.items.length;
    els.cardDoneSub.textContent = count + " tricky " + (count === 1 ? "word" : "words") + " practised.";
    els.cardDone.classList.add("is-active");
    if (doneTimer) clearTimeout(doneTimer);
    doneTimer = setTimeout(goHome, 2500);
  }

  function hideDone() {
    if (doneTimer) {
      clearTimeout(doneTimer);
      doneTimer = null;
    }
    els.cardDone.classList.remove("is-active");
  }

  function goHome() {
    hideDone();
    goBack();
  }

  // ---- Manage -----------------------------------------------------------

  function populateManage() {
    els.setName.value = data.name;
    els.spellingInput.value = data.spelling.words.join("\n");
    els.phonicsInput.value = data.phonics.sounds.join("\n");
    els.trickyInput.value = data.tricky.words.join("\n");
  }

  function openManage() {
    populateManage();
    showScreen("screen-manage");
    pushScreen("manage");
  }

  function saveManage() {
    var words = parseList(els.spellingInput.value);
    var sounds = parseList(els.phonicsInput.value);
    var tricky = parseList(els.trickyInput.value);

    if (!words.length && !sounds.length && !tricky.length) {
      setMessage("Add at least one word or sound before saving.", true);
      return;
    }

    data.name = els.setName.value.trim() || "Untitled set";
    data.spelling.words = words;
    data.phonics.sounds = sounds;
    data.tricky.words = tricky;
    trickyPool = [];

    persist();
    updateHome();
    setMessage("Saved. " + words.length + " words, " + sounds.length + " sounds, " + tricky.length + " tricky words.", false);
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
    els.homeTrickyMeta = document.getElementById("home-tricky-meta");
    els.goManage = document.getElementById("go-manage");

    els.cardsBack = document.getElementById("cards-back");
    els.cardsName = document.getElementById("cards-name");
    els.cardsProgress = document.getElementById("cards-progress");
    els.paperCard = document.getElementById("paper-card");
    els.cardWord = document.getElementById("card-word");
    els.cardsHint = document.getElementById("cards-hint");
    els.cardsPrev = document.getElementById("cards-prev");
    els.cardsNext = document.getElementById("cards-next");
    els.cardDone = document.getElementById("card-done");
    els.cardDoneSub = document.getElementById("card-done-sub");
    els.cardDoneHome = document.getElementById("card-done-home");

    els.manageBack = document.getElementById("manage-back");
    els.setName = document.getElementById("set-name");
    els.spellingInput = document.getElementById("spelling-input");
    els.phonicsInput = document.getElementById("phonics-input");
    els.trickyInput = document.getElementById("tricky-input");
    els.manageMsg = document.getElementById("manage-msg");
    els.manageSave = document.getElementById("manage-save");
  }

  function bindEvents() {
    var modeBtns = document.querySelectorAll(".mode-btn");
    for (var i = 0; i < modeBtns.length; i++) {
      modeBtns[i].addEventListener("click", function () {
        openDeck(this.getAttribute("data-mode"));
      });
    }

    els.goManage.addEventListener("click", function () { setMessage("", false); openManage(); });
    els.cardsBack.addEventListener("click", goBack);
    els.manageBack.addEventListener("click", goBack);

    els.paperCard.addEventListener("click", nextCard);
    els.cardsNext.addEventListener("click", nextCard);
    els.cardsPrev.addEventListener("click", prevCard);
    els.cardDoneHome.addEventListener("click", goHome);

    els.manageSave.addEventListener("click", saveManage);

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
      else if (e.key === "Escape") { goBack(); }
    });

    window.addEventListener("popstate", handlePopState);
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
    history.replaceState({ screen: "home" }, "", screenUrl("home"));
    registerServiceWorker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
