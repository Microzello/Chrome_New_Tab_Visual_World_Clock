import { cityClock, systemUses12Hour } from "./time.js";
import { cityKey } from "./pins.js";
import { countryName } from "./places.js";

const SEARCH_DELAY = 70;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function subtitle(place) {
  const parts = [];
  if (place.region && place.region !== place.name) parts.push(place.region);
  const country = countryName(place.country);
  if (country && country !== place.name) parts.push(country);
  return parts.join(", ");
}

function clockText(clock) {
  return `${clock.time}${clock.period ? ` ${clock.period}` : ""}`;
}

export function createEditor({ places, getState, onAdd, onRemove, onSettings, onToggle }) {
  const dialog = document.getElementById("editor");
  const input = document.getElementById("search");
  const results = document.getElementById("results");
  const status = document.getElementById("search-status");
  const list = document.getElementById("city-list");
  const count = document.getElementById("city-count");
  const formatInputs = [...dialog.querySelectorAll('input[name="time-format"]')];
  const autoHint = document.getElementById("auto-hint");

  let found = [];
  let active = -1;
  let timer = 0;
  let token = 0;

  function setStatus(text) {
    status.textContent = text;
    status.hidden = !text;
  }

  function renderResults() {
    results.replaceChildren();
    const { cities, ms, twelve } = getState();
    const have = new Set(cities.map(cityKey));
    found.forEach((place, i) => {
      const added = have.has(cityKey(place));
      const clock = cityClock(place.tz, ms, twelve);
      const row = el("li", "result");
      row.id = `result-${i}`;
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(i === active));
      if (added) row.classList.add("is-added");
      const text = el("div", "result-text");
      text.append(el("div", "result-name", place.name), el("div", "result-sub", subtitle(place)));
      const meta = el("div", "result-meta");
      meta.append(el("span", "result-time", clockText(clock)), el("span", "result-offset", clock.offset));
      const badge = el("span", "result-badge", added ? "Added" : "Add");
      row.append(text, meta, badge);
      row.addEventListener("pointerdown", (e) => e.preventDefault());
      row.addEventListener("click", () => choose(i));
      row.addEventListener("pointermove", () => {
        if (active !== i) {
          active = i;
          highlight();
        }
      });
      results.append(row);
    });
    results.hidden = !found.length;
    input.setAttribute("aria-expanded", String(found.length > 0));
    highlight();
  }

  function highlight() {
    [...results.children].forEach((row, i) => row.setAttribute("aria-selected", String(i === active)));
    if (active >= 0) {
      input.setAttribute("aria-activedescendant", `result-${active}`);
      results.children[active]?.scrollIntoView({ block: "nearest" });
    } else {
      input.removeAttribute("aria-activedescendant");
    }
  }

  async function runSearch() {
    const query = input.value.trim();
    const mine = ++token;
    if (!query) {
      found = [];
      active = -1;
      setStatus("");
      renderResults();
      return;
    }
    try {
      const hits = await places.search(query);
      if (mine !== token) return;
      found = hits;
      active = hits.length ? 0 : -1;
      setStatus(hits.length ? "" : `No places match “${query}”`);
      renderResults();
    } catch (err) {
      if (mine !== token) return;
      found = [];
      setStatus("Place search is unavailable right now");
      renderResults();
      console.error(err);
    }
  }

  function choose(i) {
    const place = found[i];
    if (!place) return;
    const { cities } = getState();
    if (!cities.some((c) => cityKey(c) === cityKey(place))) onAdd(place);
    input.value = "";
    found = [];
    active = -1;
    setStatus("");
    renderResults();
    input.focus();
  }

  function renderList() {
    const { cities, ms, twelve } = getState();
    const rows = cities
      .map((city) => ({ city, clock: cityClock(city.tz, ms, twelve) }))
      .sort((a, b) => a.clock.offsetMinutes - b.clock.offsetMinutes || a.city.name.localeCompare(b.city.name));
    list.replaceChildren(
      ...rows.map(({ city, clock }) => {
        const row = el("li", "city-row");
        const text = el("div", "city-text");
        text.append(el("div", "city-name", city.name), el("div", "city-sub", subtitle(city)));
        const meta = el("div", "city-meta");
        const time = el("div", "city-time", clockText(clock));
        const sub = el("div", "city-offset", clock.dayLabel ? `${clock.offset} · ${clock.dayLabel}` : clock.offset);
        meta.append(time, sub);
        const remove = el("button", "remove");
        remove.type = "button";
        remove.setAttribute("aria-label", `Remove ${city.name}`);
        remove.title = "Remove";
        remove.innerHTML =
          '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
        remove.addEventListener("click", () => onRemove(city));
        row.append(text, meta, remove);
        return row;
      })
    );
    list.hidden = !rows.length;
    document.getElementById("empty-list").hidden = rows.length > 0;
    count.textContent = rows.length ? String(rows.length) : "";
  }

  function renderSettings() {
    const { settings } = getState();
    for (const radio of formatInputs) radio.checked = radio.value === settings.timeFormat;
    autoHint.textContent = systemUses12Hour() ? "12-hour" : "24-hour";
  }

  input.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(runSearch, SEARCH_DELAY);
  });

  input.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" && found.length) {
      e.preventDefault();
      active = (active + 1) % found.length;
      highlight();
    } else if (e.key === "ArrowUp" && found.length) {
      e.preventDefault();
      active = (active - 1 + found.length) % found.length;
      highlight();
    } else if (e.key === "Enter") {
      e.preventDefault();
      clearTimeout(timer);
      if (active >= 0) choose(active);
      else runSearch();
    } else if (e.key === "Escape" && input.value) {
      e.preventDefault();
      e.stopPropagation();
      input.value = "";
      runSearch();
    }
  });

  for (const radio of formatInputs) {
    radio.addEventListener("change", () => {
      if (radio.checked) onSettings({ timeFormat: radio.value });
    });
  }

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  dialog.querySelector(".done").addEventListener("click", () => dialog.close());
  dialog.addEventListener("close", () => {
    input.value = "";
    found = [];
    active = -1;
    setStatus("");
    renderResults();
    onToggle(false);
  });

  return {
    get isOpen() {
      return dialog.open;
    },
    open() {
      if (dialog.open) return;
      renderList();
      renderSettings();
      renderResults();
      dialog.showModal();
      input.focus();
      onToggle(true);
      places.warm().catch(() => setStatus("Place search is unavailable right now"));
    },
    refresh() {
      if (!dialog.open) return;
      renderList();
      renderSettings();
      if (found.length) renderResults();
    },
  };
}
