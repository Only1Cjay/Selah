# Selah

**A quiet Bible study tracker — log your reading, watch your progress across every book.**

Selah is a simple, offline-first web app for tracking Bible reading, chapter by chapter. You read in your own Bible, then log each session — book, chapter range, and an optional note — and Selah keeps count: how many of the 1,189 chapters you have read, which books you have finished, and how many days in a row you have shown up. It was built by a PharmD student at the University of Benin for his own daily Bible study. There is no account to create and no server you depend on: your data lives in your own browser, with optional sync to your own Google Drive or to Cjay Cloud.

> "Selah" is the Hebrew word found in the Psalms, often understood as a pause — to stop, reflect, and take it in. That is the spirit of the app: slow, steady reading, not a race.

## Features

- **Log a session** — pick any of the 66 books (in canonical order), a chapter range, and an optional note. Chapter ranges are clamped to the book's real chapter count.
- **Overall progress** — a progress bar and count of chapters read out of 1,189, plus how many books you have started.
- **Per-book progress** — every book shows how much of it you have read; tapping a book opens a chapter grid where read chapters are marked.
- **Streak** — counts consecutive days with at least one logged session (today or yesterday keeps it alive).
- **Stats** — sessions logged, chapters read, books started and finished, and your current streak.
- **Badges** — one badge per finished book (66 in total), each showing the date you completed it.
- **Sessions history** — browse, search, edit, or delete past sessions; deleting offers an undo.
- **Search** — find sessions by book or note.
- **Export & backup** — export sessions to CSV, back up all data as a JSON file (`selah-backup-YYYY-MM-DD.json`), restore from a backup file, and print a progress report.
- **Sync (optional)** — sync via Google Drive, or via Cjay Cloud (a Cloudflare Worker) using a sync token. While offline, changes still save locally and sync later.
- **View-only mode** — a read-only view (with sample Genesis/Psalms sessions if there is no data yet) for sharing a look at progress without editing.
- **Five themes** — Burgundy (light), Leather (dark), Pastel, Midnight, and Sky. Your choice is saved on the device.
- **Offline PWA** — installable on your phone's home screen via the install banner; a service worker caches the app so it works without internet.

## What Selah is not

- It does **not** contain Bible text — you read in your own Bible (or Bible app) and log chapters here.
- It has **no reading plans, reminders, or verse-of-the-day** — it tracks what you actually read, nothing more.

## How to use

1. Open the app in a browser (or install it to your home screen from the install banner).
2. Tap **Log Session**, choose a book and chapter range, add a note if you like, and save.
3. Use the menu (☰) for Search, Sessions, Stats, Badges, Settings, and Tools.
4. In Settings you can change the theme, set up sync, back up your data, or reset everything.

No installation, build step, or account is needed — it runs entirely as static files.

## Tech stack

- Plain HTML, CSS, and JavaScript — no framework, no build step
- Data stored in the browser's `localStorage` (key: `selah.data.v1`, schema v1)
- Google Drive API (via `gapi` + Google Identity Services) and a Cloudflare Worker ("Cjay Cloud") for optional sync
- Font Awesome 6.5.1 and Google Fonts (Sora, IBM Plex Sans) via CDN
- Service worker (`sw.js`, currently v1.2.0) + web app manifest for offline use and installability

## Project structure

```
Selah/
├── index.html    # App shell: header, overall progress card, book list, FAB
├── app.js        # All app logic: sessions, progress, stats, badges,
│                 #   search, sync, backup/restore, export, printing
├── books.js      # Bible data: all 66 books, canonical order, chapter counts
├── storage.js    # Storage layer: sessions, progress, streaks, schema v1
├── styles.css    # All styling, including the five themes
├── sw.js         # Service worker (offline cache)
├── manifest.json # PWA manifest (name, icons, standalone display)
├── icon.svg      # App icon
└── README.md     # This file
```

## Status

Actively used by its author; the most recent commit at the time of writing was 25 October 2026. Data is stored locally in the browser, so clearing browser data without a backup or sync will lose it — export a backup from Settings every so often.
