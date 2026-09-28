/* ============================================================
   Selah — storage layer
   Pure data. No DOM. Schema v1.
   ============================================================ */

(function (global) {
  'use strict';

  const KEY = 'selah.data.v1';
  const SCHEMA_VERSION = 1;

  /* ---------------------------------------------------------- */
  /* Dummy data for ?view=1                                      */
  /* ---------------------------------------------------------- */
  const DUMMY_DATA = {
    version: 1,
    sessions: [
      { id: 'd1', book: 'GEN', from: 1,  to: 5,   note: 'In the beginning — God speaks order into chaos.', createdAt: '2026-09-14T07:12:00Z', updatedAt: '2026-09-14T07:12:00Z' },
      { id: 'd2', book: 'GEN', from: 6,  to: 11,  note: 'Noah, the flood, the tower of Babel.',           createdAt: '2026-09-15T06:45:00Z', updatedAt: '2026-09-15T06:45:00Z' },
      { id: 'd3', book: 'PSA', from: 1,  to: 20,  note: 'Starting through the Psalms slowly.',           createdAt: '2026-09-16T19:30:00Z', updatedAt: '2026-09-16T19:30:00Z' },
      { id: 'd4', book: 'PSA', from: 21, to: 41,  note: '',                                                 createdAt: '2026-09-18T20:10:00Z', updatedAt: '2026-09-18T20:10:00Z' },
      { id: 'd5', book: 'JHN', from: 1,  to: 3,   note: 'The Word became flesh.',                         createdAt: '2026-09-20T06:15:00Z', updatedAt: '2026-09-20T06:15:00Z' },
      { id: 'd6', book: 'JHN', from: 4,  to: 6,   note: '',                                                 createdAt: '2026-09-22T06:20:00Z', updatedAt: '2026-09-22T06:20:00Z' },
      { id: 'd7', book: 'ROM', from: 1,  to: 8,   note: 'The righteousness of God by faith.',             createdAt: '2026-09-25T21:00:00Z', updatedAt: '2026-09-25T21:00:00Z' },
      { id: 'd8', book: 'RUT', from: 1,  to: 4,   note: 'Finished Ruth in one sitting.',                  createdAt: '2026-09-27T08:30:00Z', updatedAt: '2026-09-27T08:30:00Z' }
    ],
    settings: {
      theme: 'light',
      lastSync: null
    }
  };

  /* ---------------------------------------------------------- */
  /* Default / read / write                                      */
  /* ---------------------------------------------------------- */
  function defaultData() {
    return {
      version: SCHEMA_VERSION,
      sessions: [],
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
      return true;
    } catch (e) {
      console.error('Storage write failed:', e);
      return false;
    }
  }

  function read() {
    const raw = readRaw();
    if (!raw) return defaultData();
    return { ...defaultData(), ...raw };
  }

  function write(data) {
    return writeRaw(data);
  }

  /* ---------------------------------------------------------- */
  /* Helpers                                                     */
  /* ---------------------------------------------------------- */
  function uuid() {
    if (global.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function nowISO() { return new Date().toISOString(); }

  /* ---------------------------------------------------------- */
  /* Derived: read chapter set                                   */
  /* ---------------------------------------------------------- */
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
    // Date the final chapter of the book was logged
    const total = global.BibleBooks.chaptersOf(bookId);
    const key = `${bookId}-${total}`;
    let latest = null;
    (data.sessions || []).forEach((s) => {
      if (s.book !== bookId) return;
      const from = Number(s.from) || 1;
      const to = Number(s.to) || 1;
      if (total >= from && total <= to) {
        if (!latest || new Date(s.createdAt) > new Date(latest)) latest = s.createdAt;
      }
    });
    // If the final chapter was covered but no single session covered it,
    // find the latest session in that book
    if (!latest) {
      (data.sessions || []).forEach((s) => {
        if (s.book !== bookId) return;
        if (!latest || new Date(s.createdAt) > new Date(latest)) latest = s.createdAt;
      });
    }
    return latest;
  }

  /* Streak: consecutive days ending today or yesterday with >=1 session */
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

  /* ---------------------------------------------------------- */
  /* Public API                                                  */
  /* ---------------------------------------------------------- */
  const api = {
    SCHEMA_VERSION,

    getData() { return read(); },
    setData(data) { return write(data); },
    reset() { return write(defaultData()); },

    /* Sessions */
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
      write(data);
      return data.sessions.length < before;
    },

    getSession(id) {
      return read().sessions.find((s) => s.id === id) || null;
    },

    /* Settings */
    getSettings() { return read().settings; },

    updateSettings(patch) {
      const data = read();
      data.settings = { ...data.settings, ...patch };
      write(data);
      return data.settings;
    },

    /* Derived */
    readChapterSet,
    bookProgress,
    overallProgress,
    booksStarted,
    booksFinished,
    bookCompletionDate,
    streak,

    /* Demo */
    getDummyData() { return JSON.parse(JSON.stringify(DUMMY_DATA)); },

    /* Debug */
    _raw: { read, write, readRaw, writeRaw, KEY, defaultData }
  };

  global.Storage = api;
})(window);
