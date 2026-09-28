/* ============================================================
   Selah — Bible book data
   66 books, canonical order, chapter counts.
   ============================================================ */

(function (global) {
  'use strict';

  const BOOKS = [
    /* ---------- Old Testament (39) ---------- */
    { id: 'GEN', name: 'Genesis',        chapters: 50,  testament: 'ot' },
    { id: 'EXO', name: 'Exodus',         chapters: 40,  testament: 'ot' },
    { id: 'LEV', name: 'Leviticus',      chapters: 27,  testament: 'ot' },
    { id: 'NUM', name: 'Numbers',        chapters: 36,  testament: 'ot' },
    { id: 'DEU', name: 'Deuteronomy',    chapters: 34,  testament: 'ot' },
    { id: 'JOS', name: 'Joshua',         chapters: 24,  testament: 'ot' },
    { id: 'JDG', name: 'Judges',         chapters: 21,  testament: 'ot' },
    { id: 'RUT', name: 'Ruth',           chapters: 4,   testament: 'ot' },
    { id: '1SA', name: '1 Samuel',       chapters: 31,  testament: 'ot' },
    { id: '2SA', name: '2 Samuel',       chapters: 24,  testament: 'ot' },
    { id: '1KI', name: '1 Kings',        chapters: 22,  testament: 'ot' },
    { id: '2KI', name: '2 Kings',        chapters: 25,  testament: 'ot' },
    { id: '1CH', name: '1 Chronicles',   chapters: 29,  testament: 'ot' },
    { id: '2CH', name: '2 Chronicles',   chapters: 36,  testament: 'ot' },
    { id: 'EZR', name: 'Ezra',           chapters: 10,  testament: 'ot' },
    { id: 'NEH', name: 'Nehemiah',       chapters: 13,  testament: 'ot' },
    { id: 'EST', name: 'Esther',         chapters: 10,  testament: 'ot' },
    { id: 'JOB', name: 'Job',            chapters: 42,  testament: 'ot' },
    { id: 'PSA', name: 'Psalms',         chapters: 150, testament: 'ot' },
    { id: 'PRO', name: 'Proverbs',       chapters: 31,  testament: 'ot' },
    { id: 'ECC', name: 'Ecclesiastes',   chapters: 12,  testament: 'ot' },
    { id: 'SNG', name: 'Song of Solomon',chapters: 8,   testament: 'ot' },
    { id: 'ISA', name: 'Isaiah',         chapters: 66,  testament: 'ot' },
    { id: 'JER', name: 'Jeremiah',       chapters: 52,  testament: 'ot' },
    { id: 'LAM', name: 'Lamentations',   chapters: 5,   testament: 'ot' },
    { id: 'EZK', name: 'Ezekiel',        chapters: 48,  testament: 'ot' },
    { id: 'DAN', name: 'Daniel',         chapters: 12,  testament: 'ot' },
    { id: 'HOS', name: 'Hosea',          chapters: 14,  testament: 'ot' },
    { id: 'JOL', name: 'Joel',           chapters: 3,   testament: 'ot' },
    { id: 'AMO', name: 'Amos',           chapters: 9,   testament: 'ot' },
    { id: 'OBA', name: 'Obadiah',        chapters: 1,   testament: 'ot' },
    { id: 'JON', name: 'Jonah',          chapters: 4,   testament: 'ot' },
    { id: 'MIC', name: 'Micah',          chapters: 7,   testament: 'ot' },
    { id: 'NAM', name: 'Nahum',          chapters: 3,   testament: 'ot' },
    { id: 'HAB', name: 'Habakkuk',       chapters: 3,   testament: 'ot' },
    { id: 'ZEP', name: 'Zephaniah',      chapters: 3,   testament: 'ot' },
    { id: 'HAG', name: 'Haggai',         chapters: 2,   testament: 'ot' },
    { id: 'ZEC', name: 'Zechariah',      chapters: 14,  testament: 'ot' },
    { id: 'MAL', name: 'Malachi',        chapters: 4,   testament: 'ot' },

    /* ---------- New Testament (27) ---------- */
    { id: 'MAT', name: 'Matthew',        chapters: 28,  testament: 'nt' },
    { id: 'MRK', name: 'Mark',           chapters: 16,  testament: 'nt' },
    { id: 'LUK', name: 'Luke',           chapters: 24,  testament: 'nt' },
    { id: 'JHN', name: 'John',           chapters: 21,  testament: 'nt' },
    { id: 'ACT', name: 'Acts',           chapters: 28,  testament: 'nt' },
    { id: 'ROM', name: 'Romans',         chapters: 16,  testament: 'nt' },
    { id: '1CO', name: '1 Corinthians',  chapters: 16,  testament: 'nt' },
    { id: '2CO', name: '2 Corinthians',  chapters: 13,  testament: 'nt' },
    { id: 'GAL', name: 'Galatians',      chapters: 6,   testament: 'nt' },
    { id: 'EPH', name: 'Ephesians',      chapters: 6,   testament: 'nt' },
    { id: 'PHP', name: 'Philippians',    chapters: 4,   testament: 'nt' },
    { id: 'COL', name: 'Colossians',     chapters: 4,   testament: 'nt' },
    { id: '1TH', name: '1 Thessalonians',chapters: 5,   testament: 'nt' },
    { id: '2TH', name: '2 Thessalonians',chapters: 3,   testament: 'nt' },
    { id: '1TI', name: '1 Timothy',      chapters: 6,   testament: 'nt' },
    { id: '2TI', name: '2 Timothy',      chapters: 4,   testament: 'nt' },
    { id: 'TIT', name: 'Titus',          chapters: 3,   testament: 'nt' },
    { id: 'PHM', name: 'Philemon',       chapters: 1,   testament: 'nt' },
    { id: 'HEB', name: 'Hebrews',        chapters: 13,  testament: 'nt' },
    { id: 'JAS', name: 'James',          chapters: 5,   testament: 'nt' },
    { id: '1PE', name: '1 Peter',        chapters: 5,   testament: 'nt' },
    { id: '2PE', name: '2 Peter',        chapters: 3,   testament: 'nt' },
    { id: '1JN', name: '1 John',         chapters: 5,   testament: 'nt' },
    { id: '2JN', name: '2 John',         chapters: 1,   testament: 'nt' },
    { id: '3JN', name: '3 John',         chapters: 1,   testament: 'nt' },
    { id: 'JUD', name: 'Jude',           chapters: 1,   testament: 'nt' },
    { id: 'REV', name: 'Revelation',     chapters: 22,  testament: 'nt' }
  ];

  const byId = Object.fromEntries(BOOKS.map((b) => [b.id, b]));
  const TOTAL_CHAPTERS = BOOKS.reduce((s, b) => s + b.chapters, 0);

  global.BibleBooks = {
    all: BOOKS,
    ot: BOOKS.filter((b) => b.testament === 'ot'),
    nt: BOOKS.filter((b) => b.testament === 'nt'),
    byId,
    TOTAL_CHAPTERS,
    get(id) { return byId[id] || null; },
    chaptersOf(id) { return byId[id] ? byId[id].chapters : 0; }
  };
})(window);
