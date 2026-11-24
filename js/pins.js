import { sunAltitude } from "./solar.js";
import { cityClock } from "./time.js";
import { countryName } from "./places.js";

const GAP = 9;
const DOT_BOX = 14;
const EDGE = 6;
const CANDIDATES = [
  { id: "e", cost: 0, at: (w, h) => [GAP, -h / 2] },
  { id: "w", cost: 25, at: (w, h) => [-GAP - w, -h / 2] },
  { id: "ne", cost: 45, at: (w, h) => [GAP * 0.4, -h - GAP * 0.55] },
  { id: "se", cost: 45, at: (w, h) => [GAP * 0.4, GAP * 0.55] },
  { id: "nw", cost: 65, at: (w, h) => [-w - GAP * 0.4, -h - GAP * 0.55] },
  { id: "sw", cost: 65, at: (w, h) => [-w - GAP * 0.4, GAP * 0.55] },
  { id: "n", cost: 85, at: (w, h) => [-w / 2, -h - GAP] },
  { id: "s", cost: 85, at: (w, h) => [-w / 2, GAP] },
];
const STICKY_BONUS = 60;

export function cityKey(city) {
  return `${city.name}|${city.lat}|${city.lon}`;
}

export function placeLabel(city) {
  const parts = [city.name];
  if (city.region && city.region !== city.name) parts.push(city.region);
  const country = countryName(city.country);
  if (country && country !== city.name) parts.push(country);
  return parts.join(", ");
}

function overlap(a, b) {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

function outside(r, width, height) {
  const inside =
    Math.max(0, Math.min(r.x + r.w, width - EDGE) - Math.max(r.x, EDGE)) *
    Math.max(0, Math.min(r.y + r.h, height - EDGE) - Math.max(r.y, EDGE));
  return r.w * r.h - inside;
}

function layoutLabels(items, width, height, previous) {
  const dots = items.map((it) => ({ x: it.x - DOT_BOX / 2, y: it.y - DOT_BOX / 2, w: DOT_BOX, h: DOT_BOX }));
  const rectFor = (it, c) => {
    const [dx, dy] = c.at(it.w, it.h);
    return { x: it.x + dx, y: it.y + dy, w: it.w, h: it.h };
  };
  const choice = items.map((it) => {
    const prev = CANDIDATES.findIndex((c) => c.id === previous.get(it.key));
    return prev >= 0 ? prev : 0;
  });
  const rects = items.map((it, i) => rectFor(it, CANDIDATES[choice[i]]));

  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    items.forEach((it, i) => {
      let best = choice[i];
      let bestCost = Infinity;
      CANDIDATES.forEach((c, ci) => {
        const r = rectFor(it, c);
        let cost = c.cost + outside(r, width, height) * 6;
        if (previous.get(it.key) === c.id) cost -= STICKY_BONUS;
        for (let j = 0; j < items.length; j++) {
          if (j === i) continue;
          cost += overlap(r, rects[j]) * 1.5;
          cost += overlap(r, dots[j]) * 4;
        }
        if (cost < bestCost) {
          bestCost = cost;
          best = ci;
        }
      });
      if (best !== choice[i]) {
        choice[i] = best;
        rects[i] = rectFor(it, CANDIDATES[best]);
        changed = true;
      }
    });
    if (!changed) break;
  }
  return items.map((it, i) => ({ id: CANDIDATES[choice[i]].id, rect: rects[i] }));
}

function phaseFor(altitude) {
  if (altitude > -0.833) return "day";
  if (altitude > -6) return "twilight";
  return "night";
}

function buildPin() {
  const el = document.createElement("div");
  el.className = "pin";
  el.innerHTML =
    '<i class="dot"></i><div class="label"><div class="name"></div>' +
    '<div class="meta"><span class="time"><span class="hm"></span><span class="ampm"></span></span>' +
    '<span class="offset"></span><span class="day"></span></div></div>';
  return {
    el,
    label: el.querySelector(".label"),
    name: el.querySelector(".name"),
    hm: el.querySelector(".hm"),
    ampm: el.querySelector(".ampm"),
    offset: el.querySelector(".offset"),
    day: el.querySelector(".day"),
    text: {},
  };
}

function setText(node, field, el, value) {
  if (node.text[field] !== value) {
    node.text[field] = value;
    el.textContent = value;
  }
}

export function createPins(container) {
  const nodes = new Map();
  const previous = new Map();

  return {
    update({ cities, view, ms, sun, twelve }) {
      const nameCount = new Map();
      for (const city of cities) nameCount.set(city.name, (nameCount.get(city.name) || 0) + 1);
      const items = [];
      for (const city of cities) {
        const display = nameCount.get(city.name) > 1 ? `${city.name}, ${city.region || countryName(city.country)}` : city.name;
        const base = view.project(city.lat, city.lon);
        const clock = cityClock(city.tz, ms, twelve);
        const phase = phaseFor(sunAltitude(sun, city.lat, city.lon));
        const copies = [0];
        if (view.worldWidth < view.width - 1) {
          for (let k = -3; k <= 3; k++) {
            const x = base.x + k * view.worldWidth;
            if (k && x >= 0 && x <= view.width) copies.push(k);
          }
        }
        for (const k of copies) {
          items.push({
            key: `${cityKey(city)}#${k}`,
            city,
            display,
            clock,
            phase,
            x: base.x + k * view.worldWidth,
            y: base.y,
          });
        }
      }

      const live = new Set(items.map((it) => it.key));
      for (const [key, node] of nodes) {
        if (!live.has(key)) {
          node.el.remove();
          nodes.delete(key);
          previous.delete(key);
        }
      }

      for (const it of items) {
        let node = nodes.get(it.key);
        if (!node) {
          node = buildPin();
          nodes.set(it.key, node);
          container.append(node.el);
        }
        it.node = node;
        setText(node, "name", node.name, it.display);
        setText(node, "hm", node.hm, it.clock.time);
        setText(node, "ampm", node.ampm, it.clock.period);
        setText(node, "offset", node.offset, it.clock.offset);
        setText(node, "day", node.day, it.clock.dayLabel);
        if (node.phase !== it.phase) {
          node.phase = it.phase;
          node.el.dataset.phase = it.phase;
        }
        const title = `${placeLabel(it.city)}\n${it.clock.weekday} ${it.clock.time}${it.clock.period ? ` ${it.clock.period}` : ""} (${it.clock.offset})`;
        if (node.title !== title) {
          node.title = title;
          node.el.title = title;
        }
      }

      for (const it of items) {
        it.w = it.node.label.offsetWidth;
        it.h = it.node.label.offsetHeight;
      }

      const placed = layoutLabels(items, view.width, view.height, previous);
      items.forEach((it, i) => {
        const { id, rect } = placed[i];
        previous.set(it.key, id);
        it.node.el.style.transform = `translate(${it.x.toFixed(1)}px, ${it.y.toFixed(1)}px)`;
        it.node.label.style.transform = `translate(${(rect.x - it.x).toFixed(1)}px, ${(rect.y - it.y).toFixed(1)}px)`;
        it.node.el.dataset.side = id;
      });
    },
  };
}
