import { loadPlaces, placeByName, placeForTimeZone, searchPlaces } from "./places.js";

const ops = {
  load: (db) => db.count,
  search: (db, query) => searchPlaces(db, query, 8),
  byTimeZone: (db, tz) => placeForTimeZone(db, tz),
  byName: (db, name) => placeByName(db, name),
};

self.onmessage = async ({ data: { id, op, arg } }) => {
  try {
    const db = await loadPlaces();
    self.postMessage({ id, result: ops[op](db, arg) });
  } catch (err) {
    self.postMessage({ id, error: String(err?.message || err) });
  }
};
