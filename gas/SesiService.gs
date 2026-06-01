/**
 * ============================================================
 * SesiService.gs - Layanan Manajemen Sesi
 * ============================================================
 * Mengelola slot waktu (sesi) yang bisa dibooking guru.
 * Setiap sesi punya nama, jam mulai, jam selesai, dan tipe.
 * 
 * HEADER sheet Sesi:
 * ID | Nama_Sesi | Jam_Mulai | Jam_Selesai | Tipe | Urutan
 * 
 * Tipe sesi:
 * - Reguler: sesi belajar biasa
 * - Istirahat: waktu istirahat (tidak bisa dibooking)
 * ============================================================
 */

// Header kolom sheet Sesi
var SESI_HEADERS = ['ID', 'Nama_Sesi', 'Jam_Mulai', 'Jam_Selesai', 'Tipe', 'Urutan'];

/**
 * Mendapatkan semua sesi, diurutkan berdasarkan kolom Urutan.
 * @returns {Object} {success, data: sesiArray, message}
 */
function getAllSesi() {
  try {
    var sheet = getSheet('Sesi');
    if (!sheet) {
      return { success: true, data: [], message: 'Belum ada data sesi.' };
    }

    var sesiList = sheetToObjects(sheet);

    // Urutkan berdasarkan Urutan (ascending)
    sesiList.sort(function(a, b) {
      return (parseInt(a['Urutan']) || 0) - (parseInt(b['Urutan']) || 0);
    });

    var result = [];
    for (var i = 0; i < sesiList.length; i++) {
      var s = sesiList[i];
      result.push({
        id: s['ID'],
        namaSesi: s['Nama_Sesi'],
        jamMulai: s['Jam_Mulai'],
        jamSelesai: s['Jam_Selesai'],
        tipe: s['Tipe'],
        urutan: s['Urutan']
      });
    }

    return { success: true, data: result, message: 'Data sesi berhasil diambil.' };

  } catch (err) {
    Logger.log('getAllSesi error: ' + err.message);
    return { success: false, data: null, message: 'Gagal mengambil data sesi: ' + err.message };
  }
}

/**
 * Menambah sesi baru.
 * @param {Object} data - {namaSesi, jamMulai, jamSelesai, tipe, urutan}
 * @returns {Object} {success, data: {id}, message}
 */
function addSesi(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var error = validateRequired(data, ['namaSesi', 'jamMulai', 'jamSelesai', 'tipe']);
    if (error) {
      return { success: false, data: null, message: error };
    }

    var sheet = getSheet('Sesi', true);

    // Pastikan header ada
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, SESI_HEADERS.length).setValues([SESI_HEADERS]);
    }

    var newId = generateId('S');

    // Tentukan urutan: jika tidak diberikan, pakai urutan terakhir + 1
    var urutan = data.urutan;
    if (!urutan) {
      var existing = sheetToObjects(sheet);
      var maxUrutan = 0;
      for (var i = 0; i < existing.length; i++) {
        var u = parseInt(existing[i]['Urutan']) || 0;
        if (u > maxUrutan) maxUrutan = u;
      }
      urutan = maxUrutan + 1;
    }

    var newRow = [
      newId,
      data.namaSesi,
      data.jamMulai,
      data.jamSelesai,
      data.tipe,
      parseInt(urutan)
    ];

    sheet.getRange(sheet.getLastRow() + 1, 1, 1, newRow.length).setValues([newRow]);

    return { success: true, data: { id: newId }, message: 'Sesi "' + data.namaSesi + '" berhasil ditambahkan.' };

  } catch (err) {
    Logger.log('addSesi error: ' + err.message);
    return { success: false, data: null, message: 'Gagal menambah sesi: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update data sesi.
 * @param {string} sesiId - ID sesi
 * @param {Object} data - Field yang akan diupdate
 * @returns {Object} {success, data, message}
 */
function updateSesi(sesiId, data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!sesiId) {
      return { success: false, data: null, message: 'ID sesi wajib diisi.' };
    }

    var sheet = getSheet('Sesi');
    if (!sheet) {
      return { success: false, data: null, message: 'Sheet Sesi tidak ditemukan.' };
    }

    var sesiList = sheetToObjects(sheet);
    var sesi = null;

    for (var i = 0; i < sesiList.length; i++) {
      if (String(sesiList[i]['ID']) === String(sesiId)) {
        sesi = sesiList[i];
        break;
      }
    }

    if (!sesi) {
      return { success: false, data: null, message: 'Sesi dengan ID "' + sesiId + '" tidak ditemukan.' };
    }

    // Update field yang diberikan
    if (data.namaSesi !== undefined) sesi['Nama_Sesi'] = data.namaSesi;
    if (data.jamMulai !== undefined) sesi['Jam_Mulai'] = data.jamMulai;
    if (data.jamSelesai !== undefined) sesi['Jam_Selesai'] = data.jamSelesai;
    if (data.tipe !== undefined) sesi['Tipe'] = data.tipe;
    if (data.urutan !== undefined) sesi['Urutan'] = parseInt(data.urutan);

    // Tulis baris yang diupdate
    var updatedRow = [];
    for (var j = 0; j < SESI_HEADERS.length; j++) {
      updatedRow.push(sesi[SESI_HEADERS[j]] !== undefined ? sesi[SESI_HEADERS[j]] : '');
    }

    sheet.getRange(sesi['_row'], 1, 1, SESI_HEADERS.length).setValues([updatedRow]);

    return { success: true, data: { id: sesiId }, message: 'Sesi berhasil diperbarui.' };

  } catch (err) {
    Logger.log('updateSesi error: ' + err.message);
    return { success: false, data: null, message: 'Gagal memperbarui sesi: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Menghapus sesi (hard delete - hapus baris dari sheet).
 * Perhatian: sesi yang sudah ada di booking tidak boleh dihapus.
 * @param {string} sesiId - ID sesi
 * @returns {Object} {success, data, message}
 */
function deleteSesi(sesiId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!sesiId) {
      return { success: false, data: null, message: 'ID sesi wajib diisi.' };
    }

    var sheet = getSheet('Sesi');
    if (!sheet) {
      return { success: false, data: null, message: 'Sheet Sesi tidak ditemukan.' };
    }

    // Cek apakah sesi masih dipakai di booking aktif
    var bookingSheet = getSheet('Booking');
    if (bookingSheet) {
      var bookings = sheetToObjects(bookingSheet);
      for (var i = 0; i < bookings.length; i++) {
        if (String(bookings[i]['Sesi_ID']) === String(sesiId) && bookings[i]['Status'] === 'Aktif') {
          return { success: false, data: null, message: 'Sesi tidak bisa dihapus karena masih ada booking aktif.' };
        }
      }
    }

    // Cari baris sesi
    var sesiList = sheetToObjects(sheet);
    var sesi = null;

    for (var j = 0; j < sesiList.length; j++) {
      if (String(sesiList[j]['ID']) === String(sesiId)) {
        sesi = sesiList[j];
        break;
      }
    }

    if (!sesi) {
      return { success: false, data: null, message: 'Sesi tidak ditemukan.' };
    }

    // Hapus baris
    sheet.deleteRow(sesi['_row']);

    return { success: true, data: null, message: 'Sesi berhasil dihapus.' };

  } catch (err) {
    Logger.log('deleteSesi error: ' + err.message);
    return { success: false, data: null, message: 'Gagal menghapus sesi: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Inisialisasi 8 sesi default jika sheet Sesi kosong.
 * Sesi default untuk sekolah:
 * 1. Sesi 1 (07:15-08:00) - Reguler
 * 2. Sesi 2 (08:00-08:45) - Reguler
 * 3. Sesi 3 (08:45-09:30) - Reguler
 * 4. Istirahat 1 (09:30-10:00) - Istirahat
 * 5. Sesi 4 (10:00-10:45) - Reguler
 * 6. Sesi 5 (10:45-11:30) - Reguler
 * 7. Istirahat 2 (11:30-12:15) - Istirahat
 * 8. Sesi 6 (12:15-13:00) - Reguler
 */
function initializeSesi() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var sheet = getSheet('Sesi', true);

    // Cek apakah sudah ada data
    if (sheet.getLastRow() > 1) {
      Logger.log('Sheet Sesi sudah ada data, skip inisialisasi.');
      return;
    }

    // Tulis header
    sheet.getRange(1, 1, 1, SESI_HEADERS.length).setValues([SESI_HEADERS]);

    // Data default 8 sesi
    var defaultSesi = [
      ['S001', 'Sesi 1', '07:15', '08:00', 'Reguler', 1],
      ['S002', 'Sesi 2', '08:00', '08:45', 'Reguler', 2],
      ['S003', 'Sesi 3', '08:45', '09:30', 'Reguler', 3],
      ['S004', 'Istirahat 1', '09:30', '10:00', 'Istirahat', 4],
      ['S005', 'Sesi 4', '10:00', '10:45', 'Reguler', 5],
      ['S006', 'Sesi 5', '10:45', '11:30', 'Reguler', 6],
      ['S007', 'Istirahat 2', '11:30', '12:15', 'Istirahat', 7],
      ['S008', 'Sesi 6', '12:15', '13:00', 'Reguler', 8]
    ];

    // Batch write semua sesi sekaligus
    sheet.getRange(2, 1, defaultSesi.length, SESI_HEADERS.length).setValues(defaultSesi);
    Logger.log('8 sesi default berhasil diinisialisasi.');

  } catch (err) {
    Logger.log('initializeSesi error: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}
