/* ============================================================
   Selah — storage layer
   Pure data. No DOM. Schema v1.
   ============================================================ */

(function (global) {
  'use strict';

  const KEY = 'selah.data.v1';
  const SCHEMA_VERSION = 1;

  const DUMMY_DATA = {
    version: 1,
    sessions: [
      { id: 'd1', book: 'GEN', from: 1,  to: 5,   note: 'In the beginning — God speaks order into chaos.', createdAt: '2026-09-14T07:12:00Z', updatedAt: '2026-09-14T07:12:00Z' },
      { id: 'd2', book: 'GEN', from: 6,  to: 11,  note: 'Noah, the flood, the tower of Babel.',           createdAt: '2026-09-15T06:45:00Z', updatedAt: '2026-09-15T06:45:00Z' },
      { id: 'd3', book: 'PSA', from: 1,  to: 20,  note: 'Starting through the Psalms slowly.',           createdAt: '2026-09-16T19:30:00Z', updatedAt: '2026-09-16T19:30:00Z' }
    ],
    deletedIds: [],
    settings: { theme: 'light', lastSync: null }
  };

  function defaultData() {
    return {
      version: SCHEMA_VERSION,
      sessions: [],
      deletedIds: [], // For Cloudflare sync
      settings: {
        theme: 'light',
        lastSync: null
      }
    };
  }

  function readRaw() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (e) {
      console.warn('Storage read failed:', e);
      return null;
    }
  }

  function writeRaw(data) {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
      // Notify app.js to trigger background sync
      global.dispatchEvent(new Event('selah-storage-changed'));
      return true;
    } catch (e) {
      console.error('Storage write failed:', e);
      return false;
    }
  }

  function read() {
    const raw = readRaw();
    if (!raw) return defaultData();
    const merged = { ...defaultData(), ...raw };
    if (!merged.deletedIds) merged.deletedIds = [];
    return merged;
  }

  function write(data) {
    return writeRaw(data);
  }

  function uuid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function nowISO() { return new Date().toISOString(); }

  function readChapterSet(data) {
    const set = new Set();
    (data.sessions || []).forEach((s) => {
      const max = global.BibleBooks.chaptersOf(s.book);
      const from = Math.max(1, Number(s.from) || 1);
      const to = Math.min(max, Number(s.to) || max);
      if (to < from) return;
      for (let c = from; c <= to; c++) set.add(`${s.book}-${c}`);
    });
    return set;
  }

  function bookProgress(data, bookId) {
    const set = readChapterSet(data);
    const total = global.BibleBooks.chaptersOf(bookId);
    let read = 0;
    for (let c = 1; c <= total; c++) {
      if (set.has(`${bookId}-${c}`)) read++;
    }
    return {
      book: bookId,
      read,
      total,
      percent: total ? Math.round((read / total) * 100) : 0,
      finished: total > 0 && read === total
    };
  }

  function overallProgress(data) {
    const set = readChapterSet(data);
    const total = global.BibleBooks.TOTAL_CHAPTERS;
    const read = set.size;
    return {
      read,
      total,
      percent: total ? Math.round((read / total) * 100) : 0
    };
  }

  function booksStarted(data) {
    const set = readChapterSet(data);
    const started = new Set();
    set.forEach((k) => started.add(k.split('-')[0]));
    return started.size;
  }

  function booksFinished(data) {
    const out = [];
    global.BibleBooks.all.forEach((b) => {
      const p = bookProgress(data, b.id);
      if (p.finished) out.push(b.id);
    });
    return out;
  }

  function bookCompletionDate(data, bookId) {
    const total = global.BibleBooks.chaptersOf(bookId);
    let latest = null;
    (data.sessions || []).forEach((s) => {
      if (s.book !== bookId) return;
      const from = Number(s.from) || 1;
      const to = Number(s.to) || 1;
      if (total >= from && total <= to) {
        if (!latest || new Date(s.createdAt) > new Date(latest)) latest = s.createdAt;
      }
    });
    if (!latest) {
      (data.sessions || []).forEach((s) => {
        if (s.book !== bookId) return;
        if (!latest || new Date(s.createdAt) > new Date(latest)) latest = s.createdAt;
      });
    }
    return latest;
  }

  function streak(data) {
    const sessions = data.sessions || [];
    if (!sessions.length) return 0;

    const days = new Set();
    sessions.forEach((s) => {
      const d = new Date(s.createdAt);
      if (isNaN(d)) return;
      days.add(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      );
    });

    function fmt(d) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    let cursor = new Date();
    let count = 0;

    if (!days.has(fmt(cursor))) {
      cursor.setDate(cursor.getDate() - 1);
      if (!days.has(fmt(cursor))) return 0;
    }

    while (days.has(fmt(cursor))) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }

  const api = {
    SCHEMA_VERSION,

    getData() { return read(); },
    setData(data) { return write(data); },
    reset() { return write(defaultData()); },

    addSession({ book, from, to, note = '' }) {
      const data = read();
      const max = global.BibleBooks.chaptersOf(book);
      const f = Math.max(1, Math.min(max, Number(from) || 1));
      const t = Math.max(f, Math.min(max, Number(to) || f));

      const wasFinishedBefore = bookProgress(data, book).finished;

      const session = {
        id: uuid(),
        book,
        from: f,
        to: t,
        note: String(note || '').trim(),
        createdAt: nowISO(),
        updatedAt: nowISO()
      };
      data.sessions.push(session);
      write(data);

      const progressAfter = bookProgress(data, book);
      const justCompleted = !wasFinishedBefore && progressAfter.finished;

      return { session, justCompleted };
    },

    updateSession(id, patch) {
      const data = read();
      const idx = data.sessions.findIndex((s) => s.id === id);
      if (idx === -1) return null;

      const wasFinishedBefore = bookProgress(data, data.sessions[idx].book).finished;

      const max = global.BibleBooks.chaptersOf(patch.book || data.sessions[idx].book);
      const f = Math.max(1, Math.min(max, Number(patch.from) || 1));
      const t = Math.max(f, Math.min(max, Number(patch.to) || f));

      const merged = {
        ...data.sessions[idx],
        ...patch,
        from: f,
        to: t,
        id,
        updatedAt: nowISO()
      };
      data.sessions[idx] = merged;
      write(data);

      const progressAfter = bookProgress(data, merged.book);
      const justCompleted = !wasFinishedBefore && progressAfter.finished;

      return { session: merged, justCompleted };
    },

    removeSession(id) {
      const data = read();
      const before = data.sessions.length;
      data.sessions = data.sessions.filter((s) => s.id !== id);
      
      // Add to tombstones for sync
      if (!data.deletedIds.includes(id)) {
        data.deletedIds.push(id);
      }
      
      write(data);
      return data.sessions.length < before;
    },

    getSession(id) {
      return read().sessions.find((s) => s.id === id) || null;
    },

    getSettings() { return read().settings; },

    updateSettings(patch) {
      const data = read();
      data.settings = { ...data.settings, ...patch };
      write(data);
      return data.settings;
    },

    readChapterSet,
    bookProgress,
    overallProgress,
    booksStarted,
    booksFinished,
    bookCompletionDate,
    streak,

    getDummyData() { return JSON.parse(JSON.stringify(DUMMY_DATA)); },

    _raw: { read, write, readRaw, writeRaw, KEY, defaultData }
  };

  global.Storage = api;
})(window);
