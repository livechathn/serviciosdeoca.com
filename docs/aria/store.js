// store.js — generic per-origin IndexedDB stores via small factory.
// Mirror of lempyra's aria/store.js with oca_ prefix on DB names.

(function () {
  function createStore({ dbName, storeName = 'records', capBytes, maxRecords, hasBlobs = false }) {
    const listeners = { change: new Set() };
    let _dbPromise = null;

    const SCHEMA_VERSION = 3;

    function openDB() {
      if (_dbPromise) return _dbPromise;
      _dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(dbName, SCHEMA_VERSION);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          const oldV = e.oldVersion;
          for (const name of Array.from(db.objectStoreNames)) {
            db.deleteObjectStore(name);
          }
          const os = db.createObjectStore(storeName, { keyPath: 'id' });
          os.createIndex('ts', 'ts', { unique: false });
          console.log(`[store] ${dbName}: upgraded ${oldV} → ${SCHEMA_VERSION}, created store '${storeName}'`);
        };
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(storeName)) {
            console.error(`[store] ${dbName}: FATAL — store '${storeName}' missing after open. Forcing delete to recover.`);
            db.close();
            const del = indexedDB.deleteDatabase(dbName);
            del.onsuccess = () => { _dbPromise = null; openDB().then(resolve, reject); };
            del.onerror   = () => reject(del.error);
            return;
          }
          db.onversionchange = () => { db.close(); _dbPromise = null; };
          resolve(db);
        };
        req.onerror = () => {
          console.error(`[store] ${dbName}: open failed`, req.error);
          reject(req.error);
        };
        req.onblocked = () => {
          console.warn(`[store] ${dbName}: open blocked — close other tabs`);
        };
      });
      return _dbPromise;
    }
    function tx(mode) {
      return openDB().then(db => db.transaction(storeName, mode).objectStore(storeName));
    }
    function promisify(req) {
      return new Promise((resolve, reject) => {
        req.onsuccess = () => resolve(req.result);
        req.onerror   = () => reject(req.error);
      });
    }
    function emit(event) {
      for (const fn of listeners[event] || []) {
        try { fn(); } catch (_) {}
      }
    }

    async function indexAll() {
      const store = await tx('readonly');
      const out = [];
      return new Promise((resolve, reject) => {
        const req = store.openCursor();
        req.onsuccess = (e) => {
          const c = e.target.result;
          if (!c) return resolve(out);
          const r = c.value;
          out.push({ id: r.id, ts: r.ts || 0, bytes: r._bytes || 0 });
          c.continue();
        };
        req.onerror = () => reject(req.error);
      });
    }

    function recordBytes(record) {
      if (record._bytes) return record._bytes;
      let n = 0;
      if (Array.isArray(record.images)) {
        for (const im of record.images) n += im.blob?.size || 0;
      }
      if (record.blob) n += record.blob.size;
      const meta = { ...record };
      delete meta.blob; delete meta.images; delete meta._bytes;
      n += JSON.stringify(meta).length * 2;
      return n;
    }

    async function evictIfNeeded(incomingBytes = 0) {
      const all = (await indexAll()).sort((a, b) => a.ts - b.ts);
      let totalBytes = all.reduce((s, r) => s + r.bytes, 0) + incomingBytes;
      let count = all.length + 1;
      while (all.length && (count > maxRecords || totalBytes > capBytes)) {
        const victim = all.shift();
        try { await deleteOne(victim.id, /*silent*/ true); } catch (_) {}
        totalBytes -= victim.bytes;
        count--;
      }
    }

    async function put(record) {
      if (!record || !record.id) throw new Error('put: record.id required');
      if (typeof record.ts !== 'number') record.ts = Date.now();
      record._bytes = recordBytes(record);
      await evictIfNeeded(record._bytes);
      try {
        const store = await tx('readwrite');
        await promisify(store.put(record));
        console.log(`[store] ${dbName}: put ok id=${record.id} bytes=${record._bytes}`);
      } catch (err) {
        if (err && err.name === 'QuotaExceededError') {
          const all = (await indexAll()).sort((a, b) => a.ts - b.ts);
          const drop = Math.max(1, Math.floor(all.length / 4));
          for (let i = 0; i < drop; i++) await deleteOne(all[i].id, true);
          const store = await tx('readwrite');
          await promisify(store.put(record));
        } else {
          console.error(`[store] ${dbName}: put failed`, err, record);
          throw err;
        }
      }
      emit('change');
      return record.id;
    }

    async function get(id) {
      const store = await tx('readonly');
      const rec = await promisify(store.get(id));
      if (!rec) return null;
      if (Array.isArray(rec.images)) {
        rec.images = rec.images.map(im => ({
          ...im,
          objectUrl: im.blob ? URL.createObjectURL(im.blob) : null,
        }));
      } else if (rec.blob) {
        rec.objectUrl = URL.createObjectURL(rec.blob);
      }
      return rec;
    }

    async function list({ limit = 200 } = {}) {
      const store = await tx('readonly');
      const out = [];
      return new Promise((resolve, reject) => {
        const idx = store.index('ts');
        const req = idx.openCursor(null, 'prev');
        req.onsuccess = (e) => {
          const c = e.target.result;
          if (!c || out.length >= limit) return resolve(out);
          const r = c.value;
          const { blob: _b, images: _i, ...meta } = r;
          out.push({ ...meta, image_count: (r.images || []).length });
          c.continue();
        };
        req.onerror = () => reject(req.error);
      });
    }

    async function deleteOne(id, silent = false) {
      const store = await tx('readwrite');
      await promisify(store.delete(id));
      if (!silent) emit('change');
    }

    async function clear() {
      const store = await tx('readwrite');
      await promisify(store.clear());
      emit('change');
    }

    async function usage() {
      const all = await indexAll();
      const bytes = all.reduce((s, r) => s + r.bytes, 0);
      let browser = null;
      try {
        if (navigator.storage && navigator.storage.estimate) {
          const est = await navigator.storage.estimate();
          browser = { usage: est.usage, quota: est.quota };
        }
      } catch (_) {}
      return {
        bytes,
        count: all.length,
        cap_bytes:   capBytes,
        cap_records: maxRecords,
        cap_percent: Math.min(1, Math.max(bytes / capBytes, all.length / maxRecords)),
        browser,
      };
    }

    function on(event, fn) {
      if (!listeners[event]) listeners[event] = new Set();
      listeners[event].add(fn);
      return () => listeners[event].delete(fn);
    }

    return { put, get, list, delete: deleteOne, clear, usage, on };
  }

  const CAP_200_MB = 200 * 1024 * 1024;

  // oca_-prefixed so they never collide on shared local-dev origin with
  // lempyra's aria_* or operator canva's bare names.
  window.ImgStore = createStore({
    dbName:     'oca_imgStore',
    capBytes:   CAP_200_MB,
    maxRecords: 100,
    hasBlobs:   true,
  });
  window.ChatUserStore = createStore({
    dbName:     'oca_chatUserStore',
    capBytes:   CAP_200_MB,
    maxRecords: 50000,
    hasBlobs:   false,
  });
  window.ChatLLMStore = createStore({
    dbName:     'oca_chatLLMStore',
    capBytes:   CAP_200_MB,
    maxRecords: 50000,
    hasBlobs:   false,
  });
  window.RecipeStore = createStore({
    dbName:     'oca_recipeStore',
    capBytes:   CAP_200_MB,
    maxRecords: 1000,
    hasBlobs:   false,
  });
  window.SettingsStore = createStore({
    dbName:     'oca_settingsStore',
    capBytes:   CAP_200_MB,
    maxRecords: 1000,
    hasBlobs:   false,
  });

  async function totalUsage() {
    const stores = [window.ImgStore, window.ChatUserStore, window.ChatLLMStore, window.RecipeStore, window.SettingsStore];
    const all = await Promise.all(stores.map(s => s.usage().catch(() => ({bytes:0,count:0,cap_bytes:0}))));
    return all.reduce((acc, u) => ({
      bytes:     acc.bytes     + (u.bytes     || 0),
      count:     acc.count     + (u.count     || 0),
      cap_bytes: acc.cap_bytes + (u.cap_bytes || 0),
    }), {bytes: 0, count: 0, cap_bytes: 0});
  }
  window.Store = { totalUsage };

  const ALL_STORES = {
    Img:      'ImgStore',
    ChatUser: 'ChatUserStore',
    ChatLLM:  'ChatLLMStore',
    Recipe:   'RecipeStore',
    Settings: 'SettingsStore',
  };
  const ALL_DBS = ['oca_imgStore', 'oca_chatUserStore', 'oca_chatLLMStore', 'oca_recipeStore', 'oca_settingsStore'];

  window.StoreDebug = {
    async audit() {
      const out = {};
      for (const [name, gname] of Object.entries(ALL_STORES)) {
        const s = window[gname];
        try { out[name] = await s.usage(); } catch (e) { out[name] = `ERR: ${e.message}`; }
      }
      console.table(out);
      return out;
    },
    async total() {
      const t = await Store.totalUsage();
      console.log(`[store] total: ${(t.bytes/1024/1024).toFixed(2)} MB across ${t.count} records (cap ${(t.cap_bytes/1024/1024/1024).toFixed(2)} GB)`);
      return t;
    },
    async dump(which = 'img') {
      const map = { img: ImgStore, user: ChatUserStore, llm: ChatLLMStore, recipe: RecipeStore, settings: SettingsStore };
      const s = map[which.toLowerCase()] || ImgStore;
      const list = await s.list({limit: 10});
      console.table(list);
      return list;
    },
    async nuke() {
      if (!confirm('Delete ALL five IndexedDB databases? Will lose every saved record.')) return;
      for (const name of ALL_DBS) {
        await new Promise((res, rej) => {
          const r = indexedDB.deleteDatabase(name);
          r.onsuccess = res; r.onerror = () => rej(r.error); r.onblocked = res;
        });
        console.log(`[store] deleted database '${name}'`);
      }
      console.log('[store] all gone — reload the page');
    },
  };
})();
