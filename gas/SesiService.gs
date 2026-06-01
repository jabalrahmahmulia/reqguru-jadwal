/**
 * ============================================================
 * SesiService.gs - Layanan Manajemen Sesi
 * ============================================================
 * Mengelola slot waktu (sesi) yang bisa dibooking guru.
 * Setiap sesi sekarang diikat pada Hari tertentu agar durasi
 * dan jumlah sesi bisa berbeda-beda tiap harinya.
 * 
 * HEADER sheet Sesi:
 * ID | Hari | Nama_Sesi | Jam_Mulai | Jam_Selesai | Tipe | Urutan
 * 
 * Tipe sesi:
 * - Reguler: sesi belajar biasa
 * - Istirahat: waktu istirahat (tidak bisa dibooking)
 * ============================================================
 */

// Header kolom sheet Sesi dengan penambahan kolom 'Hari'
var SESI_HEADERS = ['ID', 'Hari', 'Nama_Sesi', 'Jam_Mulai', 'Jam_Selesai', 'Tipe', 'Urutan'];

/**
 * Mendapatkan semua sesi, diurutkan berdasarkan kolom Hari dan Urutan.
 * @returns {Object} {success, data: sesiArray, message}
 */
function getAllSesi() {
  try {
    var sheet = getSheet('Sesi');
    if (!sheet) {
      return { success: true, data: [], message: 'Belum ada data sesi.' };
    }

    var sesiList = sheetToObjects(sheet);

    // Sorting Helper: urutan hari senin-sabtu
    var hariOrder = { 'Senin': 1, 'Selasa': 2, 'Rabu': 3, 'Kamis': 4, 'Jumat': 5, 'Sabtu': 6 };

    // Urutkan berdasarkan Hari dan Urutan
    sesiList.sort(function(a, b) {
      var dayA = hariOrder[a['Hari']] || 99;
      var dayB = hariOrder[b['Hari']] || 99;
      if (dayA !== dayB) return dayA - dayB;
      return (parseInt(a['Urutan']) || 0) - (parseInt(b['Urutan']) || 0);
    });

    var result = [];
    for (var i = 0; i < sesiList.length; i++) {
      var s = sesiList[i];
      result.push({
        id: s['ID'],
        hari: s['Hari'] || '',
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
 * @param {Object} data - {hari, namaSesi, jamMulai, jamSelesai, tipe, urutan}
 * @returns {Object} {success, data: {id}, message}
 */
function addSesi(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var error = validateRequired(data, ['hari', 'namaSesi', 'jamMulai', 'jamSelesai', 'tipe']);
    if (error) {
      return { success: false, data: null, message: error };
    }

    var sheet = getSheet('Sesi', true);

    // Pastikan header ada
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, SESI_HEADERS.length).setValues([SESI_HEADERS]);
    }

    var newId = generateId('S');

    // Tentukan urutan: jika tidak diberikan, pakai urutan terakhir pada hari tersebut + 1
    var urutan = data.urutan;
    if (!urutan) {
      var existing = sheetToObjects(sheet);
      var maxUrutan = 0;
      for (var i = 0; i < existing.length; i++) {
        if (existing[i]['Hari'] === data.hari) {
          var u = parseInt(existing[i]['Urutan']) || 0;
          if (u > maxUrutan) maxUrutan = u;
        }
      }
      urutan = maxUrutan + 1;
    }

    var newRow = [
      newId,
      data.hari,
      data.namaSesi,
      data.jamMulai,
      data.jamSelesai,
      data.tipe,
      parseInt(urutan)
    ];

    sheet.getRange(sheet.getLastRow() + 1, 1, 1, newRow.length).setValues([newRow]);

    return { success: true, data: { id: newId }, message: 'Sesi "' + data.namaSesi + '" untuk hari ' + data.hari + ' berhasil ditambahkan.' };

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
    if (data.hari !== undefined) sesi['Hari'] = data.hari;
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
 * Menghapus sesi (hard delete).
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
 * Inisialisasi 31 sesi default per hari sesuai spesifikasi sekolah.
 * Diaktifkan jika sheet Sesi kosong.
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

    // Data default 31 sesi sesuai instruksi user
    var defaultSesi = [
      // === SENIN (6 Sesi) ===
      ['S001', 'Senin', 'Sesi 1', '10:30', '11:10', 'Reguler', 1],
      ['S002', 'Senin', 'Sesi 2', '11:10', '11:50', 'Reguler', 2],
      ['S003', 'Senin', 'Sesi 3', '11:50', '12:30', 'Reguler', 3],
      ['S004', 'Senin', 'Sesi 4', '14:00', '14:40', 'Reguler', 4],
      ['S005', 'Senin', 'Sesi 5', '14:40', '15:20', 'Reguler', 5],
      ['S006', 'Senin', 'Sesi 6', '15:20', '16:00', 'Reguler', 6],

      // === SELASA (6 Sesi) ===
      ['S007', 'Selasa', 'Sesi 1', '10:30', '11:10', 'Reguler', 1],
      ['S008', 'Selasa', 'Sesi 2', '11:10', '11:50', 'Reguler', 2],
      ['S009', 'Selasa', 'Sesi 3', '11:50', '12:30', 'Reguler', 3],
      ['S010', 'Selasa', 'Sesi 4', '14:00', '14:40', 'Reguler', 4],
      ['S011', 'Selasa', 'Sesi 5', '14:40', '15:20', 'Reguler', 5],
      ['S012', 'Selasa', 'Sesi 6', '15:20', '16:00', 'Reguler', 6],

      // === RABU (6 Sesi) ===
      ['S013', 'Rabu', 'Sesi 1', '10:30', '11:10', 'Reguler', 1],
      ['S014', 'Rabu', 'Sesi 2', '11:10', '11:50', 'Reguler', 2],
      ['S015', 'Rabu', 'Sesi 3', '11:50', '12:30', 'Reguler', 3],
      ['S016', 'Rabu', 'Sesi 4', '14:00', '14:40', 'Reguler', 4],
      ['S017', 'Rabu', 'Sesi 5', '14:40', '15:20', 'Reguler', 5],
      ['S018', 'Rabu', 'Sesi 6', '15:20', '16:00', 'Reguler', 6],

      // === KAMIS (6 Sesi) ===
      ['S019', 'Kamis', 'Sesi 1', '10:30', '11:10', 'Reguler', 1],
      ['S020', 'Kamis', 'Sesi 2', '11:10', '11:50', 'Reguler', 2],
      ['S021', 'Kamis', 'Sesi 3', '11:50', '12:30', 'Reguler', 3],
      ['S022', 'Kamis', 'Sesi 4', '14:00', '14:40', 'Reguler', 4],
      ['S023', 'Kamis', 'Sesi 5', '14:40', '15:20', 'Reguler', 5],
      ['S024', 'Kamis', 'Sesi 6', '15:20', '16:00', 'Reguler', 6],

      // === JUMAT (5 Sesi) ===
      ['S025', 'Jumat', 'Sesi 1', '10:30', '11:10', 'Reguler', 1],
      ['S026', 'Jumat', 'Sesi 2', '11:10', '11:50', 'Reguler', 2],
      ['S027', 'Jumat', 'Sesi 3', '14:00', '14:40', 'Reguler', 3],
      ['S028', 'Jumat', 'Sesi 4', '14:40', '15:20', 'Reguler', 4],
      ['S029', 'Jumat', 'Sesi 5', '15:20', '16:00', 'Reguler', 5],

      // === SABTU (2 Sesi) ===
      ['S030', 'Sabtu', 'Sesi 1', '10:30', '11:10', 'Reguler', 1],
      ['S031', 'Sabtu', 'Sesi 2', '11:10', '11:50', 'Reguler', 2]
    ];

    // Batch write semua sesi sekaligus
    sheet.getRange(2, 1, defaultSesi.length, SESI_HEADERS.length).setValues(defaultSesi);
    Logger.log('31 sesi default per hari berhasil diinisialisasi.');

  } catch (err) {
    Logger.log('initializeSesi error: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}
