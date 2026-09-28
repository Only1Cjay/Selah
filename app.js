/* ============================================================
   Selah — app.js
   Full app: shell + home (progress) + sessions + badges +
   stats + settings + drive sync + tools
   ============================================================ */

(() => {
  'use strict';

  const LS = {
    theme: 'selah.theme',
    installDismissed: 'selah.installDismissed'
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const state = {
    readOnly: false,
    demoMode: false,
    data: null,
    view: 'ot' // current testament tab
  };

  /* ---------------------------------------------------------- */
  /* URL flags                                                   */
  /* ---------------------------------------------------------- */
  function parseUrlFlags() {
    const params = new URLSearchParams(location.search);
    state.demoMode = params.get('view') === '1';
    state.readOnly = state.demoMode;
  }

  /* ---------------------------------------------------------- */
  /* Theme (5 palettes)                                          */
  /* ---------------------------------------------------------- */
  const THEMES = [
    { id: 'light',    name: 'Parchment',  isDark: false },
    { id: 'dark',     name: 'Deep',       isDark: true  },
    { id: 'pastel',   name: 'Pastel',     isDark: false },
    { id: 'midnight', name: 'Midnight',   isDark: true  },
    { id: 'sky',      name: 'Sky',        isDark: false }
  ];

  const themeToggle = $('#themeToggle');
  const themeIcon = $('#themeIcon');

  function isDarkTheme(id) {
    const t = THEMES.find((x) => x.id === id);
    return t ? t.isDark : false;
  }

  function applyTheme(id) {
    if (!THEMES.some((t) => t.id === id)) id = 'light';
    document.documentElement.setAttribute('data-theme', id);

    // Header icon reflects the theme's mode, not the next theme's
    const dark = isDarkTheme(id);
    themeIcon.className = dark ? 'fa-solid fa-sun' : 'fa-solid fa-moon';

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim();
      meta.setAttribute('content', bg || '#2A3F6B');
    }
  }

  themeToggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const dark = isDarkTheme(current);
    // Flip between light <-> dark pair; if a "special" palette is active,
    // flip to its natural counterpart (light->dark, dark->light)
    const next = dark ? 'light' : 'dark';
    applyTheme(next);
    if (!state.readOnly) {
      localStorage.setItem(LS.theme, next);
      Storage.updateSettings({ theme: next });
    }
  });

  /* ---------------------------------------------------------- */
  /* Menu                                                        */
  /* ---------------------------------------------------------- */
  const menuBtn = $('#menuBtn');
  const menuDropdown = $('#menuDropdown');
  const menuBackdrop = $('#menuBackdrop');

  function openMenu() {
    menuDropdown.hidden = false;
    menuBackdrop.hidden = false;
    menuBtn.setAttribute('aria-expanded', 'true');
  }

  function closeMenu() {
    menuDropdown.hidden = true;
    menuBackdrop.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuDropdown.hidden ? openMenu() : closeMenu();
  });

  menuBackdrop.addEventListener('click', closeMenu);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMenu();
      if (!$('#viewRoot').hidden) { closeView(); return; }
      closeModal();
    }
  });

  $$('.menu-item').forEach((item) => {
    item.addEventListener('click', () => {
      const action = item.dataset.action;
      closeMenu();
      handleMenuAction(action);
    });
  });

  function handleMenuAction(action) {
    switch (action) {
      case 'search':    openView('search');    break;
      case 'sessions':  openView('sessions');  break;
      case 'stats':     openView('stats');     break;
      case 'badges':    openView('badges');    break;
      case 'settings':  openView('settings');  break;
      case 'tools':     openToolsSheet();      break;
      case 'backup':    backupToFile();        break;
      case 'restore':   restoreFromFile();     break;
      case 'export':    exportCSV();           break;
      case 'print':     openView('stats');     break;
      case 'clear-data': confirmResetAll();    break;
    }
  }

  /* ---------------------------------------------------------- */
  /* Toast                                                       */
  /* ---------------------------------------------------------- */
  const toastStack = $('#toastStack');
  const MAX_TOASTS = 3;

  function toast(message, opts = {}) {
    const {
      icon = 'fa-circle-info',
      type = 'info',
      duration = 5000,
      action = null,
      persist = false
    } = opts;

    const existing = $$('.toast', toastStack);
    if (existing.length >= MAX_TOASTS) dismissToast(existing[0]);

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `
      <i class="fa-solid ${icon} toast-icon"></i>
      <span class="toast-msg"></span>
      ${action ? '<button class="toast-action"></button>' : ''}
      <button class="toast-close" aria-label="Dismiss"><i class="fa-solid fa-xmark"></i></button>
    `;
    el.querySelector('.toast-msg').textContent = message;

    if (action) {
      const btn = el.querySelector('.toast-action');
      btn.textContent = action.label;
      btn.addEventListener('click', () => {
        action.onClick?.();
        dismissToast(el);
      });
    }

    el.querySelector('.toast-close').addEventListener('click', () => dismissToast(el));
    toastStack.appendChild(el);

    if (!persist && duration > 0) {
      el._timer = setTimeout(() => dismissToast(el), duration);
    }
    return el;
  }

  function dismissToast(el) {
    if (!el || el._dismissed) return;
    el._dismissed = true;
    clearTimeout(el._timer);
    el.classList.add('leaving');
    setTimeout(() => el.remove(), 240);
  }

  /* ---------------------------------------------------------- */
  /* Modal                                                       */
  /* ---------------------------------------------------------- */
  const modalRoot = $('#modalRoot');
  const modalSlot = $('#modalSlot');
  const modalBackdrop = $('#modalBackdrop');

  function openModal(contentEl) {
    modalSlot.innerHTML = '';
    modalSlot.appendChild(contentEl);
    modalRoot.hidden = false;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    if (modalRoot.hidden) return;
    modalRoot.hidden = true;
    modalSlot.innerHTML = '';
    document.body.style.overflow = '';
    document.body.classList.remove('modal-open');
  }

  modalBackdrop.addEventListener('click', closeModal);

  /* ---------------------------------------------------------- */
  /* Utilities                                                   */
  /* ---------------------------------------------------------- */
  function escapeHTML(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function relativeTime(iso) {
    if (!iso) return '';
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    const weeks = Math.floor(days / 7);
    if (weeks < 4) return `${weeks}w ago`;
    return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  /* ---------------------------------------------------------- */
  /* View system                                                 */
  /* ---------------------------------------------------------- */
  const viewRoot = $('#viewRoot');

  function openView(name, payload = {}) {
    viewRoot.innerHTML = '';
    viewRoot.hidden = false;
    document.body.style.overflow = 'hidden';
    document.body.classList.add('view-open');

    const el = document.createElement('div');
    el.className = 'view';
    viewRoot.appendChild(el);

    if (name === 'search')        renderSearchView(el);
    else if (name === 'sessions') renderSessionsView(el, payload);
    else if (name === 'stats')    renderStatsView(el);
    else if (name === 'badges')   renderBadgesView(el);
    else if (name === 'settings') renderSettingsView(el);
    else renderPlaceholderView(el, name);
  }

  function closeView() {
    viewRoot.hidden = true;
    viewRoot.innerHTML = '';
    document.body.style.overflow = '';
    document.body.classList.remove('view-open');
  }

  function renderPlaceholderView(el, name) {
    el.innerHTML = `
      <div class="view-header">
        <button class="view-back" data-act="back" aria-label="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h2 class="view-title">${escapeHTML(name)}</h2>
      </div>
      <div class="view-body">
        <div style="padding:48px 24px; text-align:center; color:var(--muted);">
          Coming soon.
        </div>
      </div>
    `;
    el.querySelector('[data-act="back"]').addEventListener('click', closeView);
  }

  function viewHeaderHTML(title, rightHTML = '') {
    return `
      <div class="view-header">
        <button class="view-back" data-act="back" aria-label="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <h2 class="view-title">${escapeHTML(title)}</h2>
        <div class="view-actions">${rightHTML}</div>
      </div>`;
  }

  /* ---------------------------------------------------------- */
  /* Offline banner                                              */
  /* ---------------------------------------------------------- */
  const offlineBanner = $('#offlineBanner');
  function updateOnlineStatus() {
    offlineBanner.classList.toggle('show', !navigator.onLine);
  }
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  /* ---------------------------------------------------------- */
  /* Install prompt                                              */
  /* ---------------------------------------------------------- */
  const installBanner = $('#installBanner');
  const installAccept = $('#installAccept');
  const installDismiss = $('#installDismiss');
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (localStorage.getItem(LS.installDismissed) !== '1') {
      installBanner.hidden = false;
    }
  });

  installAccept.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installBanner.hidden = true;
    toast(outcome === 'accepted' ? 'Installing…' : 'Install dismissed', {
      type: outcome === 'accepted' ? 'success' : 'info',
      icon: 'fa-circle-down'
    });
  });

  installDismiss.addEventListener('click', () => {
    installBanner.hidden = true;
    localStorage.setItem(LS.installDismissed, '1');
  });

  /* ---------------------------------------------------------- */
  /* Service worker                                              */
  /* ---------------------------------------------------------- */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((reg) => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateToast(reg);
            }
          });
        });
        setInterval(() => reg.update(), 30 * 60 * 1000);
      }).catch((err) => console.warn('SW registration failed:', err));
    });
  }

  function showUpdateToast(reg) {
    const menuBadge = $('#menuBadge');
    const el = toast('New version available', {
      icon: 'fa-arrows-rotate',
      type: 'info',
      persist: true,
      action: {
        label: 'Refresh',
        onClick: () => {
          reg.waiting?.postMessage({ type: 'SKIP_WAITING' });
          setTimeout(() => window.location.reload(), 200);
        }
      }
    });

    setTimeout(() => {
      if (el && !el._dismissed) {
        dismissToast(el);
        menuBadge.hidden = false;
      }
    }, 30000);

    menuBadge.addEventListener('click', () => {
      menuBadge.hidden = true;
      showUpdateToast(reg);
    }, { once: true });
  }

  let refreshing = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });

  /* ============================================================ */
  /* HOME — progress                                             */
  /* ============================================================ */

  const bookListEl = $('#bookList');
  const overallPercent = $('#overallPercent');
  const overallFill = $('#overallFill');
  const overallSub = $('#overallSub');
  const streakCountEl = $('#streakCount');
  const addSessionFab = $('#addSessionFab');

  function refresh() {
    state.data = state.readOnly ? state.data : Storage.getData();
    renderAll();
  }

  function renderAll() {
    renderStreak();
    renderOverall();
    renderBookList();
  }

  function renderStreak() {
    streakCountEl.textContent = Storage.streak(state.data);
  }

  function renderOverall() {
    const p = Storage.overallProgress(state.data);
    overallPercent.textContent = `${p.percent}%`;
    overallFill.style.width = `${p.percent}%`;

    const started = Storage.booksStarted(state.data);
    overallSub.textContent =
      `${p.read} of ${p.total} chapters · ${started} book${started === 1 ? '' : 's'} started`;
  }

   function renderBookList() {
    const data = state.data;
    const reading = BibleBooks.all.filter((b) => {
      const p = Storage.bookProgress(data, b.id);
      return p.read > 0 && !p.finished;
    });

    bookListEl.innerHTML = '';

    const title = document.createElement('div');
    title.className = 'home-section-title';
    title.textContent = reading.length
      ? `Currently reading · ${reading.length}`
      : 'Currently reading';
    bookListEl.appendChild(title);

    if (!reading.length) {
      const empty = document.createElement('div');
      empty.className = 'home-empty';
      empty.innerHTML = `
        <i class="fa-solid fa-book-open-reader"></i>
        <div class="home-empty-title">Nothing in progress</div>
        <div class="home-empty-sub">
          Tap <strong>Log Session</strong> to start a new reading,
          or open <strong>Search</strong> from the menu to browse all 66 books.
        </div>
      `;
      bookListEl.appendChild(empty);
      return;
    }

    reading.forEach((b) => bookListEl.appendChild(renderBookRow(b)));
  }

  function renderBookRow(book) {
    const p = Storage.bookProgress(state.data, book.id);
    const row = document.createElement('div');
    row.className = 'book-row' + (p.finished ? ' finished' : '') + (p.read > 0 ? ' started' : '');
    row.dataset.bookId = book.id;

    row.innerHTML = `
      <div class="book-row-head">
        <div class="book-row-title">
          <span class="book-name">${escapeHTML(book.name)}</span>
          ${p.finished ? '<span class="book-badge"><i class="fa-solid fa-check"></i></span>' : ''}
        </div>
        <div class="book-row-meta">
          <span class="book-count num">${p.read}/${p.total}</span>
          <span class="book-percent num">${p.percent}%</span>
          <span class="chevron"><i class="fa-solid fa-chevron-down"></i></span>
        </div>
      </div>
      <div class="book-track"><div class="book-fill" style="width:${p.percent}%"></div></div>
      <div class="book-grid-wrap" hidden>
        <div class="book-grid" data-book="${book.id}"></div>
      </div>
    `;

    const head = row.querySelector('.book-row-head');
    const gridWrap = row.querySelector('.book-grid-wrap');
    const grid = row.querySelector('.book-grid');
    const chevron = row.querySelector('.chevron');

    head.addEventListener('click', () => {
      const isOpen = !gridWrap.hidden;
      if (isOpen) {
        gridWrap.hidden = true;
        chevron.classList.remove('open');
        return;
      }
      renderChapterGrid(grid, book.id);
      gridWrap.hidden = false;
      chevron.classList.add('open');
    });

    return row;
  }

  function renderChapterGrid(container, bookId) {
    const total = BibleBooks.chaptersOf(bookId);
    const set = Storage.readChapterSet(state.data);
    const chaptersHTML = [];
    for (let c = 1; c <= total; c++) {
      const read = set.has(`${bookId}-${c}`);
      chaptersHTML.push(`<span class="chapter-cell ${read ? 'read' : 'unread'}">${c}</span>`);
    }
    container.innerHTML = chaptersHTML.join('');
  }


  /* FAB */
  addSessionFab.addEventListener('click', () => {
    if (state.readOnly) return;
    openSessionSheet({ mode: 'add' });
  });

  if (state.readOnly) addSessionFab.hidden = true;

  /* ============================================================ */
  /* Session sheet (add / edit)                                  */
  /* ============================================================ */

  function openSessionSheet({ mode = 'add', sessionId = null, presetBook = null } = {}) {
    const editing = mode === 'edit' && sessionId
      ? Storage.getSession(sessionId)
      : null;

    let currentBook = editing?.book || presetBook || 'GEN';
    let from = editing?.from ?? 1;
    let to = editing?.to ?? 1;
    let note = editing?.note ?? '';

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet session-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">${editing ? 'Edit Session' : 'Log a Session'}</h3>

      <label class="field">
        <span class="field-label">Book</span>
        <div class="book-picker-wrap">
          <button type="button" class="book-picker-trigger" id="bookTrigger">
            <span id="bookTriggerLabel">Genesis</span>
            <i class="fa-solid fa-chevron-down"></i>
          </button>
          <div class="book-picker-menu" id="bookMenu" hidden></div>
        </div>
      </label>

      <div class="field">
        <span class="field-label">Chapters</span>
        <div class="range-row">
          <div class="range-cell">
            <span class="range-cell-label">From</span>
            <div class="range-stepper">
              <button type="button" data-act="from-dec" aria-label="Decrease from">−</button>
              <input type="number" id="fromInput" min="1" inputmode="numeric" value="${from}">
              <button type="button" data-act="from-inc" aria-label="Increase from">+</button>
            </div>
          </div>
          <div class="range-cell">
            <span class="range-cell-label">To</span>
            <div class="range-stepper">
              <button type="button" data-act="to-dec" aria-label="Decrease to">−</button>
              <input type="number" id="toInput" min="1" inputmode="numeric" value="${to}">
              <button type="button" data-act="to-inc" aria-label="Increase to">+</button>
            </div>
          </div>
        </div>
        <div class="field-hint" id="rangeHint"></div>
      </div>

      <label class="field">
        <span class="field-label">Note <span class="opt">(optional)</span></span>
        <textarea id="noteInput" rows="3" placeholder="Anything you want to remember from this reading…">${editing ? escapeHTML(editing.note || '') : ''}</textarea>
      </label>

      <div class="sheet-actions ${editing ? 'three' : ''}">
        ${editing ? '<button class="btn-danger-ghost" data-act="delete"><i class="fa-solid fa-trash-can"></i> Delete</button>' : ''}
        <button class="btn-ghost" data-act="cancel">Cancel</button>
        <button class="btn-primary" data-act="save">${editing ? 'Save' : 'Log'}</button>
      </div>
    `;
    openModal(sheet);

    const bookTrigger = sheet.querySelector('#bookTrigger');
    const bookTriggerLabel = sheet.querySelector('#bookTriggerLabel');
    const bookMenu = sheet.querySelector('#bookMenu');
    const fromInput = sheet.querySelector('#fromInput');
    const toInput = sheet.querySelector('#toInput');
    const noteInput = sheet.querySelector('#noteInput');
    const rangeHint = sheet.querySelector('#rangeHint');

    function bookMax() { return BibleBooks.chaptersOf(currentBook); }
    function bookName() { return BibleBooks.get(currentBook)?.name || currentBook; }

    function updateBook() {
      bookTriggerLabel.textContent = bookName();
      const max = bookMax();
      if (from > max) from = max;
      if (to > max) to = max;
      if (from < 1) from = 1;
      if (to < from) to = from;
      fromInput.value = from;
      toInput.value = to;
      fromInput.max = max;
      toInput.max = max;
      updateHint();
    }

    function updateHint() {
      const max = bookMax();
      const count = to - from + 1;
      rangeHint.textContent = `${count} chapter${count === 1 ? '' : 's'} · ${bookName()} has ${max} total`;
    }

    // --- Book picker ---
    function buildBookMenu() {
      const otHTML = `
        <div class="book-menu-section">
          <div class="book-menu-heading">Old Testament</div>
          ${BibleBooks.ot.map((b) => `
            <button type="button" class="book-menu-item ${b.id === currentBook ? 'active' : ''}" data-book="${b.id}">
              <span>${escapeHTML(b.name)}</span>
              <span class="book-menu-count">${b.chapters}</span>
            </button>
          `).join('')}
        </div>`;
      const ntHTML = `
        <div class="book-menu-section">
          <div class="book-menu-heading">New Testament</div>
          ${BibleBooks.nt.map((b) => `
            <button type="button" class="book-menu-item ${b.id === currentBook ? 'active' : ''}" data-book="${b.id}">
              <span>${escapeHTML(b.name)}</span>
              <span class="book-menu-count">${b.chapters}</span>
            </button>
          `).join('')}
        </div>`;
      bookMenu.innerHTML = otHTML + ntHTML;

      bookMenu.querySelectorAll('.book-menu-item').forEach((item) => {
        item.addEventListener('click', () => {
          currentBook = item.dataset.book;
          bookMenu.hidden = true;
          updateBook();
        });
      });
    }

    bookTrigger.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !bookMenu.hidden;
      if (isOpen) {
        bookMenu.hidden = true;
      } else {
        buildBookMenu();
        bookMenu.hidden = false;
        // Scroll active into view
        const active = bookMenu.querySelector('.book-menu-item.active');
        if (active) setTimeout(() => active.scrollIntoView({ block: 'center' }), 40);
      }
    });

    sheet.addEventListener('click', (e) => {
      if (!e.target.closest('.book-picker-wrap')) bookMenu.hidden = true;
    });

    // --- Steppers ---
    function setFrom(v) {
      const max = bookMax();
      from = Math.max(1, Math.min(max, v));
      if (to < from) to = from;
      fromInput.value = from;
      toInput.value = to;
      updateHint();
    }
    function setTo(v) {
      const max = bookMax();
      to = Math.max(1, Math.min(max, v));
      if (to < from) from = to;
      fromInput.value = from;
      toInput.value = to;
      updateHint();
    }

    sheet.querySelector('[data-act="from-dec"]').addEventListener('click', () => setFrom(from - 1));
    sheet.querySelector('[data-act="from-inc"]').addEventListener('click', () => setFrom(from + 1));
    sheet.querySelector('[data-act="to-dec"]').addEventListener('click', () => setTo(to - 1));
    sheet.querySelector('[data-act="to-inc"]').addEventListener('click', () => setTo(to + 1));

    fromInput.addEventListener('input', () => setFrom(Number(fromInput.value) || 1));
    toInput.addEventListener('input', () => setTo(Number(toInput.value) || 1));

    // --- Actions ---
    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);

    sheet.querySelector('[data-act="save"]').addEventListener('click', () => {
      note = noteInput.value;

      if (editing) {
        const res = Storage.updateSession(editing.id, {
          book: currentBook, from, to, note
        });
        closeModal();
        refresh();
        if (res?.justCompleted) {
          celebrateBook(currentBook);
        } else {
          toast('Session updated', { type: 'success', icon: 'fa-check' });
        }
      } else {
        const res = Storage.addSession({
          book: currentBook, from, to, note
        });
        closeModal();
        refresh();
        if (res?.justCompleted) {
          celebrateBook(currentBook);
        } else {
          toast('Session logged', { type: 'success', icon: 'fa-book-bible' });
        }
      }
    });

    if (editing) {
      sheet.querySelector('[data-act="delete"]').addEventListener('click', () => {
        closeModal();
        doDeleteSessionWithUndo(editing);
      });
    }

    updateBook();
  }

  function doDeleteSessionWithUndo(session) {
    Storage.removeSession(session.id);
    refresh();

    toast('Session removed', {
      type: 'info',
      icon: 'fa-trash-can',
      duration: 5000,
      action: {
        label: 'Undo',
        onClick: () => {
          const data = Storage.getData();
          data.sessions.push(session);
          Storage.setData(data);
          refresh();
          toast('Restored', { type: 'success', icon: 'fa-rotate-left' });
        }
      }
    });
  }

  function celebrateBook(bookId) {
    const book = BibleBooks.get(bookId);
    if (!book) return;
    const el = toast(`Book complete — ${book.name}!`, {
      type: 'success',
      icon: 'fa-award',
      duration: 8000
    });
    el.classList.add('toast-celebrate');
  }

  /* ============================================================ */
  /* SEARCH                                                       */
  /* ============================================================ */

  function renderSearchView(root) {
    let filter = 'all'; // all | reading | finished | notstarted

    root.innerHTML = `
      <div class="view-header view-header-search">
        <button class="view-back" data-act="back" aria-label="Back">
          <i class="fa-solid fa-arrow-left"></i>
        </button>
        <div class="search-input-wrap">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" id="searchInput" placeholder="Search books and notes…" autocomplete="off" spellcheck="false">
          <button class="search-clear" id="searchClear" hidden aria-label="Clear">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </div>
      <div class="browse-chips" id="browseChips">
        <button class="browse-chip active" data-filter="all">All</button>
        <button class="browse-chip" data-filter="reading">Reading</button>
        <button class="browse-chip" data-filter="finished">Finished</button>
        <button class="browse-chip" data-filter="notstarted">Not started</button>
      </div>
      <div class="view-body" id="searchResults"></div>
    `;

    root.querySelector('[data-act="back"]').addEventListener('click', closeView);

    const input = root.querySelector('#searchInput');
    const clearBtn = root.querySelector('#searchClear');
    const results = root.querySelector('#searchResults');
    const chipBar = root.querySelector('#browseChips');

    chipBar.querySelectorAll('.browse-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        filter = chip.dataset.filter;
        chipBar.querySelectorAll('.browse-chip').forEach((c) => {
          c.classList.toggle('active', c.dataset.filter === filter);
        });
        render();
      });
    });

    function matchesFilter(b) {
      const p = Storage.bookProgress(state.data, b.id);
      if (filter === 'reading')     return p.read > 0 && !p.finished;
      if (filter === 'finished')    return p.finished;
      if (filter === 'notstarted')  return p.read === 0;
      return true;
    }

    function bookRowHTML(b, query) {
      const p = Storage.bookProgress(state.data, b.id);
      const bookLabel = query ? highlight(b.name, query) : escapeHTML(b.name);
      const status =
        p.finished ? 'Finished' :
        p.read > 0 ? `${p.read} / ${p.total} · ${p.percent}%` :
        `${p.total} chapters`;
      return `
        <button class="browse-row" data-book="${b.id}">
          <div class="browse-row-left">
            <div class="browse-row-title">
              ${bookLabel}
              ${p.finished ? '<span class="book-badge sm"><i class="fa-solid fa-check"></i></span>' : ''}
            </div>
            <div class="browse-row-sub">${escapeHTML(status)}</div>
          </div>
          ${p.read > 0 && !p.finished ? `
            <div class="browse-row-track">
              <div class="browse-row-fill" style="width:${p.percent}%"></div>
            </div>` : ''}
          ${p.read === 0 ? `
            <div class="browse-row-track empty"></div>` : ''}
        </button>`;
    }

    function render() {
      const q = input.value.trim().toLowerCase();
      clearBtn.hidden = !q;

      // --- Note matches (only when there's a query) ---
      const noteMatches = q
        ? (state.data.sessions || []).filter((s) =>
            (s.note || '').toLowerCase().includes(q)
          )
        : [];

      // --- Book matches ---
      const filteredBooks = BibleBooks.all.filter(matchesFilter);

      let filteredByQuery = filteredBooks;
      if (q) {
        filteredByQuery = filteredBooks.filter((b) =>
          b.name.toLowerCase().includes(q)
        );
      }

      // --- Empty state ---
      if (!filteredByQuery.length && !noteMatches.length) {
        if (q) {
          results.innerHTML = `
            <div class="search-hint">
              <i class="fa-solid fa-face-frown"></i>
              <div class="search-hint-title">No matches</div>
              <div class="search-hint-sub">Nothing found for "<strong>${escapeHTML(q)}</strong>".</div>
            </div>`;
        } else {
          const filterLabels = {
            reading: 'No books in progress',
            finished: 'No books finished yet',
            notstarted: 'Every book has been started'
          };
          results.innerHTML = `
            <div class="search-hint">
              <i class="fa-solid fa-book-bible"></i>
              <div class="search-hint-title">${filterLabels[filter] || 'Nothing here'}</div>
            </div>`;
        }
        return;
      }

      let html = '';

      // Books
      if (filteredByQuery.length) {
        if (q) {
          html += `<div class="search-section-label">Books</div>`;
          filteredByQuery.forEach((b) => {
            html += bookRowHTML(b, q);
          });
        } else if (filter === 'all') {
          // Group by testament
          const ot = filteredByQuery.filter((b) => b.testament === 'ot');
          const nt = filteredByQuery.filter((b) => b.testament === 'nt');
          if (ot.length) {
            html += `<div class="search-section-label">Old Testament</div>`;
            ot.forEach((b) => { html += bookRowHTML(b, ''); });
          }
          if (nt.length) {
            html += `<div class="search-section-label">New Testament</div>`;
            nt.forEach((b) => { html += bookRowHTML(b, ''); });
          }
        } else {
          filteredByQuery.forEach((b) => { html += bookRowHTML(b, ''); });
        }
      }

      // Notes
      if (noteMatches.length) {
        html += `<div class="search-section-label">Notes</div>`;
        noteMatches.slice(0, 30).forEach((s) => {
          const book = BibleBooks.get(s.book);
          const bookName = book ? book.name : s.book;
          html += `
            <button class="search-result" data-session="${s.id}">
              <span class="search-result-body">
                <span class="search-result-topic">${escapeHTML(bookName)} ${s.from}–${s.to}</span>
                <span class="search-result-sub">${highlight(s.note || '', q)}</span>
              </span>
            </button>`;
        });
      }

      results.innerHTML = html;

      results.querySelectorAll('[data-book]').forEach((btn) => {
        btn.addEventListener('click', () => {
          openBookDetailSheet(btn.dataset.book);
        });
      });

      results.querySelectorAll('[data-session]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.session;
          closeView();
          setTimeout(() => openSessionDetail(id), 100);
        });
      });
    }

    function highlight(text, query) {
      const t = String(text || '');
      if (!query) return escapeHTML(t);
      const idx = t.toLowerCase().indexOf(query.toLowerCase());
      if (idx === -1) return escapeHTML(t);
      return escapeHTML(t.slice(0, idx)) +
             '<mark>' + escapeHTML(t.slice(idx, idx + query.length)) + '</mark>' +
             escapeHTML(t.slice(idx + query.length));
    }

    input.addEventListener('input', render);
    clearBtn.addEventListener('click', () => {
      input.value = '';
      input.focus();
      render();
    });

    setTimeout(() => input.focus(), 100);
    render();
  }

  /* ---------------------------------------------------------- */
  /* Book detail sheet (from search)                             */
  /* ---------------------------------------------------------- */
  function openBookDetailSheet(bookId) {
    const book = BibleBooks.get(bookId);
    if (!book) return;
    const p = Storage.bookProgress(state.data, bookId);
    const set = Storage.readChapterSet(state.data);

    const grid = [];
    for (let c = 1; c <= book.chapters; c++) {
      const read = set.has(`${bookId}-${c}`);
      grid.push(`<span class="chapter-cell ${read ? 'read' : 'unread'}">${c}</span>`);
    }

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet book-detail-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="book-detail-head">
        <div>
          <div class="book-detail-eyebrow">${book.testament === 'ot' ? 'Old Testament' : 'New Testament'}</div>
          <h2 class="book-detail-title">
            ${escapeHTML(book.name)}
            ${p.finished ? '<span class="book-badge"><i class="fa-solid fa-check"></i></span>' : ''}
          </h2>
        </div>
        <button class="icon-btn" data-act="close" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>

      <div class="book-detail-stats">
        <div class="book-detail-stat">
          <span>Read</span>
          <strong class="num">${p.read} / ${p.total}</strong>
        </div>
        <div class="book-detail-stat">
          <span>Progress</span>
          <strong class="num">${p.percent}%</strong>
        </div>
      </div>

      <div class="book-detail-grid">
        ${grid.join('')}
      </div>

      <div class="sheet-actions">
        <button class="btn-ghost" data-act="close2">Close</button>
        ${!state.readOnly ? `
          <button class="btn-primary" data-act="log">
            <i class="fa-solid fa-plus"></i> Log session
          </button>
        ` : ''}
      </div>
    `;
    openModal(sheet);

    sheet.querySelector('[data-act="close"]').addEventListener('click', closeModal);
    sheet.querySelector('[data-act="close2"]').addEventListener('click', closeModal);

    const logBtn = sheet.querySelector('[data-act="log"]');
    if (logBtn) {
      logBtn.addEventListener('click', () => {
        closeModal();
        if (!$('#viewRoot').hidden) closeView();
        setTimeout(() => openSessionSheet({ mode: 'add', presetBook: bookId }), 120);
      });
    }
  }
  /* ============================================================ */
  /* SESSIONS                                                     */
  /* ============================================================ */

  function renderSessionsView(root, payload = {}) {
    let filter = payload.book || 'all';

    root.innerHTML = `
      ${viewHeaderHTML('Sessions')}
      <div class="sessions-filter" id="sessionsFilter"></div>
      <div class="view-body" id="sessionsBody"></div>
    `;

    root.querySelector('[data-act="back"]').addEventListener('click', closeView);

    const filterBar = root.querySelector('#sessionsFilter');
    const body = root.querySelector('#sessionsBody');

    function subjectsWithSessions() {
      const set = new Set();
      (state.data.sessions || []).forEach((s) => set.add(s.book));
      return Array.from(set);
    }

    function renderFilters() {
      const books = subjectsWithSessions();
      if (!books.length) { filterBar.innerHTML = ''; return; }

      const chips = ['all', ...books];
      filterBar.innerHTML = chips.map((id) => {
        const label = id === 'all' ? 'All' : (BibleBooks.get(id)?.name || id);
        return `<button class="sessions-chip ${id === filter ? 'active' : ''}" data-filter="${id}">${escapeHTML(label)}</button>`;
      }).join('');

      filterBar.querySelectorAll('.sessions-chip').forEach((c) => {
        c.addEventListener('click', () => {
          filter = c.dataset.filter;
          renderFilters();
          renderEntries();
        });
      });
    }

    function dayKey(iso) {
      const d = new Date(iso);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function dayLabel(iso) {
      const d = new Date(iso);
      const today = new Date();
      const yesterday = new Date(Date.now() - 86400000);
      const same = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();
      if (same(d, today)) return 'Today';
      if (same(d, yesterday)) return 'Yesterday';
      return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
    }

    function renderEntries() {
      let items = (state.data.sessions || []).slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      if (filter !== 'all') items = items.filter((s) => s.book === filter);

      if (!items.length) {
        body.innerHTML = `
          <div class="search-hint">
            <i class="fa-solid fa-book-bible"></i>
            <div class="search-hint-title">No sessions yet</div>
            <div class="search-hint-sub">Tap the <strong>Log Session</strong> button to add your first reading.</div>
          </div>`;
        return;
      }

      const groups = new Map();
      items.forEach((s) => {
        const k = dayKey(s.createdAt);
        if (!groups.has(k)) groups.set(k, []);
        groups.get(k).push(s);
      });

      body.innerHTML = '';
      groups.forEach((entries) => {
        const day = document.createElement('div');
        day.className = 'sessions-day';
        day.innerHTML = `
          <div class="sessions-day-label">${escapeHTML(dayLabel(entries[0].createdAt))}</div>
          <div class="sessions-day-entries"></div>
        `;
        const list = day.querySelector('.sessions-day-entries');

        entries.forEach((s) => {
          const book = BibleBooks.get(s.book);
          const bookName = book ? book.name : s.book;
          const time = new Date(s.createdAt).toLocaleTimeString(undefined, {
            hour: 'numeric', minute: '2-digit'
          });
          const range = s.from === s.to ? `${s.from}` : `${s.from}–${s.to}`;
          const count = s.to - s.from + 1;
          const hasNote = (s.note || '').trim().length > 0;

          const btn = document.createElement('button');
          btn.className = 'session-entry';
          btn.innerHTML = `
            <div class="session-entry-main">
              <div class="session-entry-title">${escapeHTML(bookName)} ${escapeHTML(range)}</div>
              <div class="session-entry-sub">
                ${count} chapter${count === 1 ? '' : 's'}
                ${hasNote ? ' · <i class="fa-solid fa-note-sticky"></i> note' : ''}
              </div>
            </div>
            <div class="session-entry-time">${escapeHTML(time)}</div>
          `;
          btn.addEventListener('click', () => openSessionDetail(s.id));
          list.appendChild(btn);
        });

        body.appendChild(day);
      });
    }

    renderFilters();
    renderEntries();
  }

  function openSessionDetail(sessionId) {
    const s = Storage.getSession(sessionId);
    if (!s) return;

    const book = BibleBooks.get(s.book);
    const bookName = book ? book.name : s.book;
    const range = s.from === s.to ? `${s.from}` : `${s.from}–${s.to}`;
    const date = new Date(s.createdAt).toLocaleString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit'
    });

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet session-detail-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <div class="detail-head">
        <div class="detail-eyebrow">${escapeHTML(bookName)}</div>
        <button class="icon-btn" data-act="close" aria-label="Close">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <h2 class="detail-title">Chapters ${escapeHTML(range)}</h2>
      <div class="detail-meta">${escapeHTML(date)}</div>

      ${(s.note || '').trim() ? `
        <div class="detail-note">
          <div class="detail-note-label"><i class="fa-solid fa-note-sticky"></i> Note</div>
          <div class="detail-note-body">${escapeHTML(s.note)}</div>
        </div>` : ''}

      ${!state.readOnly ? `
        <div class="sheet-actions">
          <button class="btn-ghost" data-act="edit"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn-primary" data-act="done">Done</button>
        </div>` : `
        <div class="sheet-actions">
          <button class="btn-primary" data-act="done">Done</button>
        </div>`}
    `;
    openModal(sheet);

    sheet.querySelector('[data-act="close"]').addEventListener('click', closeModal);
    sheet.querySelector('[data-act="done"]').addEventListener('click', closeModal);

    if (!state.readOnly) {
      sheet.querySelector('[data-act="edit"]').addEventListener('click', () => {
        closeModal();
        setTimeout(() => openSessionSheet({ mode: 'edit', sessionId: s.id }), 100);
      });
    }
  }

  /* ============================================================ */
  /* STATS                                                        */
  /* ============================================================ */

  function renderStatsView(root) {
    const data = state.data;
    const overall = Storage.overallProgress(data);
    const finished = Storage.booksFinished(data);
    const started = Storage.booksStarted(data);
    const sessions = data.sessions || [];
    const streak = Storage.streak(data);

    // Per-book progress list, sorted by percent desc then canonical order
    const bookStats = BibleBooks.all.map((b) => {
      const p = Storage.bookProgress(data, b.id);
      return { book: b, ...p };
    });

    const sorted = bookStats.slice().sort((a, b) => {
      if (b.percent !== a.percent) return b.percent - a.percent;
      return 0; // preserve canonical order on ties
    });

    root.innerHTML = `
      ${viewHeaderHTML('Stats')}
      <div class="view-body">

        <div class="stats-grid">
          <div class="stat-tile">
            <div class="stat-tile-num">${overall.percent}<span class="stat-tile-sub">%</span></div>
            <div class="stat-tile-lbl"><i class="fa-solid fa-book-bible"></i> Bible read</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-num">${overall.read}<span class="stat-tile-sub">/${overall.total}</span></div>
            <div class="stat-tile-lbl"><i class="fa-solid fa-bookmark"></i> Chapters</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-num">${finished.length}<span class="stat-tile-sub">/66</span></div>
            <div class="stat-tile-lbl"><i class="fa-solid fa-award"></i> Books finished</div>
          </div>
          <div class="stat-tile">
            <div class="stat-tile-num">${streak}</div>
            <div class="stat-tile-lbl"><i class="fa-solid fa-fire"></i> Day streak</div>
          </div>
        </div>

        <div class="stats-secondary">
          <div class="stats-secondary-item">
            <span>Books started</span><strong class="num">${started}</strong>
          </div>
          <div class="stats-secondary-item">
            <span>Sessions logged</span><strong class="num">${sessions.length}</strong>
          </div>
          <div class="stats-secondary-item">
            <span>Chapters remaining</span><strong class="num">${overall.total - overall.read}</strong>
          </div>
        </div>

        <div class="report-section">
          <h3 class="report-section-title">Progress by book</h3>
          <div class="stat-books">
            ${sorted.map((s) => `
              <div class="stat-book-row">
                <div class="stat-book-name">
                  ${escapeHTML(s.book.name)}
                  ${s.finished ? '<span class="book-badge sm"><i class="fa-solid fa-check"></i></span>' : ''}
                </div>
                <div class="stat-book-track">
                  <div class="stat-book-fill" style="width:${s.percent}%"></div>
                </div>
                <div class="stat-book-pct num">${s.percent}%</div>
              </div>
            `).join('')}
          </div>
        </div>

        ${!state.readOnly ? `
        <div class="view-footer-actions">
          <button class="btn-ghost" id="statsPrintBtn">
            <i class="fa-solid fa-print"></i> Print report
          </button>
        </div>` : ''}
      </div>
    `;

    root.querySelector('[data-act="back"]').addEventListener('click', closeView);

    const printBtn = root.querySelector('#statsPrintBtn');
    if (printBtn) printBtn.addEventListener('click', () => printProgressReport());
  }

  function printProgressReport() {
    const data = state.data;
    const overall = Storage.overallProgress(data);
    const finished = Storage.booksFinished(data);
    const started = Storage.booksStarted(data);
    const sessions = data.sessions || [];

    const issued = new Date().toLocaleDateString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const rows = BibleBooks.all.map((b) => {
      const p = Storage.bookProgress(data, b.id);
      return `
        <tr>
          <td class="col-name">${escapeHTML(b.name)}</td>
          <td class="col-test">${b.testament === 'ot' ? 'OT' : 'NT'}</td>
          <td class="col-num">${p.read} / ${p.total}</td>
          <td class="col-num">${p.percent}%</td>
          <td class="col-status">${p.finished ? '<span class="chk">✓</span>' : ''}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Selah — Reading Progress</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@500;600;700;800&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --ink: #12161E;
    --ink-soft: #4A5160;
    --muted: #8A8F9C;
    --line: #E4E1D9;
    --line-soft: #EFEDE5;
    --indigo: #2A3F6B;
    --gold: #B8860B;
    --bg: #F5F2EA;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0; padding: 0;
    background: var(--bg); color: var(--ink);
    font-family: 'IBM Plex Sans', system-ui, sans-serif;
    font-size: 14px; line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  .rpt-toolbar {
    position: sticky; top: 0;
    display: flex; align-items: center; justify-content: space-between;
    gap: 12px; padding: 12px 20px;
    background: #fff; border-bottom: 1px solid var(--line-soft); z-index: 10;
  }
  .rpt-toolbar-title {
    font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700;
    color: var(--indigo);
  }
  .rpt-toolbar-actions { display: flex; gap: 8px; }
  .rpt-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 9px 16px; border-radius: 999px;
    font-family: 'Sora', sans-serif; font-size: 13px; font-weight: 700;
    border: none; cursor: pointer;
  }
  .rpt-btn.primary { background: var(--indigo); color: #fff; }
  .rpt-btn.primary:hover { background: #1F3050; }
  .rpt-btn.ghost { background: #F1EFEA; color: var(--ink-soft); }
  .rpt-page {
    max-width: 800px; margin: 28px auto;
    background: #fff; padding: 48px 56px 56px;
    box-shadow: 0 4px 24px rgba(18, 22, 30, 0.06);
    border-radius: 4px;
  }
  .rpt-header {
    text-align: center; padding-bottom: 24px;
    border-bottom: 2px solid var(--indigo); margin-bottom: 28px;
  }
  .rpt-title {
    font-family: 'Sora', sans-serif; font-size: 26px; font-weight: 800;
    color: var(--indigo); letter-spacing: -0.01em; margin: 0 0 6px;
  }
  .rpt-sub {
    font-size: 13px; color: var(--ink-soft); letter-spacing: 0.02em;
  }
  .rpt-summary {
    display: grid; grid-template-columns: repeat(4, 1fr);
    gap: 16px; padding: 22px 0;
    border-bottom: 1px solid var(--line-soft); margin-bottom: 28px;
  }
  .rpt-summary-item { display: flex; flex-direction: column; gap: 4px; }
  .rpt-summary-item span {
    font-size: 10.5px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted);
  }
  .rpt-summary-item strong {
    font-family: 'Sora', sans-serif; font-size: 22px; font-weight: 800;
    color: var(--indigo); font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }
  .rpt-section-title {
    font-family: 'Sora', sans-serif;
    font-size: 12px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.1em; color: var(--muted);
    margin: 0 0 12px;
  }
  .rpt-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  .rpt-table thead th {
    font-family: 'Sora', sans-serif; font-size: 10.5px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 0.08em; color: var(--muted);
    text-align: left; padding: 10px 8px;
    border-bottom: 1.5px solid var(--indigo);
  }
  .rpt-table thead th.col-num,
  .rpt-table thead th.col-status { text-align: right; }
  .rpt-table tbody td {
    padding: 9px 8px; border-bottom: 1px solid var(--line-soft);
    font-size: 13px; color: var(--ink); vertical-align: middle;
  }
  .rpt-table tbody tr:nth-child(even) td { background: #FAFAF7; }
  .rpt-table tbody td.col-num { text-align: right; font-variant-numeric: tabular-nums; }
  .rpt-table tbody td.col-status { text-align: right; }
  .rpt-table tbody td.col-test {
    font-size: 11px; font-weight: 700; color: var(--muted);
    letter-spacing: 0.06em;
  }
  .chk {
    display: inline-grid; place-items: center;
    width: 18px; height: 18px; border-radius: 50%;
    background: var(--gold); color: #fff;
    font-size: 11px; font-weight: 800;
  }
  .rpt-footer {
    display: flex; align-items: flex-end; justify-content: space-between;
    gap: 24px; margin-top: 40px;
    padding-top: 18px; border-top: 1px solid var(--line-soft);
  }
  .rpt-credit {
    font-size: 10.5px; color: var(--muted); letter-spacing: 0.04em;
  }
  .rpt-credit strong { color: var(--indigo); font-weight: 700; }
  @page { size: A4; margin: 18mm 16mm; }
  @media print {
    html, body { background: #fff; }
    .rpt-toolbar { display: none; }
    .rpt-page {
      max-width: none; margin: 0; padding: 0;
      box-shadow: none; border-radius: 0;
    }
    .rpt-table tr { page-break-inside: avoid; }
  }
  @media (max-width: 640px) {
    .rpt-page { padding: 28px 20px; margin: 12px; }
    .rpt-title { font-size: 20px; }
    .rpt-summary { grid-template-columns: 1fr 1fr; }
  }
</style>
</head>
<body>
<div class="rpt-toolbar">
  <div class="rpt-toolbar-title">Progress Report Preview</div>
  <div class="rpt-toolbar-actions">
    <button class="rpt-btn ghost" onclick="window.close()">Close</button>
    <button class="rpt-btn primary" onclick="window.print()">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
      Save as PDF
    </button>
  </div>
</div>

<main class="rpt-page">
  <header class="rpt-header">
    <h1 class="rpt-title">Bible Reading Progress</h1>
    <div class="rpt-sub">${escapeHTML(issued)}</div>
  </header>

  <div class="rpt-summary">
    <div class="rpt-summary-item">
      <span>Bible read</span>
      <strong>${overall.percent}%</strong>
    </div>
    <div class="rpt-summary-item">
      <span>Chapters</span>
      <strong>${overall.read} / ${overall.total}</strong>
    </div>
    <div class="rpt-summary-item">
      <span>Books finished</span>
      <strong>${finished.length} / 66</strong>
    </div>
    <div class="rpt-summary-item">
      <span>Books started</span>
      <strong>${started}</strong>
    </div>
  </div>

  <h2 class="rpt-section-title">Progress by book</h2>
  <table class="rpt-table">
    <thead>
      <tr>
        <th class="col-name">Book</th>
        <th class="col-test">T</th>
        <th class="col-num">Chapters</th>
        <th class="col-num">Percent</th>
        <th class="col-status"></th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <footer class="rpt-footer">
    <div class="rpt-credit">
      Generated by <strong>Selah</strong> · ${escapeHTML(issued)}
    </div>
    <div class="rpt-credit">
      ${sessions.length} session${sessions.length === 1 ? '' : 's'} logged
    </div>
  </footer>
</main>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');

    if (!win) {
      toast('Please allow pop-ups to view the report', {
        type: 'warn', icon: 'fa-triangle-exclamation', duration: 6000
      });
      return;
    }

    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  /* ============================================================ */
  /* BADGES                                                       */
  /* ============================================================ */

  function renderBadgesView(root) {
    const data = state.data;
    const finished = new Set(Storage.booksFinished(data));

    const tiles = BibleBooks.all.map((b) => {
      const unlocked = finished.has(b.id);
      const date = unlocked ? Storage.bookCompletionDate(data, b.id) : null;
      const dateStr = date
        ? new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : '';

      return `
        <div class="badge-tile ${unlocked ? 'unlocked' : 'locked'}">
          <div class="badge-medal">
            <i class="fa-solid ${unlocked ? 'fa-award' : 'fa-lock'}"></i>
          </div>
          <div class="badge-name">${escapeHTML(b.name)}</div>
          <div class="badge-sub">${unlocked ? escapeHTML(dateStr) : b.chapters + ' ch'}</div>
        </div>`;
    }).join('');

    root.innerHTML = `
      ${viewHeaderHTML('Badges')}
      <div class="view-body">
        <div class="badges-intro">
          <div class="badges-count">
            <span class="num">${finished.size}</span> of 66 books completed
          </div>
          <div class="badges-track">
            <div class="badges-fill" style="width:${Math.round((finished.size / 66) * 100)}%"></div>
          </div>
        </div>
        <div class="badges-grid">
          ${tiles}
        </div>
      </div>
    `;

    root.querySelector('[data-act="back"]').addEventListener('click', closeView);
  }

  /* ============================================================ */
  /* SETTINGS                                                     */
  /* ============================================================ */

  function renderSettingsView(root) {
    const data = state.data;
    const settings = data.settings || {};
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const ro = state.readOnly;

    const themeTiles = THEMES.map((t) => `
      <button class="theme-tile ${t.id === currentTheme ? 'active' : ''}" data-theme-id="${t.id}">
        <div class="theme-preview theme-preview-${t.id}">
          <span class="swatch swatch-bg"></span>
          <span class="swatch swatch-card"></span>
          <span class="swatch swatch-primary"></span>
        </div>
        <div class="theme-name">${escapeHTML(t.name)}</div>
      </button>
    `).join('');

    root.innerHTML = `
      ${viewHeaderHTML('Settings')}
      <div class="view-body">

        <section class="settings-section">
          <div class="settings-section-title">Theme</div>
          <div class="theme-grid">${themeTiles}</div>
          <div class="settings-section-hint">Pick any palette — your choice is saved on this device.</div>
        </section>

        <section class="settings-section">
          <div class="settings-section-title">About</div>
          <div class="settings-card">
            <div class="settings-row static">
              <i class="fa-solid fa-code-branch"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">Version</div>
                <div class="settings-row-sub" id="appVersion">Loading…</div>
              </div>
            </div>
            <div class="settings-row static">
              <i class="fa-solid fa-database"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">Stored locally</div>
                <div class="settings-row-sub">Your data never leaves this device unless you enable Drive sync</div>
              </div>
            </div>
            <div class="settings-row static">
              <i class="fa-solid fa-bible"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">66 books · 1189 chapters</div>
                <div class="settings-row-sub">Canonical order, Old & New Testaments</div>
              </div>
            </div>
          </div>
        </section>

        ${!ro ? `
        <section class="settings-section">
          <div class="settings-section-head">
            <div class="settings-section-title">Google Drive</div>
            <button class="settings-section-help" id="driveHelp" aria-label="Help">
              <i class="fa-solid fa-circle-question"></i>
            </button>
          </div>
          <div class="settings-card">
            <div class="drive-block">
              <label class="drive-field">
                <span class="drive-field-label">OAuth Client ID</span>
                <input type="text" id="driveClientId" placeholder="xxxxxxxx.apps.googleusercontent.com" autocomplete="off" spellcheck="false" autocapitalize="off">
              </label>
              <div class="drive-actions">
                <button class="drive-btn" data-act="drive-connect" id="driveConnectBtn">
                  <i class="fa-solid fa-plug"></i><span>Connect</span>
                </button>
                <button class="drive-btn primary" data-act="drive-push" id="drivePushBtn">
                  <i class="fa-solid fa-cloud-arrow-up"></i><span>Push</span>
                </button>
                <button class="drive-btn" data-act="drive-pull" id="drivePullBtn">
                  <i class="fa-solid fa-cloud-arrow-down"></i><span>Pull</span>
                </button>
              </div>
              <div class="drive-status" id="driveStatus">Not connected</div>
            </div>
          </div>
        </section>
        ` : ''}

        ${!ro ? `
        <section class="settings-section">
          <div class="settings-section-title">Danger zone</div>
          <div class="settings-card">
            <button class="settings-row danger" data-act="reset-all">
              <i class="fa-solid fa-triangle-exclamation"></i>
              <div class="settings-row-text">
                <div class="settings-row-title">Reset all data</div>
                <div class="settings-row-sub">Permanently delete every session</div>
              </div>
              <i class="fa-solid fa-chevron-right settings-row-chevron"></i>
            </button>
          </div>
        </section>
        ` : ''}

        <div class="settings-footer">Selah · Bible Study Tracker</div>
      </div>
    `;

    root.querySelector('[data-act="back"]').addEventListener('click', closeView);

    getAppVersion().then((v) => {
      const el = root.querySelector('#appVersion');
      if (el) el.textContent = v;
    });

    // Theme tiles
    root.querySelectorAll('.theme-tile').forEach((tile) => {
      tile.addEventListener('click', () => {
        const id = tile.dataset.themeId;
        applyTheme(id);
        if (!state.readOnly) {
          localStorage.setItem(LS.theme, id);
          Storage.updateSettings({ theme: id });
          state.data = Storage.getData();
        }
        root.querySelectorAll('.theme-tile').forEach((t) => {
          t.classList.toggle('active', t.dataset.themeId === id);
        });
      });
    });

    // Danger zone
    const resetBtn = root.querySelector('[data-act="reset-all"]');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        closeView();
        setTimeout(() => confirmResetAll(), 100);
      });
    }

    // Drive block
    const driveInput = root.querySelector('#driveClientId');
    if (driveInput) {
      driveInput.value = getStoredClientId();

      driveInput.addEventListener('blur', () => {
        setStoredClientId(driveInput.value);
        updateDriveStatus();
      });
      driveInput.addEventListener('change', () => {
        setStoredClientId(driveInput.value);
        updateDriveStatus();
      });

      root.querySelector('#driveHelp').addEventListener('click', openDriveHelp);
      root.querySelector('#driveConnectBtn').addEventListener('click', driveConnect);
      root.querySelector('#drivePushBtn').addEventListener('click', drivePush);
      root.querySelector('#drivePullBtn').addEventListener('click', drivePull);

      updateDriveStatus();
    }
  }

  async function getAppVersion() {
    try {
      const res = await fetch(`sw.js?t=${Date.now()}`, { cache: 'no-store' });
      const text = await res.text();
      const m = text.match(/CACHE_VERSION\s*=\s*['"]([^'"]+)['"]/);
      return m ? `v${m[1].replace(/^v/, '')}` : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  /* ============================================================ */
  /* TOOLS + BACKUP + RESTORE + CSV                               */
  /* ============================================================ */

  function openToolsSheet() {
    const ro = state.readOnly;
    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet tools-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Tools</h3>
      <div class="tools-grid">
        <button class="tool-tile" data-act="backup" ${ro ? 'disabled' : ''}>
          <i class="fa-solid fa-cloud-arrow-up"></i><span>Backup</span>
        </button>
        <button class="tool-tile" data-act="restore" ${ro ? 'disabled' : ''}>
          <i class="fa-solid fa-cloud-arrow-down"></i><span>Restore</span>
        </button>
        <button class="tool-tile" data-act="export" ${ro ? 'disabled' : ''}>
          <i class="fa-solid fa-file-export"></i><span>Export CSV</span>
        </button>
        <button class="tool-tile" data-act="print">
          <i class="fa-solid fa-print"></i><span>Print</span>
        </button>
        <button class="tool-tile danger" data-act="clear-data" ${ro ? 'disabled' : ''}>
          <i class="fa-solid fa-trash-can"></i><span>Clear Data</span>
        </button>
      </div>
    `;
    openModal(sheet);

    sheet.querySelectorAll('.tool-tile').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        const act = btn.dataset.act;
        closeModal();
        setTimeout(() => handleMenuAction(act), 100);
      });
    });
  }

  function backupToFile() {
    const payload = {
      app: 'selah',
      schema: 1,
      exportedAt: new Date().toISOString(),
      data: Storage.getData()
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selah-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('Backup saved', { type: 'success', icon: 'fa-cloud-arrow-up' });
  }

  function restoreFromFile() {
    pickFile('.json,application/json', async (file) => {
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const incoming = parsed.data || parsed;
        if (!incoming || !Array.isArray(incoming.sessions)) throw new Error('Invalid backup');
        showRestoreChoice(incoming);
      } catch (err) {
        toast(`Restore failed: ${err.message}`, {
          type: 'error', icon: 'fa-triangle-exclamation', duration: 6000
        });
      }
    });
  }

  function showRestoreChoice(incoming) {
    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet confirm-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Restore backup</h3>
      <p class="sheet-body">
        The backup has <strong>${incoming.sessions.length}</strong>
        session${incoming.sessions.length === 1 ? '' : 's'}.
        How should they be applied?
      </p>
      <div class="sheet-actions" style="flex-direction:column;">
        <button class="btn-primary" data-act="replace">Replace everything</button>
        <button class="btn-ghost" data-act="merge">Merge with current</button>
        <button class="btn-ghost" data-act="cancel">Cancel</button>
      </div>
    `;
    openModal(sheet);

    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);

    sheet.querySelector('[data-act="replace"]').addEventListener('click', () => {
      Storage.setData(incoming);
      closeModal();
      refresh();
      toast(`Restored ${incoming.sessions.length} sessions`, {
        type: 'success', icon: 'fa-cloud-arrow-down'
      });
    });

    sheet.querySelector('[data-act="merge"]').addEventListener('click', () => {
      const current = Storage.getData();
      const byId = new Map(current.sessions.map((s) => [s.id, s]));
      let added = 0, updated = 0;
      (incoming.sessions || []).forEach((s) => {
        if (byId.has(s.id)) { byId.set(s.id, { ...byId.get(s.id), ...s }); updated++; }
        else { byId.set(s.id, s); added++; }
      });
      current.sessions = Array.from(byId.values());
      Storage.setData(current);
      closeModal();
      refresh();
      toast(`Merged: ${added} new, ${updated} updated`, {
        type: 'success', icon: 'fa-cloud-arrow-down'
      });
    });
  }

  function exportCSV() {
    const data = state.data;
    const rows = [['Date', 'Book', 'From', 'To', 'Chapters', 'Note']];
    (data.sessions || [])
      .slice()
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .forEach((s) => {
        const book = BibleBooks.get(s.book);
        rows.push([
          s.createdAt,
          book ? book.name : s.book,
          s.from,
          s.to,
          s.to - s.from + 1,
          s.note || ''
        ]);
      });
    const csv = rows.map((r) =>
      r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `selah-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV exported', { type: 'success', icon: 'fa-file-export' });
  }

  function pickFile(accept, onPick) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.style.display = 'none';
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) onPick(file);
      input.remove();
    });
    document.body.appendChild(input);
    input.click();
  }

  function confirmResetAll() {
    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet confirm-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Reset all data?</h3>
      <p class="sheet-body">
        This will permanently delete <strong>every session</strong>.
        Your reading progress will be cleared. Back up first if you're unsure.
      </p>
      <label class="confirm-input-label">
        Type <code>DELETE</code> to confirm
        <input type="text" id="confirmResetInput" autocomplete="off" autocapitalize="characters" spellcheck="false">
      </label>
      <div class="sheet-actions">
        <button class="btn-ghost" data-act="cancel">Cancel</button>
        <button class="btn-danger" data-act="confirm" disabled>Reset</button>
      </div>
    `;
    openModal(sheet);

    const input = sheet.querySelector('#confirmResetInput');
    const confirmBtn = sheet.querySelector('[data-act="confirm"]');

    input.addEventListener('input', () => {
      confirmBtn.disabled = input.value.trim().toUpperCase() !== 'DELETE';
    });

    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);
    confirmBtn.addEventListener('click', () => {
      Storage.reset();
      closeModal();
      if (!$('#viewRoot').hidden) closeView();
      refresh();
      toast('All data cleared', { type: 'success', icon: 'fa-broom' });
    });
  }

  /* ============================================================ */
  /* DRIVE SYNC                                                   */
  /* ============================================================ */

  const DRIVE = {
    clientIdKey: 'cjay_gdrive_client_id',
    lastSyncKey: 'selah_last_sync',
    folderName: 'Selah',
    fileName: 'selah.json',
    scope: 'https://www.googleapis.com/auth/drive.file',
    token: null,
    tokenClient: null,
    gapiReady: false,
    folderId: null,
    initPromise: null
  };

  function getStoredClientId() {
    return localStorage.getItem(DRIVE.clientIdKey) || '';
  }

  function setStoredClientId(id) {
    if (id) localStorage.setItem(DRIVE.clientIdKey, id.trim());
    else localStorage.removeItem(DRIVE.clientIdKey);
    DRIVE.tokenClient = null;
    DRIVE.gapiReady = false;
    DRIVE.folderId = null;
    DRIVE.token = null;
    DRIVE.initPromise = null;
  }

  function getLastSync() {
    return localStorage.getItem(DRIVE.lastSyncKey) || '';
  }

  function setLastSync(iso) {
    localStorage.setItem(DRIVE.lastSyncKey, iso);
    Storage.updateSettings({ lastSync: iso });
  }

  function waitForGlobals(timeoutMs = 12000) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (typeof gapi !== 'undefined' &&
            typeof google !== 'undefined' &&
            google.accounts && google.accounts.oauth2) {
          resolve();
        } else if (Date.now() - start > timeoutMs) {
          reject(new Error('Google libraries failed to load'));
        } else {
          setTimeout(check, 150);
        }
      };
      check();
    });
  }

  function initDrive() {
    if (DRIVE.initPromise) return DRIVE.initPromise;

    DRIVE.initPromise = (async () => {
      const clientId = getStoredClientId();
      if (!clientId) throw new Error('No client ID');

      await waitForGlobals();

      if (!DRIVE.gapiReady) {
        await new Promise((resolve, reject) => {
          gapi.load('client', {
            callback: resolve,
            onerror: () => reject(new Error('gapi.load failed'))
          });
        });
        await gapi.client.init({
          discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
        });
        DRIVE.gapiReady = true;
      }

      if (!DRIVE.tokenClient) {
        DRIVE.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: DRIVE.scope,
          callback: () => {}
        });
      }

      return true;
    })();

    DRIVE.initPromise.catch(() => { DRIVE.initPromise = null; });
    return DRIVE.initPromise;
  }

  function ensureAccessToken({ forcePrompt = false } = {}) {
    return new Promise((resolve, reject) => {
      if (DRIVE.token && !forcePrompt) return resolve(DRIVE.token);
      if (!DRIVE.tokenClient) return reject(new Error('Drive not initialised'));

      DRIVE.tokenClient.callback = (resp) => {
        if (resp.error) return reject(new Error(resp.error));
        DRIVE.token = resp.access_token;
        gapi.client.setToken({ access_token: resp.access_token });
        resolve(resp.access_token);
      };

      DRIVE.tokenClient.requestAccessToken({ prompt: forcePrompt ? 'consent' : '' });
    });
  }

  async function getOrCreateFolder() {
    if (DRIVE.folderId) return DRIVE.folderId;

    const q = `mimeType='application/vnd.google-apps.folder' and name='${DRIVE.folderName}' and trashed=false`;
    const res = await gapi.client.drive.files.list({
      q, fields: 'files(id,name)', spaces: 'drive'
    });
    const files = res.result.files || [];
    if (files.length) {
      DRIVE.folderId = files[0].id;
      return DRIVE.folderId;
    }

    const create = await gapi.client.drive.files.create({
      resource: { name: DRIVE.folderName, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id'
    });
    DRIVE.folderId = create.result.id;
    return DRIVE.folderId;
  }

  async function findDriveFile(folderId) {
    const q = `name='${DRIVE.fileName}' and '${folderId}' in parents and trashed=false`;
    const res = await gapi.client.drive.files.list({
      q, fields: 'files(id,name,modifiedTime)', spaces: 'drive'
    });
    const files = res.result.files || [];
    return files[0] || null;
  }

  async function driveConnect() {
    try {
      await initDrive();
      await ensureAccessToken({ forcePrompt: true });
      toast('Connected to Drive', { type: 'success', icon: 'fa-plug' });
      updateDriveStatus();
    } catch (err) {
      toast(`Connect failed: ${err.message}`, {
        type: 'error', icon: 'fa-triangle-exclamation', duration: 6000
      });
    }
  }

  async function drivePush() {
    try {
      await initDrive();
      await ensureAccessToken();
      const folderId = await getOrCreateFolder();
      const file = await findDriveFile(folderId);

      const payload = JSON.stringify({
        app: 'selah',
        schema: 1,
        exportedAt: new Date().toISOString(),
        data: Storage.getData()
      }, null, 2);

      const boundary = '-------selah' + Date.now();
      const delimiter = '\r\n--' + boundary + '\r\n';
      const closeDelim = '\r\n--' + boundary + '--';

      const metadata = file
        ? { name: DRIVE.fileName }
        : { name: DRIVE.fileName, parents: [folderId] };

      const body =
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        JSON.stringify(metadata) +
        delimiter +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        payload +
        closeDelim;

      await gapi.client.request({
        path: file ? `/upload/drive/v3/files/${file.id}` : '/upload/drive/v3/files',
        method: file ? 'PATCH' : 'POST',
        params: { uploadType: 'multipart' },
        headers: { 'Content-Type': `multipart/related; boundary="${boundary}"` },
        body
      });

      setLastSync(new Date().toISOString());
      updateDriveStatus();
      toast('Pushed to Drive', { type: 'success', icon: 'fa-cloud-arrow-up' });
    } catch (err) {
      toast(`Push failed: ${err.message}`, {
        type: 'error', icon: 'fa-triangle-exclamation', duration: 6000
      });
    }
  }

  async function drivePull() {
    try {
      await initDrive();
      await ensureAccessToken();
      const folderId = await getOrCreateFolder();
      const file = await findDriveFile(folderId);

      if (!file) {
        toast('No Drive backup found', { type: 'info', icon: 'fa-circle-info' });
        return;
      }

      const res = await gapi.client.drive.files.get({
        fileId: file.id,
        alt: 'media'
      });

      const raw = typeof res.body === 'string' ? res.body : JSON.stringify(res.result);
      const parsed = JSON.parse(raw);
      const incoming = parsed.data || parsed;

      if (!incoming || !Array.isArray(incoming.sessions)) {
        throw new Error('Invalid backup on Drive');
      }

      showDrivePullChoice(incoming, file.modifiedTime);
    } catch (err) {
      toast(`Pull failed: ${err.message}`, {
        type: 'error', icon: 'fa-triangle-exclamation', duration: 6000
      });
    }
  }

  function showDrivePullChoice(incoming, modifiedTime) {
    const modifiedLabel = modifiedTime
      ? new Date(modifiedTime).toLocaleString()
      : 'unknown';

    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet confirm-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Pull from Drive</h3>
      <p class="sheet-body">
        Cloud backup has <strong>${incoming.sessions.length}</strong>
        session${incoming.sessions.length === 1 ? '' : 's'}
        (last modified ${escapeHTML(modifiedLabel)}).
        How should they be applied?
      </p>
      <div class="sheet-actions" style="flex-direction:column;">
        <button class="btn-primary" data-act="replace">Replace everything</button>
        <button class="btn-ghost" data-act="merge">Merge with current</button>
        <button class="btn-ghost" data-act="cancel">Cancel</button>
      </div>
    `;
    openModal(sheet);

    sheet.querySelector('[data-act="cancel"]').addEventListener('click', closeModal);

    sheet.querySelector('[data-act="replace"]').addEventListener('click', () => {
      Storage.setData(incoming);
      setLastSync(new Date().toISOString());
      closeModal();
      refresh();
      updateDriveStatus();
      toast(`Restored ${incoming.sessions.length} sessions`, {
        type: 'success', icon: 'fa-cloud-arrow-down'
      });
    });

    sheet.querySelector('[data-act="merge"]').addEventListener('click', () => {
      const current = Storage.getData();
      const byId = new Map(current.sessions.map((s) => [s.id, s]));
      let added = 0, updated = 0;
      (incoming.sessions || []).forEach((s) => {
        if (byId.has(s.id)) { byId.set(s.id, { ...byId.get(s.id), ...s }); updated++; }
        else { byId.set(s.id, s); added++; }
      });
      current.sessions = Array.from(byId.values());
      Storage.setData(current);
      setLastSync(new Date().toISOString());
      closeModal();
      refresh();
      updateDriveStatus();
      toast(`Merged: ${added} new, ${updated} updated`, {
        type: 'success', icon: 'fa-cloud-arrow-down'
      });
    });
  }

  function updateDriveStatus() {
    const el = document.getElementById('driveStatus');
    if (!el) return;
    const clientId = getStoredClientId();
    const lastSync = getLastSync();

    if (!clientId) {
      el.textContent = 'Paste your Client ID to enable sync';
    } else if (!lastSync) {
      el.textContent = 'Ready to sync';
    } else {
      el.textContent = `Last synced ${relativeTime(lastSync)}`;
    }
  }

  function openDriveHelp() {
    const sheet = document.createElement('div');
    sheet.className = 'modal-sheet';
    sheet.innerHTML = `
      <div class="sheet-handle"></div>
      <h3 class="sheet-title">Where do I get a Client ID?</h3>
      <div class="sheet-body" style="line-height:1.6; font-size:13.5px;">
        <p style="margin:0 0 12px;">Selah syncs via Google Drive using an OAuth Client ID you own. It never leaves your device — stored only in this browser.</p>
        <p style="margin:0 0 8px;"><strong>1.</strong> Go to <code>console.cloud.google.com</code> → APIs &amp; Services → Credentials.</p>
        <p style="margin:0 0 8px;"><strong>2.</strong> Create an <strong>OAuth client ID</strong> of type <em>Web application</em>.</p>
        <p style="margin:0 0 8px;"><strong>3.</strong> Under <em>Authorized JavaScript origins</em>, add your GitHub Pages URL (and <code>http://localhost</code> for dev).</p>
        <p style="margin:0 0 8px;"><strong>4.</strong> Copy the Client ID (ends in <code>.apps.googleusercontent.com</code>) and paste it above.</p>
        <p style="margin:0; color:var(--muted);">If you've already set up Drive sync in another CJay app, reuse the same Client ID.</p>
      </div>
      <div class="sheet-actions">
        <button class="btn-primary" data-act="close">Got it</button>
      </div>
    `;
    openModal(sheet);
    sheet.querySelector('[data-act="close"]').addEventListener('click', closeModal);
  }

  /* ---------------------------------------------------------- */
  /* Init                                                        */
  /* ---------------------------------------------------------- */
  function init() {
    parseUrlFlags();

    if (state.demoMode) {
      state.data = Storage.getDummyData();
      $('#viewBadge').hidden = false;
    } else {
      state.data = Storage.getData();
    }

    const theme = state.data?.settings?.theme
      || localStorage.getItem(LS.theme)
      || 'light';
    applyTheme(theme);

    renderAll();
  }

  init();

  /* ---------------------------------------------------------- */
  /* Public API                                                  */
  /* ---------------------------------------------------------- */
  window.Selah = {
    toast, dismissToast,
    openModal, closeModal,
    openView, closeView,
    refresh,
    getState: () => state
  };

})();
