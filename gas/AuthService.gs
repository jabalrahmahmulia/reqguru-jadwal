/**
 * ============================================================
 * AuthService.gs - Layanan Autentikasi JadwalGuru
 * ============================================================
 * Menangani login dan verifikasi untuk:
 * 1. Guru - login dengan nama + nomor HP (di-hash SHA-256)
 * 2. Admin - login dengan PIN
 * ============================================================
 */

/**
 * Login guru berdasarkan nama dan nomor HP.
 * Mencari guru di sheet, verifikasi hash noHP, return info guru.
 * @param {string} nama - Nama guru (case-insensitive match)
 * @param {string} noHp - Nomor HP plaintext (akan di-hash untuk verifikasi)
 * @returns {Object} {success, data, message}
 */
function loginGuru(nama, noHp) {
  try {
    if (!nama || !noHp) {
      return { success: false, data: null, message: 'Nama dan Nomor HP wajib diisi.' };
    }

    var sheet = getSheet('Guru');
    if (!sheet) {
      return { success: false, data: null, message: 'Sheet Guru tidak ditemukan.' };
    }

    var guruList = sheetToObjects(sheet);
    var cleanedInput = cleanPhone(noHp);

    // Cari guru berdasarkan nama (case-insensitive)
    var guru = null;
    for (var i = 0; i < guruList.length; i++) {
      if (String(guruList[i]['Nama']).toLowerCase().trim() === String(nama).toLowerCase().trim()) {
        guru = guruList[i];
        break;
      }
    }

    if (!guru) {
      return { success: false, data: null, message: 'Guru dengan nama "' + nama + '" tidak ditemukan.' };
    }

    // Cek status aktif
    if (guru['Status'] === 'Nonaktif') {
      return { success: false, data: null, message: 'Akun guru sudah dinonaktifkan. Hubungi admin.' };
    }

    // Verifikasi password (noHp plaintext, tersimpan di kolom NoHP_Hash)
    if (cleanPhone(guru['NoHP_Hash']) !== cleanedInput) {
      return { success: false, data: null, message: 'Nomor HP tidak cocok. Silakan coba lagi.' };
    }

    // Berhasil login - return info guru (tanpa hash)
    var guruInfo = {
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

    return { success: true, data: guruInfo, message: 'Login berhasil. Selamat datang, ' + guru['Nama'] + '!' };

  } catch (err) {
    Logger.log('loginGuru error: ' + err.message);
    return { success: false, data: null, message: 'Terjadi kesalahan saat login: ' + err.message };
  }
}

/**
 * Verifikasi kredensial guru (untuk booking/release).
 * Dipakai sebelum operasi sensitif untuk memastikan identitas guru.
 * @param {string} guruId - ID guru (misal G001)
 * @param {string} noHp - Nomor HP plaintext
 * @returns {Object} {success, data: guruObject, message}
 */
function verifyGuru(guruId, noHp) {
  try {
    if (!guruId || !noHp) {
      return { success: false, data: null, message: 'Guru ID dan Nomor HP wajib diisi.' };
    }

    var sheet = getSheet('Guru');
    if (!sheet) {
      return { success: false, data: null, message: 'Sheet Guru tidak ditemukan.' };
    }

    var guruList = sheetToObjects(sheet);
    var cleanedInput = cleanPhone(noHp);

    // Cari guru berdasarkan ID
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

    if (guru['Status'] === 'Nonaktif') {
      return { success: false, data: null, message: 'Akun guru sudah dinonaktifkan.' };
    }

    if (cleanPhone(guru['NoHP_Hash']) !== cleanedInput) {
      return { success: false, data: null, message: 'Nomor HP tidak cocok. Verifikasi gagal.' };
    }

    return { success: true, data: guru, message: 'Verifikasi berhasil.' };

  } catch (err) {
    Logger.log('verifyGuru error: ' + err.message);
    return { success: false, data: null, message: 'Terjadi kesalahan saat verifikasi: ' + err.message };
  }
}

/**
 * Login admin menggunakan PIN.
 * PIN disimpan di sheet Config dengan key 'ADMIN_PIN' (di-hash).
 * @param {string} pin - PIN admin plaintext
 * @returns {Object} {success, data, message}
 */
function adminLogin(pin) {
  try {
    if (!pin) {
      return { success: false, data: null, message: 'PIN admin wajib diisi.' };
    }

    var result = verifyAdmin(pin);
    if (!result.success) {
      return result;
    }

    return { success: true, data: { role: 'admin' }, message: 'Login admin berhasil.' };

  } catch (err) {
    Logger.log('adminLogin error: ' + err.message);
    return { success: false, data: null, message: 'Terjadi kesalahan saat login admin: ' + err.message };
  }
}

/**
 * Verifikasi PIN admin.
 * Membandingkan hash PIN input dengan hash yang tersimpan di Config.
 * @param {string} pin - PIN admin plaintext
 * @returns {Object} {success, data, message}
 */
function verifyAdmin(pin) {
  try {
    if (!pin) {
      return { success: false, data: null, message: 'PIN admin wajib diisi.' };
    }

    var sheet = getSheet('Config');
    if (!sheet) {
      return { success: false, data: null, message: 'Sheet Config tidak ditemukan. Jalankan initializeSystem() terlebih dahulu.' };
    }

    var configData = sheetToObjects(sheet);
    var storedHash = null;

    for (var i = 0; i < configData.length; i++) {
      if (configData[i]['Key'] === 'ADMIN_PIN') {
        storedHash = configData[i]['Value'];
        break;
      }
    }

    if (!storedHash) {
      return { success: false, data: null, message: 'PIN admin belum diatur. Jalankan initializeSystem().' };
    }

    var inputHash = hashPassword(String(pin));

    if (inputHash !== storedHash) {
      return { success: false, data: null, message: 'PIN admin salah.' };
    }

    return { success: true, data: null, message: 'PIN admin valid.' };

  } catch (err) {
    Logger.log('verifyAdmin error: ' + err.message);
    return { success: false, data: null, message: 'Terjadi kesalahan saat verifikasi admin: ' + err.message };
  }
}

/**
 * Inisialisasi PIN admin default.
 * Set PIN default '123456' jika belum ada di Config.
 * Dipanggil saat initializeSystem().
 */
function initializeAdmin() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var sheet = getSheet('Config', true);

    // Cek apakah sudah ada header
    var lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      // Tulis header
      sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value']]);
      lastRow = 1;
    }

    // Cek apakah ADMIN_PIN sudah ada
    var configData = sheetToObjects(sheet);
    var pinExists = false;

    for (var i = 0; i < configData.length; i++) {
      if (configData[i]['Key'] === 'ADMIN_PIN') {
        pinExists = true;
        break;
      }
    }

    if (!pinExists) {
      // Set default PIN '123456'
      var defaultHash = hashPassword('123456');
      sheet.getRange(lastRow + 1, 1, 1, 2).setValues([['ADMIN_PIN', defaultHash]]);
      Logger.log('Admin PIN default berhasil diatur (123456)');
    }

  } catch (err) {
    Logger.log('initializeAdmin error: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}
