(function () {
  "use strict";

  var STORAGE_KEY = "homework-assistant.v2";
  var LEGACY_STORAGE_KEY = "homework-assistant.v1";

  var Logic = (typeof window !== "undefined" && window.HomeworkLogic) || {};

  var normalizeStore = Logic.normalizeStore;
  var parseList = Logic.parseList;
  var shuffleArray = Logic.shuffleArray;
  var countText = Logic.countText;
  var sessionBatch = Logic.sessionBatch;
  var routeUrl = Logic.routeUrl;
  var routeFromHash = Logic.routeFromHash;

  var PROFILES = {
    tyler: {
      initial: "T",
      name: "Tyler",
      title: "Tyler's Homework",
      modes: ["spelling", "phonics", "tricky"]
    },
    jackson: {
      initial: "J",
      name: "Jackson",
      title: "Jackson's Homework",
      modes: ["numbers"]
    }
  };

  var els = {};
  var store = null;
  var activeProfile = null;
  var trickyPool = [];
  var doneTimer = null;

  var deck = { profile: null, mode: null, items: [], index: 0 };

  function data() {
    return store.profiles[activeProfile];
  }

  // ---- Storage ----------------------------------------------------------

  function readStored(key) {
    try {
      return JSON.parse(localStorage.getItem(key));
    } catch (e) {
      return null;
    }
  }

  function load() {
    var stored = readStored(STORAGE_KEY);
    if (!stored) stored = readStored(LEGACY_STORAGE_KEY);
    return normalizeStore(stored);
  }

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
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

  function routeBase() {
    return location.pathname + location.search;
  }

  function routeFor(name) {
    return routeUrl(routeBase(), activeProfile, name);
  }

  function pushScreen(name) {
    history.pushState({ profile: activeProfile, screen: name }, "", routeFor(name));
  }

  function pushProfiles() {
    activeProfile = null;
    deck = { profile: null, mode: null, items: [], index: 0 };
    history.pushState({ profile: null, screen: "profiles" }, "", routeBase());
    showScreen("screen-profiles");
  }

  function goBack() {
    if (history.state && history.state.profile && history.state.screen !== "profiles") {
      history.back();
    } else if (activeProfile) {
      showScreen("screen-home");
    } else {
      showScreen("screen-profiles");
    }
  }

  function handlePopState(event) {
    var route = event.state && event.state.profile !== undefined
      ? event.state
      : routeFromHash(location.hash);

    if (!route || !route.profile || !PROFILES[route.profile] || route.screen === "profiles") {
      activeProfile = null;
      showScreen("screen-profiles");
      return;
    }

    activeProfile = route.profile;
    updateHome();

    if (route.screen === "cards" && deck.profile === activeProfile && deck.items.length) {
      showScreen("screen-cards");
      renderCard();
    } else if (route.screen === "manage") {
      populateManage();
      showScreen("screen-manage");
    } else {
      showScreen("screen-home");
    }
  }

  function openProfile(id) {
    if (!PROFILES[id]) return;

    if (activeProfile !== id) {
      trickyPool = [];
      deck = { profile: null, mode: null, items: [], index: 0 };
    }
    activeProfile = id;
    updateHome();
    showScreen("screen-home");
    pushScreen("home");
  }

  function updateHome() {
    var profile = PROFILES[activeProfile];
    var d = data();

    els.homeTitle.textContent = profile.title;
    els.homeProfile.textContent = profile.initial;
    els.homeProfile.setAttribute("aria-label", "Switch profile. Currently " + profile.name);
    els.homeSetName.textContent = d.name;
    els.goManage.textContent = activeProfile === "jackson" ? "Manage numbers" : "Manage words";

    els.homeSpellingMeta.textContent = d.spelling ? countText(d.spelling.words, "word") : "";
    els.homePhonicsMeta.textContent = d.phonics ? countText(d.phonics.sounds, "sound") : "";
    els.homeTrickyMeta.textContent = d.tricky ? countText(d.tricky.words, "word") : "";
    els.homeNumbersMeta.textContent = d.numbers ? countText(d.numbers.values, "number") : "";

    for (var i = 0; i < els.modeBtns.length; i++) {
      var btn = els.modeBtns[i];
      btn.hidden = profile.modes.indexOf(btn.getAttribute("data-mode")) === -1;
    }
  }

  // ---- Cards ------------------------------------------------------------

  function listForMode(mode) {
    var d = data();
    if (mode === "spelling") return d.spelling.words;
    if (mode === "phonics") return d.phonics.sounds;
    if (mode === "tricky") return d.tricky.words;
    if (mode === "numbers") return d.numbers.values;
    return [];
  }

  function labelForMode(mode) {
    if (mode === "spelling") return "spelling words";
    if (mode === "phonics") return "phonics sounds";
    if (mode === "tricky") return "tricky words";
    if (mode === "numbers") return "numbers";
    return "words";
  }

  // Tricky words are practised in batches: the pool is shuffled once, then
  // handed out ten at a time so every word is covered before any repeats.
  function nextTrickyBatch() {
    if (!trickyPool.length) {
      trickyPool = shuffleArray(data().tricky.words.slice());
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
    deck.profile = activeProfile;
    deck.mode = mode;
    deck.items = mode === "tricky" ? nextTrickyBatch() : list.slice();
    // Numbers stay in teaching order; every other deck is shuffled.
    if (mode !== "numbers") shuffleArray(deck.items);
    deck.index = 0;
    els.cardsName.textContent = data().name;
    showScreen("screen-cards");
    renderCard();
    pushScreen("cards");
  }

  function renderCard() {
    var total = deck.items.length;
    var isLast = deck.index === total - 1;
    var isTricky = deck.mode === "tricky";
    var isNumbers = deck.mode === "numbers";
    els.cardWord.textContent = deck.items[deck.index];
    els.cardsProgress.textContent = (deck.index + 1) + " / " + total;
    els.cardsPrev.disabled = deck.index === 0;
    els.cardsNext.disabled = isLast && !isTricky;
    els.cardsNext.textContent = isLast && isTricky ? "✓" : "→";
    els.cardsNext.setAttribute("aria-label", isLast && isTricky ? "Finish" : "Next card");
    if (isLast) {
      els.cardsHint.textContent = isTricky ? "Last one - tap to finish" : "Last one";
    } else {
      els.cardsHint.textContent = isNumbers ? "Say the number out loud" : "Say it out loud";
    }
    fitCard();
  }

  function fitCard() {
    var card = els.paperCard;
    var word = els.cardWord;
    var maxW = card.clientWidth - 48;
    if (maxW <= 0) return;

    word.style.fontSize = "";
    var size = card.clientHeight - 48;
    if (deck.mode === "phonics" || deck.mode === "tricky" || deck.mode === "numbers") {
      size = Math.min(size, 150);
    }
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
    var d = data();
    var profile = PROFILES[activeProfile];

    els.manageTitle.textContent = activeProfile === "jackson" ? "Manage numbers" : "Manage words";
    els.fieldSetName.hidden = false;
    els.fieldSpelling.hidden = profile.modes.indexOf("spelling") === -1;
    els.fieldPhonics.hidden = profile.modes.indexOf("phonics") === -1;
    els.fieldTricky.hidden = profile.modes.indexOf("tricky") === -1;
    els.fieldNumbers.hidden = profile.modes.indexOf("numbers") === -1;

    els.setName.value = d.name;
    els.setName.placeholder = activeProfile === "jackson" ? "Numbers 1-5" : "e.g. Weeks 7&8";
    els.spellingInput.value = (d.spelling ? d.spelling.words || [] : []).join("\n");
    els.phonicsInput.value = (d.phonics ? d.phonics.sounds || [] : []).join("\n");
    els.trickyInput.value = (d.tricky ? d.tricky.words || [] : []).join("\n");
    els.numbersInput.value = (d.numbers ? d.numbers.values || [] : []).join("\n");
  }

  function openManage() {
    populateManage();
    showScreen("screen-manage");
    pushScreen("manage");
  }

  function saveManage() {
    var d = data();

    if (activeProfile === "jackson") {
      var numbers = parseList(els.numbersInput.value);
      if (!numbers.length) {
        setMessage("Add at least one number before saving.", true);
        return;
      }

      d.name = els.setName.value.trim() || "Numbers 1-5";
      d.numbers = { values: numbers };

      persist();
      updateHome();
      setMessage("Saved. " + numbers.length + " numbers.", false);
      return;
    }

    var words = parseList(els.spellingInput.value);
    var sounds = parseList(els.phonicsInput.value);
    var tricky = parseList(els.trickyInput.value);

    if (!words.length && !sounds.length && !tricky.length) {
      setMessage("Add at least one word or sound before saving.", true);
      return;
    }

    d.name = els.setName.value.trim() || "Untitled set";
    d.spelling.words = words;
    d.phonics.sounds = sounds;
    d.tricky = { words: tricky, empty: tricky.length === 0 };
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
    els.homeTitle = document.getElementById("home-title");
    els.homeProfile = document.getElementById("home-profile");
    els.homeSetName = document.getElementById("home-set-name");
    els.homeSpellingMeta = document.getElementById("home-spelling-meta");
    els.homePhonicsMeta = document.getElementById("home-phonics-meta");
    els.homeTrickyMeta = document.getElementById("home-tricky-meta");
    els.homeNumbersMeta = document.getElementById("home-numbers-meta");
    els.modeBtns = document.querySelectorAll(".mode-btn");
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
    els.manageTitle = document.getElementById("manage-title");
    els.fieldSetName = document.getElementById("field-set-name");
    els.fieldSpelling = document.getElementById("field-spelling");
    els.fieldPhonics = document.getElementById("field-phonics");
    els.fieldTricky = document.getElementById("field-tricky");
    els.fieldNumbers = document.getElementById("field-numbers");
    els.setName = document.getElementById("set-name");
    els.spellingInput = document.getElementById("spelling-input");
    els.phonicsInput = document.getElementById("phonics-input");
    els.trickyInput = document.getElementById("tricky-input");
    els.numbersInput = document.getElementById("numbers-input");
    els.manageMsg = document.getElementById("manage-msg");
    els.manageSave = document.getElementById("manage-save");
  }

  function bindEvents() {
    var profileBtns = document.querySelectorAll(".profile-btn");
    for (var p = 0; p < profileBtns.length; p++) {
      profileBtns[p].addEventListener("click", function () {
        openProfile(this.getAttribute("data-profile"));
      });
    }

    for (var i = 0; i < els.modeBtns.length; i++) {
      els.modeBtns[i].addEventListener("click", function () {
        openDeck(this.getAttribute("data-mode"));
      });
    }

    els.homeProfile.addEventListener("click", pushProfiles);
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
    store = load();
    bindEvents();
    activeProfile = null;
    showScreen("screen-profiles");
    history.replaceState({ profile: null, screen: "profiles" }, "", routeBase());
    registerServiceWorker();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
