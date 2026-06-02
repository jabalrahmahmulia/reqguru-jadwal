/**
 * ============================================================
 * KelasService.gs - Layanan Manajemen Kelas
 * ============================================================
 */

var KELAS_HEADERS = ['ID', 'Nama_Kelas'];

function getAllKelas() {
  try {
    var sheet = getSheet('Kelas');
    if (!sheet) {
      return { success: true, data: [], message: 'Belum ada data kelas.' };
    }
    var kelasList = sheetToObjects(sheet);
    var result = [];
    for (var i = 0; i < kelasList.length; i++) {
      result.push({
        id: kelasList[i]['ID'],
        namaKelas: kelasList[i]['Nama_Kelas']
      });
    }
    return { success: true, data: result, message: 'Daftar kelas berhasil diambil.' };
  } catch (err) {
    return { success: false, data: null, message: 'Gagal mengambil daftar kelas: ' + err.message };
  }
}

function addKelas(namaKelas) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Kelas', true);
    
    if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, KELAS_HEADERS.length).setValues([KELAS_HEADERS]);
    }
    
    if (!namaKelas) {
      return { success: false, data: null, message: 'Nama kelas harus diisi.' };
    }
    
    var existingKelas = sheetToObjects(sheet);
    for (var i = 0; i < existingKelas.length; i++) {
      if (String(existingKelas[i]['Nama_Kelas']).toLowerCase() === String(namaKelas).toLowerCase()) {
        return { success: false, data: null, message: 'Kelas dengan nama tersebut sudah ada.' };
      }
    }
    
    var newId = generateId('K');
    sheet.appendRow([newId, namaKelas]);
    
    return { success: true, data: { id: newId, namaKelas: namaKelas }, message: 'Kelas berhasil ditambahkan.' };
  } catch (err) {
    Logger.log('addKelas error: ' + err.message);
    return { success: false, data: null, message: 'Terjadi kesalahan: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

function updateKelas(id, namaKelas) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Kelas');
    if (!sheet) return { success: false, data: null, message: 'Data kelas tidak ditemukan.' };
    
    if (!namaKelas) {
      return { success: false, data: null, message: 'Nama kelas harus diisi.' };
    }
    
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        rowIndex = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, data: null, message: 'Kelas tidak ditemukan.' };
    }
    
    // Check duplicates
    for (var j = 1; j < data.length; j++) {
      if (j + 1 !== rowIndex && String(data[j][1]).toLowerCase() === String(namaKelas).toLowerCase()) {
        return { success: false, data: null, message: 'Kelas dengan nama tersebut sudah ada.' };
      }
    }
    
    sheet.getRange(rowIndex, 2).setValue(namaKelas);
    
    return { success: true, data: { id: id, namaKelas: namaKelas }, message: 'Kelas berhasil diperbarui.' };
  } catch (err) {
    Logger.log('updateKelas error: ' + err.message);
    return { success: false, data: null, message: 'Terjadi kesalahan: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

function deleteKelas(id) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    var sheet = getSheet('Kelas');
    if (!sheet) return { success: false, data: null, message: 'Data kelas tidak ditemukan.' };
    
    var data = sheet.getDataRange().getValues();
    var rowIndex = -1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        rowIndex = i + 1;
        break;
      }
    }
    
    if (rowIndex === -1) {
      return { success: false, data: null, message: 'Kelas tidak ditemukan.' };
    }
    
    sheet.deleteRow(rowIndex);
    
    return { success: true, data: null, message: 'Kelas berhasil dihapus.' };
  } catch (err) {
    Logger.log('deleteKelas error: ' + err.message);
    return { success: false, data: null, message: 'Terjadi kesalahan: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}
