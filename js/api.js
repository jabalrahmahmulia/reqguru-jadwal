/* ============================================================
   JadwalGuru — API Communication Layer
   ============================================================
   Semua komunikasi dengan Google Apps Script Web App.
   Action names di sini HARUS cocok dengan routing di Code.gs.
   ============================================================ */

const api = (function () {
  'use strict';

  /* ---------- Field Normalization ---------- */
  // Backend uses full names (mataPelajaran, kuotaSesi, etc.)
  // Frontend components use short names (mapel, kuota, etc.)
  function normalizeGuru(g) {
    if (!g) return g;
    return {
      id: g.id || g.ID,
      nama: g.nama || g.Nama,
      mapel: g.mataPelajaran || g.mapel || g.Mata_Pelajaran || '',
      kelas: g.kelas || g.Kelas || '',
      kuota: parseInt(g.kuotaSesi || g.kuota || g.Kuota_Sesi) || 0,
      kuotaUsed: parseInt(g.sesiTerpakai || g.kuotaUsed || g.Sesi_Terpakai) || 0,
      hariAllowed: g.hariAllowed || g.Hari_Allowed || '',
      sesiAllowed: g.sesiAllowed || g.Sesi_Allowed || '',
      status: g.status || g.Status || 'Aktif',
      noHp: g.noHp || ''
    };
  }

  function normalizeSesi(s) {
    if (!s) return s;
    return {
      id: s.id || s.ID || s.sesiId,
      hari: s.hari || s.Hari || '',
      nama: s.namaSesi || s.nama || s.Nama_Sesi || '',
      mulai: s.jamMulai || s.mulai || s.Jam_Mulai || '',
      selesai: s.jamSelesai || s.selesai || s.Jam_Selesai || '',
      tipe: s.tipe || s.Tipe || 'Regular',
      urutan: parseInt(s.urutan || s.Urutan) || 0
    };
  }

  function normalizeBooking(b) {
    if (!b) return b;
    return {
      id: b.id || b.ID,
      guruId: b.guruId || b.Guru_ID,
      guruNama: b.guruNama || b.Guru_Nama || '',
      hari: b.hari || b.Hari,
      sesiId: b.sesiId || b.Sesi_ID,
      sesiNama: b.sesiNama || b.Sesi_Nama || '',
      kelas: b.kelas || b.Kelas,
      mapel: b.mapel || b.mataPelajaran || '',
      status: b.status || b.Status || 'Aktif',
      waktuBooking: b.waktuBooking || b.Waktu_Booking || ''
    };
  }

  function normalizeArray(arr, fn) {
    if (!Array.isArray(arr)) return [];
    return arr.map(fn);
  }

  /* ---------- Core Request Methods ---------- */
  async function request(method, action, params, body) {
    let url = CONFIG.GAS_URL;
    const queryParams = new URLSearchParams();
    queryParams.set('action', action);

    if (params) {
      Object.entries(params).forEach(function (entry) {
        if (entry[1] !== undefined && entry[1] !== null) {
          queryParams.set(entry[0], entry[1]);
        }
      });
    }

    url += '?' + queryParams.toString();

    const options = {
      method: method,
      redirect: 'follow',
      headers: {}
    };

    if (method === 'POST' && body) {
      // Use text/plain to avoid CORS preflight with GAS
      options.headers['Content-Type'] = 'text/plain;charset=utf-8';
      options.body = JSON.stringify(Object.assign({ action: action }, body));
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error('Server error: ' + response.status);
      }

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Invalid response from server');
      }

      if (data.success === false) {
        throw new Error(data.message || 'Terjadi kesalahan');
      }

      return data;
    } catch (err) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        throw new Error('Tidak dapat terhubung ke server. Periksa koneksi internet Anda.');
      }
      throw err;
    }
  }

  async function get(action, params) {
    return request('GET', action, params);
  }

  async function post(action, body) {
    return request('POST', action, null, body);
  }

  /* ---------- Wrapped API Methods ---------- */

  // ==== AUTH / LOGIN ====

  /** Daftar guru untuk dropdown login (id + nama only) */
  async function getGuruList() {
    showLoading('Memuat data guru...');
    try {
      const res = await get('getGuruList');
      return normalizeArray(res.data || [], normalizeGuru);
    } catch (err) {
      showToast(err.message, 'error');
      return [];
    } finally {
      hideLoading();
    }
  }

  /** Login guru: nama + noHp */
  async function loginGuru(nama, noHp) {
    showLoading('Memverifikasi...');
    try {
      const res = await post('loginGuru', { nama: nama, noHp: noHp });
      showToast('Login berhasil! Selamat datang, ' + escapeHtml(nama), 'success');
      return normalizeGuru(res.data || res);
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  /** Login admin: pin */
  async function adminLogin(pin) {
    showLoading('Memverifikasi PIN...');
    try {
      const res = await post('adminLogin', { pin: pin });
      showToast('Login admin berhasil!', 'success');
      return res.data || res;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  // ==== GURU ====

  /** Semua guru dengan detail lengkap (admin) */
  async function getAllGuru() {
    showLoading('Memuat data guru...');
    try {
      const res = await get('getAllGuru');
      return normalizeArray(res.data || [], normalizeGuru);
    } catch (err) {
      showToast(err.message, 'error');
      return [];
    } finally {
      hideLoading();
    }
  }

  /** Detail satu guru */
  async function getGuruDetail(guruId) {
    try {
      const res = await get('getGuruDetail', { guruId: guruId });
      return res.data || null;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    }
  }

  /** Tambah guru (admin) */
  async function addGuru(guruData) {
    showLoading('Menyimpan data guru...');
    try {
      const res = await post('addGuru', guruData);
      showToast('Guru berhasil ditambahkan', 'success');
      return res.data || res;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  /** Update guru (admin) */
  async function updateGuru(guruId, guruData) {
    showLoading('Mengupdate data guru...');
    try {
      guruData.guruId = guruId;
      const res = await post('updateGuru', guruData);
      showToast('Data guru berhasil diupdate', 'success');
      return res.data || res;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  /** Delete guru / nonaktifkan (admin) */
  async function deleteGuru(guruId) {
    showLoading('Menghapus guru...');
    try {
      const res = await post('deleteGuru', { guruId: guruId });
      showToast('Guru berhasil dinonaktifkan', 'success');
      return res.data || res;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  /** Reset password / No HP guru (admin) */
  async function resetPassword(guruId, newNoHp) {
    showLoading('Mereset password...');
    try {
      const res = await post('resetPassword', { guruId: guruId, newNoHp: newNoHp });
      showToast('Password berhasil direset', 'success');
      return res.data || res;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  // ==== SESI ====

  /** Semua sesi - Backend action: getAllSesi */
  async function getSesi() {
    try {
      const res = await get('getAllSesi');
      return normalizeArray(res.data || [], normalizeSesi);
    } catch (err) {
      showToast(err.message, 'error');
      return [];
    }
  }

  /** Tambah sesi (admin) */
  async function addSesi(sesiData) {
    showLoading('Menyimpan sesi...');
    try {
      const res = await post('addSesi', sesiData);
      showToast('Sesi berhasil ditambahkan', 'success');
      return res.data || res;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  /** Update sesi (admin) */
  async function updateSesi(sesiId, sesiData) {
    showLoading('Mengupdate sesi...');
    try {
      sesiData.sesiId = sesiId;
      const res = await post('updateSesi', sesiData);
      showToast('Sesi berhasil diupdate', 'success');
      return res.data || res;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  /** Delete sesi (admin) */
  async function deleteSesi(sesiId) {
    showLoading('Menghapus sesi...');
    try {
      const res = await post('deleteSesi', { sesiId: sesiId });
      showToast('Sesi berhasil dihapus', 'success');
      return res.data || res;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  // ==== BOOKING ====

  /** Booking per hari - Backend action: getBookingByHari */
  async function getBookings(hari) {
    try {
      const action = hari ? 'getBookingByHari' : 'getAllBooking';
      const params = hari ? { hari: hari } : {};
      const res = await get(action, params);
      return normalizeArray(res.data || [], normalizeBooking);
    } catch (err) {
      showToast(err.message, 'error');
      return [];
    }
  }

  /** Jadwal guru - Backend action: getGuruSchedule */
  async function getGuruBookings(guruId) {
    try {
      const res = await get('getGuruSchedule', { guruId: guruId });
      return normalizeArray(res.data || [], normalizeBooking);
    } catch (err) {
      showToast(err.message, 'error');
      return [];
    }
  }

  /** Booking sesi - includes noHp dari current guru session */
  async function bookSesi(guruId, hari, sesiId, kelas) {
    showLoading('Memproses booking...');
    try {
      // Get noHp from session for authentication
      const guru = loadSession('currentGuru');
      const noHp = guru ? guru.noHp : '';
      const res = await post('bookSesi', {
        guruId: guruId,
        hari: hari,
        sesiId: sesiId,
        kelas: kelas,
        noHp: noHp
      });
      showToast(res.message || 'Booking berhasil!', 'success');
      return res.data || res;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  /** Release sesi - needs bookingId, guruId, noHp */
  async function releaseSesi(bookingId, guruId) {
    showLoading('Melepas booking...');
    try {
      const guru = loadSession('currentGuru');
      const noHp = guru ? guru.noHp : '';
      const res = await post('releaseSesi', {
        bookingId: bookingId,
        guruId: guruId,
        noHp: noHp
      });
      showToast(res.message || 'Booking berhasil dilepas', 'success');
      return res.data || res;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  /** Semua booking aktif (admin) - Backend action: getAllBooking */
  async function getAllBookings() {
    showLoading('Memuat semua booking...');
    try {
      const res = await get('getAllBooking');
      return normalizeArray(res.data || [], normalizeBooking);
    } catch (err) {
      showToast(err.message, 'error');
      return [];
    } finally {
      hideLoading();
    }
  }

  /** Force release oleh admin - Backend requires PIN verification */
  async function forceRelease(bookingId, adminPin) {
    showLoading('Melepas booking...');
    try {
      const pin = adminPin || loadSession('adminPin');
      const res = await post('forceRelease', { bookingId: bookingId, pin: pin });
      showToast(res.message || 'Booking berhasil dilepas paksa', 'success');
      return res.data || res;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  /** Bulk release semua booking (admin) */
  async function bulkRelease(adminPin) {
    showLoading('Mereset semua booking...');
    try {
      const pin = adminPin || loadSession('adminPin');
      const res = await post('bulkRelease', { pin: pin });
      showToast(res.message || 'Semua booking berhasil direset', 'success');
      return res.data || res;
    } catch (err) {
      showToast(err.message, 'error');
      return null;
    } finally {
      hideLoading();
    }
  }

  // ==== ROSTER & STATS ====

  /** Roster lengkap - Backend action: getRoster */
  async function getRoster() {
    try {
      const res = await get('getRoster');
      return res.data || {};
    } catch (err) {
      showToast(err.message, 'error');
      return {};
    }
  }

  /** Kelas list - Backend action: getKelasList */
  async function getKelasList() {
    try {
      const res = await get('getKelasList');
      return res.data || [];
    } catch (err) {
      showToast(err.message, 'error');
      return [];
    }
  }

  /** Dashboard stats - Backend action: getDashboardStats */
  async function getStats() {
    try {
      const res = await get('getDashboardStats');
      return res.data || {};
    } catch (err) {
      showToast(err.message, 'error');
      return {};
    }
  }

  /* ---------- Public API ---------- */
  return {
    get: get,
    post: post,
    getGuruList: getGuruList,
    loginGuru: loginGuru,
    adminLogin: adminLogin,
    getAllGuru: getAllGuru,
    getGuruDetail: getGuruDetail,
    addGuru: addGuru,
    updateGuru: updateGuru,
    deleteGuru: deleteGuru,
    resetPassword: resetPassword,
    getSesi: getSesi,
    addSesi: addSesi,
    updateSesi: updateSesi,
    deleteSesi: deleteSesi,
    getBookings: getBookings,
    getGuruBookings: getGuruBookings,
    bookSesi: bookSesi,
    releaseSesi: releaseSesi,
    getAllBookings: getAllBookings,
    forceRelease: forceRelease,
    bulkRelease: bulkRelease,
    getRoster: getRoster,
    getKelasList: getKelasList,
    getStats: getStats
  };
})();
