/**
 * ============================================================
 * GuruService.gs - Layanan Manajemen Guru
 * ============================================================
 * CRUD operations untuk data guru:
 * - Tambah guru baru dengan hash noHP
 * - Update data guru
 * - Soft delete (nonaktifkan)
 * - Reset password (nomor HP)
 * - Hitung ulang kuota sesi terpakai
 * 
 * HEADER sheet Guru:
 * ID | Nama | NoHP_Hash | Mata_Pelajaran | Kelas | Kuota_Sesi | Sesi_Terpakai | Hari_Allowed | Sesi_Allowed | Status
 * ============================================================
 */

// Header kolom sheet Guru
var GURU_HEADERS = ['ID', 'Nama', 'NoHP_Hash', 'Mata_Pelajaran', 'Kelas', 'Kuota_Sesi', 'Sesi_Terpakai', 'Hari_Allowed', 'Sesi_Allowed', 'Status'];

/**
 * Mendapatkan semua guru (untuk admin).
 * Mengembalikan semua field kecuali hash password.
 * @returns {Object} {success, data: guruArray, message}
 */
function getAllGuru() {
  try {
    var sheet = getSheet('Guru');
    if (!sheet) {
      return { success: true, data: [], message: 'Belum ada data guru.' };
    }

    var guruList = sheetToObjects(sheet);
    var result = [];

    for (var i = 0; i < guruList.length; i++) {
      var g = guruList[i];
      result.push({
        id: g['ID'],
        nama: g['Nama'],
        mataPelajaran: g['Mata_Pelajaran'],
        kelas: g['Kelas'],
        kuotaSesi: g['Kuota_Sesi'],
        sesiTerpakai: g['Sesi_Terpakai'],
        hariAllowed: g['Hari_Allowed'],
        sesiAllowed: g['Sesi_Allowed'],
        status: g['Status'],
        noHp: g['NoHP_Hash']
      });
    }

    return { success: true, data: result, message: 'Data guru berhasil diambil.' };

  } catch (err) {
    Logger.log('getAllGuru error: ' + err.message);
    return { success: false, data: null, message: 'Gagal mengambil data guru: ' + err.message };
  }
}

/**
 * Mendapatkan daftar guru untuk dropdown login.
 * Hanya mengembalikan ID, nama, dan status (guru aktif saja).
 * @returns {Object} {success, data: [{id, nama}], message}
 */
function getGuruList() {
  try {
    var sheet = getSheet('Guru');
    if (!sheet) {
      return { success: true, data: [], message: 'Belum ada data guru.' };
    }

    var guruList = sheetToObjects(sheet);
    var result = [];

    for (var i = 0; i < guruList.length; i++) {
      // Hanya tampilkan guru aktif
      if (guruList[i]['Status'] !== 'Nonaktif') {
        result.push({
          id: guruList[i]['ID'],
          nama: guruList[i]['Nama'],
          mataPelajaran: guruList[i]['Mata_Pelajaran']
        });
      }
    }

    return { success: true, data: result, message: 'Daftar guru berhasil diambil.' };

  } catch (err) {
    Logger.log('getGuruList error: ' + err.message);
    return { success: false, data: null, message: 'Gagal mengambil daftar guru: ' + err.message };
  }
}

/**
 * Mendapatkan detail lengkap satu guru.
 * @param {string} guruId - ID guru
 * @returns {Object} {success, data: guruObj, message}
 */
function getGuruDetail(guruId) {
  try {
    if (!guruId) {
      return { success: false, data: null, message: 'ID guru wajib diisi.' };
    }

    var sheet = getSheet('Guru');
    if (!sheet) {
      return { success: false, data: null, message: 'Sheet Guru tidak ditemukan.' };
    }

    var guruList = sheetToObjects(sheet);
    var guru = null;

    for (var i = 0; i < guruList.length; i++) {
      if (String(guruList[i]['ID']) === String(guruId)) {
        guru = guruList[i];
        break;
      }
    }

    if (!guru) {
      return { success: false, data: null, message: 'Guru dengan ID "' + guruId + '" tidak ditemukan.' };
    }

    var result = {
      id: guru['ID'],
      nama: guru['Nama'],
      mataPelajaran: guru['Mata_Pelajaran'],
      kelas: guru['Kelas'],
      kuotaSesi: guru['Kuota_Sesi'],
      sesiTerpakai: guru['Sesi_Terpakai'],
      hariAllowed: guru['Hari_Allowed'],
      sesiAllowed: guru['Sesi_Allowed'],
      status: guru['Status']
    };

    return { success: true, data: result, message: 'Detail guru berhasil diambil.' };

  } catch (err) {
    Logger.log('getGuruDetail error: ' + err.message);
    return { success: false, data: null, message: 'Gagal mengambil detail guru: ' + err.message };
  }
}

/**
 * Menambah guru baru.
 * NoHP akan di-hash sebelum disimpan.
 * Menggunakan LockService untuk mencegah race condition pada generate ID.
 * @param {Object} data - {nama, noHp, mataPelajaran, kelas, kuotaSesi, hariAllowed, sesiAllowed}
 * @returns {Object} {success, data: {id}, message}
 */
function addGuru(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    // Validasi field wajib
    var error = validateRequired(data, ['nama', 'noHp', 'mataPelajaran', 'kelas', 'kuotaSesi']);
    if (error) {
      return { success: false, data: null, message: error };
    }

    var sheet = getSheet('Guru', true);

    // Pastikan header ada
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, GURU_HEADERS.length).setValues([GURU_HEADERS]);
    }

    // Cek duplikat nama
    var existingGuru = sheetToObjects(sheet);
    for (var i = 0; i < existingGuru.length; i++) {
      if (String(existingGuru[i]['Nama']).toLowerCase().trim() === String(data.nama).toLowerCase().trim()
          && existingGuru[i]['Status'] !== 'Nonaktif') {
        return { success: false, data: null, message: 'Guru dengan nama "' + data.nama + '" sudah terdaftar.' };
      }
    }

    // Generate ID dan bersihkan nomor HP
    var newId = generateId('G');
    var cleanedHp = cleanPhone(String(data.noHp));

    // Siapkan baris baru
    var newRow = [
      newId,
      data.nama,
      cleanedHp,
      data.mataPelajaran,
      data.kelas,                              // Bisa berupa string dipisah koma
      parseInt(data.kuotaSesi) || 0,
      0,                                       // Sesi_Terpakai mulai dari 0
      data.hariAllowed || 'Senin,Selasa,Rabu,Kamis,Jumat,Sabtu',  // Default semua hari
      data.sesiAllowed || '',                  // Default: semua sesi diizinkan (kosong = semua)
      'Aktif'
    ];

    // Tulis ke baris terakhir + 1
    sheet.getRange(sheet.getLastRow() + 1, 1, 1, newRow.length).setValues([newRow]);

    return { success: true, data: { id: newId }, message: 'Guru "' + data.nama + '" berhasil ditambahkan dengan ID ' + newId + '.' };

  } catch (err) {
    Logger.log('addGuru error: ' + err.message);
    return { success: false, data: null, message: 'Gagal menambah guru: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Update data guru.
 * Field yang bisa diupdate: nama, mataPelajaran, kelas, kuotaSesi, hariAllowed, sesiAllowed
 * NoHP TIDAK bisa diupdate lewat sini (gunakan resetPassword).
 * @param {string} guruId - ID guru
 * @param {Object} data - Field yang akan diupdate
 * @returns {Object} {success, data, message}
 */
function updateGuru(guruId, data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!guruId) {
      return { success: false, data: null, message: 'ID guru wajib diisi.' };
    }

    var sheet = getSheet('Guru');
    if (!sheet) {
      return { success: false, data: null, message: 'Sheet Guru tidak ditemukan.' };
    }

    var guruList = sheetToObjects(sheet);
    var guruIndex = -1;

    for (var i = 0; i < guruList.length; i++) {
      if (String(guruList[i]['ID']) === String(guruId)) {
        guruIndex = i;
        break;
      }
    }

    if (guruIndex === -1) {
      return { success: false, data: null, message: 'Guru dengan ID "' + guruId + '" tidak ditemukan.' };
    }

    var guru = guruList[guruIndex];
    var rowNum = guru['_row']; // Nomor baris di sheet

    // Update field yang diberikan
    if (data.nama !== undefined) guru['Nama'] = data.nama;
    if (data.mataPelajaran !== undefined) guru['Mata_Pelajaran'] = data.mataPelajaran;
    if (data.kelas !== undefined) guru['Kelas'] = data.kelas;
    if (data.noHp !== undefined) guru['NoHP_Hash'] = cleanPhone(data.noHp);
    if (data.kuotaSesi !== undefined) guru['Kuota_Sesi'] = parseInt(data.kuotaSesi) || 0;
    if (data.hariAllowed !== undefined) guru['Hari_Allowed'] = data.hariAllowed;
    if (data.sesiAllowed !== undefined) guru['Sesi_Allowed'] = data.sesiAllowed;
    if (data.status !== undefined) guru['Status'] = data.status;

    // Tulis baris yang diupdate (batch write satu baris)
    var updatedRow = [];
    for (var j = 0; j < GURU_HEADERS.length; j++) {
      updatedRow.push(guru[GURU_HEADERS[j]] !== undefined ? guru[GURU_HEADERS[j]] : '');
    }

    sheet.getRange(rowNum, 1, 1, GURU_HEADERS.length).setValues([updatedRow]);

    return { success: true, data: { id: guruId }, message: 'Data guru berhasil diperbarui.' };

  } catch (err) {
    Logger.log('updateGuru error: ' + err.message);
    return { success: false, data: null, message: 'Gagal memperbarui data guru: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Menghapus guru secara permanen dari database sheet Guru
 * serta menghapus seluruh data booking aktif milik guru tersebut.
 * @param {string} guruId - ID guru
 * @returns {Object} {success, data, message}
 */
function deleteGuru(guruId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Guru');
    if (!sheet) {
      return { success: false, data: null, message: 'Sheet Guru tidak ditemukan.' };
    }

    var guruList = sheetToObjects(sheet);
    var rowNum = -1;
    for (var i = 0; i < guruList.length; i++) {
      if (String(guruList[i]['ID']) === String(guruId)) {
        rowNum = guruList[i]['_row'];
        break;
      }
    }

    if (rowNum === -1) {
      return { success: false, data: null, message: 'Guru tidak ditemukan.' };
    }

    // Hapus baris dari sheet
    sheet.deleteRow(rowNum);

    // Hapus seluruh booking aktif milik guru ini agar jadwal kembali kosong
    var bookingSheet = getSheet('Booking');
    if (bookingSheet) {
      var bookings = sheetToObjects(bookingSheet);
      // Hapus dari bawah ke atas agar indeks baris tidak bergeser
      for (var k = bookings.length - 1; k >= 0; k--) {
        if (String(bookings[k]['Guru_ID']) === String(guruId)) {
          bookingSheet.deleteRow(bookings[k]['_row']);
        }
      }
    }

    return { success: true, data: { id: guruId }, message: 'Guru berhasil dihapus dari sistem.' };

  } catch (err) {
    Logger.log('deleteGuru error: ' + err.message);
    return { success: false, data: null, message: 'Gagal menghapus guru: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Reset nomor HP guru (password reset).
 * Admin bisa mereset noHP guru yang lupa.
 * @param {string} guruId - ID guru
 * @param {string} newNoHp - Nomor HP baru (akan di-hash)
 * @returns {Object} {success, data, message}
 */
function resetPassword(guruId, newNoHp) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!guruId || !newNoHp) {
      return { success: false, data: null, message: 'ID guru dan nomor HP baru wajib diisi.' };
    }

    var sheet = getSheet('Guru');
    if (!sheet) {
      return { success: false, data: null, message: 'Sheet Guru tidak ditemukan.' };
    }

    var guruList = sheetToObjects(sheet);
    var guru = null;

    for (var i = 0; i < guruList.length; i++) {
      if (String(guruList[i]['ID']) === String(guruId)) {
        guru = guruList[i];
        break;
      }
    }

    if (!guru) {
      return { success: false, data: null, message: 'Guru dengan ID "' + guruId + '" tidak ditemukan.' };
    }

    // Bersihkan noHP baru dan update di kolom NoHP_Hash (kolom 3)
    var cleanedHp = cleanPhone(String(newNoHp));
    sheet.getRange(guru['_row'], 3).setValue(cleanedHp);

    return { success: true, data: { id: guruId }, message: 'Nomor HP guru berhasil direset.' };

  } catch (err) {
    Logger.log('resetPassword error: ' + err.message);
    return { success: false, data: null, message: 'Gagal mereset password: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Hitung ulang kuota sesi terpakai untuk seorang guru.
 * Menghitung jumlah booking aktif dan update field Sesi_Terpakai.
 * @param {string} guruId - ID guru
 * @returns {Object} {success, data: {sesiTerpakai}, message}
 */
function recalculateKuota(guruId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!guruId) {
      return { success: false, data: null, message: 'ID guru wajib diisi.' };
    }

    var guruSheet = getSheet('Guru');
    var bookingSheet = getSheet('Booking');

    if (!guruSheet) {
      return { success: false, data: null, message: 'Sheet Guru tidak ditemukan.' };
    }

    // Cari guru
    var guruList = sheetToObjects(guruSheet);
    var guru = null;

    for (var i = 0; i < guruList.length; i++) {
      if (String(guruList[i]['ID']) === String(guruId)) {
        guru = guruList[i];
        break;
      }
    }

    if (!guru) {
      return { success: false, data: null, message: 'Guru tidak ditemukan.' };
    }

    // Hitung booking aktif
    var count = 0;
    if (bookingSheet) {
      var bookings = sheetToObjects(bookingSheet);
      for (var j = 0; j < bookings.length; j++) {
        if (String(bookings[j]['Guru_ID']) === String(guruId) && bookings[j]['Status'] === 'Aktif') {
          count++;
        }
      }
    }

    // Update Sesi_Terpakai (kolom 7)
    guruSheet.getRange(guru['_row'], 7).setValue(count);

    return { success: true, data: { sesiTerpakai: count }, message: 'Kuota berhasil dihitung ulang: ' + count + ' sesi terpakai.' };

  } catch (err) {
    Logger.log('recalculateKuota error: ' + err.message);
    return { success: false, data: null, message: 'Gagal menghitung ulang kuota: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}
