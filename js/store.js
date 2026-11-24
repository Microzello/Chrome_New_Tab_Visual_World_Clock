const KEYS = ["cities", "settings"];
const LOCAL_PREFIX = "worldclock.";
const sync = globalThis.chrome?.storage?.sync;

export const DEFAULT_SETTINGS = { timeFormat: "auto" };

export async function loadState() {
  let raw = {};
  if (sync) {
    raw = await sync.get(KEYS);
    if (!raw.cities) {
      const local = await chrome.storage.local.get(KEYS);
      raw = { ...local, ...raw };
    }
  } else {
    for (const key of KEYS) {
      try {
        const value = localStorage.getItem(LOCAL_PREFIX + key);
        if (value) raw[key] = JSON.parse(value);
      } catch {}
    }
  }
  return {
    cities: Array.isArray(raw.cities) ? raw.cities : null,
    settings: { ...DEFAULT_SETTINGS, ...(raw.settings || {}) },
  };
}

export async function saveState(partial) {
  if (sync) {
    try {
      await sync.set(partial);
    } catch (err) {
      console.warn("Sync storage rejected write, keeping it on this device", err);
      await chrome.storage.local.set(partial);
      await sync.remove(Object.keys(partial)).catch(() => {});
    }
    return;
  }
  for (const [key, value] of Object.entries(partial)) {
    try {
      localStorage.setItem(LOCAL_PREFIX + key, JSON.stringify(value));
    } catch {}
  }
}

export function onExternalChange(callback) {
  if (sync) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" || area === "local") callback();
    });
  } else {
    window.addEventListener("storage", (e) => {
      if (e.key?.startsWith(LOCAL_PREFIX)) callback();
    });
  }
}

export function legacyCityNames() {
  try {
    const names = JSON.parse(localStorage.getItem("selectedCities") || "null");
    return Array.isArray(names) && names.length ? names : null;
  } catch {
    return null;
  }
}
