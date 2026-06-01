/* ============================================================
   JadwalGuru — UI Components
   ============================================================ */

const Components = (function () {
  'use strict';

  /* ==========================================================
     NAVBAR
     ========================================================== */
  function renderNavbar(state) {
    const nav = $('#navbar');
    if (!nav) return;

    const isLoggedIn = state && state.currentGuru;
    const isAdmin = state && state.isAdmin;
    const page = state ? state.currentPage : 'landing';
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    let links = '';
    if (isAdmin) {
      links = `
        <a href="#roster" class="navbar__link ${page === 'roster' ? 'active' : ''}">Roster</a>
        <button class="btn btn--ghost btn--sm guru-logout" data-action="admin-logout">Logout</button>
      `;
    } else if (isLoggedIn) {
      links = `
        <a href="#booking" class="navbar__link ${page === 'booking' ? 'active' : ''}">Booking</a>
        <a href="#schedule" class="navbar__link ${page === 'schedule' ? 'active' : ''}">Jadwal</a>
        <a href="#roster" class="navbar__link ${page === 'roster' ? 'active' : ''}">Roster</a>
        <button class="btn btn--ghost btn--sm guru-logout" data-action="guru-logout">Logout</button>
      `;
    } else {
      links = `
        <a href="#roster" class="navbar__link ${page === 'roster' ? 'active' : ''}">Roster</a>
      `;
    }

    nav.innerHTML = `
      <div class="navbar">
        <a href="#landing" class="navbar__brand">
          <div class="navbar__logo">📅</div>
          <div class="navbar__title">
            <span class="navbar__title-main">JadwalGuru</span>
            <span class="navbar__title-sub">${CONFIG.SCHOOL_NAME}</span>
          </div>
        </a>
        <div class="navbar__actions">
          ${links}
          <button class="dark-toggle" data-action="toggle-dark" aria-label="Toggle dark mode">
            ${isDark ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    `;
  }

  /* ==========================================================
     LANDING PAGE
     ========================================================== */
  function renderLandingPage() {
    return `
      <div class="hero page-enter">
        <div class="hero__bg"></div>
        <div class="hero__shapes">
          <div class="hero__shape"></div>
          <div class="hero__shape"></div>
          <div class="hero__shape"></div>
        </div>
        <div class="hero__content">
          <div class="hero__badge">
            ✨ Sistem Booking Jadwal Digital
          </div>
          <h1 class="hero__title">
            Atur Jadwal Mengajar
            <span class="hero__title-gradient">Lebih Mudah</span>
          </h1>
          <p class="hero__subtitle">
            Sistem booking jadwal guru ${CONFIG.SCHOOL_NAME} — ${CONFIG.SCHOOL_FULL}. 
            Pilih sesi, kelas, dan hari dengan mudah dalam satu platform.
          </p>
          <div class="hero__actions">
            <a href="#login" class="btn btn--primary btn--xl hero__cta">
              👨‍🏫 Booking Guru
            </a>
            <a href="#admin-login" class="btn btn--accent btn--xl hero__cta">
              🔐 Admin Panel
            </a>
          </div>
          <div class="hero__features">
            <div class="hero__feature">
              <div class="hero__feature-icon">⚡</div>
              <div class="hero__feature-title">Cepat & Mudah</div>
              <div class="hero__feature-desc">Booking dalam hitungan detik</div>
            </div>
            <div class="hero__feature">
              <div class="hero__feature-icon">📊</div>
              <div class="hero__feature-title">Roster Lengkap</div>
              <div class="hero__feature-desc">Lihat jadwal semua kelas</div>
            </div>
            <div class="hero__feature">
              <div class="hero__feature-icon">📱</div>
              <div class="hero__feature-title">Mobile Friendly</div>
              <div class="hero__feature-desc">Akses dari mana saja</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================
     GURU LOGIN PAGE
     ========================================================== */
  function renderGuruLoginPage(guruList) {
    const listItems = (guruList || []).map(function (g) {
      return `<div class="autocomplete-item" data-guru-id="${escapeHtml(g.id || '')}" data-guru-name="${escapeHtml(g.nama || '')}" data-guru-mapel="${escapeHtml(g.mapel || '')}">
        <div>${escapeHtml(g.nama || '')}</div>
        <div class="autocomplete-item__sub">${escapeHtml(g.mapel || '')}</div>
      </div>`;
    }).join('');

    return `
      <div class="login-page page-enter">
        <div class="login-card card">
          <div class="card__body">
            <div class="login-header">
              <div class="login-header__icon">👨‍🏫</div>
              <h2 class="login-header__title">Login Guru</h2>
              <p class="login-header__desc">Cari nama Anda dan masukkan nomor HP</p>
            </div>

            <div class="form-group">
              <label class="form-label">Nama Guru</label>
              <div class="search-wrapper">
                <span class="search-icon">🔍</span>
                <input type="text" class="form-input" id="guru-search" placeholder="Ketik nama guru..." autocomplete="off" />
                <div class="autocomplete-list" id="guru-autocomplete">
                  ${listItems}
                </div>
              </div>
              <input type="hidden" id="guru-selected-id" />
              <input type="hidden" id="guru-selected-name" />
            </div>

            <div class="form-group" id="phone-group" style="display:none">
              <label class="form-label">Nomor HP</label>
              <input type="tel" class="form-input form-input--lg" id="guru-phone" placeholder="628xxxxxxxxxx" maxlength="15" />
              <p class="form-hint">Format: 628xxxxxxxxxx (tanpa + atau spasi)</p>
            </div>

            <button class="btn btn--primary btn--lg btn--block" id="btn-guru-login" disabled>
              Masuk
            </button>

            <div style="text-align:center;margin-top:var(--sp-4)">
              <a href="#landing" class="btn btn--ghost btn--sm">← Kembali</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================
     BOOKING PAGE
     ========================================================== */
  function renderBookingPage(state) {
    const guru = state.currentGuru;
    if (!guru) return '<div class="empty-state page-enter"><div class="empty-state__icon">🔒</div><div class="empty-state__title">Silakan login terlebih dahulu</div><div class="empty-state__desc"><a href="#login" class="btn btn--primary mt-4">Login</a></div></div>';

    const initials = getInitials(guru.nama);
    const currentHari = state.currentHari || CONFIG.HARI[0];
    const allowedHari = guru.hariAllowed || CONFIG.HARI;

    // Day tabs
    const dayTabs = CONFIG.HARI.map(function (h) {
      const allowed = allowedHari.indexOf(h) !== -1;
      const active = h === currentHari;
      return `<button class="day-tab ${active ? 'active' : ''} ${!allowed ? 'disabled' : ''}" 
        data-hari="${h}" ${!allowed ? 'disabled' : ''}>${h}</button>`;
    }).join('');

    // Kuota info
    const kuotaUsed = guru.kuotaUsed || 0;
    const kuotaMax = guru.kuota || 0;
    const kuotaPct = kuotaMax > 0 ? Math.round((kuotaUsed / kuotaMax) * 100) : 0;
    const kuotaClass = kuotaPct >= 100 ? 'progress--danger' : kuotaPct >= 75 ? 'progress--warning' : '';

    return `
      <div class="container page-enter" style="padding-top:var(--sp-6);padding-bottom:var(--sp-8)">
        <div class="guru-info">
          <div class="guru-avatar">${initials}</div>
          <div class="guru-details">
            <div class="guru-name">${escapeHtml(guru.nama)}</div>
            <div class="guru-mapel">${escapeHtml(guru.mapel || '-')}</div>
            <div class="kuota-bar">
              <div class="kuota-info">
                <span class="kuota-info__label">Kuota Booking</span>
                <span class="kuota-info__value">${kuotaUsed} / ${kuotaMax}</span>
              </div>
              <div class="progress ${kuotaClass}">
                <div class="progress__fill" style="width:${kuotaPct}%"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="day-tabs no-print" style="margin-bottom:var(--sp-4)">
          ${dayTabs}
        </div>

        <div class="booking-legend no-print">
          <div class="booking-legend__item">
            <div class="booking-legend__color booking-legend__color--available"></div>
            <span>Tersedia</span>
          </div>
          <div class="booking-legend__item">
            <div class="booking-legend__color booking-legend__color--booked"></div>
            <span>Sudah dibooking</span>
          </div>
          <div class="booking-legend__item">
            <div class="booking-legend__color booking-legend__color--own"></div>
            <span>Booking Anda</span>
          </div>
          <div class="booking-legend__item">
            <div class="booking-legend__color booking-legend__color--disabled"></div>
            <span>Tidak tersedia</span>
          </div>
        </div>

        <div class="booking-grid-wrapper" id="booking-grid-container">
          ${renderSkeleton('grid')}
        </div>
      </div>
    `;
  }

  function renderBookingGrid(sesiList, kelasList, bookings, guru) {
    if (!sesiList || !sesiList.length) {
      return '<div class="empty-state"><div class="empty-state__icon">📋</div><div class="empty-state__title">Belum ada sesi</div></div>';
    }

    const allowedSesi = guru.sesiAllowed || sesiList.map(function (s) { return s.id || s.nama; });

    const headers = kelasList.map(function (k) {
      return '<th>' + escapeHtml(shortKelas(k)) + '</th>';
    }).join('');

    const rows = sesiList.map(function (sesi) {
      const sesiId = sesi.id || sesi.nama;
      const sesiAllowed = allowedSesi.indexOf(sesiId) !== -1;
      const timeStr = formatTimeRange(sesi.mulai, sesi.selesai);

      const cells = kelasList.map(function (kelas) {
        const booking = bookings.find(function (b) {
          return (b.sesiId === sesiId || b.sesi === sesi.nama) && b.kelas === kelas;
        });

        if (!sesiAllowed) {
          return '<td class="cell cell--disabled"></td>';
        }

        if (booking) {
          const isOwn = booking.guruId === guru.id || booking.guruNama === guru.nama;
          if (isOwn) {
            return `<td class="cell cell--own" data-action="release" data-sesi="${escapeHtml(sesiId)}" data-sesi-nama="${escapeHtml(sesi.nama)}" data-kelas="${escapeHtml(kelas)}">
              <div class="cell__label">${escapeHtml(guru.mapel || '')}</div>
            </td>`;
          } else {
            return `<td class="cell cell--booked" data-action="view-booking" data-guru-nama="${escapeHtml(booking.guruNama || '')}" data-mapel="${escapeHtml(booking.mapel || '')}" data-sesi-nama="${escapeHtml(sesi.nama)}" data-kelas="${escapeHtml(kelas)}">
              <div class="cell__label">${escapeHtml(booking.mapel || '●')}</div>
            </td>`;
          }
        }

        return `<td class="cell cell--available" data-action="book" data-sesi="${escapeHtml(sesiId)}" data-sesi-nama="${escapeHtml(sesi.nama)}" data-kelas="${escapeHtml(kelas)}"></td>`;
      }).join('');

      return `<tr>
        <td>
          <div>${escapeHtml(sesi.nama || sesiId)}</div>
          <span class="sesi-time">${escapeHtml(timeStr)}</span>
        </td>
        ${cells}
      </tr>`;
    }).join('');

    return `
      <table class="booking-grid">
        <thead>
          <tr>
            <th>Sesi</th>
            ${headers}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  /* ==========================================================
     BOOKING CONFIRMATION MODAL
     ========================================================== */
  function renderBookConfirmModal(sesiNama, kelas, hari) {
    return renderModal('Konfirmasi Booking', `
      <div style="text-align:center">
        <div class="confirm-icon confirm-icon--book">📝</div>
        <p style="font-size:0.95rem;color:var(--text-secondary);margin-bottom:var(--sp-4)">
          Anda akan membooking sesi berikut:
        </p>
        <dl class="confirm-details" style="text-align:left">
          <dt>Hari</dt><dd>${escapeHtml(hari)}</dd>
          <dt>Sesi</dt><dd>${escapeHtml(sesiNama)}</dd>
          <dt>Kelas</dt><dd>${escapeHtml(kelas)}</dd>
        </dl>
      </div>
    `, `
      <button class="btn btn--secondary" data-action="close-modal">Batal</button>
      <button class="btn btn--success" data-action="confirm-book">✓ Booking</button>
    `);
  }

  function renderReleaseConfirmModal(sesiNama, kelas, hari) {
    return renderModal('Lepas Booking', `
      <div style="text-align:center">
        <div class="confirm-icon confirm-icon--release">⚠️</div>
        <p style="font-size:0.95rem;color:var(--text-secondary);margin-bottom:var(--sp-4)">
          Anda yakin ingin melepas booking ini?
        </p>
        <dl class="confirm-details" style="text-align:left">
          <dt>Hari</dt><dd>${escapeHtml(hari)}</dd>
          <dt>Sesi</dt><dd>${escapeHtml(sesiNama)}</dd>
          <dt>Kelas</dt><dd>${escapeHtml(kelas)}</dd>
        </dl>
      </div>
    `, `
      <button class="btn btn--secondary" data-action="close-modal">Batal</button>
      <button class="btn btn--danger" data-action="confirm-release">Lepas Booking</button>
    `);
  }

  /* ==========================================================
     BOOKED BY OTHER — INFO BOTTOM SHEET
     ========================================================== */
  function renderBookingInfoSheet(guruNama, mapel, sesiNama, kelas) {
    return `
      <div class="bottom-sheet__handle"></div>
      <div class="bottom-sheet__content">
        <div class="info-popup">
          <div style="font-size:2rem;margin-bottom:var(--sp-3)">👨‍🏫</div>
          <div class="info-popup__guru">${escapeHtml(guruNama)}</div>
          <div class="info-popup__mapel">${escapeHtml(mapel)}</div>
          <div class="divider"></div>
          <div class="info-popup__detail">
            <strong>${escapeHtml(sesiNama)}</strong> · ${escapeHtml(kelas)}
          </div>
        </div>
        <button class="btn btn--secondary btn--block mt-4" data-action="close-bottom-sheet">Tutup</button>
      </div>
    `;
  }

  /* ==========================================================
     GURU SCHEDULE PAGE
     ========================================================== */
  function renderGuruSchedulePage(guru, bookings) {
    if (!guru) return '<div class="empty-state page-enter"><div class="empty-state__icon">🔒</div><div class="empty-state__title">Silakan login terlebih dahulu</div></div>';

    const initials = getInitials(guru.nama);
    let content = '';

    if (!bookings || bookings.length === 0) {
      content = `
        <div class="empty-state">
          <div class="empty-state__icon">📭</div>
          <div class="empty-state__title">Belum ada jadwal</div>
          <div class="empty-state__desc">Anda belum membooking sesi apapun. <a href="#booking" style="color:var(--primary);font-weight:600">Mulai booking →</a></div>
        </div>
      `;
    } else {
      // Group bookings by hari
      const byHari = {};
      CONFIG.HARI.forEach(function (h) { byHari[h] = []; });
      bookings.forEach(function (b) {
        const h = b.hari || 'Lainnya';
        if (!byHari[h]) byHari[h] = [];
        byHari[h].push(b);
      });

      Object.entries(byHari).forEach(function (entry) {
        var h = entry[0], items = entry[1];
        if (items.length === 0) return;
        content += `<div class="schedule-day">
          <h3 class="schedule-day__title">${escapeHtml(h)}</h3>`;
        items.forEach(function (b) {
          content += `<div class="schedule-item">
            <div class="schedule-item__time">${escapeHtml(b.sesiMulai || b.sesi || '')}</div>
            <div class="schedule-item__info">
              <div class="schedule-item__kelas">${escapeHtml(b.kelas)}</div>
              <div class="schedule-item__sesi">${escapeHtml(b.sesiNama || b.sesi || '')}</div>
            </div>
          </div>`;
        });
        content += '</div>';
      });
    }

    return `
      <div class="container page-enter" style="padding-top:var(--sp-6);padding-bottom:var(--sp-8)">
        <div class="guru-info mb-6">
          <div class="guru-avatar">${initials}</div>
          <div class="guru-details">
            <div class="guru-name">${escapeHtml(guru.nama)}</div>
            <div class="guru-mapel">${escapeHtml(guru.mapel || '-')}</div>
          </div>
        </div>
        <h2 class="mb-4">📋 Jadwal Mengajar Anda</h2>
        <div id="schedule-content">
          ${content}
        </div>
      </div>
    `;
  }

  /* ==========================================================
     ROSTER PAGE
     ========================================================== */
  function renderRosterPage(state) {
    const currentHari = state.currentRosterHari || CONFIG.HARI[0];
    const currentGrade = state.currentGrade || 'Semua';

    const dayTabs = CONFIG.HARI.map(function (h) {
      const active = h === currentHari;
      return `<button class="day-tab ${active ? 'active' : ''}" data-roster-hari="${h}">${h}</button>`;
    }).join('');

    const gradePills = ['Semua', '7', '8', '9'].map(function (g) {
      return `<button class="grade-pill ${g === currentGrade ? 'active' : ''}" data-grade="${g}">
        ${g === 'Semua' ? 'Semua' : 'Kelas ' + g}
      </button>`;
    }).join('');

    return `
      <div class="container page-enter" style="padding-top:var(--sp-6);padding-bottom:var(--sp-8)">
        <div class="print-title">${CONFIG.SCHOOL_NAME} — ${CONFIG.SCHOOL_FULL}</div>
        <div class="print-subtitle">Roster Jadwal Mengajar</div>

        <div class="flex items-center justify-between flex-wrap gap-4 mb-4 no-print">
          <h2>📊 Roster Jadwal</h2>
          <button class="btn btn--secondary btn--sm" data-action="print-roster">🖨 Cetak</button>
        </div>

        <div class="day-tabs mb-4 no-print">
          ${dayTabs}
        </div>

        <div class="grade-filter mb-4 no-print">
          ${gradePills}
        </div>

        <div class="roster-wrapper" id="roster-container">
          ${renderSkeleton('grid')}
        </div>
      </div>
    `;
  }

  function renderRosterTable(sesiList, kelasList, rosterData) {
    if (!sesiList || !sesiList.length) {
      return '<div class="empty-state"><div class="empty-state__icon">📋</div><div class="empty-state__title">Belum ada data sesi</div></div>';
    }

    if (!kelasList || !kelasList.length) {
      return '<div class="empty-state"><div class="empty-state__icon">🏫</div><div class="empty-state__title">Tidak ada kelas untuk filter ini</div></div>';
    }

    const headers = kelasList.map(function (k) {
      return '<th>' + escapeHtml(shortKelas(k)) + '</th>';
    }).join('');

    const rows = sesiList.map(function (sesi) {
      const sesiId = sesi.id || sesi.nama;
      const timeStr = formatTimeRange(sesi.mulai, sesi.selesai);

      const cells = kelasList.map(function (kelas) {
        const entry = rosterData.find(function (r) {
          return (r.sesiId === sesiId || r.sesi === sesi.nama) && r.kelas === kelas;
        });

        if (entry && entry.guruNama) {
          const color = getSubjectColor(entry.mapel);
          return `<td>
            <div class="roster-cell roster-cell--filled" style="background:${color}">
              <div class="roster-cell__mapel">${escapeHtml(entry.mapel || '-')}</div>
              <div class="roster-cell__guru">${escapeHtml(entry.guruNama)}</div>
            </div>
          </td>`;
        }

        return '<td><div class="roster-cell roster-cell--empty">—</div></td>';
      }).join('');

      return `<tr>
        <td>
          <div>${escapeHtml(sesi.nama || sesiId)}</div>
          <span class="sesi-time">${escapeHtml(timeStr)}</span>
        </td>
        ${cells}
      </tr>`;
    }).join('');

    return `
      <table class="roster-table">
        <thead>
          <tr>
            <th>Sesi</th>
            ${headers}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;
  }

  /* ==========================================================
     ADMIN LOGIN PAGE
     ========================================================== */
  function renderAdminLoginPage() {
    const pinDigits = Array(6).fill(0).map(function (_, i) {
      return `<input type="password" class="pin-digit" maxlength="1" data-pin-index="${i}" inputmode="numeric" autocomplete="off" />`;
    }).join('');

    return `
      <div class="login-page page-enter">
        <div class="login-card card">
          <div class="card__body">
            <div class="login-header">
              <div class="login-header__icon">🔐</div>
              <h2 class="login-header__title">Admin Login</h2>
              <p class="login-header__desc">Masukkan PIN admin 6 digit</p>
            </div>

            <div class="pin-container" id="pin-container">
              ${pinDigits}
            </div>

            <div class="numpad" id="numpad">
              <button class="numpad__key" data-num="1">1</button>
              <button class="numpad__key" data-num="2">2</button>
              <button class="numpad__key" data-num="3">3</button>
              <button class="numpad__key" data-num="4">4</button>
              <button class="numpad__key" data-num="5">5</button>
              <button class="numpad__key" data-num="6">6</button>
              <button class="numpad__key" data-num="7">7</button>
              <button class="numpad__key" data-num="8">8</button>
              <button class="numpad__key" data-num="9">9</button>
              <button class="numpad__key numpad__key--action" data-num="clear">C</button>
              <button class="numpad__key" data-num="0">0</button>
              <button class="numpad__key numpad__key--enter" data-num="enter">→</button>
            </div>

            <div style="text-align:center;margin-top:var(--sp-6)">
              <a href="#landing" class="btn btn--ghost btn--sm">← Kembali</a>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /* ==========================================================
     ADMIN DASHBOARD
     ========================================================== */
  function renderAdminDashboard(state) {
    const activeTab = state.adminTab || 'guru';

    const tabs = [
      { id: 'guru', icon: '👨‍🏫', label: 'Guru' },
      { id: 'sesi', icon: '⏱', label: 'Sesi' },
      { id: 'mapel', icon: '📚', label: 'Mapel' },
      { id: 'monitor', icon: '📡', label: 'Monitor' },
      { id: 'roster', icon: '📊', label: 'Roster' },
      { id: 'stats', icon: '📈', label: 'Statistik' }
    ];

    const sidebarItems = tabs.map(function (t) {
      return `<div class="admin-nav-item ${t.id === activeTab ? 'active' : ''}" data-admin-tab="${t.id}">
        <span class="admin-nav-item__icon">${t.icon}</span>
        <span>${t.label}</span>
      </div>`;
    }).join('');

    const bottomTabs = tabs.map(function (t) {
      return `<div class="admin-bottom-tab ${t.id === activeTab ? 'active' : ''}" data-admin-tab="${t.id}">
        <span class="admin-bottom-tab__icon">${t.icon}</span>
        <span>${t.label}</span>
      </div>`;
    }).join('');

    return `
      <div class="admin-layout page-enter">
        <aside class="admin-sidebar">
          <div class="admin-sidebar__header">
            <div class="admin-sidebar__title">Admin Panel</div>
          </div>
          ${sidebarItems}
        </aside>
        <div class="admin-content" id="admin-content">
          ${renderSkeleton('card', 2)}
        </div>
        <div class="admin-bottom-tabs">
          ${bottomTabs}
        </div>
      </div>
    `;
  }

  /* ---------- Admin: Kelola Guru ---------- */
  function renderAdminGuruTab(guruList) {
    const rows = (guruList || []).map(function (g, idx) {
      let hariArr = [];
      if (Array.isArray(g.hariAllowed)) {
        hariArr = g.hariAllowed;
      } else if (typeof g.hariAllowed === 'string' && g.hariAllowed.trim() !== '') {
        hariArr = g.hariAllowed.split(',').map(function (s) { return s.trim(); });
      }

      let sesiArr = [];
      if (Array.isArray(g.sesiAllowed)) {
        sesiArr = g.sesiAllowed;
      } else if (typeof g.sesiAllowed === 'string' && g.sesiAllowed.trim() !== '') {
        sesiArr = g.sesiAllowed.split(',').map(function (s) { return s.trim(); });
      }

      const hariTags = hariArr.map(function (h) {
        return '<span class="tag">' + escapeHtml(h) + '</span>';
      }).join('');
      const sesiTags = sesiArr.map(function (s) {
        return '<span class="tag">' + escapeHtml(s) + '</span>';
      }).join('');

      return `<tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(g.nama || '')}</strong></td>
        <td>${escapeHtml(g.mapel || '')}</td>
        <td>${escapeHtml(g.noHp || '')}</td>
        <td>${g.kuota || '-'}</td>
        <td><div class="tag-list">${hariTags || '-'}</div></td>
        <td><div class="tag-list">${sesiTags || '-'}</div></td>
        <td>
          <div class="table-actions">
            <button class="btn btn--ghost btn--sm" data-action="edit-guru" data-guru-id="${escapeHtml(g.id || '')}">✏️</button>
            <button class="btn btn--ghost btn--sm text-danger" data-action="delete-guru" data-guru-id="${escapeHtml(g.id || '')}" data-guru-nama="${escapeHtml(g.nama || '')}">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    return `
      <div class="admin-content__header">
        <h2>👨‍🏫 Kelola Guru</h2>
        <button class="btn btn--primary btn--sm" data-action="add-guru">+ Tambah Guru</button>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th>Mapel</th>
              <th>No. HP</th>
              <th>Kuota</th>
              <th>Hari</th>
              <th>Sesi</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="8" class="text-center text-secondary p-6">Belum ada data guru</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ---------- Admin: Guru Form Modal ---------- */
  function renderGuruFormModal(guru, sesiList, mapelList) {
    const isEdit = !!guru;
    const title = isEdit ? 'Edit Guru' : 'Tambah Guru Baru';

    let allowedHari = [];
    if (isEdit && guru.hariAllowed) {
      if (Array.isArray(guru.hariAllowed)) {
        allowedHari = guru.hariAllowed;
      } else if (typeof guru.hariAllowed === 'string') {
        allowedHari = guru.hariAllowed.split(',').map(function (s) { return s.trim(); });
      }
    }

    const hariCheckboxes = CONFIG.HARI.map(function (h) {
      const checked = isEdit && allowedHari.indexOf(h) !== -1 ? 'checked' : '';
      const id = uid('hari');
      return `<input type="checkbox" class="chip-checkbox" id="${id}" name="hariAllowed" value="${h}" ${checked}>
        <label class="chip-label" for="${id}">${h}</label>`;
    }).join('');

    // Group sessions by day
    const sessionsByDay = {};
    CONFIG.HARI.forEach(function (h) {
      sessionsByDay[h] = [];
    });
    (sesiList || []).forEach(function (s) {
      if (sessionsByDay[s.hari]) {
        sessionsByDay[s.hari].push(s);
      }
    });

    let allowedSesi = [];
    if (isEdit && guru.sesiAllowed) {
      if (Array.isArray(guru.sesiAllowed)) {
        allowedSesi = guru.sesiAllowed;
      } else if (typeof guru.sesiAllowed === 'string') {
        allowedSesi = guru.sesiAllowed.split(',').map(function (s) { return s.trim(); });
      }
    }

    const sesiCheckboxesHtml = CONFIG.HARI.map(function (h) {
      const daySesi = sessionsByDay[h] || [];
      if (daySesi.length === 0) return '';
      
      const boxes = daySesi.map(function (s) {
        const sId = s.id || s.nama;
        const checked = isEdit && allowedSesi.indexOf(sId) !== -1 ? 'checked' : '';
        const id = uid('sesi');
        const timeStr = formatTimeRange(s.mulai, s.selesai);
        return `<input type="checkbox" class="chip-checkbox" id="${id}" name="sesiAllowed" value="${sId}" ${checked}>
          <label class="chip-label" for="${id}">${escapeHtml(s.nama || sId)} (${escapeHtml(timeStr)})</label>`;
      }).join('');

      return `
        <div class="day-sesi-group" data-sesi-group-day="${h}" style="margin-top: 8px; margin-bottom: 12px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px">
            <span style="font-weight:600;font-size:0.8rem;color:var(--orange-500)">${h}</span>
            <label style="font-size:0.72rem; color:var(--text-secondary); cursor:pointer; display:inline-flex; align-items:center; gap:4px">
              <input type="checkbox" data-select-all-day="${h}" style="width:12px; height:12px; cursor:pointer">
              Pilih Semua
            </label>
          </div>
          <div class="chip-group">${boxes}</div>
        </div>
      `;
    }).join('');

    const kelasGuru = isEdit && guru.kelas ? (typeof guru.kelas === 'string' ? guru.kelas.split(',').map(function(k) { return k.trim(); }) : guru.kelas) : [];
    const kelasCheckboxes = CONFIG.KELAS.map(function (k) {
      const checked = kelasGuru.indexOf(k) !== -1 ? 'checked' : '';
      const id = uid('kelas');
      return `<input type="checkbox" class="chip-checkbox" id="${id}" name="kelas" value="${k}" ${checked}>
        <label class="chip-label" for="${id}">${escapeHtml(shortKelas(k))}</label>`;
    }).join('');

    const mapelOptions = (mapelList || []).map(function (m) {
      const selected = isEdit && guru.mapel === m.nama ? 'selected' : '';
      return `<option value="${escapeHtml(m.nama)}" ${selected}>${escapeHtml(m.nama)}</option>`;
    }).join('');

    return renderModal(title, `
      <form id="guru-form" data-guru-id="${isEdit ? escapeHtml(guru.id) : ''}">
        <div class="form-group">
          <label class="form-label">Nama Guru *</label>
          <input type="text" class="form-input" name="nama" value="${isEdit ? escapeHtml(guru.nama || '') : ''}" required placeholder="Nama lengkap" />
        </div>
        <div class="form-group">
          <label class="form-label">Mata Pelajaran *</label>
          <select class="form-input" name="mapel" required>
            <option value="">-- Pilih Mata Pelajaran --</option>
            ${mapelOptions}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">No. HP *</label>
          <input type="tel" class="form-input" name="noHp" value="${isEdit ? escapeHtml(guru.noHp || '') : ''}" required placeholder="628xxxxxxxxxx" />
        </div>
        <div class="form-group">
          <label class="form-label">Kuota Booking</label>
          <input type="number" class="form-input" name="kuota" value="${isEdit ? (guru.kuota || '') : ''}" min="0" placeholder="Jumlah maksimal booking" />
        </div>
        <div class="form-group">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-2)">
            <label class="form-label" style="margin-bottom:0">Kelas yang Diampu</label>
            <button type="button" id="btn-select-all-kelas" style="background:none; border:none; color:var(--primary); font-size:0.75rem; font-weight:600; cursor:pointer">Pilih Semua Kelas</button>
          </div>
          <div class="chip-group">${kelasCheckboxes}</div>
        </div>
        <div class="form-group">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-2)">
            <label class="form-label" style="margin-bottom:0">Hari yang Diizinkan</label>
            <button type="button" id="btn-select-all-hari" style="background:none; border:none; color:var(--primary); font-size:0.75rem; font-weight:600; cursor:pointer">Pilih Semua Hari</button>
          </div>
          <div class="chip-group">${hariCheckboxes}</div>
        </div>
        <div class="form-group">
          <label class="form-label">Sesi yang Diizinkan</label>
          <div style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border-color); padding: 12px; border-radius: 8px;">
            ${sesiCheckboxesHtml}
          </div>
        </div>
      </form>
    `, `
      <button class="btn btn--secondary" data-action="close-modal">Batal</button>
      <button class="btn btn--primary" data-action="save-guru">${isEdit ? 'Update' : 'Simpan'}</button>
    `);
  }

  /* ---------- Admin: Kelola Sesi ---------- */
  function renderAdminSesiTab(sesiList, activeDay) {
    activeDay = activeDay || 'Semua';

    const tabs = ['Semua', ...CONFIG.HARI].map(function (h) {
      const active = activeDay === h ? 'active' : '';
      return `<button class="day-tab ${active}" data-admin-sesi-hari="${h}">${h}</button>`;
    }).join('');

    const filteredList = (activeDay === 'Semua')
      ? (sesiList || [])
      : (sesiList || []).filter(function (s) { return s.hari === activeDay; });

    const rows = filteredList.map(function (s, idx) {
      return `<tr>
        <td>${idx + 1}</td>
        <td><span class="badge badge--orange">${escapeHtml(s.hari || '-')}</span></td>
        <td><strong>${escapeHtml(s.nama || '')}</strong></td>
        <td>${escapeHtml(formatTime(s.mulai) || '-')}</td>
        <td>${escapeHtml(formatTime(s.selesai) || '-')}</td>
        <td>
          <div class="table-actions">
            <button class="btn btn--ghost btn--sm" data-action="edit-sesi" data-sesi-id="${escapeHtml(s.id || '')}">✏️</button>
            <button class="btn btn--ghost btn--sm text-danger" data-action="delete-sesi" data-sesi-id="${escapeHtml(s.id || '')}" data-sesi-nama="${escapeHtml(s.nama || '')}">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    return `
      <div class="admin-content__header">
        <h2>⏱ Kelola Sesi</h2>
        <button class="btn btn--primary btn--sm" data-action="add-sesi">+ Tambah Sesi</button>
      </div>

      <!-- Filter Hari Sesi -->
      <div class="day-tabs" style="margin-bottom: var(--sp-6)">
        ${tabs}
      </div>

      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Hari</th>
              <th>Nama Sesi</th>
              <th>Mulai</th>
              <th>Selesai</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${rows || `<tr><td colspan="6" class="text-center text-secondary p-6">Belum ada data sesi untuk ${escapeHtml(activeDay)}</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ---------- Admin: Sesi Form Modal ---------- */
  function renderSesiFormModal(sesi) {
    const isEdit = !!sesi;
    const title = isEdit ? 'Edit Sesi' : 'Tambah Sesi Baru';

    return renderModal(title, `
      <form id="sesi-form" data-sesi-id="${isEdit ? escapeHtml(sesi.id) : ''}">
        <div class="form-group">
          <label class="form-label">Hari *</label>
          <select class="form-input" name="hari" required>
            ${CONFIG.HARI.map(function(h) {
              const selected = isEdit && sesi.hari === h ? 'selected' : '';
              return `<option value="${h}" ${selected}>${h}</option>`;
            }).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">Nama Sesi *</label>
          <input type="text" class="form-input" name="nama" value="${isEdit ? escapeHtml(sesi.nama || '') : ''}" required placeholder="Contoh: Sesi 1" />
        </div>
        <div class="form-group">
          <label class="form-label">Waktu Mulai</label>
          <input type="time" class="form-input" name="mulai" value="${isEdit ? escapeHtml(sesi.mulai || '') : ''}" />
        </div>
        <div class="form-group">
          <label class="form-label">Waktu Selesai</label>
          <input type="time" class="form-input" name="selesai" value="${isEdit ? escapeHtml(sesi.selesai || '') : ''}" />
        </div>
      </form>
    `, `
      <button class="btn btn--secondary" data-action="close-modal">Batal</button>
      <button class="btn btn--primary" data-action="save-sesi">${isEdit ? 'Update' : 'Simpan'}</button>
    `);
  }

  /* ---------- Admin: Kelola Mapel ---------- */
  function renderAdminMapelTab(mapelList) {
    const rows = (mapelList || []).map(function (m, idx) {
      return `<tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(m.nama || '')}</strong></td>
        <td>
          <div class="table-actions">
            <button class="btn btn--ghost btn--sm" data-action="edit-mapel" data-mapel-id="${escapeHtml(m.id || '')}">✏️</button>
            <button class="btn btn--ghost btn--sm text-danger" data-action="delete-mapel" data-mapel-id="${escapeHtml(m.id || '')}" data-mapel-nama="${escapeHtml(m.nama || '')}">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    return `
      <div class="admin-content__header">
        <h2>📚 Kelola Mata Pelajaran</h2>
        <button class="btn btn--primary btn--sm" data-action="add-mapel">+ Tambah Mapel</button>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama Mata Pelajaran</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="3" class="text-center text-secondary p-6">Belum ada mata pelajaran</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ---------- Admin: Mapel Form Modal ---------- */
  function renderMapelFormModal(mapel) {
    const isEdit = !!mapel;
    const title = isEdit ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran Baru';

    return renderModal(title, `
      <form id="mapel-form" data-mapel-id="${isEdit ? escapeHtml(mapel.id) : ''}">
        <div class="form-group">
          <label class="form-label">Nama Mata Pelajaran *</label>
          <input type="text" class="form-input" name="nama" value="${isEdit ? escapeHtml(mapel.nama || '') : ''}" required placeholder="Contoh: Matematika" />
        </div>
      </form>
    `, `
      <button class="btn btn--secondary" data-action="close-modal">Batal</button>
      <button class="btn btn--primary" data-action="save-mapel">${isEdit ? 'Update' : 'Simpan'}</button>
    `);
  }

  /* ---------- Admin: Monitor Booking ---------- */
  function renderAdminMonitorTab(bookings) {
    const rows = (bookings || []).map(function (b, idx) {
      return `<tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(b.guruNama || '')}</strong></td>
        <td>${escapeHtml(b.mapel || '')}</td>
        <td>${escapeHtml(b.hari || '')}</td>
        <td>${escapeHtml(b.sesiNama || b.sesi || '')}</td>
        <td>${escapeHtml(b.kelas || '')}</td>
        <td>
          <button class="btn btn--danger btn--sm" data-action="force-release" data-booking-id="${escapeHtml(b.id || '')}" data-booking-info="${escapeHtml(b.guruNama + ' - ' + b.kelas)}">
            Lepas
          </button>
        </td>
      </tr>`;
    }).join('');

    return `
      <div class="admin-content__header">
        <h2>📡 Monitor Booking</h2>
        <button class="btn btn--secondary btn--sm" data-action="refresh-monitor">🔄 Refresh</button>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Guru</th>
              <th>Mapel</th>
              <th>Hari</th>
              <th>Sesi</th>
              <th>Kelas</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="7" class="text-center text-secondary p-6">Belum ada booking</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ---------- Admin: Roster Tab ---------- */
  function renderAdminRosterTab(state) {
    const currentHari = state.adminRosterHari || CONFIG.HARI[0];
    const currentGrade = state.adminRosterGrade || 'Semua';

    const dayTabs = CONFIG.HARI.map(function (h) {
      return `<button class="day-tab ${h === currentHari ? 'active' : ''}" data-admin-roster-hari="${h}">${h}</button>`;
    }).join('');

    const gradePills = ['Semua', '7', '8', '9'].map(function (g) {
      return `<button class="grade-pill ${g === currentGrade ? 'active' : ''}" data-admin-roster-grade="${g}">
        ${g === 'Semua' ? 'Semua' : 'Kelas ' + g}
      </button>`;
    }).join('');

    return `
      <div class="admin-content__header">
        <h2>📊 Roster</h2>
        <button class="btn btn--secondary btn--sm" data-action="print-roster">🖨 Cetak</button>
      </div>
      <div class="day-tabs mb-4">${dayTabs}</div>
      <div class="grade-filter mb-4">${gradePills}</div>
      <div class="roster-wrapper" id="admin-roster-container">
        ${renderSkeleton('grid')}
      </div>
    `;
  }

  /* ---------- Admin: Statistik ---------- */
  function renderAdminStatsTab(stats) {
    stats = stats || {};
    return `
      <div class="admin-content__header">
        <h2>📈 Statistik</h2>
        <button class="btn btn--secondary btn--sm" data-action="refresh-stats">🔄 Refresh</button>
      </div>
      <div class="stat-grid">
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--primary">👨‍🏫</div>
          <div class="stat-card__value">${stats.totalGuru || 0}</div>
          <div class="stat-card__label">Total Guru</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--success">📝</div>
          <div class="stat-card__value">${stats.totalBooking || 0}</div>
          <div class="stat-card__label">Total Booking</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--info">⏱</div>
          <div class="stat-card__value">${stats.totalSesi || 0}</div>
          <div class="stat-card__label">Total Sesi</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--warning">📊</div>
          <div class="stat-card__value">${stats.totalSlot || 0}</div>
          <div class="stat-card__label">Total Slot</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--success">✅</div>
          <div class="stat-card__value">${stats.filledSlot || 0}</div>
          <div class="stat-card__label">Slot Terisi</div>
        </div>
        <div class="stat-card">
          <div class="stat-card__icon stat-card__icon--danger">⬜</div>
          <div class="stat-card__value">${stats.emptySlot || 0}</div>
          <div class="stat-card__label">Slot Kosong</div>
        </div>
      </div>
      ${stats.totalSlot ? `
        <div class="card mt-6">
          <div class="card__body">
            <h4 class="mb-2">Tingkat Terisi</h4>
            <div class="kuota-info">
              <span class="kuota-info__label">Progress</span>
              <span class="kuota-info__value">${Math.round(((stats.filledSlot || 0) / stats.totalSlot) * 100)}%</span>
            </div>
            <div class="progress">
              <div class="progress__fill" style="width:${Math.round(((stats.filledSlot || 0) / stats.totalSlot) * 100)}%"></div>
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }

  /* ==========================================================
     DELETE CONFIRM MODAL
     ========================================================== */
  function renderDeleteConfirmModal(itemType, itemName, itemId, actionName) {
    return renderModal('Hapus ' + itemType, `
      <div style="text-align:center">
        <div class="confirm-icon confirm-icon--danger">🗑</div>
        <p style="font-size:0.95rem;color:var(--text-secondary)">
          Anda yakin ingin menghapus <strong>${escapeHtml(itemName)}</strong>?
        </p>
        <p style="font-size:0.82rem;color:var(--danger);margin-top:var(--sp-2)">
          Tindakan ini tidak dapat dibatalkan.
        </p>
      </div>
    `, `
      <button class="btn btn--secondary" data-action="close-modal">Batal</button>
      <button class="btn btn--danger" data-action="${actionName}" data-id="${escapeHtml(itemId)}">Hapus</button>
    `);
  }

  /* ==========================================================
     REUSABLE MODAL
     ========================================================== */
  function renderModal(title, bodyHtml, footerHtml) {
    return `
      <div class="modal-backdrop" id="modal-active">
        <div class="modal">
          <div class="modal__header">
            <h3 class="modal__title">${title}</h3>
            <button class="modal__close" data-action="close-modal">✕</button>
          </div>
          <div class="modal__body">
            ${bodyHtml}
          </div>
          ${footerHtml ? `<div class="modal__footer">${footerHtml}</div>` : ''}
        </div>
      </div>
    `;
  }

  /* ==========================================================
     MODAL HELPERS
     ========================================================== */
  function showModal(html) {
    const container = $('#modal-container');
    if (!container) return;
    container.innerHTML = html;
    requestAnimationFrame(function () {
      const backdrop = container.querySelector('.modal-backdrop');
      if (backdrop) backdrop.classList.add('show');
    });
  }

  function closeModal() {
    const container = $('#modal-container');
    if (!container) return;
    const backdrop = container.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.classList.remove('show');
      setTimeout(function () {
        container.innerHTML = '';
      }, 300);
    } else {
      container.innerHTML = '';
    }
  }

  /* ==========================================================
     BOTTOM SHEET HELPERS
     ========================================================== */
  function showBottomSheet(html) {
    const container = $('#bottom-sheet-container');
    if (!container) return;
    container.innerHTML = `<div class="bottom-sheet-backdrop" id="bs-active"><div class="bottom-sheet">${html}</div></div>`;
    requestAnimationFrame(function () {
      const backdrop = container.querySelector('.bottom-sheet-backdrop');
      if (backdrop) backdrop.classList.add('show');
    });
  }

  function closeBottomSheet() {
    const container = $('#bottom-sheet-container');
    if (!container) return;
    const backdrop = container.querySelector('.bottom-sheet-backdrop');
    if (backdrop) {
      backdrop.classList.remove('show');
      setTimeout(function () {
        container.innerHTML = '';
      }, 300);
    } else {
      container.innerHTML = '';
    }
  }

  /* ==========================================================
     FORCE RELEASE CONFIRM MODAL
     ========================================================== */
  function renderForceReleaseModal(bookingId, info) {
    return renderModal('Lepas Paksa Booking', `
      <div style="text-align:center">
        <div class="confirm-icon confirm-icon--danger">⚠️</div>
        <p style="font-size:0.95rem;color:var(--text-secondary)">
          Lepas booking untuk:<br><strong>${escapeHtml(info)}</strong>?
        </p>
      </div>
    `, `
      <button class="btn btn--secondary" data-action="close-modal">Batal</button>
      <button class="btn btn--danger" data-action="confirm-force-release" data-booking-id="${escapeHtml(bookingId)}">Lepas Paksa</button>
    `);
  }

  /* ==========================================================
     PUBLIC API
     ========================================================== */
  return {
    renderNavbar: renderNavbar,
    renderLandingPage: renderLandingPage,
    renderGuruLoginPage: renderGuruLoginPage,
    renderBookingPage: renderBookingPage,
    renderBookingGrid: renderBookingGrid,
    renderBookConfirmModal: renderBookConfirmModal,
    renderReleaseConfirmModal: renderReleaseConfirmModal,
    renderBookingInfoSheet: renderBookingInfoSheet,
    renderGuruSchedulePage: renderGuruSchedulePage,
    renderRosterPage: renderRosterPage,
    renderRosterTable: renderRosterTable,
    renderAdminLoginPage: renderAdminLoginPage,
    renderAdminDashboard: renderAdminDashboard,
    renderAdminGuruTab: renderAdminGuruTab,
    renderGuruFormModal: renderGuruFormModal,
    renderAdminSesiTab: renderAdminSesiTab,
    renderSesiFormModal: renderSesiFormModal,
    renderAdminMapelTab: renderAdminMapelTab,
    renderMapelFormModal: renderMapelFormModal,
    renderAdminMonitorTab: renderAdminMonitorTab,
    renderAdminRosterTab: renderAdminRosterTab,
    renderAdminStatsTab: renderAdminStatsTab,
    renderDeleteConfirmModal: renderDeleteConfirmModal,
    renderForceReleaseModal: renderForceReleaseModal,
    showModal: showModal,
    closeModal: closeModal,
    showBottomSheet: showBottomSheet,
    closeBottomSheet: closeBottomSheet
  };
})();
