// Phone app only: stands in for the artifact runtime with a store kept in this browser.
window.__MANDALART_APP__ = true;
(function () {
  const KEY = 'mandalart-db-v1';
  let S = {};
  try { S = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (_) {}
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (_) {}
  const subs = [];
  const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (_) {} };
  const docSnap = p => ({ id: p.split('/').pop(), exists: p in S, data: () => clone(S[p]) });
  const colSnap = c => {
    const docs = Object.keys(S).filter(p => p.split('/').length === 2 && p.split('/')[0] === c).sort().map(docSnap);
    return { docs, size: docs.length, empty: !docs.length };
  };
  const fire = p => setTimeout(() => {
    for (const s of subs.slice()) {
      if (s.kind === 'doc' && s.path === p) s.cb(docSnap(p));
      if (s.kind === 'col' && p.split('/')[0] === s.path) s.cb(colSnap(s.path));
    }
  }, 0);
  const listen = (kind, path, cb, snap) => {
    const s = { kind, path, cb }; subs.push(s);
    setTimeout(() => cb(snap()), 0);
    return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); };
  };
  const docRef = p => ({
    id: p.split('/').pop(), path: p,
    get: async () => docSnap(p),
    set: async d => { S[p] = clone(d); persist(); fire(p); },
    update: async d => { S[p] = Object.assign({}, S[p], clone(d)); persist(); fire(p); },
    delete: async () => { delete S[p]; persist(); fire(p); },
    onSnapshot: cb => listen('doc', p, cb, () => docSnap(p))
  });
  const db = {
    doc: docRef,
    collection: c => ({ doc: id => docRef(c + '/' + id), get: async () => colSnap(c), onSnapshot: cb => listen('col', c, cb, () => colSnap(c)) })
  };
  window.claude = { use: async n => n === 'db' ? db : n === 'user' ? { can: async () => true } : null };
  if ('serviceWorker' in navigator) addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
