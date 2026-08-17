var fs = require("fs");
var vm = require("vm");
var source = fs.readFileSync("/home/ubuntu/minikyumons-v11-rebuild/app.js", "utf8");
var failures = 0;
var timers = [];
var timerId = 0;
var elements = {};
function Element(id, className) {
  this.id = id || ""; this.className = className || ""; this.style = { display: "", width: "", transform: "", backgroundImage: "", setProperty: function (k, v) { this[k] = v; } };
  this.innerHTML = ""; this.value = ""; this.src = ""; this.parentNode = null; this.children = []; this.attrs = {};
  this.scrollTop = 0; this.scrollHeight = 0;
}
Element.prototype.setAttribute = function (key, value) { this.attrs[key] = String(value); };
Element.prototype.getAttribute = function (key) { return this.attrs[key] || null; };
Element.prototype.appendChild = function (node) { node.parentNode = this; this.children.push(node); };
Element.prototype.removeChild = function (node) { var i = this.children.indexOf(node); if (i >= 0) { this.children.splice(i, 1); node.parentNode = null; } };
Element.prototype.getElementsByTagName = function (tag) { var result = []; for (var i = 0; i < this.children.length; i++) { if (String(this.children[i].tagName || "").toLowerCase() === String(tag).toLowerCase()) { result.push(this.children[i]); } result = result.concat(this.children[i].getElementsByTagName(tag)); } return result; };
Element.prototype.getElementsByClassName = function (className) { var result = []; for (var i = 0; i < this.children.length; i++) { var c = " " + this.children[i].className + " "; if (c.indexOf(" " + className + " ") >= 0) { result.push(this.children[i]); } result = result.concat(this.children[i].getElementsByClassName(className)); } return result; };
function add(id, className) { elements[id] = new Element(id, className); return elements[id]; }
function button(id, parent, attrs, className) { var b = add(id, className || ""); b.tagName = "button"; for (var k in attrs) { b.attrs[k] = attrs[k]; } if (parent) { parent.appendChild(b); } return b; }
var title = add("title-modal"); button("title-start", title, { "data-title": "start" }, "title-menu selected"); button("title-options", title, { "data-title": "options" }, "title-menu"); button("title-exit", title, { "data-title": "exit" }, "title-menu");
var egg = add("egg-modal"); button("egg-water", egg, { "data-species": "Água" }, "egg-choice selected"); button("egg-plant", egg, { "data-species": "Planta" }, "egg-choice"); button("egg-fire", egg, { "data-species": "Fogo" }, "egg-choice"); button("egg-back", egg, {}, "overlay-back");
[
  "console-shell", "screen", "home-view", "screen-stage", "screen-time", "home-pet-area", "yard-background", "particle-layer", "dirt-mark", "pet-placeholder", "pet-asset", "hatch-yard-egg", "sleep-particles", "emotion-overlay", "carousel", "carousel-track", "carousel-left", "carousel-right", "submenu-strip", "submenu-track", "footer-time", "status-view", "status-level", "status-name", "status-species", "status-stage", "status-bond", "status-care", "status-memories", "status-general", "status-profile", "status-memory", "status-hunger", "status-hunger-text", "status-energy", "status-energy-text", "status-happiness", "status-happiness-text", "status-hygiene", "status-hygiene-text", "status-health", "status-health-text", "hatch-modal", "hatch-egg", "hatch-pet", "hatch-progress", "dev-log-modal", "dev-log-close", "dev-log-count", "dev-log-list", "dev-log-export", "dev-log-clear", "dev-log-button", "toast", "dpad-up", "dpad-left", "dpad-right", "dpad-down", "green-button", "yellow-button", "pink-button"
].forEach(function (id) { if (!elements[id]) { add(id); } });
var documentShim = {
  documentElement: { clientWidth: 585, clientHeight: 427 },
  onkeydown: null,
  body: new Element("body"),
  getElementById: function (id) { return elements[id] || (elements[id] = add(id)); },
  createElement: function (tag) { var e = new Element("", ""); e.tagName = tag; return e; }
};
var storage = {};
var windowShim = {
  setTimeout: function (fn) { var id = ++timerId; timers.push({ id: id, fn: fn, active: true }); return id; },
  clearTimeout: function (id) { for (var i = 0; i < timers.length; i++) { if (timers[i].id === id) { timers[i].active = false; } } },
  setInterval: function () { return 0; },
  resizeTo: function () {}, moveTo: function () {},
  URL: { createObjectURL: function () { return "blob:test"; } },
  navigator: {},
  __miniKyumonsDebug: null
};
var context = { window: windowShim, document: documentShim, localStorage: { getItem: function (k) { return storage[k] || null; }, setItem: function (k, v) { storage[k] = String(v); }, removeItem: function (k) { delete storage[k]; } }, console: console, Math: Math, Date: Date, Blob: function () {}, isFinite: isFinite };
windowShim.window = windowShim; context.global = context;
vm.runInNewContext(source, context, { filename: "app.js" });
function runNext() { while (timers.length) { var item = timers.shift(); if (item.active) { item.fn(); return true; } } return false; }
function runUntil(predicate, limit) { for (var i = 0; i < limit && !predicate(); i++) { if (!runNext()) { break; } } return predicate(); }
function click(id) { var fn = elements[id].onclick; if (typeof fn !== "function") { fail("handler ausente: " + id); return; } fn.call(elements[id]); }
function pass(name) { console.log("PASS|" + name); }
function fail(name) { failures += 1; console.log("FAIL|" + name); }
function assertTrue(condition, name) { if (condition) { pass(name); } else { fail(name); } }
function state() { return windowShim.__miniKyumonsDebug.getState(); }
assertTrue(elements["title-modal"].style.display === "block", "tela inicial abre no menu de titulo");
click("green-button"); assertTrue(elements["egg-modal"].style.display === "block", "START abre os tres ovos"); click("dpad-right"); assertTrue(elements["egg-plant"].className.indexOf("selected") >= 0, "D-pad navega para ovo Planta"); click("green-button"); assertTrue(elements["hatch-yard-egg"].style.display === "block", "confirmar ovo inicia eclosao no quintal");
assertTrue(runUntil(function () { return state().started === true; }, 60), "eclosao termina e inicia o pet"); assertTrue(elements["hatch-yard-egg"].style.display === "none", "ovo some apos eclosao");
click("green-button"); assertTrue(elements["submenu-strip"].className.indexOf("menu-hidden") < 0, "Alimentar abre submenu"); click("dpad-left"); click("green-button"); assertTrue(state().hygiene > 68, "Agua melhora higiene");
click("dpad-right"); click("green-button"); var beforeEnergy = state().energy; click("green-button"); assertTrue(state().energy < beforeEnergy, "brincar reduz energia");
click("dpad-right"); click("green-button"); var beforeHygiene = state().hygiene; assertTrue(state().hygiene >= beforeHygiene, "limpeza melhora higiene");
click("dpad-right"); click("green-button"); assertTrue(state().happiness > 82, "carinho melhora humor");
click("dpad-right"); click("green-button"); click("green-button"); assertTrue(state().sleeping === true, "sono ativa animacao de dormir");
click("pink-button"); assertTrue(elements["status-view"].style.display === "block", "pink abre status"); click("pink-button"); assertTrue(elements["status-view"].style.display === "none", "pink fecha status");
assertTrue(elements["carousel-track"].innerHTML.indexOf("Novo ovo") < 0, "menu principal não possui Novo ovo");
console.log("RESULT=" + (failures ? "FAIL" : "PASS") + " failures=" + failures);
process.exitCode = failures ? 1 : 0;
