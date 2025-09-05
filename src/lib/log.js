// Simple localStorage-backed logging for Picture Diary
// Stores recent entries (cap) locally; provides export/clear helpers.
(function (global) {
  const KEY = 'pd_history_v1';
  const CAP = 500;

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  function load() {
    try {
      return safeParse(localStorage.getItem(KEY), []);
    } catch (_) {
      return [];
    }
  }

  function save(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (_) {
      return false;
    }
  }

  function add(type, payload) {
    const ts = new Date().toISOString();
    const entry = { id: ts + '_' + Math.random().toString(36).slice(2, 8), ts, type, ...payload };
    const list = load();
    list.push(entry);
    // cap oldest
    while (list.length > CAP) list.shift();
    save(list);
    return { ok: true, count: list.length, entry };
  }

  function list() { return load(); }
  function count() { return load().length; }
  function clear() { save([]); return true; }
  function exportJson(pretty = true) {
    const data = load();
    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  global.PDLog = { add, list, count, clear, exportJson };
})(window);

