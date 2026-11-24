export function createPlacesClient() {
  let worker = null;
  let seq = 0;
  const pending = new Map();

  function failAll(message) {
    for (const { reject } of pending.values()) reject(new Error(message));
    pending.clear();
    worker?.terminate();
    worker = null;
  }

  function spawn() {
    const w = new Worker(new URL("./places-worker.js", import.meta.url), { type: "module" });
    w.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      if (!job) return;
      pending.delete(data.id);
      if (data.error) job.reject(new Error(data.error));
      else job.resolve(data.result);
    };
    w.onerror = (e) => failAll(e.message || "Place search failed to start");
    return w;
  }

  function call(op, arg) {
    worker ??= spawn();
    const id = ++seq;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      worker.postMessage({ id, op, arg });
    });
  }

  return {
    warm: () => call("load"),
    search: (query) => call("search", query),
    byTimeZone: (tz) => call("byTimeZone", tz),
    byName: (name) => call("byName", name),
  };
}
