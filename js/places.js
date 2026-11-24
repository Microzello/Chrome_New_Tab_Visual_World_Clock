const SPECIAL = { ł: "l", ø: "o", æ: "ae", œ: "oe", ß: "ss", đ: "d", ð: "d", þ: "th", ı: "i", ħ: "h" };
const SPECIAL_RE = /[łøæœßđðþıħ]/g;
const MAJOR = 2500;

const PUNCTUATION_RE = /[.'’`]/g;

export function fold(text) {
  const lower = text.toLowerCase().replace(PUNCTUATION_RE, "");
  if (!/[^\x00-\x7f]/.test(lower)) return lower;
  return lower
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(SPECIAL_RE, (c) => SPECIAL[c]);
}

const COUNTRY_ALIASES = {
  usa: "US", us: "US", america: "US", "united states of america": "US",
  uk: "GB", britain: "GB", "great britain": "GB", england: "GB", scotland: "GB", wales: "GB",
  uae: "AE", emirates: "AE", ksa: "SA", korea: "KR", "south korea": "KR", "north korea": "KP",
  holland: "NL", czechia: "CZ", "czech republic": "CZ", russia: "RU", turkey: "TR", turkiye: "TR",
  "ivory coast": "CI", burma: "MM", persia: "IR", drc: "CD", congo: "CG",
};

const REGION_ABBREVIATIONS = {
  US: {
    al: "Alabama", ak: "Alaska", az: "Arizona", ar: "Arkansas", ca: "California", co: "Colorado",
    ct: "Connecticut", de: "Delaware", dc: "District of Columbia", fl: "Florida", ga: "Georgia", hi: "Hawaii",
    id: "Idaho", il: "Illinois", in: "Indiana", ia: "Iowa", ks: "Kansas", ky: "Kentucky", la: "Louisiana",
    me: "Maine", md: "Maryland", ma: "Massachusetts", mi: "Michigan", mn: "Minnesota", ms: "Mississippi",
    mo: "Missouri", mt: "Montana", ne: "Nebraska", nv: "Nevada", nh: "New Hampshire", nj: "New Jersey",
    nm: "New Mexico", ny: "New York", nc: "North Carolina", nd: "North Dakota", oh: "Ohio", ok: "Oklahoma",
    or: "Oregon", pa: "Pennsylvania", ri: "Rhode Island", sc: "South Carolina", sd: "South Dakota",
    tn: "Tennessee", tx: "Texas", ut: "Utah", vt: "Vermont", va: "Virginia", wa: "Washington",
    wv: "West Virginia", wi: "Wisconsin", wy: "Wyoming", pr: "Puerto Rico",
  },
  CA: {
    ab: "Alberta", bc: "British Columbia", mb: "Manitoba", nb: "New Brunswick", nl: "Newfoundland and Labrador",
    ns: "Nova Scotia", nt: "Northwest Territories", nu: "Nunavut", on: "Ontario", pe: "Prince Edward Island",
    qc: "Quebec", sk: "Saskatchewan", yt: "Yukon",
  },
  AU: {
    nsw: "New South Wales", vic: "Victoria", qld: "Queensland", wa: "Western Australia", sa: "South Australia",
    tas: "Tasmania", act: "Australian Capital Territory", nt: "Northern Territory",
  },
};

let displayNames;
const countryNameCache = new Map();

export function countryName(code) {
  if (!code) return "";
  let name = countryNameCache.get(code);
  if (name === undefined) {
    try {
      displayNames ??= new Intl.DisplayNames([navigator.language, "en"], { type: "region" });
      name = displayNames.of(code) || code;
    } catch {
      name = code;
    }
    countryNameCache.set(code, name);
  }
  return name;
}

function parse(text) {
  const lines = text.split("\n");
  const tzs = lines[0].split("\t");
  const regions = lines[1].split("\t");
  const count = lines.length - 2;
  const db = {
    tzs,
    regions,
    regionKeys: regions.map(fold),
    count,
    names: new Array(count),
    keys: new Array(count),
    asciiKeys: new Array(count),
    alts: new Array(count),
    cc: new Array(count),
    region: new Uint16Array(count),
    tz: new Uint16Array(count),
    lat: new Float32Array(count),
    lon: new Float32Array(count),
  };
  for (let i = 0; i < count; i++) {
    const f = lines[i + 2].split("\t");
    db.names[i] = f[0];
    db.keys[i] = fold(f[0]);
    db.asciiKeys[i] = f[1] ? fold(f[1]) : null;
    db.alts[i] = f[2] ? f[2].split("|").map(fold) : null;
    db.cc[i] = f[3];
    db.region[i] = +f[4];
    db.lat[i] = +f[5];
    db.lon[i] = +f[6];
    db.tz[i] = +f[7];
  }
  return db;
}

let loading;

export function loadPlaces() {
  loading ??= (async () => {
    const res = await fetch(new URL("../data/cities.tsv.gz", import.meta.url));
    if (!res.ok) throw new Error(`places: ${res.status}`);
    const text = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).text();
    return parse(text);
  })();
  loading.catch(() => (loading = null));
  return loading;
}

function entry(db, i) {
  return {
    name: db.names[i],
    region: db.regions[db.region[i]],
    country: db.cc[i],
    lat: Math.round(db.lat[i] * 100) / 100,
    lon: Math.round(db.lon[i] * 100) / 100,
    tz: db.tzs[db.tz[i]],
  };
}

function regionMatcher(db, query) {
  const regionHits = new Set();
  const countryHits = new Set();
  const aliasCountry = COUNTRY_ALIASES[query];
  if (aliasCountry) countryHits.add(aliasCountry);
  for (const map of Object.values(REGION_ABBREVIATIONS)) {
    const full = map[query] && fold(map[query]);
    if (full) {
      const idx = db.regionKeys.indexOf(full);
      if (idx >= 0) regionHits.add(idx);
    }
  }
  db.regionKeys.forEach((key, idx) => {
    if (key && key.startsWith(query)) regionHits.add(idx);
  });
  for (const cc of new Set(db.cc)) {
    if (cc.toLowerCase() === query || fold(countryName(cc)).startsWith(query)) countryHits.add(cc);
  }
  return (i) => regionHits.has(db.region[i]) || countryHits.has(db.cc[i]);
}

function scan(db, name, region, limit) {
  if (!name) return [];
  const buckets = [[], [], [], []];
  const matchesRegion = region ? regionMatcher(db, region) : null;
  const wordStart = ` ${name}`;
  const dashStart = `-${name}`;
  const rankKey = (key, i) => {
    if (key === name) return 0;
    if (key.startsWith(name)) return 1;
    if (key.includes(wordStart) || key.includes(dashStart)) return i < MAJOR ? 1 : 3;
    return -1;
  };
  for (let i = 0; i < db.count; i++) {
    let rank = rankKey(db.keys[i], i);
    const ascii = db.asciiKeys[i];
    if (ascii && rank !== 0) {
      const r = rankKey(ascii, i);
      if (r >= 0 && (rank < 0 || r < rank)) rank = r;
    }
    const alts = db.alts[i];
    if (alts && rank !== 0) {
      for (const alt of alts) {
        if (alt === name) {
          rank = 0;
          break;
        }
        if (rank < 0 && alt.startsWith(name)) rank = 2;
      }
    }
    if (rank < 0 || buckets[rank].length >= limit) continue;
    if (matchesRegion && !matchesRegion(i)) continue;
    buckets[rank].push(i);
  }
  return buckets.flat();
}

export function searchPlaces(db, query, limit = 8) {
  const q = fold(query).replace(/\s+/g, " ").trim();
  if (!q) return [];
  const [namePart, ...rest] = q.split(",").map((s) => s.trim());
  const regionPart = rest.join(" ").trim();
  let hits = scan(db, namePart, regionPart, limit);

  if (hits.length < limit && !regionPart && namePart.includes(" ")) {
    const words = namePart.split(" ");
    for (let cut = words.length - 1; cut >= 1 && hits.length < limit; cut--) {
      const extra = scan(db, words.slice(0, cut).join(" "), words.slice(cut).join(" "), limit);
      hits = [...new Set([...hits, ...extra])];
    }
  }

  const seen = new Set();
  const out = [];
  for (const i of hits) {
    const id = `${db.keys[i]}|${db.region[i]}|${db.cc[i]}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(entry(db, i));
    if (out.length >= limit) break;
  }
  return out;
}

export function placeForTimeZone(db, tz) {
  const tzIndex = db.tzs.indexOf(tz);
  if (tzIndex < 0) return null;
  const cityKey = fold(tz.split("/").pop().replace(/_/g, " "));
  let first = -1;
  for (let i = 0; i < db.count; i++) {
    if (db.tz[i] !== tzIndex) continue;
    if (db.keys[i] === cityKey) return entry(db, i);
    if (first < 0) first = i;
  }
  return first >= 0 ? entry(db, first) : null;
}

export function placeByName(db, name) {
  return searchPlaces(db, name, 1)[0] || null;
}
