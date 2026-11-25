import { createView } from "./projection.js";
import { subsolarPoint } from "./solar.js";
import { createRenderer } from "./renderer.js";
import { createPins, cityKey } from "./pins.js";
import { createDock } from "./dock.js";
import { createEditor } from "./editor.js";
import { createPlacesClient } from "./places-client.js";
import { isValidTimeZone, localTimeZone, uses12Hour } from "./time.js";
import { DEFAULT_SETTINGS, legacyCityNames, loadState, onExternalChange, saveState } from "./store.js";

const STEP_MS = 30 * 60 * 1000;
const MAX_DPR = 2;
const DEFAULT_NAMES = ["London", "New York City", "Dubai", "Tokyo", "Sydney"];
const FALLBACK_CITIES = [
  { name: "London", region: "England", country: "GB", lat: 51.51, lon: -0.13, tz: "Europe/London" },
  { name: "New York City", region: "New York", country: "US", lat: 40.71, lon: -74.01, tz: "America/New_York" },
  { name: "Tokyo", region: "Tokyo", country: "JP", lat: 35.69, lon: 139.69, tz: "Asia/Tokyo" },
];

const state = { cities: [], settings: { ...DEFAULT_SETTINGS } };
const places = createPlacesClient();
const renderer = createRenderer(document.getElementById("map"), () => document.body.classList.add("map-ready"));
const pins = createPins(document.getElementById("pins"));
let view = null;
let frame = 0;
let tickTimer = 0;

const dock = createDock({
  onShift: () => requestDraw(),
  onEdit: () => editor.open(),
});

const editor = createEditor({
  places,
  getState: () => ({ ...state, ms: displayTime(), twelve: twelve() }),
  onAdd: (place) => commitCities([...state.cities, normalize(place)]),
  onRemove: (city) => commitCities(state.cities.filter((c) => cityKey(c) !== cityKey(city))),
  onSettings: (patch) => {
    state.settings = { ...state.settings, ...patch };
    saveState({ settings: state.settings });
    requestDraw();
  },
  onToggle: (open) => document.body.classList.toggle("editor-open", open),
});

function twelve() {
  return uses12Hour(state.settings.timeFormat);
}

function displayTime() {
  return Date.now() + dock.steps * STEP_MS;
}

function normalize(place) {
  return {
    name: String(place.name),
    region: String(place.region || ""),
    country: String(place.country || ""),
    lat: +place.lat,
    lon: +place.lon,
    tz: String(place.tz),
  };
}

function valid(city) {
  return city && city.name && Number.isFinite(city.lat) && Number.isFinite(city.lon) && isValidTimeZone(city.tz);
}

function commitCities(cities) {
  const seen = new Set();
  state.cities = cities.filter((c) => {
    const key = cityKey(c);
    if (!valid(c) || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  saveState({ cities: state.cities });
  requestDraw();
}

function draw() {
  frame = 0;
  if (!view) return;
  const ms = displayTime();
  const sun = subsolarPoint(ms);
  renderer.render(view, sun, ms);
  pins.update({ cities: state.cities, view, ms, sun, twelve: twelve() });
  dock.setTime(ms, twelve());
  editor.refresh();
}

function requestDraw() {
  if (!frame) frame = requestAnimationFrame(draw);
}

function layout() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  view = createView(width, height);
  renderer.resize(width, height, Math.min(window.devicePixelRatio || 1, MAX_DPR));
  dock.refresh();
  requestDraw();
}

function tick() {
  clearTimeout(tickTimer);
  requestDraw();
  tickTimer = setTimeout(tick, 60000 - (Date.now() % 60000) + 30);
}

async function initialCities() {
  const legacy = legacyCityNames();
  const lookups = legacy
    ? legacy.map((name) => places.byName(name))
    : [places.byTimeZone(localTimeZone), ...DEFAULT_NAMES.map((name) => places.byName(name))];
  const found = (await Promise.allSettled(lookups)).map((r) => (r.status === "fulfilled" ? r.value : null)).filter(Boolean);
  return found.length ? found.map(normalize) : FALLBACK_CITIES;
}

async function reloadFromStorage() {
  const stored = await loadState();
  state.settings = stored.settings;
  if (stored.cities) state.cities = stored.cities.map(normalize).filter(valid);
  requestDraw();
}

async function start() {
  layout();
  const stored = await loadState();
  state.settings = stored.settings;
  if (stored.cities) {
    state.cities = stored.cities.map(normalize).filter(valid);
  } else {
    commitCities(await initialCities());
  }
  tick();
  onExternalChange(reloadFromStorage);
}

let resizeFrame = 0;
window.addEventListener("resize", () => {
  if (!resizeFrame) {
    resizeFrame = requestAnimationFrame(() => {
      resizeFrame = 0;
      layout();
    });
  }
});

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) tick();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !editor.isOpen && dock.steps) dock.reset();
});

start();
