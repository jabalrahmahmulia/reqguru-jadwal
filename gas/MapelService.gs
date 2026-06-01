/**
 * ============================================================
 * MapelService.gs - Layanan Manajemen Mata Pelajaran
 * ============================================================
 * Mengelola daftar pusat mata pelajaran yang terdaftar.
 * 
 * HEADER sheet Mapel:
 * ID | Nama_Mapel
 * ============================================================
 */

// Header kolom sheet Mapel
var MAPEL_HEADERS = ['ID', 'Nama_Mapel'];

/**
 * Mendapatkan semua mata pelajaran.
 * @returns {Object} {success, data: mapelArray, message}
 */
function getAllMapel() {
  try {
    var sheet = getSheet('Mapel');
    if (!sheet) {
      return { success: true, data: [], message: 'Belum ada data mata pelajaran.' };
    }

    var mapelList = sheetToObjects(sheet);
    var result = [];

    for (var i = 0; i < mapelList.length; i++) {
      var m = mapelList[i];
      result.push({
        id: m['ID'],
        nama: m['Nama_Mapel']
      });
    }

    // Urutkan alfabetis berdasarkan Nama
    result.sort(function(a, b) {
      return a.nama.localeCompare(b.nama);
    });

    return { success: true, data: result, message: 'Daftar mata pelajaran berhasil diambil.' };

  } catch (err) {
    Logger.log('getAllMapel error: ' + err.message);
    return { success: false, data: null, message: 'Gagal mengambil data mata pelajaran: ' + err.message };
  }
}

/**
 * Menambah mata pelajaran baru.
 * @param {Object} data - {namaMapel}
 * @returns {Object} {success, data: {id}, message}
 */
function addMapel(data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var error = validateRequired(data, ['namaMapel']);
    if (error) {
      return { success: false, data: null, message: error };
    }

    var sheet = getSheet('Mapel', true);

    // Pastikan header ada
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, MAPEL_HEADERS.length).setValues([MAPEL_HEADERS]);
    }

    // Validasi duplikat
    var existing = sheetToObjects(sheet);
    var newNama = data.namaMapel.trim();
    for (var i = 0; i < existing.length; i++) {
      if (String(existing[i]['Nama_Mapel']).toLowerCase() === newNama.toLowerCase()) {
        return { success: false, data: null, message: 'Mata pelajaran "' + newNama + '" sudah terdaftar.' };
      }
    }

    var newId = generateId('M');
    var newRow = [
      newId,
      newNama
    ];

    sheet.getRange(sheet.getLastRow() + 1, 1, 1, newRow.length).setValues([newRow]);

    return { success: true, data: { id: newId }, message: 'Mata pelajaran "' + newNama + '" berhasil ditambahkan.' };

  } catch (err) {
    Logger.log('addMapel error: ' + err.message);
    return { success: false, data: null, message: 'Gagal menambah mata pelajaran: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Mengupdate mata pelajaran.
 * @param {string} mapelId - ID mapel
 * @param {Object} data - {namaMapel}
 * @returns {Object} {success, data, message}
 */
function updateMapel(mapelId, data) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!mapelId) {
      return { success: false, data: null, message: 'ID mata pelajaran wajib diisi.' };
    }
    if (!data.namaMapel || data.namaMapel.trim() === '') {
      return { success: false, data: null, message: 'Nama mata pelajaran tidak boleh kosong.' };
    }

    var sheet = getSheet('Mapel');
    if (!sheet) {
      return { success: false, data: null, message: 'Sheet Mapel tidak ditemukan.' };
    }

    var mapelList = sheetToObjects(sheet);
    var mapel = null;

    for (var i = 0; i < mapelList.length; i++) {
      if (String(mapelList[i]['ID']) === String(mapelId)) {
        mapel = mapelList[i];
        break;
      }
    }

    if (!mapel) {
      return { success: false, data: null, message: 'Mata pelajaran tidak ditemukan.' };
    }

    var newNama = data.namaMapel.trim();

    // Validasi duplikat dengan entri lain
    for (var j = 0; j < mapelList.length; j++) {
      if (String(mapelList[j]['ID']) !== String(mapelId) && String(mapelList[j]['Nama_Mapel']).toLowerCase() === newNama.toLowerCase()) {
        return { success: false, data: null, message: 'Mata pelajaran "' + newNama + '" sudah digunakan pada entri lain.' };
      }
    }

    var oldNama = mapel['Nama_Mapel'];
    mapel['Nama_Mapel'] = newNama;

    // Tulis baris yang diupdate
    var updatedRow = [mapelId, newNama];
    sheet.getRange(mapel['_row'], 1, 1, MAPEL_HEADERS.length).setValues([updatedRow]);

    // Opsi tambahan: Update nama mapel di data guru jika diganti
    updateGuruMapelName_(oldNama, newNama);

    return { success: true, data: { id: mapelId }, message: 'Mata pelajaran berhasil diperbarui.' };

  } catch (err) {
    Logger.log('updateMapel error: ' + err.message);
    return { success: false, data: null, message: 'Gagal memperbarui mata pelajaran: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Menghapus mata pelajaran (hard delete).
 * Validasi mencegah penghapusan jika masih digunakan guru.
 * @param {string} mapelId - ID mapel
 * @returns {Object} {success, data, message}
 */
function deleteMapel(mapelId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!mapelId) {
      return { success: false, data: null, message: 'ID mata pelajaran wajib diisi.' };
    }

    var sheet = getSheet('Mapel');
    if (!sheet) {
      return { success: false, data: null, message: 'Sheet Mapel tidak ditemukan.' };
    }

    var mapelList = sheetToObjects(sheet);
    var mapel = null;

    for (var i = 0; i < mapelList.length; i++) {
      if (String(mapelList[i]['ID']) === String(mapelId)) {
        mapel = mapelList[i];
        break;
      }
    }

    if (!mapel) {
      return { success: false, data: null, message: 'Mata pelajaran tidak ditemukan.' };
    }

    var mapelName = mapel['Nama_Mapel'];

    // Cek apakah masih digunakan oleh guru aktif
    var guruSheet = getSheet('Guru');
    if (guruSheet) {
      var guruList = sheetToObjects(guruSheet);
      for (var g = 0; g < guruList.length; g++) {
        if (String(guruList[g]['Mata_Pelajaran']).toLowerCase() === mapelName.toLowerCase() && guruList[g]['Status'] === 'Aktif') {
          return { success: false, data: null, message: 'Mata pelajaran "' + mapelName + '" tidak bisa dihapus karena masih diampu oleh Guru: ' + guruList[g]['Nama'] + '.' };
        }
      }
    }

    // Hapus baris
    sheet.deleteRow(mapel['_row']);

    return { success: true, data: null, message: 'Mata pelajaran "' + mapelName + '" berhasil dihapus.' };

  } catch (err) {
    Logger.log('deleteMapel error: ' + err.message);
    return { success: false, data: null, message: 'Gagal menghapus mata pelajaran: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Mengupdate nama mata pelajaran pada seluruh guru jika nama mapel diubah di dashboard mapel.
 */
function updateGuruMapelName_(oldName, newName) {
  try {
    var guruSheet = getSheet('Guru');
    if (!guruSheet) return;

    var guruList = sheetToObjects(guruSheet);
    var changed = false;

    for (var i = 0; i < guruList.length; i++) {
      if (String(guruList[i]['Mata_Pelajaran']).toLowerCase() === oldName.toLowerCase()) {
        guruList[i]['Mata_Pelajaran'] = newName;
        changed = true;
      }
    }

    if (changed) {
      var headers = ['ID', 'Nama', 'No_HP', 'Mata_Pelajaran', 'Kelas', 'Kuota_Sesi', 'Sesi_Terpakai', 'Hari_Allowed', 'Sesi_Allowed', 'Status'];
      objectsToSheet(guruSheet, guruList, headers);
      Logger.log('Nama mata pelajaran "' + oldName + '" pada data guru berhasil disinkronkan menjadi "' + newName + '".');
    }
  } catch (e) {
    Logger.log('updateGuruMapelName_ error: ' + e.message);
  }
}

/**
 * Inisialisasi awal 10 Mata Pelajaran default sekolah.
 */
function initializeMapel() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var sheet = getSheet('Mapel', true);

    if (sheet.getLastRow() > 1) {
      Logger.log('Sheet Mapel sudah ada data, skip inisialisasi.');
      return;
    }

    // Tulis header
    sheet.getRange(1, 1, 1, MAPEL_HEADERS.length).setValues([MAPEL_HEADERS]);

    // Data awal 10 mata pelajaran umum
    var defaultMapel = [
      ['M001', 'Matematika'],
      ['M002', 'IPA (Ilmu Pengetahuan Alam)'],
      ['M003', 'IPS (Ilmu Pengetahuan Sosial)'],
      ['M004', 'Bahasa Indonesia'],
      ['M005', 'Bahasa Inggris'],
      ['M006', 'Pendidikan Agama & Budi Pekerti'],
      ['M007', 'PJOK (Pendidikan Jasmani, Olahraga & Kesehatan)'],
      ['M008', 'PKn (Pendidikan Pancasila & Kewarganegaraan)'],
      ['M009', 'Seni Budaya'],
      ['M010', 'Prakarya']
    ];

    sheet.getRange(2, 1, defaultMapel.length, MAPEL_HEADERS.length).setValues(defaultMapel);
    Logger.log('10 Mata Pelajaran awal berhasil diinisialisasi.');

  } catch (err) {
    Logger.log('initializeMapel error: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}
