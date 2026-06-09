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
          <img src="https://jrm.sch.id/wp-content/uploads/2024/10/logo-jrm-png-150x150.png" alt="Logo Sekolah" style="margin: 0 auto 2rem; display: block; max-width: 150px;" />
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
              <p class="login-header__desc">Cari nama Anda, masukkan nomor HP dan PIN</p>
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
              <input type="tel" class="form-input form-input--lg" id="guru-phone" placeholder="8xxxxxxxxxx" maxlength="15" />
              <p class="form-hint">Format: 8xxxxxxxxxx (tanpa angka 62 atau 0 di depan)</p>
            </div>

            <div class="form-group" id="pin-group" style="display:none">
              <label class="form-label">PIN</label>
              <input type="password" class="form-input form-input--lg" id="guru-pin" placeholder="••••••" maxlength="6" inputmode="numeric" />
              <p class="form-hint">Masukkan 6 digit PIN (Default: 123456)</p>
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
    let allowedHari = [];
    if (guru.hariAllowed) {
      if (Array.isArray(guru.hariAllowed)) {
        allowedHari = guru.hariAllowed;
      } else if (typeof guru.hariAllowed === 'string') {
        allowedHari = guru.hariAllowed.split(',').map(function (s) { return s.trim(); });
      }
    }
    if (allowedHari.length === 0) {
      allowedHari = CONFIG.HARI;
    }

    // Day tabs
    const dayTabs = CONFIG.HARI.map(function (h) {
      const allowed = allowedHari.indexOf(h) !== -1;
      const active = h === currentHari;
      return `<button class="day-tab ${active ? 'active' : ''} ${!allowed ? 'disabled-tab' : ''}" 
        data-hari="${h}" data-allowed="${allowed}">${h}</button>`;
    }).join('');

    const kuotaWrapper = `
      <div id="kuota-container-wrapper" style="margin-top: var(--sp-3); width: 100%;">
        ${renderClassQuotas(guru, state.guruBookings || [])}
      </div>
    `;

    return `
      <div class="container page-enter" style="padding-top:var(--sp-6);padding-bottom:var(--sp-8)">
        <div class="guru-info" style="align-items: flex-start;">
          <div class="guru-avatar">${initials}</div>
          <div class="guru-details">
            <div class="guru-name">${escapeHtml(guru.nama)}</div>
            <div class="guru-mapel">${escapeHtml(guru.mapel || '-')}</div>
            ${kuotaWrapper}
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

    // 1. Filter Allowed Sessions (Hide disallowed ones)
    let allowedSesi = [];
    if (guru.sesiAllowed) {
      if (Array.isArray(guru.sesiAllowed)) {
        allowedSesi = guru.sesiAllowed;
      } else if (typeof guru.sesiAllowed === 'string') {
        allowedSesi = guru.sesiAllowed.split(',').map(function (s) { return s.trim(); });
      }
    }
    
    // Filter the session list
    const activeSesiList = sesiList.filter(function (s) {
      const sesiId = s.id || s.nama;
      // Jika allowedSesi kosong, berarti semua sesi diizinkan
      return allowedSesi.length === 0 || allowedSesi.indexOf(sesiId) !== -1;
    });

    if (!activeSesiList.length) {
      return '<div class="empty-state"><div class="empty-state__icon">🔒</div><div class="empty-state__title">Tidak ada sesi yang diizinkan untuk Anda hari ini</div></div>';
    }

    // 2. Filter Allowed Classes (Hide disallowed ones)
    let allowedKelas = [];
    let classQuotas = {};
    if (guru.kelas) {
      let rawKelas = [];
      if (Array.isArray(guru.kelas)) {
        rawKelas = guru.kelas;
      } else if (typeof guru.kelas === 'string') {
        rawKelas = guru.kelas.split(',').map(function (s) { return s.trim(); });
      }
      rawKelas.forEach(function (item) {
        if (item.indexOf(':') !== -1) {
          const parts = item.split(':');
          const kName = parts[0].trim();
          const kQuota = parseInt(parts[1]) || 0;
          allowedKelas.push(kName);
          classQuotas[kName] = kQuota;
        } else {
          allowedKelas.push(item);
          classQuotas[item] = 0;
        }
      });
    }
    
    // Filter the class list
    const activeKelasList = kelasList.filter(function (k) {
      return allowedKelas.length === 0 || allowedKelas.indexOf(k) !== -1;
    });

    if (!activeKelasList.length) {
      return '<div class="empty-state"><div class="empty-state__icon">🔒</div><div class="empty-state__title">Tidak ada kelas yang diizinkan untuk Anda</div></div>';
    }

    const headers = activeKelasList.map(function (k) {
      return '<th>' + escapeHtml(shortKelas(k)) + '</th>';
    }).join('');

    const rows = activeSesiList.map(function (sesi) {
      const sesiId = sesi.id || sesi.nama;
      const timeStr = formatTimeRange(sesi.mulai, sesi.selesai);

      const ownBookingInThisSesi = bookings.find(function (b) {
        return (b.sesiId === sesiId || b.sesi === sesi.nama) && (b.guruId === guru.id || b.guruNama === guru.nama);
      });

      const cells = activeKelasList.map(function (kelas) {
        const booking = bookings.find(function (b) {
          return (b.sesiId === sesiId || b.sesi === sesi.nama) && b.kelas === kelas;
        });

        if (booking) {
          const isOwn = booking.guruId === guru.id || booking.guruNama === guru.nama;
          if (isOwn) {
            return `<td class="cell cell--own" data-action="release" data-sesi="${escapeHtml(sesiId)}" data-sesi-nama="${escapeHtml(sesi.nama)}" data-kelas="${escapeHtml(kelas)}">
              <div class="cell__label" style="white-space:normal; line-height:1.1; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:2px; height:100%;">
                <span style="font-weight:700; font-size:0.68rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-align:center;">${escapeHtml(booking.mapel || guru.mapel || '')}</span>
                <span style="font-size:0.58rem; opacity:0.85; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; text-align:center;">${escapeHtml(booking.guruNama || guru.nama)}</span>
              </div>
            </td>`;
          } else {
            return `<td class="cell cell--booked" data-action="view-booking" data-guru-nama="${escapeHtml(booking.guruNama || '')}" data-guru-nohp="${escapeHtml(booking.guruNoHp || '')}" data-mapel="${escapeHtml(booking.mapel || '')}" data-sesi-nama="${escapeHtml(sesi.nama)}" data-kelas="${escapeHtml(kelas)}">
              <div class="cell__label" style="white-space:normal; line-height:1.1; display:flex; flex-direction:column; justify-content:center; align-items:center; gap:2px; height:100%;">
                <span style="font-weight:700; font-size:0.68rem; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; text-align:center;">${escapeHtml(booking.mapel || '')}</span>
                <span style="font-size:0.58rem; opacity:0.85; display:-webkit-box; -webkit-line-clamp:1; -webkit-box-orient:vertical; overflow:hidden; text-align:center;">${escapeHtml(booking.guruNama || '')}</span>
              </div>
            </td>`;
          }
        }

        // Jika guru sudah booking kelas lain di sesi & hari yang sama, nonaktifkan slot tersedia lainnya
        if (ownBookingInThisSesi) {
          return '<td class="cell cell--disabled" title="Anda sudah mengajar kelas lain di sesi ini"></td>';
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
  function renderBookingInfoSheet(guruNama, mapel, sesiNama, kelas, guruNoHp) {
    return `
      <div class="bottom-sheet__handle"></div>
      <div class="bottom-sheet__content">
        <div class="info-popup">
          <div style="font-size:2rem;margin-bottom:var(--sp-3)">👨‍🏫</div>
          <div class="info-popup__guru" style="display:inline-flex; align-items:center; justify-content:center; gap:8px">
            <span>${escapeHtml(guruNama)}</span>
            ${guruNoHp ? `
              <a href="https://wa.me/62${escapeHtml(guruNoHp)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex; align-items:center; gap:4px; background-color:#25D366; color:white; padding:3px 8px; border-radius:12px; text-decoration:none; font-size:0.7rem; font-weight:600; line-height:1" title="Hubungi via WhatsApp">
                <span style="font-size:0.8rem">💬</span> WA
              </a>
            ` : ''}
          </div>
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

    const tabs = ['Semua', ...CONFIG.HARI];
    const dayTabs = tabs.map(function (h) {
      const active = h === currentHari;
      const label = h === 'Semua' ? 'Semua Hari' : h;
      return `<button class="day-tab ${active ? 'active' : ''}" data-roster-hari="${h}">${label}</button>`;
    }).join('');

    const gradePills = ['Semua', '7', '8', '9'].map(function (g) {
      return `<button class="grade-pill ${g === currentGrade ? 'active' : ''}" data-grade="${g}">
        ${g === 'Semua' ? 'Semua' : 'Kelas ' + g}
      </button>`;
    }).join('');

    return `
      <div class="container page-enter" style="padding-top:var(--sp-6);padding-bottom:var(--sp-8)">
        <div class="print-title">${CONFIG.SCHOOL_NAME} — ${CONFIG.SCHOOL_FULL}</div>
        <div class="print-subtitle">Roster Jadwal Mengajar Tahun Ajaran ${new Date().getFullYear()}/${new Date().getFullYear()+1}</div>
        <div class="print-meta" style="display:none; text-align:center; margin-bottom:20px; font-weight:bold;">
          Hari: ${currentHari} | Tingkat: ${currentGrade === 'Semua' ? 'Semua Kelas' : 'Kelas ' + currentGrade}
        </div>

        <div class="flex items-center justify-between flex-wrap gap-4 mb-4 no-print">
          <h2>📊 Roster Jadwal</h2>
          <button class="btn btn--secondary btn--sm" data-action="print-roster">⬇ Download PDF</button>
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

  function renderRosterTable(sesiList, kelasList, rosterData, isSemuaHari) {
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

      const hariBadge = isSemuaHari ? `<div style="font-size:0.75rem;font-weight:bold;color:var(--primary);margin-bottom:2px;">${escapeHtml(sesi.hari)}</div>` : '';
      return `<tr>
        <td>
          ${hariBadge}
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
      { id: 'kelas', icon: '🏫', label: 'Kelas' },
      { id: 'monitor', icon: '📡', label: 'Monitor' },
      { id: 'roster', icon: '📊', label: 'Roster' }
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

      // Parse kelas and quotas
      const allowedKelas = [];
      const classQuotas = {};
      if (g.kelas) {
        let rawKelas = [];
        if (Array.isArray(g.kelas)) {
          rawKelas = g.kelas;
        } else if (typeof g.kelas === 'string') {
          rawKelas = g.kelas.split(',').map(function (s) { return s.trim(); });
        }
        rawKelas.forEach(function (item) {
          if (item.indexOf(':') !== -1) {
            const parts = item.split(':');
            const kName = parts[0].trim();
            const kQuota = parseInt(parts[1]) || 0;
            allowedKelas.push(kName);
            classQuotas[kName] = kQuota;
          } else {
            allowedKelas.push(item);
            classQuotas[item] = 0;
          }
        });
      }

      let kelasWithQuotasHtml = '-';
      if (allowedKelas.length > 0) {
        const fullList = allowedKelas.map(function(k) {
          const q = classQuotas[k] ? classQuotas[k] : '∞';
          return shortKelas(k) + ' (' + q + ')';
        });
        
        if (fullList.length > 4) {
          const visible = fullList.slice(0, 4).join(', ');
          const hidden = fullList.slice(4).join(', ');
          kelasWithQuotasHtml = `<span title="${escapeHtml(hidden)}">${escapeHtml(visible)} <span style="color:var(--primary); font-weight:bold; cursor:help;">+${fullList.length - 4}</span></span>`;
        } else {
          kelasWithQuotasHtml = escapeHtml(fullList.join(', '));
        }
      }

      let hariTags = '-';
      if (hariArr.length > 0) {
        if (hariArr.length === 6) { // Asumsi 6 hari (Senin-Sabtu)
          hariTags = `<span class="tag" style="background:var(--info-light); color:var(--info); border-color:var(--info);">Semua Hari (${hariArr.length})</span>`;
        } else if (hariArr.length > 3) {
          const visible = hariArr.slice(0, 3).map(function(h) { return '<span class="tag">' + escapeHtml(h) + '</span>'; }).join('');
          const hidden = hariArr.slice(3).join(', ');
          hariTags = visible + `<span class="tag" style="background:var(--border-light); color:var(--text-secondary); cursor:help;" title="${escapeHtml(hidden)}">+${hariArr.length - 3}</span>`;
        } else {
          hariTags = hariArr.map(function(h) { return '<span class="tag">' + escapeHtml(h) + '</span>'; }).join('');
        }
      }

      let sesiTags = '-';
      if (sesiArr.length > 0) {
        if (sesiArr.length > 4) {
          const visible = sesiArr.slice(0, 4).map(function(s) { return '<span class="tag">' + escapeHtml(s) + '</span>'; }).join('');
          const hidden = sesiArr.slice(4).join(', ');
          sesiTags = visible + `<span class="tag" style="background:var(--border-light); color:var(--text-secondary); cursor:help;" title="${escapeHtml(hidden)}">+${sesiArr.length - 4} sesi</span>`;
        } else {
          sesiTags = sesiArr.map(function(s) { return '<span class="tag">' + escapeHtml(s) + '</span>'; }).join('');
        }
      }

      return `<tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(g.nama || '')}</strong></td>
        <td>${escapeHtml(g.mapel || '')}</td>
        <td>${escapeHtml(g.noHp || '')}</td>
        <td><span style="font-size:0.75rem; font-weight:500; color:var(--text-secondary)">${kelasWithQuotasHtml}</span></td>
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
        <div style="display:flex; gap:12px; align-items:center;">
          <input type="text" id="admin-guru-search" placeholder="Cari guru atau mapel..." 
            style="padding:6px 12px; border:1.5px solid var(--border); border-radius:var(--radius-md); background:var(--bg-card); color:var(--text); font-size:0.85rem; width:220px; outline:none;" />
          <button class="btn btn--primary btn--sm" data-action="add-guru">+ Tambah Guru</button>
        </div>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama</th>
              <th>Mapel</th>
              <th>No. HP</th>
              <th>Kelas (Kuota)</th>
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
    
    // Parse checked classes and their quotas
    const checkedClasses = [];
    const classQuotas = {};
    kelasGuru.forEach(function (item) {
      if (item.indexOf(':') !== -1) {
        const parts = item.split(':');
        const kName = parts[0].trim();
        const kQuota = parseInt(parts[1]) || 0;
        checkedClasses.push(kName);
        classQuotas[kName] = kQuota;
      } else {
        checkedClasses.push(item);
        classQuotas[item] = ''; // empty string represents no quota or default
      }
    });

    const kelasCheckboxes = CONFIG.KELAS.map(function (k) {
      const isChecked = checkedClasses.indexOf(k) !== -1;
      const checked = isChecked ? 'checked' : '';
      const quotaVal = isChecked && classQuotas[k] !== undefined ? classQuotas[k] : '';
      const id = uid('kelas');
      
      return `
        <div style="display:flex; justify-content:space-between; align-items:center; width:100%; padding:6px 0; border-bottom:1px solid var(--border-color)">
          <label style="display:inline-flex; align-items:center; gap:8px; font-size:0.85rem; cursor:pointer">
            <input type="checkbox" name="kelas" value="${k}" ${checked} style="width:14px; height:14px; cursor:pointer">
            <span>${escapeHtml(k)}</span>
          </label>
          <div style="display:inline-flex; align-items:center; gap:4px">
            <span style="font-size:0.75rem; color:var(--text-secondary)">Kuota:</span>
            <input type="number" name="kelas_quota_${k}" value="${quotaVal}" min="0" placeholder="∞" 
              style="width:50px; padding:3px 6px; font-size:0.75rem; border:1px solid var(--border-color); border-radius:4px; text-align:center" 
              ${!isChecked ? 'disabled' : ''} />
          </div>
        </div>
      `;
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
          <input type="tel" class="form-input" name="noHp" value="${isEdit ? escapeHtml(guru.noHp || '') : ''}" required placeholder="8xxxxxxxxxx" />
        </div>
        <div class="form-group">
          <label class="form-label">PIN *</label>
          <input type="text" class="form-input" name="pin" value="${isEdit ? escapeHtml(guru.pin || '123456') : '123456'}" required placeholder="123456" maxlength="6" inputmode="numeric" />
        </div>
        <input type="hidden" name="kuota" value="0" />
        <div class="form-group">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--sp-2)">
            <label class="form-label" style="margin-bottom:0">Kelas yang Diampu</label>
            <button type="button" id="btn-select-all-kelas" style="background:none; border:none; color:var(--primary); font-size:0.75rem; font-weight:600; cursor:pointer">Pilih Semua Kelas</button>
          </div>
          <div style="max-height: 200px; overflow-y: auto; border: 1px solid var(--border-color); padding: 12px; border-radius: 8px;">
            ${kelasCheckboxes}
          </div>
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

  /* ---------- Admin: Kelola Kelas ---------- */
  function renderAdminKelasTab(kelasList) {
    const rows = (kelasList || []).map(function (k, idx) {
      return `<tr>
        <td>${idx + 1}</td>
        <td><strong>${escapeHtml(k.namaKelas || k.nama || '')}</strong></td>
        <td>
          <div class="table-actions">
            <button class="btn btn--ghost btn--sm" data-action="edit-kelas" data-kelas-id="${escapeHtml(k.id || '')}">✏️</button>
            <button class="btn btn--ghost btn--sm text-danger" data-action="delete-kelas" data-kelas-id="${escapeHtml(k.id || '')}" data-kelas-nama="${escapeHtml(k.namaKelas || k.nama || '')}">🗑</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    return `
      <div class="admin-content__header">
        <h2>🏫 Kelola Kelas</h2>
        <button class="btn btn--primary btn--sm" data-action="add-kelas">+ Tambah Kelas</button>
      </div>
      <div class="data-table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Nama Kelas</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="3" class="text-center text-secondary p-6">Belum ada kelas</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ---------- Admin: Kelas Form Modal ---------- */
  function renderKelasFormModal(kelas) {
    const isEdit = !!kelas;
    const title = isEdit ? 'Edit Kelas' : 'Tambah Kelas Baru';

    return renderModal(title, `
      <form id="kelas-form" data-kelas-id="${isEdit ? escapeHtml(kelas.id) : ''}">
        <div class="form-group">
          <label class="form-label">Nama Kelas *</label>
          <input type="text" class="form-input" name="namaKelas" value="${isEdit ? escapeHtml(kelas.namaKelas || kelas.nama || '') : ''}" required placeholder="Contoh: Kelas 7 Abu Bakar" />
        </div>
      </form>
    `, `
      <button class="btn btn--secondary" data-action="close-modal">Batal</button>
      <button class="btn btn--primary" data-action="save-kelas">${isEdit ? 'Update' : 'Simpan'}</button>
    `);
  }

  /* ---------- Admin: Monitor Booking ---------- */
  function renderAdminMonitorTab(bookings) {
    const guruMap = {};
    (bookings || []).forEach(function(b) {
      const guruKey = b.guruNama + '_' + b.mapel;
      if (!guruMap[guruKey]) {
        guruMap[guruKey] = {
          nama: b.guruNama,
          mapel: b.mapel,
          bookings: []
        };
      }
      guruMap[guruKey].bookings.push(b);
    });

    const guruKeys = Object.keys(guruMap).sort();
    let rows = '';
    
    if (guruKeys.length === 0) {
      rows = '<tr><td colspan="3" class="text-center text-secondary p-6">Belum ada booking</td></tr>';
    } else {
      rows = guruKeys.map(function(key, idx) {
        const guru = guruMap[key];
        
        // Urutkan booking berdasarkan hari lalu sesi
        guru.bookings.sort(function(a, b) {
          const hariA = CONFIG.HARI.indexOf(a.hari);
          const hariB = CONFIG.HARI.indexOf(b.hari);
          if (hariA !== hariB) return hariA - hariB;
          return (a.sesiMulai || a.sesiNama || '').localeCompare(b.sesiMulai || b.sesiNama || '');
        });

        const bookingPills = guru.bookings.map(function(b) {
          return `<div class="monitor-booking-pill">
            <div class="monitor-booking-pill__info"><strong>${escapeHtml(b.hari || '')}</strong> - ${escapeHtml(b.sesiNama || b.sesi || '')} (${escapeHtml(b.kelas || '')})</div>
            <button class="monitor-booking-pill__btn" data-action="force-release" data-booking-id="${escapeHtml(b.id || '')}" data-booking-info="${escapeHtml(b.guruNama + ' - ' + b.kelas)}" title="Lepas Booking">✕</button>
          </div>`;
        }).join('');

        return `<tr>
          <td style="width: 50px; vertical-align: top; padding-top: var(--sp-4);">${idx + 1}</td>
          <td style="width: 200px; vertical-align: top; padding-top: var(--sp-4);">
            <strong>${escapeHtml(guru.nama || '')}</strong>
            <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 4px;">${escapeHtml(guru.mapel || '')}</div>
          </td>
          <td style="vertical-align: top; padding-top: var(--sp-4); padding-bottom: var(--sp-4);">
            <div class="monitor-booking-list">
              ${bookingPills}
            </div>
          </td>
        </tr>`;
      }).join('');
    }

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
              <th>Guru & Mapel</th>
              <th>Daftar Jadwal (Hari - Sesi - Kelas)</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  }

  /* ---------- Admin: Roster Tab ---------- */
  function renderAdminRosterTab(state) {
    const currentHari = state.adminRosterHari || CONFIG.HARI[0];
    const currentGrade = state.adminRosterGrade || 'Semua';

    const tabs = ['Semua', ...CONFIG.HARI];
    const dayTabs = tabs.map(function (h) {
      const active = h === currentHari;
      const label = h === 'Semua' ? 'Semua Hari' : h;
      return `<button class="day-tab ${active ? 'active' : ''}" data-admin-roster-hari="${h}">${label}</button>`;
    }).join('');

    const gradePills = ['Semua', '7', '8', '9'].map(function (g) {
      return `<button class="grade-pill ${g === currentGrade ? 'active' : ''}" data-admin-roster-grade="${g}">
        ${g === 'Semua' ? 'Semua' : 'Kelas ' + g}
      </button>`;
    }).join('');

    return `
      <div class="admin-content__header">
        <h2>📊 Roster</h2>
        <button class="btn btn--secondary btn--sm" data-action="print-roster">⬇ Download PDF</button>
      </div>
      <div class="print-title" style="display:none;">${CONFIG.SCHOOL_NAME} — ${CONFIG.SCHOOL_FULL}</div>
      <div class="print-subtitle" style="display:none;">Roster Jadwal Mengajar Tahun Ajaran ${new Date().getFullYear()}/${new Date().getFullYear()+1}</div>
      <div class="print-meta" style="display:none; text-align:center; margin-bottom:20px; font-weight:bold;">
        Hari: ${currentHari} | Tingkat: ${currentGrade === 'Semua' ? 'Semua Kelas' : 'Kelas ' + currentGrade}
      </div>
      <div class="day-tabs mb-4 no-print">${dayTabs}</div>
      <div class="grade-filter mb-4 no-print">${gradePills}</div>
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
     CLASS LEVEL QUOTAS RENDERER
     ========================================================== */
  function renderClassQuotas(guru, guruBookings) {
    const allowedKelas = [];
    const classQuotas = {};
    if (guru.kelas) {
      let rawKelas = [];
      if (Array.isArray(guru.kelas)) {
        rawKelas = guru.kelas;
      } else if (typeof guru.kelas === 'string') {
        rawKelas = guru.kelas.split(',').map(function (s) { return s.trim(); });
      }
      rawKelas.forEach(function (item) {
        if (item.indexOf(':') !== -1) {
          const parts = item.split(':');
          const kName = parts[0].trim();
          const kQuota = parseInt(parts[1]) || 0;
          allowedKelas.push(kName);
          classQuotas[kName] = kQuota;
        } else {
          allowedKelas.push(item);
          classQuotas[item] = 0;
        }
      });
    }

    const classBookings = guruBookings || [];
    const classUsed = {};
    allowedKelas.forEach(function (kelas) {
      classUsed[kelas] = classBookings.filter(function (b) {
        return b.kelas === kelas;
      }).length;
    });

    const classQuotasHtml = allowedKelas.map(function (kelas) {
      const quota = classQuotas[kelas] || 0;
      const used = classUsed[kelas] || 0;
      const displayQuota = quota > 0 ? quota : '∞';
      const isFull = quota > 0 && used >= quota;
      const pillClass = isFull ? 'badge--danger' : used > 0 ? 'badge--warning' : 'badge--success';
      
      return `
        <div style="background: var(--bg-card); border: 1.5px solid var(--border); padding: 8px 12px; border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 4px; min-width: 120px; box-shadow: var(--shadow-sm); flex-grow: 1;">
          <span style="font-size: 0.72rem; font-weight: 700; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(kelas)}">${escapeHtml(shortKelas(kelas))}</span>
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; margin-top: 2px;">
            <span class="badge ${pillClass}" style="font-size: 0.65rem; font-weight: 700; padding: 1px 6px; border-radius: 4px; display: inline-flex;">
              ${used}/${displayQuota}
            </span>
            <span style="font-size: 0.62rem; color: ${isFull ? 'var(--danger)' : 'var(--success)'}; font-weight: 700; text-transform: uppercase; letter-spacing: 0.02em;">
              ${isFull ? 'Penuh' : 'Slot'}
            </span>
          </div>
        </div>
      `;
    }).join('');

    return `
      <div class="kuota-container-new" style="width: 100%;">
        <span style="font-size: 0.75rem; font-weight: 700; color: var(--text-secondary); display: block; margin-bottom: var(--sp-2); text-transform: uppercase; letter-spacing: 0.05em;">Kuota Booking per Kelas</span>
        <div style="display: flex; flex-wrap: wrap; gap: 8px; width: 100%;">
          ${classQuotasHtml || '<span style="font-size: 0.8rem; color: var(--text-secondary);">Tidak ada kelas yang diampu</span>'}
        </div>
      </div>
    `;
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
    renderClassQuotas: renderClassQuotas,
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
    renderAdminKelasTab: renderAdminKelasTab,
    renderKelasFormModal: renderKelasFormModal,
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
