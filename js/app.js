/* ============================================================
   JadwalGuru — Main Application
   SPA Router, State Management, Event Handling
   ============================================================ */

(function () {
  'use strict';

  /* ==========================================================
     GLOBAL STATE
     ========================================================== */
  const state = {
    currentPage: 'landing',
    currentGuru: null,       // { id, nama, mapel, noHp, kuota, kuotaUsed, hariAllowed, sesiAllowed }
    isAdmin: false,
    adminPin: null,
    currentHari: CONFIG.HARI[getCurrentHariIndex()],
    currentRosterHari: CONFIG.HARI[getCurrentHariIndex()],
    currentGrade: 'Semua',
    adminTab: 'guru',
    adminRosterHari: CONFIG.HARI[getCurrentHariIndex()],
    adminRosterGrade: 'Semua',
    darkMode: false,
    // Data caches
    guruList: [],
    sesiList: [],
    bookings: [],
    guruBookings: [],
    rosterData: [],
    allBookings: [],
    stats: {},
    mapelList: [],
    // Pending action for confirmations
    pendingAction: null
  };

  /* ==========================================================
     INITIALIZATION
     ========================================================== */
  function init() {
    // Restore dark mode
    const savedDark = loadLocal('darkMode');
    if (savedDark) {
      state.darkMode = true;
      document.documentElement.setAttribute('data-theme', 'dark');
    }

    // Restore guru session
    const savedGuru = loadSession('currentGuru');
    if (savedGuru) {
      state.currentGuru = savedGuru;
    }

    // Restore admin session
    const savedAdmin = loadSession('isAdmin');
    if (savedAdmin) {
      state.isAdmin = true;
      state.adminPin = loadSession('adminPin');
    }

    // Setup navbar scroll effect
    setupNavbarScroll();

    // Setup event delegation
    setupEventDelegation();

    // Listen to hash changes
    window.addEventListener('hashchange', onHashChange);

    // Initial route
    onHashChange();
  }

  /* ==========================================================
     ROUTING
     ========================================================== */
  function onHashChange() {
    const hash = (window.location.hash || '#landing').replace('#', '');
    navigateTo(hash);
  }

  function navigateTo(page) {
    // Guard: redirect if not logged in
    if ((page === 'booking' || page === 'schedule') && !state.currentGuru) {
      window.location.hash = '#login';
      return;
    }
    if (page === 'admin' && !state.isAdmin) {
      window.location.hash = '#admin-login';
      return;
    }

    state.currentPage = page;
    Components.renderNavbar(state);
    renderPage(page);
  }

  async function renderPage(page) {
    const app = $('#app');
    if (!app) return;

    switch (page) {
      case 'landing':
        app.innerHTML = Components.renderLandingPage();
        break;

      case 'login':
        if (state.currentGuru) {
          window.location.hash = '#booking';
          return;
        }
        app.innerHTML = renderSkeleton('card');
        state.guruList = await api.getGuruList();
        app.innerHTML = Components.renderGuruLoginPage(state.guruList);
        setupGuruSearch();
        break;

      case 'booking':
        app.innerHTML = Components.renderBookingPage(state);
        await loadBookingGrid();
        break;

      case 'schedule':
        app.innerHTML = renderSkeleton('card', 3);
        state.guruBookings = await api.getGuruBookings(state.currentGuru.id);
        app.innerHTML = Components.renderGuruSchedulePage(state.currentGuru, state.guruBookings);
        break;

      case 'roster':
        app.innerHTML = Components.renderRosterPage(state);
        await loadRoster();
        break;

      case 'admin-login':
        if (state.isAdmin) {
          window.location.hash = '#admin';
          return;
        }
        app.innerHTML = Components.renderAdminLoginPage();
        setupPinInput();
        break;

      case 'admin':
        app.innerHTML = Components.renderAdminDashboard(state);
        await loadAdminTab(state.adminTab);
        break;

      default:
        app.innerHTML = Components.renderLandingPage();
    }
  }

  /* ==========================================================
     BOOKING GRID LOADING
     ========================================================== */
  async function loadBookingGrid() {
    const container = $('#booking-grid-container');
    if (!container) return;

    container.innerHTML = renderSkeleton('grid');

    // Fetch sesi and bookings in parallel
    const results = await Promise.all([
      api.getSesi(),
      api.getBookings(state.currentHari)
    ]);

    state.sesiList = results[0].filter(function (s) {
      return s.hari === state.currentHari;
    });
    state.bookings = results[1];

    // Update guru kuota from bookings
    if (state.currentGuru) {
      const ownBookings = state.bookings.filter(function (b) {
        return b.guruId === state.currentGuru.id || b.guruNama === state.currentGuru.nama;
      });
      // We count total own bookings across all days but here we just have one day
      // Keep the kuota from login data
    }

    container.innerHTML = Components.renderBookingGrid(
      state.sesiList,
      CONFIG.KELAS,
      state.bookings,
      state.currentGuru
    );
  }

  /* ==========================================================
     ROSTER LOADING
     ========================================================== */
  async function loadRoster() {
    const container = $('#roster-container');
    if (!container) return;

    container.innerHTML = renderSkeleton('grid');

    // Fetch sesi and all bookings for selected day
    const results = await Promise.all([
      api.getSesi(),
      api.getBookings(state.currentRosterHari)
    ]);

    state.sesiList = results[0].filter(function (s) {
      return s.hari === state.currentRosterHari;
    });
    state.rosterData = results[1];

    const kelasList = filterKelasByGrade(state.currentGrade);
    container.innerHTML = Components.renderRosterTable(state.sesiList, kelasList, state.rosterData);
  }

  async function loadAdminRoster() {
    const container = $('#admin-roster-container');
    if (!container) return;

    container.innerHTML = renderSkeleton('grid');

    const results = await Promise.all([
      api.getSesi(),
      api.getBookings(state.adminRosterHari)
    ]);

    state.sesiList = results[0].filter(function (s) {
      return s.hari === state.adminRosterHari;
    });
    state.rosterData = results[1];

    const kelasList = filterKelasByGrade(state.adminRosterGrade);
    container.innerHTML = Components.renderRosterTable(state.sesiList, kelasList, state.rosterData);
  }

  /* ==========================================================
     ADMIN TAB LOADING
     ========================================================== */
  async function loadAdminTab(tab) {
    const content = $('#admin-content');
    if (!content) return;

    state.adminTab = tab;

    // Update tab active states
    $$('[data-admin-tab]').forEach(function (el) {
      el.classList.toggle('active', el.dataset.adminTab === tab);
    });

    content.innerHTML = renderSkeleton('card', 2);

    switch (tab) {
      case 'guru':
        state.guruList = await api.getAllGuru();
        content.innerHTML = Components.renderAdminGuruTab(state.guruList);
        break;

      case 'sesi':
        state.sesiList = await api.getSesi();
        content.innerHTML = Components.renderAdminSesiTab(state.sesiList, state.adminSesiHari || 'Semua');
        break;

      case 'mapel':
        state.mapelList = await api.getMapel();
        content.innerHTML = Components.renderAdminMapelTab(state.mapelList);
        break;

      case 'monitor':
        state.allBookings = await api.getAllBookings();
        content.innerHTML = Components.renderAdminMonitorTab(state.allBookings);
        break;

      case 'roster':
        content.innerHTML = Components.renderAdminRosterTab(state);
        await loadAdminRoster();
        break;

      case 'stats':
        state.stats = await api.getStats();
        content.innerHTML = Components.renderAdminStatsTab(state.stats);
        break;
    }
  }

  /* ==========================================================
     GURU SEARCH / AUTOCOMPLETE
     ========================================================== */
  function setupGuruSearch() {
    const searchInput = $('#guru-search');
    const autocomplete = $('#guru-autocomplete');
    if (!searchInput || !autocomplete) return;

    const onInput = debounce(function () {
      const query = searchInput.value.trim().toLowerCase();
      const items = autocomplete.querySelectorAll('.autocomplete-item');
      let hasVisible = false;

      items.forEach(function (item) {
        const name = (item.dataset.guruName || '').toLowerCase();
        const mapel = (item.dataset.guruMapel || '').toLowerCase();
        const match = query.length === 0 || name.indexOf(query) !== -1 || mapel.indexOf(query) !== -1;
        item.style.display = match ? '' : 'none';
        if (match) hasVisible = true;
      });

      autocomplete.classList.toggle('show', hasVisible && query.length > 0);
    }, 150);

    searchInput.addEventListener('input', onInput);

    searchInput.addEventListener('focus', function () {
      if (searchInput.value.trim().length > 0) {
        onInput();
      }
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search-wrapper')) {
        autocomplete.classList.remove('show');
      }
    });
  }

  /* ==========================================================
     ADMIN PIN INPUT
     ========================================================== */
  function setupPinInput() {
    const digits = $$('.pin-digit');
    if (!digits.length) return;

    digits[0].focus();

    digits.forEach(function (input, idx) {
      input.addEventListener('input', function () {
        const val = input.value.replace(/\D/g, '');
        input.value = val.slice(0, 1);

        if (val && idx < digits.length - 1) {
          digits[idx + 1].focus();
        }

        input.classList.toggle('filled', !!val);

        // Auto-submit when all filled
        const pin = digits.map(function (d) { return d.value; }).join('');
        if (pin.length === digits.length) {
          handleAdminLogin(pin);
        }
      });

      input.addEventListener('keydown', function (e) {
        if (e.key === 'Backspace' && !input.value && idx > 0) {
          digits[idx - 1].focus();
          digits[idx - 1].value = '';
          digits[idx - 1].classList.remove('filled');
        }
      });
    });
  }

  /* ==========================================================
     NAVBAR SCROLL EFFECT
     ========================================================== */
  function setupNavbarScroll() {
    let ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(function () {
          const navbar = $('.navbar');
          if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 10);
          }
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /* ==========================================================
     EVENT DELEGATION
     ========================================================== */
  function setupEventDelegation() {
    document.addEventListener('click', function (e) {
      const target = e.target;

      // Find closest element with data-action
      const actionEl = target.closest('[data-action]');
      if (actionEl) {
        handleAction(actionEl.dataset.action, actionEl);
        return;
      }

      // Autocomplete item click
      const autoItem = target.closest('.autocomplete-item');
      if (autoItem) {
        handleGuruSelect(autoItem);
        return;
      }

      // Day tab click (booking page)
      const dayTab = target.closest('[data-hari]');
      if (dayTab) {
        if (dayTab.dataset.allowed === 'false') {
          showToast('Anda tidak diberi akses pada hari ' + dayTab.dataset.hari, 'warning');
        } else {
          handleDayTabClick(dayTab.dataset.hari);
        }
        return;
      }

      // Roster day tab click
      const rosterDayTab = target.closest('[data-roster-hari]');
      if (rosterDayTab) {
        handleRosterDayTabClick(rosterDayTab.dataset.rosterHari);
        return;
      }

      // Grade pill click
      const gradePill = target.closest('[data-grade]');
      if (gradePill) {
        handleGradeFilterClick(gradePill.dataset.grade);
        return;
      }

      // Admin tab click
      const adminTab = target.closest('[data-admin-tab]');
      if (adminTab) {
        loadAdminTab(adminTab.dataset.adminTab);
        return;
      }

      // Admin roster day tab
      const adminRosterDay = target.closest('[data-admin-roster-hari]');
      if (adminRosterDay) {
        handleAdminRosterDayClick(adminRosterDay.dataset.adminRosterHari);
        return;
      }

      // Admin Sesi day tab click
      const adminSesiTab = target.closest('[data-admin-sesi-hari]');
      if (adminSesiTab) {
        handleAdminSesiDayClick(adminSesiTab.dataset.adminSesiHari);
        return;
      }

      // Admin roster grade filter
      const adminRosterGrade = target.closest('[data-admin-roster-grade]');
      if (adminRosterGrade) {
        handleAdminRosterGradeClick(adminRosterGrade.dataset.adminRosterGrade);
        return;
      }

      // Numpad click
      const numKey = target.closest('[data-num]');
      if (numKey) {
        handleNumpadClick(numKey.dataset.num);
        return;
      }

      // Close modal on backdrop click
      const modalBackdrop = target.closest('.modal-backdrop');
      if (modalBackdrop && target === modalBackdrop) {
        Components.closeModal();
        return;
      }

      // Close bottom sheet on backdrop click
      const bsBackdrop = target.closest('.bottom-sheet-backdrop');
      if (bsBackdrop && target === bsBackdrop) {
        Components.closeBottomSheet();
        return;
      }
    });

    // Phone input formatting
    document.addEventListener('input', function (e) {
      if (e.target.id === 'guru-phone' || e.target.name === 'noHp') {
        let val = e.target.value.replace(/\D/g, '');
        
        if (val.indexOf('08') === 0) {
          val = val.substring(1);
        }
        else if (val.indexOf('628') === 0) {
          val = val.substring(2);
        }
        else if (val.startsWith('0') && val.length > 1) {
          val = val.replace(/^0+/, '');
        }

        e.target.value = val;

        // Enable/disable login button
        if (e.target.id === 'guru-phone') {
          const loginBtn = $('#btn-guru-login');
          const selectedId = $('#guru-selected-id');
          if (loginBtn) {
            loginBtn.disabled = !(selectedId && selectedId.value && isValidPhone(val));
          }
        }
      }
    });
  }

  /* ==========================================================
     ACTION HANDLERS
     ========================================================== */
  function handleAction(action, el) {
    switch (action) {
      case 'toggle-dark':
        toggleDarkMode();
        break;

      case 'guru-logout':
        handleGuruLogout();
        break;

      case 'admin-logout':
        handleAdminLogout();
        break;

      case 'book':
        handleBookClick(el);
        break;

      case 'release':
        handleReleaseClick(el);
        break;

      case 'view-booking':
        handleViewBookingClick(el);
        break;

      case 'confirm-book':
        handleConfirmBook();
        break;

      case 'confirm-release':
        handleConfirmRelease();
        break;

      case 'close-modal':
        Components.closeModal();
        break;

      case 'close-bottom-sheet':
        Components.closeBottomSheet();
        break;

      case 'print-roster':
        window.print();
        break;

      // Admin Guru
      case 'add-guru':
        handleAddGuru();
        break;

      case 'edit-guru':
        handleEditGuru(el.dataset.guruId);
        break;

      case 'save-guru':
        handleSaveGuru();
        break;

      case 'delete-guru':
        handleDeleteGuruPrompt(el.dataset.guruId, el.dataset.guruNama);
        break;

      case 'confirm-delete-guru':
        handleConfirmDeleteGuru(el.dataset.id);
        break;

      // Admin Sesi
      case 'add-sesi':
        handleAddSesi();
        break;

      case 'edit-sesi':
        handleEditSesi(el.dataset.sesiId);
        break;

      case 'save-sesi':
        handleSaveSesi();
        break;

      case 'delete-sesi':
        handleDeleteSesiPrompt(el.dataset.sesiId, el.dataset.sesiNama);
        break;

      case 'confirm-delete-sesi':
        handleConfirmDeleteSesi(el.dataset.id);
        break;

      // Admin Mapel
      case 'add-mapel':
        handleAddMapel();
        break;

      case 'edit-mapel':
        handleEditMapel(el.dataset.mapelId);
        break;

      case 'save-mapel':
        handleSaveMapel();
        break;

      case 'delete-mapel':
        handleDeleteMapelPrompt(el.dataset.mapelId, el.dataset.mapelNama);
        break;

      case 'confirm-delete-mapel':
        handleConfirmDeleteMapel(el.dataset.id);
        break;

      // Admin Monitor
      case 'force-release':
        handleForceReleasePrompt(el.dataset.bookingId, el.dataset.bookingInfo);
        break;

      case 'confirm-force-release':
        handleConfirmForceRelease(el.dataset.bookingId);
        break;

      case 'refresh-monitor':
        loadAdminTab('monitor');
        break;

      case 'refresh-stats':
        loadAdminTab('stats');
        break;
    }
  }

  /* ==========================================================
     DARK MODE
     ========================================================== */
  function toggleDarkMode() {
    state.darkMode = !state.darkMode;
    document.documentElement.setAttribute('data-theme', state.darkMode ? 'dark' : 'light');
    saveLocal('darkMode', state.darkMode);
    Components.renderNavbar(state);
  }

  /* ==========================================================
     GURU LOGIN FLOW
     ========================================================== */
  function handleGuruSelect(item) {
    const searchInput = $('#guru-search');
    const selectedId = $('#guru-selected-id');
    const selectedName = $('#guru-selected-name');
    const phoneGroup = $('#phone-group');
    const autocomplete = $('#guru-autocomplete');

    if (searchInput) searchInput.value = item.dataset.guruName;
    if (selectedId) selectedId.value = item.dataset.guruId;
    if (selectedName) selectedName.value = item.dataset.guruName;
    if (autocomplete) autocomplete.classList.remove('show');
    if (phoneGroup) phoneGroup.style.display = '';

    const phoneInput = $('#guru-phone');
    if (phoneInput) {
      phoneInput.focus();
    }
  }

  // Button login click — bound via delegation
  document.addEventListener('click', function (e) {
    if (e.target.id === 'btn-guru-login' || e.target.closest('#btn-guru-login')) {
      handleGuruLogin();
    }
  });

  async function handleGuruLogin() {
    const selectedId = $('#guru-selected-id');
    const selectedName = $('#guru-selected-name');
    const phoneInput = $('#guru-phone');

    if (!selectedId || !selectedId.value) {
      showToast('Silakan pilih nama guru terlebih dahulu', 'warning');
      return;
    }
    if (!phoneInput || !isValidPhone(phoneInput.value)) {
      showToast('Masukkan nomor HP yang valid (format 8xxxxxx)', 'warning');
      return;
    }

    const result = await api.loginGuru(selectedName.value, phoneInput.value);
    if (result) {
      state.currentGuru = result;
      // Store the noHp for booking/release authentication
      state.currentGuru.noHp = phoneInput.value;
      // Ensure hariAllowed and sesiAllowed are arrays
      if (state.currentGuru.hariAllowed && typeof state.currentGuru.hariAllowed === 'string') {
        state.currentGuru.hariAllowed = state.currentGuru.hariAllowed.split(',').map(function (s) { return s.trim(); });
      }
      if (state.currentGuru.sesiAllowed && typeof state.currentGuru.sesiAllowed === 'string') {
        state.currentGuru.sesiAllowed = state.currentGuru.sesiAllowed.split(',').map(function (s) { return s.trim(); });
      }
      saveSession('currentGuru', state.currentGuru);
      window.location.hash = '#booking';
    }
  }

  function handleGuruLogout() {
    state.currentGuru = null;
    state.guruBookings = [];
    state.bookings = [];
    clearSession('currentGuru');
    showToast('Logout berhasil', 'info');
    window.location.hash = '#landing';
  }

  /* ==========================================================
     ADMIN LOGIN FLOW
     ========================================================== */
  function handleNumpadClick(num) {
    const digits = $$('.pin-digit');
    if (!digits.length) return;

    if (num === 'clear') {
      digits.forEach(function (d) {
        d.value = '';
        d.classList.remove('filled');
      });
      digits[0].focus();
      return;
    }

    if (num === 'enter') {
      const pin = digits.map(function (d) { return d.value; }).join('');
      if (pin.length === digits.length) {
        handleAdminLogin(pin);
      } else {
        showToast('Masukkan PIN 6 digit', 'warning');
      }
      return;
    }

    // Find first empty digit
    for (var i = 0; i < digits.length; i++) {
      if (!digits[i].value) {
        digits[i].value = num;
        digits[i].classList.add('filled');
        if (i < digits.length - 1) {
          digits[i + 1].focus();
        }

        // Auto-submit
        const pin = digits.map(function (d) { return d.value; }).join('');
        if (pin.length === digits.length) {
          setTimeout(function () { handleAdminLogin(pin); }, 200);
        }
        break;
      }
    }
  }

  async function handleAdminLogin(pin) {
    const result = await api.adminLogin(pin);
    if (result) {
      state.isAdmin = true;
      state.adminPin = pin;
      saveSession('isAdmin', true);
      saveSession('adminPin', pin);
      window.location.hash = '#admin';
    } else {
      // Clear pin inputs
      $$('.pin-digit').forEach(function (d) {
        d.value = '';
        d.classList.remove('filled');
      });
      const firstDigit = $('.pin-digit');
      if (firstDigit) firstDigit.focus();
    }
  }

  function handleAdminLogout() {
    state.isAdmin = false;
    state.adminPin = null;
    clearSession('isAdmin');
    clearSession('adminPin');
    showToast('Logout admin berhasil', 'info');
    window.location.hash = '#landing';
  }

  /* ==========================================================
     DAY TAB SWITCHING
     ========================================================== */
  function handleDayTabClick(hari) {
    state.currentHari = hari;

    $$('[data-hari]').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.hari === hari);
    });

    loadBookingGrid();
  }

  function handleRosterDayTabClick(hari) {
    state.currentRosterHari = hari;

    $$('[data-roster-hari]').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.rosterHari === hari);
    });

    loadRoster();
  }

  function handleGradeFilterClick(grade) {
    state.currentGrade = grade;

    $$('[data-grade]').forEach(function (pill) {
      pill.classList.toggle('active', pill.dataset.grade === grade);
    });

    // Re-render roster with new filter without refetching
    const container = $('#roster-container');
    if (container && state.rosterData) {
      const kelasList = filterKelasByGrade(grade);
      container.innerHTML = Components.renderRosterTable(state.sesiList, kelasList, state.rosterData);
    }
  }

  function handleAdminRosterDayClick(hari) {
    state.adminRosterHari = hari;

    $$('[data-admin-roster-hari]').forEach(function (tab) {
      tab.classList.toggle('active', tab.dataset.adminRosterHari === hari);
    });

    loadAdminRoster();
  }

  function handleAdminRosterGradeClick(grade) {
    state.adminRosterGrade = grade;

    $$('[data-admin-roster-grade]').forEach(function (pill) {
      pill.classList.toggle('active', pill.dataset.adminRosterGrade === grade);
    });

    const container = $('#admin-roster-container');
    if (container && state.rosterData) {
      const kelasList = filterKelasByGrade(grade);
      container.innerHTML = Components.renderRosterTable(state.sesiList, kelasList, state.rosterData);
    }
  }

  function handleAdminSesiDayClick(hari) {
    state.adminSesiHari = hari;
    loadAdminTab('sesi');
  }

  /* ==========================================================
     BOOKING ACTIONS
     ========================================================== */
  function handleBookClick(el) {
    if (!state.currentGuru) return;

    const sesiId = el.dataset.sesi;
    const sesiNama = el.dataset.sesiNama;
    const kelas = el.dataset.kelas;

    state.pendingAction = {
      type: 'book',
      sesiId: sesiId,
      sesiNama: sesiNama,
      kelas: kelas,
      hari: state.currentHari
    };

    Components.showModal(
      Components.renderBookConfirmModal(sesiNama, kelas, state.currentHari)
    );
  }

  function handleReleaseClick(el) {
    if (!state.currentGuru) return;

    const sesiId = el.dataset.sesi;
    const sesiNama = el.dataset.sesiNama;
    const kelas = el.dataset.kelas;

    state.pendingAction = {
      type: 'release',
      sesiId: sesiId,
      sesiNama: sesiNama,
      kelas: kelas,
      hari: state.currentHari
    };

    Components.showModal(
      Components.renderReleaseConfirmModal(sesiNama, kelas, state.currentHari)
    );
  }

  function handleViewBookingClick(el) {
    const guruNama = el.dataset.guruNama;
    const mapel = el.dataset.mapel;
    const sesiNama = el.dataset.sesiNama;
    const kelas = el.dataset.kelas;
    const guruNoHp = el.dataset.guruNohp;

    Components.showBottomSheet(
      Components.renderBookingInfoSheet(guruNama, mapel, sesiNama, kelas, guruNoHp)
    );
  }

  async function handleConfirmBook() {
    Components.closeModal();
    if (!state.pendingAction || state.pendingAction.type !== 'book') return;

    const action = state.pendingAction;
    state.pendingAction = null;

    const result = await api.bookSesi(
      state.currentGuru.id,
      action.hari,
      action.sesiId,
      action.kelas
    );

    if (result) {
      // Update guru kuota
      if (state.currentGuru.kuotaUsed !== undefined) {
        state.currentGuru.kuotaUsed++;
        saveSession('currentGuru', state.currentGuru);
      }
      // Refresh grid
      await loadBookingGrid();
      // Update kuota display
      updateKuotaDisplay();
    }
  }

  async function handleConfirmRelease() {
    Components.closeModal();
    if (!state.pendingAction || state.pendingAction.type !== 'release') return;

    const action = state.pendingAction;
    state.pendingAction = null;

    // Find the bookingId from current bookings
    const booking = state.bookings.find(function(b) {
      return b.sesiId === action.sesiId && b.kelas === action.kelas
        && (b.guruId === state.currentGuru.id || String(b.guruId) === String(state.currentGuru.id));
    });

    if (!booking) {
      showToast('Booking tidak ditemukan', 'error');
      return;
    }

    const result = await api.releaseSesi(
      booking.id,
      state.currentGuru.id
    );

    if (result) {
      if (state.currentGuru.kuotaUsed !== undefined && state.currentGuru.kuotaUsed > 0) {
        state.currentGuru.kuotaUsed--;
        saveSession('currentGuru', state.currentGuru);
      }
      await loadBookingGrid();
      updateKuotaDisplay();
    }
  }

  function updateKuotaDisplay() {
    const guru = state.currentGuru;
    if (!guru) return;

    const kuotaUsed = guru.kuotaUsed || 0;
    const kuotaMax = guru.kuota || 0;
    const kuotaPct = kuotaMax > 0 ? Math.round((kuotaUsed / kuotaMax) * 100) : 0;

    const valueEl = $('.kuota-info__value');
    if (valueEl) valueEl.textContent = kuotaUsed + ' / ' + kuotaMax;

    const fillEl = $('.progress__fill');
    if (fillEl) fillEl.style.width = kuotaPct + '%';

    const progressEl = fillEl ? fillEl.parentElement : null;
    if (progressEl) {
      progressEl.classList.remove('progress--danger', 'progress--warning');
      if (kuotaPct >= 100) progressEl.classList.add('progress--danger');
      else if (kuotaPct >= 75) progressEl.classList.add('progress--warning');
    }
  }

  /* ==========================================================
     ADMIN: GURU CRUD
     ========================================================== */
  async function handleAddGuru() {
    if (!state.sesiList || !state.sesiList.length) {
      state.sesiList = await api.getSesi();
    }
    if (!state.mapelList || !state.mapelList.length) {
      state.mapelList = await api.getMapel();
    }
    Components.showModal(
      Components.renderGuruFormModal(null, state.sesiList, state.mapelList)
    );
    setupGuruFormEvents();
  }

  async function handleEditGuru(guruId) {
    const guru = state.guruList.find(function (g) { return g.id === guruId; });
    if (!guru) {
      showToast('Data guru tidak ditemukan', 'error');
      return;
    }
    if (!state.sesiList || !state.sesiList.length) {
      state.sesiList = await api.getSesi();
    }
    if (!state.mapelList || !state.mapelList.length) {
      state.mapelList = await api.getMapel();
    }
    Components.showModal(
      Components.renderGuruFormModal(guru, state.sesiList, state.mapelList)
    );
    setupGuruFormEvents();
  }

  async function handleSaveGuru() {
    const form = $('#guru-form');
    if (!form) return;

    const guruId = form.dataset.guruId;
    const nama = form.querySelector('[name="nama"]').value.trim();
    const mapel = form.querySelector('[name="mapel"]').value.trim();
    const noHp = form.querySelector('[name="noHp"]').value.trim();
    const kuota = parseInt(form.querySelector('[name="kuota"]').value) || 0;

    if (!nama || !mapel || !noHp) {
      showToast('Nama, Mapel, dan No. HP wajib diisi', 'warning');
      return;
    }

    const hariAllowed = [];
    form.querySelectorAll('[name="hariAllowed"]:checked').forEach(function (cb) {
      hariAllowed.push(cb.value);
    });

    const sesiAllowed = [];
    form.querySelectorAll('[name="sesiAllowed"]:checked').forEach(function (cb) {
      sesiAllowed.push(cb.value);
    });

    // Get kelas checkboxes and class-level quotas if present
    const kelasAllowed = [];
    form.querySelectorAll('[name="kelas"]:checked').forEach(function (cb) {
      const quotaInput = form.querySelector(`input[name="kelas_quota_${cb.value}"]`);
      const quotaVal = quotaInput ? parseInt(quotaInput.value) || 0 : 0;
      if (quotaVal > 0) {
        kelasAllowed.push(cb.value + ':' + quotaVal);
      } else {
        kelasAllowed.push(cb.value);
      }
    });

    const guruData = {
      nama: nama,
      mataPelajaran: mapel,
      noHp: noHp,
      kuotaSesi: kuota,
      kelas: kelasAllowed.length ? kelasAllowed.join(', ') : CONFIG.KELAS.join(', '),
      hariAllowed: hariAllowed.length ? hariAllowed.join(', ') : '',
      sesiAllowed: sesiAllowed.length ? sesiAllowed.join(', ') : ''
    };

    Components.closeModal();

    let result;
    if (guruId) {
      result = await api.updateGuru(guruId, guruData);
    } else {
      result = await api.addGuru(guruData);
    }

    if (result) {
      await loadAdminTab('guru');
    }
  }

  function handleDeleteGuruPrompt(guruId, guruNama) {
    Components.showModal(
      Components.renderDeleteConfirmModal('Guru', guruNama, guruId, 'confirm-delete-guru')
    );
  }

  async function handleConfirmDeleteGuru(guruId) {
    Components.closeModal();
    const result = await api.deleteGuru(guruId);
    if (result) {
      await loadAdminTab('guru');
    }
  }

  function setupGuruFormEvents() {
    const form = $('#guru-form');
    if (!form) return;

    const hariCheckboxes = form.querySelectorAll('input[name="hariAllowed"]');
    const sesiGroups = form.querySelectorAll('[data-sesi-group-day]');
    const kelasCheckboxes = form.querySelectorAll('input[name="kelas"]');

    // 1. Visibilitas Sesi berdasarkan Hari
    function updateSesiGroupsVisibility() {
      const checkedDays = Array.prototype.slice.call(hariCheckboxes)
        .filter(function (cb) { return cb.checked; })
        .map(function (cb) { return cb.value; });

      sesiGroups.forEach(function (group) {
        const day = group.dataset.sesiGroupDay;
        const isVisible = checkedDays.indexOf(day) !== -1;
        group.style.display = isVisible ? 'block' : 'none';

        // Bersihkan centang jika hari disembunyikan
        if (!isVisible) {
          group.querySelectorAll('input[name="sesiAllowed"]').forEach(function (cb) {
            cb.checked = false;
          });
          const selectAllCb = group.querySelector('input[data-select-all-day]');
          if (selectAllCb) selectAllCb.checked = false;
        }
      });
    }

    hariCheckboxes.forEach(function (cb) {
      cb.addEventListener('change', updateSesiGroupsVisibility);
    });

    // Jalankan inisialisasi visibilitas sesi di awal
    updateSesiGroupsVisibility();

    // 2. Pilih Semua Hari
    const btnSelectAllHari = $('#btn-select-all-hari', form);
    if (btnSelectAllHari) {
      btnSelectAllHari.addEventListener('click', function () {
        hariCheckboxes.forEach(function (cb) {
          cb.checked = true;
        });
        updateSesiGroupsVisibility();
      });
    }

    // 3. Pilih Semua Kelas & Toggle Quota Input
    const btnSelectAllKelas = $('#btn-select-all-kelas', form);
    if (btnSelectAllKelas) {
      btnSelectAllKelas.addEventListener('click', function () {
        kelasCheckboxes.forEach(function (cb) {
          cb.checked = true;
          const quotaInput = form.querySelector(`input[name="kelas_quota_${cb.value}"]`);
          if (quotaInput) quotaInput.disabled = false;
        });
      });
    }

    kelasCheckboxes.forEach(function (cb) {
      cb.addEventListener('change', function () {
        const quotaInput = form.querySelector(`input[name="kelas_quota_${cb.value}"]`);
        if (quotaInput) {
          quotaInput.disabled = !cb.checked;
          if (!cb.checked) quotaInput.value = '';
        }
      });
    });

    // 4. Pilih Semua Sesi per Hari & Sinkronisasi Balik
    sesiGroups.forEach(function (group) {
      const day = group.dataset.sesiGroupDay;
      const selectAllCb = group.querySelector('input[data-select-all-day]');
      const sesiCbs = group.querySelectorAll('input[name="sesiAllowed"]');

      if (!selectAllCb || sesiCbs.length === 0) return;

      function updateSelectAllState() {
        const total = sesiCbs.length;
        const checkedCount = Array.prototype.slice.call(sesiCbs).filter(function (cb) {
          return cb.checked;
        }).length;
        selectAllCb.checked = (total > 0 && checkedCount === total);
      }

      // Klik 'Pilih Semua' per hari
      selectAllCb.addEventListener('change', function () {
        const isChecked = selectAllCb.checked;
        sesiCbs.forEach(function (cb) {
          cb.checked = isChecked;
        });
      });

      // Klik sesi individu memengaruhi status 'Pilih Semua' hari tersebut
      sesiCbs.forEach(function (cb) {
        cb.addEventListener('change', updateSelectAllState);
      });

      // Inisialisasi status 'Pilih Semua' per hari di awal (untuk mode Edit)
      updateSelectAllState();
    });
  }

  /* ==========================================================
     ADMIN: SESI CRUD
     ========================================================== */
  function handleAddSesi() {
    const defaultDay = (state.adminSesiHari && state.adminSesiHari !== 'Semua') ? state.adminSesiHari : 'Senin';
    Components.showModal(
      Components.renderSesiFormModal({ hari: defaultDay })
    );
  }

  function handleEditSesi(sesiId) {
    const sesi = state.sesiList.find(function (s) { return s.id === sesiId; });
    if (!sesi) {
      showToast('Data sesi tidak ditemukan', 'error');
      return;
    }
    Components.showModal(
      Components.renderSesiFormModal(sesi)
    );
  }

  async function handleSaveSesi() {
    const form = $('#sesi-form');
    if (!form) return;

    const sesiId = form.dataset.sesiId;
    const hari = form.querySelector('[name="hari"]').value;
    const nama = form.querySelector('[name="nama"]').value.trim();
    const mulai = form.querySelector('[name="mulai"]').value;
    const selesai = form.querySelector('[name="selesai"]').value;

    if (!nama) {
      showToast('Nama sesi wajib diisi', 'warning');
      return;
    }

    const sesiData = {
      hari: hari,
      namaSesi: nama,
      jamMulai: mulai,
      jamSelesai: selesai,
      tipe: 'Reguler'
    };

    Components.closeModal();

    let result;
    if (sesiId) {
      result = await api.updateSesi(sesiId, sesiData);
    } else {
      result = await api.addSesi(sesiData);
    }

    if (result) {
      await loadAdminTab('sesi');
    }
  }

  function handleDeleteSesiPrompt(sesiId, sesiNama) {
    Components.showModal(
      Components.renderDeleteConfirmModal('Sesi', sesiNama, sesiId, 'confirm-delete-sesi')
    );
  }

  async function handleConfirmDeleteSesi(sesiId) {
    Components.closeModal();
    const result = await api.deleteSesi(sesiId);
    if (result) {
      await loadAdminTab('sesi');
    }
  }

  /* ==========================================================
     ADMIN: MAPEL CRUD
     ========================================================== */
  function handleAddMapel() {
    Components.showModal(
      Components.renderMapelFormModal(null)
    );
  }

  function handleEditMapel(mapelId) {
    const mapel = state.mapelList.find(function (m) { return m.id === mapelId; });
    if (!mapel) {
      showToast('Data mata pelajaran tidak ditemukan', 'error');
      return;
    }
    Components.showModal(
      Components.renderMapelFormModal(mapel)
    );
  }

  async function handleSaveMapel() {
    const form = $('#mapel-form');
    if (!form) return;

    const mapelId = form.dataset.mapelId;
    const nama = form.querySelector('[name="nama"]').value.trim();

    if (!nama) {
      showToast('Nama mata pelajaran wajib diisi', 'warning');
      return;
    }

    const mapelData = {
      namaMapel: nama
    };

    Components.closeModal();

    let result;
    if (mapelId) {
      result = await api.updateMapel(mapelId, mapelData);
    } else {
      result = await api.addMapel(mapelData);
    }

    if (result) {
      await loadAdminTab('mapel');
    }
  }

  function handleDeleteMapelPrompt(mapelId, mapelNama) {
    Components.showModal(
      Components.renderDeleteConfirmModal('Mata Pelajaran', mapelNama, mapelId, 'confirm-delete-mapel')
    );
  }

  async function handleConfirmDeleteMapel(mapelId) {
    Components.closeModal();
    const result = await api.deleteMapel(mapelId);
    if (result) {
      await loadAdminTab('mapel');
    }
  }

  /* ==========================================================
     ADMIN: FORCE RELEASE
     ========================================================== */
  function handleForceReleasePrompt(bookingId, info) {
    Components.showModal(
      Components.renderForceReleaseModal(bookingId, info)
    );
  }

  async function handleConfirmForceRelease(bookingId) {
    Components.closeModal();
    const result = await api.forceRelease(bookingId, state.adminPin);
    if (result) {
      await loadAdminTab('monitor');
    }
  }

  /* ==========================================================
     START THE APP
     ========================================================== */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
