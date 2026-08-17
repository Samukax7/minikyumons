(function () {
  "use strict";

  var SAVE_KEY = "minikyumons_save_v5_zero_rebuild";
  var BACKUP_KEY = "minikyumons_save_v5_zero_rebuild_backup";
  var LOG_KEY = "minikyumons_dev_log_v5_zero_rebuild";
  var SAVE_VERSION = 5;
  var speciesList = ["Água", "Planta", "Fogo"];
  var titleItems = ["START", "OPTIONS", "EXIT"];
  var actions = [
    { id: "feed", icon: "●", label: "Alimentar" },
    { id: "play", icon: "✦", label: "Brincar" },
    { id: "clean", icon: "≈", label: "Limpar" },
    { id: "pet", icon: "♡", label: "Carinho" },
    { id: "sleep", icon: "z", label: "Dormir" },
    { id: "new", icon: "+", label: "Novo ovo" }
  ];
  var menus = {
    feed: [{ id: "snack", icon: "·", label: "Lanche" }, { id: "meal", icon: "●", label: "Comida" }, { id: "water", icon: "≈", label: "Água" }],
    play: [{ id: "walk", icon: "→", label: "Passear" }, { id: "dance", icon: "✦", label: "Dançar" }, { id: "train", icon: "◆", label: "Treinar" }],
    sleep: [{ id: "quick", icon: "z", label: "Soneca" }, { id: "nap", icon: "Z", label: "Descanso" }, { id: "deep", icon: "✦", label: "Sono profundo" }]
  };

  var state = null;
  var titleOpen = false;
  var eggOpen = false;
  var hatchInYard = false;
  var statusOpen = false;
  var devLogOpen = false;
  var menuOpen = true;
  var submenu = null;
  var selected = 0;
  var submenuSelected = 0;
  var titleSelected = 0;
  var eggSelected = 0;
  var lastTick = new Date().getTime();
  var toastTimer = null;
  var animationTimer = null;
  var animationToken = 0;
  var hatchTimer = null;
  var idleTimer = null;
  var devLog = [];

  function byId(id) { return document.getElementById(id); }
  function clamp(value) { return Math.max(0, Math.min(100, Math.round(Number(value || 0) * 10) / 10)); }
  function nowText() {
    var date = new Date();
    var h = String(date.getHours());
    var m = String(date.getMinutes());
    if (h.length < 2) { h = "0" + h; }
    if (m.length < 2) { m = "0" + m; }
    return h + ":" + m;
  }
  function dayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate();
  }
  function escapeHtml(text) {
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  }
  function newPet(species) {
    return {
      version: SAVE_VERSION,
      name: "Kyu",
      species: species || "Água",
      started: false,
      level: 1,
      xp: 0,
      stage: "Bebê",
      expression: "neutral",
      sleeping: false,
      hunger: 78,
      energy: 74,
      happiness: 82,
      hygiene: 68,
      health: 96,
      bond: 0,
      care: 0,
      dirt: 0,
      poop: 0,
      memories: ["O ovo chegou a um lugar seguro.", "Uma nova amizade pode começar aqui."],
      personality: { carinhoso: 0, curioso: 0, brincalhao: 0 },
      routine: { lastDay: "", streak: 0, lastAction: "" },
      lastSeen: new Date().getTime(),
      totalMinutes: 0
    };
  }
  function normalizeState() {
    if (!state || typeof state !== "object") { state = newPet("Água"); }
    if (speciesList.indexOf(state.species) < 0) { state.species = "Água"; }
    if (!state.name) { state.name = "Kyu"; }
    if (!(state.memories instanceof Array)) { state.memories = []; }
    if (!state.personality || typeof state.personality !== "object") { state.personality = { carinhoso: 0, curioso: 0, brincalhao: 0 }; }
    if (!state.routine || typeof state.routine !== "object") { state.routine = { lastDay: "", streak: 0, lastAction: "" }; }
    if (typeof state.xp !== "number") { state.xp = 0; }
    if (typeof state.level !== "number" || state.level < 1) { state.level = 1; }
    if (state.level > 30) { state.level = 30; }
    if (typeof state.dirt !== "number") { state.dirt = 0; }
    if (typeof state.poop !== "number") { state.poop = 0; }
    if (typeof state.bond !== "number") { state.bond = 0; }
    if (typeof state.care !== "number") { state.care = 0; }
    if (typeof state.started !== "boolean") { state.started = false; }
    syncGrowth(false);
    state.version = SAVE_VERSION;
  }
  function load() {
    var raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { raw = null; }
    if (raw) {
      try { state = JSON.parse(raw); } catch (e2) { state = null; }
    }
    if (!state) {
      try { raw = localStorage.getItem(BACKUP_KEY); if (raw) { state = JSON.parse(raw); } } catch (e3) { state = null; }
    }
    if (!state) { state = newPet("Água"); }
    normalizeState();
    loadLog();
    applyOfflineTime();
    titleOpen = true;
    menuOpen = true;
    save();
    logEvent("Aplicação iniciada na tela de título.");
  }
  function applyOfflineTime() {
    var current = new Date().getTime();
    var hours = (current - (state.lastSeen || current)) / 3600000;
    if (hours < 0) { hours = 0; }
    hours = Math.min(hours, 12);
    if (state.started && hours > 0.02) {
      state.hunger = clamp(state.hunger - hours * 1.8);
      state.energy = clamp(state.energy - hours * 1.0);
      state.happiness = clamp(state.happiness - hours * .8);
      state.hygiene = clamp(state.hygiene - hours * 1.2);
      state.dirt = clamp(state.dirt + hours * .25);
      if (hours > .5) { remember("Ele esperou por você com calma."); }
    }
    state.lastSeen = current;
  }
  function save() {
    if (!state) { return; }
    state.lastSeen = new Date().getTime();
    state.version = SAVE_VERSION;
    var serialized = JSON.stringify(state);
    try {
      var previous = localStorage.getItem(SAVE_KEY);
      if (previous && previous !== serialized) { localStorage.setItem(BACKUP_KEY, previous); }
      localStorage.setItem(SAVE_KEY, serialized);
    } catch (e) {}
  }
  function loadLog() {
    var raw = null;
    try { raw = localStorage.getItem(LOG_KEY); } catch (e) { raw = null; }
    if (raw) { try { devLog = JSON.parse(raw); } catch (e2) { devLog = []; } }
    if (!(devLog instanceof Array)) { devLog = []; }
    renderLog();
  }
  function saveLog() {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(devLog.slice(-300))); } catch (e) {}
  }
  function logEvent(message) {
    var entry = { time: nowText(), text: String(message) };
    devLog.push(entry);
    if (devLog.length > 300) { devLog = devLog.slice(-300); }
    saveLog();
    renderLog();
  }
  function renderLog() {
    var list = byId("dev-log-list");
    var count = byId("dev-log-count");
    if (count) { count.innerHTML = devLog.length + (devLog.length === 1 ? " evento" : " eventos"); }
    if (!list) { return; }
    if (!devLog.length) { list.innerHTML = "<div class=\"dev-log-entry\">Nenhum evento registrado.</div>"; return; }
    var html = "";
    var start = Math.max(0, devLog.length - 120);
    for (var i = start; i < devLog.length; i += 1) { html += "<div class=\"dev-log-entry\">[" + escapeHtml(devLog[i].time) + "] " + escapeHtml(devLog[i].text) + "</div>"; }
    list.innerHTML = html;
    list.scrollTop = list.scrollHeight;
  }
  function remember(text) {
    if (!state || !(state.memories instanceof Array)) { return; }
    state.memories.unshift(text);
    if (state.memories.length > 8) { state.memories.length = 8; }
  }
  function recordRoutine(actionName) {
    var day = dayKey();
    if (state.routine.lastDay !== day) {
      state.routine.streak = state.routine.lastDay ? state.routine.streak + 1 : 1;
      state.routine.lastDay = day;
    }
    state.routine.lastAction = actionName;
    if (actionName === "pet" || actionName === "snack") { state.personality.carinhoso += 2; }
    if (actionName === "dance" || actionName === "train") { state.personality.brincalhao += actionName === "dance" ? 3 : 1; }
    if (actionName === "walk" || actionName === "water" || actionName === "train") { state.personality.curioso += actionName === "walk" ? 2 : 1; }
  }
  function xpForLevel(level) { return Math.max(0, (level - 1) * 18); }
  function stageForLevel(level) { return level >= 20 ? "Companheiro" : (level >= 10 ? "Jovem" : "Bebê"); }
  function growthScale() {
    var level = state.level || 1;
    var start = level >= 20 ? 20 : (level >= 10 ? 10 : 1);
    var end = level >= 20 ? 30 : (level >= 10 ? 19 : 9);
    var progress = end === start ? 1 : (level - start) / (end - start);
    return .76 + Math.max(0, Math.min(1, progress)) * .24;
  }
  function syncGrowth(showMessage) {
    var oldLevel = state.level || 1;
    var oldStage = state.stage;
    while (state.level < 30 && state.xp >= xpForLevel(state.level + 1)) { state.level += 1; }
    state.stage = stageForLevel(state.level);
    if (showMessage && state.level > oldLevel) {
      remember(state.name + " alcançou o nível " + state.level + ".");
      toast("Nível " + state.level + " alcançado!");
      logEvent("Evolução de progresso: nível " + state.level + ".");
    }
    if (state.stage !== oldStage) {
      remember(state.name + " entrou no estágio " + state.stage + ".");
      if (showMessage) { toast("Novo estágio: " + state.stage + "!"); }
      logEvent("Mudança de estágio: " + state.stage + ".");
    }
  }
  function gainBond(amount) {
    state.bond += Math.max(0, amount || 0);
    state.xp += Math.max(0, amount || 0) * 5;
    syncGrowth(true);
  }
  function mood() {
    if (state.sleeping) { return "sonolento"; }
    if (state.poop >= 55 || state.dirt >= 55) { return "precisando de limpeza"; }
    if (state.energy < 22) { return "cansado"; }
    if (state.hunger < 22) { return "com fome"; }
    if (state.happiness < 30) { return "quietinho"; }
    if (state.happiness > 78 && state.health > 50) { return "muito feliz"; }
    return "calmo";
  }
  function personalityLabel() {
    var p = state.personality;
    if (p.carinhoso >= p.curioso && p.carinhoso >= p.brincalhao) { return "carinhoso"; }
    if (p.brincalhao >= p.curioso) { return "brincalhão"; }
    return "curioso";
  }
  function generalState() { return mood(); }
  function updateDayNight() {
    var home = byId("home-view");
    var yard = byId("yard-background");
    var h = new Date().getHours();
    var period = h >= 6 && h < 12 ? "manha" : (h >= 12 && h < 18 ? "tarde" : "noite");
    if (home) { home.className = "screen-view home-view time-" + (period === "manha" ? "morning" : (period === "tarde" ? "afternoon" : "night")); }
    if (yard) { yard.style.backgroundImage = "url('assets/yard/" + period + ".png')"; yard.setAttribute("data-period", period); }
  }
  function setBar(prefix, value) {
    var fill = byId(prefix);
    var text = byId(prefix + "-text");
    if (fill) { fill.style.width = Math.max(0, Math.min(100, value)) + "%"; }
    if (text) { text.innerHTML = Math.round(value) + "%"; }
  }
  function render() {
    if (!state) { return; }
    updateDayNight();
    var time = nowText();
    if (byId("screen-time")) { byId("screen-time").innerHTML = time; }
    if (byId("footer-time")) { byId("footer-time").innerHTML = time; }
    if (byId("screen-stage")) { byId("screen-stage").innerHTML = state.stage.toUpperCase() + " · NV." + state.level + " · " + state.name.toUpperCase(); }
    if (byId("status-name")) { byId("status-name").innerHTML = escapeHtml(state.name); }
    if (byId("status-species")) { byId("status-species").innerHTML = state.species; }
    if (byId("status-stage")) { byId("status-stage").innerHTML = state.stage; }
    if (byId("status-level")) { byId("status-level").innerHTML = "NV." + state.level; }
    if (byId("status-bond")) { byId("status-bond").innerHTML = state.bond; }
    if (byId("status-care")) { byId("status-care").innerHTML = state.care; }
    if (byId("status-memories")) { byId("status-memories").innerHTML = state.memories.length; }
    if (byId("status-general")) { byId("status-general").innerHTML = "Estado geral: " + generalState(); }
    if (byId("status-profile")) { byId("status-profile").innerHTML = "XP " + state.xp + " · Personalidade: " + personalityLabel() + " · Rotina: " + state.routine.streak + " dia(s)"; }
    if (byId("status-memory")) { byId("status-memory").innerHTML = "Última memória: " + (state.memories[0] || "ainda não há memórias."); }
    setBar("status-hunger", state.hunger); setBar("status-energy", state.energy); setBar("status-happiness", state.happiness); setBar("status-hygiene", state.hygiene); setBar("status-health", state.health);
    var asset = byId("pet-asset");
    if (asset) { asset.style.transform = "scale(" + growthScale() + ")"; if (!animationTimer) { setAsset(assetPathFor(state.expression)); } }
    var holder = byId("pet-placeholder");
    if (holder) { holder.className = "pet-placeholder asset-mode" + (state.sleeping ? " sleeping" : ""); }
    var dirt = byId("dirt-mark");
    if (dirt) { dirt.className = state.poop >= 45 ? "dirt-mark visible poop" : (state.dirt >= 20 ? "dirt-mark visible" : "dirt-mark"); }
  }
  function setAsset(path) {
    var asset = byId("pet-asset");
    if (!asset) { return; }
    asset.onerror = function () { asset.onerror = null; asset.src = "assets/animations64/water/idle-01.png"; };
    asset.src = path;
  }
  function assetPathFor(expression) {
    var species = state.species;
    if (species === "Água") {
      if (expression === "eating") { return "assets/animations64/water/eating-01.png"; }
      if (expression === "play") { return "assets/animations64/water/play-01.png"; }
      if (expression === "clean") { return "assets/animations64/water/clean-01.png"; }
      if (expression === "pet") { return "assets/animations64/water/pet-01.png"; }
      if (expression === "sleep") { return "assets/animations64/water/sleep-01.png"; }
      return "assets/animations64/water/idle-01.png";
    }
    if (species === "Planta") {
      return "assets/plant64/" + ({ eating: "eating", happy: "happy", sleep: "sleep", sad: "sad" }[expression] || "neutral") + ".png";
    }
    if (state.level >= 10) {
      return "assets/fire_stage2/fire_stage2_" + ({ eating: "eating", happy: "happy", sleep: "sleep", sad: "sad" }[expression] || "neutral") + ".png";
    }
    return "assets/fire_fixed64/" + ({ eating: "eating", happy: "happy", sleep: "sleep", clean: "clean_jump", pet: "affection" }[expression] || "base") + ".png";
  }
  function sequenceSpec(name) {
    if (state.species !== "Água") { return null; }
    var counts = { idle: 15, eating: 5, play: 3, clean: 3, pet: 3, sleep: 6 };
    if (!counts[name]) { return null; }
    return { count: counts[name], delay: name === "sleep" ? 380 : (name === "idle" ? 180 : 150) };
  }
  function playSequence(name, repeatCount, done) {
    if (statusOpen || titleOpen || eggOpen || hatchInYard || devLogOpen) { return; }
    if (animationTimer) { window.clearTimeout(animationTimer); animationTimer = null; }
    var spec = sequenceSpec(name);
    if (!spec) {
      state.expression = name === "sleep" ? "sleep" : (name === "eating" ? "eating" : (name === "clean" || name === "pet" || name === "play" ? "happy" : "neutral"));
      render();
      if (name !== "sleep" && done) { animationTimer = window.setTimeout(done, 1700); }
      return;
    }
    var token = ++animationToken;
    var frame = 1;
    var cycles = 0;
    var maxCycles = repeatCount || 0;
    function step() {
      if (token !== animationToken || statusOpen || devLogOpen) { return; }
      var suffix = frame < 10 ? "0" + frame : String(frame);
      setAsset("assets/animations64/water/" + name + "-" + suffix + ".png");
      frame += 1;
      if (frame > spec.count) {
        frame = 1; cycles += 1;
        if (maxCycles && cycles >= maxCycles) { animationTimer = done ? window.setTimeout(done, 120) : null; return; }
      }
      animationTimer = window.setTimeout(step, spec.delay);
    }
    step();
  }
  function clearAnimation() { animationToken += 1; if (animationTimer) { window.clearTimeout(animationTimer); animationTimer = null; } }
  function returnToIdle() {
    clearAnimation();
    if (!state.sleeping) { state.expression = "neutral"; render(); playSequence("idle", 2, null); }
  }
  function idleStep() {
    if (!state || !state.started || titleOpen || eggOpen || hatchInYard || statusOpen || devLogOpen || submenu || state.sleeping || animationTimer) { return; }
    playSequence("idle", 2, null);
  }
  function react(kind) {
    var holder = byId("pet-placeholder");
    if (!holder) { return; }
    holder.className = "pet-placeholder asset-mode " + kind;
    window.setTimeout(function () { if (!state.sleeping) { holder.className = "pet-placeholder asset-mode"; } }, 620);
  }
  function spawnParticles(kind) {
    var layer = byId("particle-layer");
    if (!layer) { return; }
    var symbols = { clean: "✦", pet: "♥", feed: "●", play: "✦", sleep: "z" };
    for (var i = 0; i < 7; i += 1) {
      var particle = document.createElement("span");
      particle.className = "particle " + (kind || "play");
      particle.innerHTML = symbols[kind] || "✦";
      particle.style.left = (35 + Math.floor(Math.random() * 30)) + "%";
      particle.style.animationDelay = (i * .07) + "s";
      layer.appendChild(particle);
      (function (node) { window.setTimeout(function () { if (node.parentNode) { node.parentNode.removeChild(node); } }, 1900); }(particle));
    }
  }
  function spawnHatchParticles(species) {
    var layer = byId("particle-layer");
    if (!layer) { return; }
    var type = species === "Fogo" ? "fire" : (species === "Planta" ? "plant" : "water");
    for (var i = 0; i < 16; i += 1) {
      var particle = document.createElement("span");
      particle.className = "particle hatch " + type;
      particle.innerHTML = i % 3 === 0 ? "✦" : "•";
      particle.style.left = (38 + Math.floor(Math.random() * 24)) + "%";
      particle.style.setProperty("--dx", (Math.floor(Math.random() * 90) - 45) + "px");
      particle.style.setProperty("--dy", (Math.floor(Math.random() * 35) - 18) + "px");
      particle.style.setProperty("--rot", (Math.floor(Math.random() * 90) - 45) + "deg");
      particle.style.animationDelay = (i * .035) + "s";
      layer.appendChild(particle);
      (function (node) { window.setTimeout(function () { if (node.parentNode) { node.parentNode.removeChild(node); } }, 1400); }(particle));
    }
  }
  function toast(text) {
    var el = byId("toast");
    if (!el) { return; }
    el.innerHTML = escapeHtml(text);
    el.style.display = "block";
    if (toastTimer) { window.clearTimeout(toastTimer); }
    toastTimer = window.setTimeout(function () { el.style.display = "none"; }, 1700);
  }
  function setOverlay(id, visible) {
    var el = byId(id);
    if (!el) { return; }
    el.setAttribute("aria-hidden", visible ? "false" : "true");
    el.style.display = visible ? "block" : "none";
  }
  function renderTitleMenu() {
    var buttons = byId("title-modal").getElementsByTagName("button");
    for (var i = 0; i < buttons.length; i += 1) { buttons[i].className = "title-menu" + (i === titleSelected ? " selected" : ""); }
  }
  function renderEggChoices() {
    var buttons = byId("egg-modal").getElementsByClassName("egg-choice");
    for (var i = 0; i < buttons.length; i += 1) { buttons[i].className = "egg-choice" + (i === eggSelected ? " selected" : ""); }
  }
  function showStartupTitle() {
    titleOpen = true; eggOpen = false; statusOpen = false; submenu = null; menuOpen = true;
    setOverlay("egg-modal", false); setOverlay("hatch-modal", false); setOverlay("title-modal", true); renderTitleMenu(); render();
    logEvent("Menu inicial exibido: START / OPTIONS / EXIT.");
  }
  function showEggSelection() {
    titleOpen = false; eggOpen = true; statusOpen = false; submenu = null;
    setOverlay("title-modal", false); setOverlay("hatch-modal", false); setOverlay("egg-modal", true); renderEggChoices();
    logEvent("Tela de seleção dos três ovos exibida.");
  }
  function startTitle() {
    if (state.started) {
      titleOpen = false; setOverlay("title-modal", false); render(); logEvent("START retornou ao pet existente."); playSequence("idle", 2, null); toast("Bem-vindo de volta!");
    } else { showEggSelection(); }
  }
  function beginHatch() {
    var species = speciesList[eggSelected];
    eggOpen = false; hatchInYard = true; clearAnimation();
    setOverlay("egg-modal", false); setOverlay("hatch-modal", false);
    var egg = byId("hatch-yard-egg");
    if (egg) { egg.src = "assets/eggs/" + (species === "Fogo" ? "fire" : (species === "Planta" ? "plant" : "water")) + ".png"; egg.style.display = "block"; }
    var holder = byId("pet-placeholder");
    if (holder) { holder.className = "pet-placeholder asset-mode hatching"; }
    byId("hatch-egg").src = egg.src;
    byId("hatch-pet").src = assetPathFor("neutral");
    logEvent("Eclosão iniciada para o ovo de " + species + ".");
    toast("O ovo está se aquecendo...");
    if (hatchTimer) { window.clearTimeout(hatchTimer); }
    hatchTimer = window.setTimeout(function () {
      spawnHatchParticles(species);
      if (holder) { holder.className = "pet-placeholder asset-mode hatching revealing"; }
      logEvent("Partículas de eclosão liberadas.");
      hatchTimer = window.setTimeout(function () { finishHatch(species); }, 900);
    }, 4300);
  }
  function finishHatch(species) {
    if (hatchTimer) { window.clearTimeout(hatchTimer); hatchTimer = null; }
    hatchInYard = false; state = newPet(species); state.started = true; state.species = species;
    var egg = byId("hatch-yard-egg");
    if (egg) { egg.style.display = "none"; }
    var holder = byId("pet-placeholder");
    if (holder) { holder.className = "pet-placeholder asset-mode"; }
    save(); render(); logEvent("Eclosão concluída: " + species + " chegou ao quintal."); toast("Seu primeiro MiniKyumon chegou!"); playSequence("idle", 2, null);
  }
  function move(direction) {
    if (hatchInYard || statusOpen || devLogOpen) { return; }
    if (titleOpen) { titleSelected = (titleSelected + direction + titleItems.length) % titleItems.length; renderTitleMenu(); return; }
    if (eggOpen) { eggSelected = (eggSelected + direction + speciesList.length) % speciesList.length; renderEggChoices(); logEvent("Ovo destacado: " + speciesList[eggSelected] + "."); return; }
    if (!menuOpen) { return; }
    if (submenu) {
      var list = menus[submenu]; submenuSelected = (submenuSelected + direction + list.length) % list.length; renderCarousel(); return;
    }
    selected = (selected + direction + actions.length) % actions.length; renderCarousel();
  }
  function select() {
    if (hatchInYard || statusOpen || devLogOpen) { return; }
    if (titleOpen) { selectTitle(); return; }
    if (eggOpen) { beginHatch(); return; }
    if (!menuOpen) { return; }
    if (submenu) {
      var option = menus[submenu][submenuSelected];
      if (submenu === "feed") { performFeed(option.id); } else if (submenu === "play") { performPlay(option.id); } else { performSleep(option.id); }
    } else { performAction(actions[selected].id); }
  }
  function selectTitle() {
    if (titleSelected === 0) { startTitle(); }
    else if (titleSelected === 1) { toast("Options serão adicionadas em uma próxima versão."); logEvent("OPTIONS selecionado; nenhum ajuste disponível ainda."); }
    else { toast("EXIT está disponível apenas quando o host permitir."); logEvent("EXIT selecionado; fechamento ignorado no modo web."); }
  }
  function renderCarousel() {
    var track = byId("carousel-track");
    var subTrack = byId("submenu-track");
    if (!track || !subTrack) { return; }
    var html = "";
    for (var i = 0; i < actions.length; i += 1) { html += "<button class=\"carousel-item" + (i === selected ? " selected" : "") + "\" data-index=\"" + i + "\"><span class=\"ico\">" + actions[i].icon + "</span>" + actions[i].label + "</button>"; }
    track.innerHTML = html;
    var buttons = track.getElementsByTagName("button");
    for (var j = 0; j < buttons.length; j += 1) { buttons[j].onclick = function () { selected = parseInt(this.getAttribute("data-index"), 10); renderCarousel(); }; }
    if (!submenu) { subTrack.innerHTML = ""; byId("submenu-strip").className = "submenu-strip menu-hidden"; }
    else {
      var list = menus[submenu]; var subHtml = "";
      for (var k = 0; k < list.length; k += 1) { subHtml += "<button class=\"submenu-item" + (k === submenuSelected ? " selected" : "") + "\" data-index=\"" + k + "\"><span>" + list[k].icon + "</span> " + list[k].label + "</button>"; }
      subTrack.innerHTML = subHtml; byId("submenu-strip").className = menuOpen ? "submenu-strip" : "submenu-strip menu-hidden";
      var subButtons = subTrack.getElementsByTagName("button");
      for (var m = 0; m < subButtons.length; m += 1) { subButtons[m].onclick = function () { submenuSelected = parseInt(this.getAttribute("data-index"), 10); select(); }; }
    }
    byId("carousel").className = menuOpen ? "carousel" : "carousel menu-hidden";
  }
  function openSubmenu(name) { submenu = name; submenuSelected = 0; menuOpen = true; renderCarousel(); logEvent("Submenu aberto: " + name + "."); toast(name === "feed" ? "Escolha o que oferecer." : (name === "play" ? "Escolha uma brincadeira." : "Escolha como descansar.")); }
  function performAction(id) {
    if (id === "feed") { openSubmenu("feed"); return; }
    if (id === "play") { openSubmenu("play"); return; }
    if (id === "sleep") { openSubmenu("sleep"); return; }
    if (id === "new") { showEggSelection(); return; }
    if (state.sleeping) { state.sleeping = false; state.expression = "neutral"; clearAnimation(); }
    if (id === "clean") { performClean(); return; }
    if (id === "pet") { performPet(); }
  }
  function finishAction(actionName, message, animationName, reaction) {
    state.care += 1; recordRoutine(actionName); gainBond(actionName === "pet" ? 2 : 1); remember(state.name + " recebeu " + message + "."); save(); render(); spawnParticles(actionName === "pet" ? "pet" : actionName === "clean" ? "clean" : "play"); react(reaction || "bounce"); logEvent("Ação concluída: " + actionName + "."); toast(message.charAt(0).toUpperCase() + message.slice(1) + "."); playSequence(animationName, 2, returnToIdle);
  }
  function performClean() {
    if (state.hygiene >= 94 && state.dirt < 10 && state.poop < 10) { state.happiness = clamp(state.happiness + 1); toast("Está tudo limpinho por aqui."); logEvent("Limpeza conferida sem necessidade de intervenção."); return; }
    state.hygiene = clamp(state.hygiene + 30); state.dirt = 0; state.poop = 0; state.happiness = clamp(state.happiness + 7); state.health = clamp(state.health + 4); finishAction("clean", "tudo limpo e aconchegante", "clean", "wiggle");
  }
  function performPet() {
    state.happiness = clamp(state.happiness + 11); state.energy = clamp(state.energy + 1); state.health = clamp(state.health + 2); finishAction("pet", "ele adorou o carinho", "pet", "nod");
  }
  function performFeed(option) {
    state.sleeping = false; state.expression = "neutral";
    if (option === "snack") { state.hunger = clamp(state.hunger + 8); state.happiness = clamp(state.happiness + 3); state.poop = clamp(state.poop + 5); }
    else if (option === "meal") { state.hunger = clamp(state.hunger + 25); state.happiness = clamp(state.happiness + 4); state.poop = clamp(state.poop + 18); }
    else { state.hunger = clamp(state.hunger + 2); state.hygiene = clamp(state.hygiene + 3); state.health = clamp(state.health + 1); }
    submenu = null; finishAction(option, option === "water" ? "água fresquinha" : (option === "meal" ? "comida servida" : "um lanchinho"), "eating", "bounce");
  }
  function performPlay(option) {
    if (state.energy <= 12) { state.happiness = clamp(state.happiness + 1); toast("Ele está cansado; uma pausa gentil ajuda."); remember(state.name + " recebeu um limite gentil."); save(); render(); logEvent("Brincadeira adiada por energia baixa."); return; }
    state.happiness = clamp(state.happiness + (option === "dance" ? 15 : option === "train" ? 11 : 9)); state.energy = clamp(state.energy - (option === "dance" ? 6 : option === "train" ? 8 : 3)); state.hunger = clamp(state.hunger - 2); state.hygiene = clamp(state.hygiene - 1); submenu = null; finishAction(option, option === "dance" ? "que dança divertida" : (option === "train" ? "treino concluído" : "passeio tranquilo"), "play", "shake");
  }
  function performSleep(option) {
    var gain = option === "quick" ? 16 : (option === "nap" ? 34 : 55);
    state.energy = clamp(state.energy + gain); state.health = clamp(state.health + (option === "deep" ? 7 : 4)); state.hunger = clamp(state.hunger - (option === "deep" ? 4 : 2)); state.happiness = clamp(state.happiness + 2); state.care += 1; recordRoutine("sleep_" + option); gainBond(1); remember(state.name + " descansou com tranquilidade."); state.sleeping = true; state.expression = "sleep"; submenu = null; clearAnimation(); save(); render(); spawnParticles("sleep"); logEvent("Sono iniciado: " + option + "."); toast("Zzz... uma pausa faz bem."); playSequence("sleep", 0, null);
  }
  function backAction() {
    if (devLogOpen) { closeDevLog(); return false; }
    if (hatchInYard) { toast("O ovo está eclodindo; aguarde só um instante."); return false; }
    if (eggOpen) { eggOpen = false; titleOpen = true; setOverlay("egg-modal", false); setOverlay("title-modal", true); renderTitleMenu(); logEvent("Seleção de ovos cancelada; retorno ao título."); return false; }
    if (titleOpen) { return false; }
    if (statusOpen) { closeStatus(); return false; }
    if (submenu) { submenu = null; submenuSelected = 0; menuOpen = true; renderCarousel(); toast("Menu principal."); logEvent("Voltou do submenu para o menu principal."); return false; }
    menuOpen = !menuOpen; renderCarousel(); toast(menuOpen ? "Menu aberto." : "Menu recolhido."); logEvent(menuOpen ? "Menu principal aberto." : "Menu principal recolhido."); return false;
  }
  function openStatus() {
    if (titleOpen || eggOpen || hatchInYard || devLogOpen) { return; }
    statusOpen = true; submenu = null; setOverlay("status-view", false); byId("home-view").style.display = "none"; byId("status-view").style.display = "block"; byId("status-view").setAttribute("aria-hidden", "false"); render(); logEvent("Tela de status aberta.");
  }
  function closeStatus() { statusOpen = false; byId("status-view").style.display = "none"; byId("status-view").setAttribute("aria-hidden", "true"); byId("home-view").style.display = "block"; renderCarousel(); render(); logEvent("Tela de status fechada."); }
  function openDevLog() {
    if (devLogOpen) { closeDevLog(); return; }
    devLogOpen = true; clearAnimation(); setOverlay("dev-log-modal", true); renderLog(); logEvent("DEV LOG aberto.");
  }
  function closeDevLog() {
    devLogOpen = false; setOverlay("dev-log-modal", false); render(); if (titleOpen) { setOverlay("title-modal", true); } if (eggOpen) { setOverlay("egg-modal", true); } logEvent("DEV LOG fechado; estado anterior restaurado.");
  }
  function exportLog() {
    var lines = ["MiniKyumons DEV LOG", "Build: V1.1 rebuild baseada no protótipo HTA", "Exportado em: " + new Date().toLocaleString("pt-BR"), ""];
    for (var i = 0; i < devLog.length; i += 1) { lines.push("[" + devLog[i].time + "] " + devLog[i].text); }
    var blob = new Blob([lines.join("\r\n")], { type: "text/plain;charset=utf-8" });
    if (window.navigator.msSaveOrOpenBlob) { window.navigator.msSaveOrOpenBlob(blob, "minikyumons-dev-log.txt"); return; }
    var link = document.createElement("a"); link.href = window.URL.createObjectURL(blob); link.download = "minikyumons-dev-log.txt"; link.style.display = "none"; document.body.appendChild(link); link.click(); document.body.removeChild(link); logEvent("DEV LOG exportado para TXT.");
  }
  function clearLog() { devLog = []; saveLog(); renderLog(); logEvent("DEV LOG limpo pelo usuário."); }
  function tick() {
    if (!state || !state.started || hatchInYard) { return; }
    var current = new Date().getTime(); var minutes = (current - lastTick) / 60000;
    if (minutes >= 1) {
      var factor = Math.min(minutes, 10);
      state.hunger = clamp(state.hunger - factor * .06); state.energy = clamp(state.energy - factor * .036); state.happiness = clamp(state.happiness - factor * .026); state.hygiene = clamp(state.hygiene - factor * .033); state.dirt = clamp(state.dirt + factor * .006); state.totalMinutes += factor; lastTick = current; save(); render(); logEvent("Ciclo de manutenção aplicado: " + Math.round(factor) + " minuto(s).");
    }
    if (byId("screen-time")) { byId("screen-time").innerHTML = nowText(); }
    if (byId("footer-time")) { byId("footer-time").innerHTML = nowText(); }
  }
  function wire() {
    var titleButtons = byId("title-modal").getElementsByTagName("button");
    for (var i = 0; i < titleButtons.length; i += 1) { titleButtons[i].onclick = function () { titleSelected = this.getAttribute("data-title") === "start" ? 0 : (this.getAttribute("data-title") === "options" ? 1 : 2); renderTitleMenu(); selectTitle(); }; }
    var eggButtons = byId("egg-modal").getElementsByClassName("egg-choice");
    for (var j = 0; j < eggButtons.length; j += 1) { eggButtons[j].onclick = function () { eggSelected = speciesList.indexOf(this.getAttribute("data-species")); renderEggChoices(); logEvent("Ovo escolhido por clique: " + speciesList[eggSelected] + "."); }; }
    byId("egg-back").onclick = function () { backAction(); };
    byId("carousel-left").onclick = function () { move(-1); }; byId("carousel-right").onclick = function () { move(1); };
    byId("dpad-left").onclick = function () { move(-1); }; byId("dpad-right").onclick = function () { move(1); }; byId("dpad-up").onclick = function () { move(-1); }; byId("dpad-down").onclick = function () { move(1); };
    byId("green-button").onclick = select; byId("yellow-button").onclick = backAction; byId("pink-button").onclick = function () { if (statusOpen) { closeStatus(); } else { openStatus(); } };
    byId("dev-log-button").onclick = openDevLog; byId("dev-log-close").onclick = closeDevLog; byId("dev-log-export").onclick = exportLog; byId("dev-log-clear").onclick = clearLog;
    document.onkeydown = function (event) {
      var e = event || window.event; var code = e.keyCode || e.which;
      if (code === 37 || code === 38) { move(-1); }
      else if (code === 39 || code === 40) { move(1); }
      else if (code === 13 || code === 32) { select(); }
      else if (code === 83) { if (statusOpen) { closeStatus(); } else { openStatus(); } }
      else if (code === 76) { openDevLog(); }
      else if (code === 27 || code === 88) { backAction(); }
      if (code === 37 || code === 38 || code === 39 || code === 40 || code === 13 || code === 32 || code === 83 || code === 76 || code === 27 || code === 88) { e.preventDefault(); }
    };
  }
  function scaleConsole() {
    var shell = byId("console-shell");
    if (!shell) { return; }
    var w = document.documentElement.clientWidth || window.innerWidth || 585;
    var h = document.documentElement.clientHeight || window.innerHeight || 427;
    var scale = Math.min(w / 585, h / 427);
    if (!isFinite(scale) || scale < 1) { scale = 1; }
    shell.style.transform = "translate(-50%,-50%) scale(" + scale.toFixed(4) + ")";
  }
  function init() {
    load(); wire(); renderCarousel(); render(); showStartupTitle();
    idleTimer = window.setInterval(idleStep, 5000); window.setInterval(tick, 10000); window.onresize = scaleConsole; scaleConsole();
    window.__miniKyumonsDebug = { getState: function () { return state; }, getLog: function () { return devLog; }, showEggSelection: showEggSelection, beginHatch: beginHatch, finishHatch: finishHatch, closeDevLog: closeDevLog };
  }
  init();
}());
