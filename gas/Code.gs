/**
 * ============================================================
 * Code.gs - Entry Point Utama JadwalGuru
 * ============================================================
 * Menangani routing untuk:
 * - doGet(e)  : semua request GET (query data)
 * - doPost(e) : semua request POST (write data)
 * - initializeSystem() : setup awal spreadsheet
 * 
 * Deploy sebagai Web App:
 * - Execute as: Me (akun pemilik spreadsheet)
 * - Who has access: Anyone
 * ============================================================
 */

/**
 * Handler untuk HTTP GET requests.
 * Routing berdasarkan parameter 'action'.
 * 
 * Contoh URL: ...?action=getGuruList
 *             ...?action=getBookingByHari&hari=Senin
 * 
 * @param {Object} e - Event object berisi parameter query
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function doGet(e) {
  try {
    var params = parseRequest(e);
    var action = params.action || '';

    switch (action) {

      // ===================== AUTH =====================
      case 'getGuruList':
        // Daftar guru untuk dropdown login (tanpa password)
        return jsonResponse_(getGuruList());

      case 'loginGuru':
        // Login guru: ?action=loginGuru&nama=xxx&noHp=xxx
        return jsonResponse_(loginGuru(params.nama, params.noHp));

      case 'adminLogin':
        // Login admin: ?action=adminLogin&pin=xxx
        return jsonResponse_(adminLogin(params.pin));

      // ===================== GURU =====================
      case 'getAllGuru':
        // Semua guru (admin)
        return jsonResponse_(getAllGuru());

      case 'getGuruDetail':
        // Detail guru: ?action=getGuruDetail&guruId=G001
        return jsonResponse_(getGuruDetail(params.guruId));

      // ===================== SESI =====================
      case 'getAllSesi':
        // Semua sesi
        return jsonResponse_(getAllSesi());

      // ===================== BOOKING =====================
      case 'getBookingByHari':
        // Booking per hari: ?action=getBookingByHari&hari=Senin
        return jsonResponse_(getBookingByHari(params.hari));

      case 'getAllBooking':
        // Semua booking aktif
        return jsonResponse_(getAllBooking());

      case 'getGuruSchedule':
        // Jadwal guru: ?action=getGuruSchedule&guruId=G001
        return jsonResponse_(getGuruSchedule(params.guruId));

      // ===================== ROSTER & DASHBOARD =====================
      case 'getRoster':
        // Roster lengkap
        return jsonResponse_(getRoster());

      case 'getDashboardStats':
        // Statistik dashboard admin
        return jsonResponse_(getDashboardStats());

      // ===================== KELAS =====================
      case 'getKelasList':
        // Daftar kelas
        return jsonResponse_(getKelasList_());

      // ===================== MAPEL =====================
      case 'getAllMapel':
        return jsonResponse_(getAllMapel());

      // ===================== DEFAULT =====================
      default:
        return jsonResponse(false, null, 'Action "' + action + '" tidak dikenali. Periksa parameter action.');
    }

  } catch (err) {
    Logger.log('doGet error: ' + err.message);
    return jsonResponse(false, null, 'Terjadi kesalahan server: ' + err.message);
  }
}

/**
 * Handler untuk HTTP POST requests.
 * Routing berdasarkan field 'action' di JSON body.
 * 
 * Body JSON contoh: {"action": "bookSesi", "guruId": "G001", ...}
 * 
 * @param {Object} e - Event object berisi postData
 * @returns {GoogleAppsScript.Content.TextOutput} JSON response
 */
function doPost(e) {
  try {
    var params = parseRequest(e);
    var action = params.action || '';

    switch (action) {

      // ===================== AUTH =====================
      case 'loginGuru':
        return jsonResponse_(loginGuru(params.nama, params.noHp));

      case 'adminLogin':
        return jsonResponse_(adminLogin(params.pin));

      case 'verifyAdmin':
        return jsonResponse_(verifyAdmin(params.pin));

      // ===================== GURU (Admin) =====================
      case 'addGuru':
        return jsonResponse_(addGuru(params));

      case 'updateGuru':
        return jsonResponse_(updateGuru(params.guruId, params));

      case 'deleteGuru':
        return jsonResponse_(deleteGuru(params.guruId));

      case 'resetPassword':
        return jsonResponse_(resetPassword(params.guruId, params.newNoHp));

      case 'recalculateKuota':
        return jsonResponse_(recalculateKuota(params.guruId));

      // ===================== SESI (Admin) =====================
      case 'addSesi':
        return jsonResponse_(addSesi(params));

      case 'updateSesi':
        return jsonResponse_(updateSesi(params.sesiId, params));

      case 'deleteSesi':
        return jsonResponse_(deleteSesi(params.sesiId));

      // ===================== BOOKING =====================
      case 'bookSesi':
        return jsonResponse_(bookSesi(params.guruId, params.hari, params.sesiId, params.kelas, params.noHp));

      case 'releaseSesi':
        return jsonResponse_(releaseSesi(params.bookingId, params.guruId, params.noHp));

      case 'forceRelease':
        // Admin force release - verifikasi PIN dulu
        var adminCheck = verifyAdmin(params.pin);
        if (!adminCheck.success) {
          return jsonResponse_(adminCheck);
        }
        return jsonResponse_(forceRelease(params.bookingId));

      case 'bulkRelease':
        // Admin bulk release - verifikasi PIN dulu
        var adminCheck2 = verifyAdmin(params.pin);
        if (!adminCheck2.success) {
          return jsonResponse_(adminCheck2);
        }
        return jsonResponse_(bulkRelease());

      // ===================== MAPEL (Admin) =====================
      case 'addMapel':
        return jsonResponse_(addMapel(params));

      case 'updateMapel':
        return jsonResponse_(updateMapel(params.mapelId, params));

      case 'deleteMapel':
        return jsonResponse_(deleteMapel(params.mapelId));

      // ===================== DEFAULT =====================
      default:
        return jsonResponse(false, null, 'Action "' + action + '" tidak dikenali. Periksa field action di body.');
    }

  } catch (err) {
    Logger.log('doPost error: ' + err.message);
    return jsonResponse(false, null, 'Terjadi kesalahan server: ' + err.message);
  }
}

/**
 * Helper internal: konversi result object menjadi ContentService response.
 * Digunakan agar service functions bisa return plain object
 * sementara doGet/doPost mengembalikan ContentService output.
 * @param {Object} result - {success, data, message}
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse_(result) {
  return jsonResponse(result.success, result.data, result.message);
}

/**
 * Helper internal: mendapatkan daftar kelas.
 * @returns {Object} {success, data, message}
 */
function getKelasList_() {
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

// ============================================================
// INISIALISASI SISTEM
// ============================================================

/**
 * Inisialisasi lengkap sistem JadwalGuru.
 * Jalankan fungsi ini SEKALI saat pertama kali setup.
 * 
 * Yang dilakukan:
 * 1. Buat sheet Guru (jika belum ada) + header
 * 2. Buat sheet Sesi (jika belum ada) + isi 8 sesi default
 * 3. Buat sheet Booking (jika belum ada) + header
 * 4. Buat sheet Kelas (jika belum ada) + isi 13 kelas
 * 5. Buat sheet Config (jika belum ada) + set admin PIN default
 */
function initializeSystem() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    Logger.log('=== Memulai inisialisasi sistem JadwalGuru ===');

    // 1. Sheet Guru
    var guruSheet = getSheet('Guru', true);
    if (guruSheet.getLastRow() === 0) {
      guruSheet.getRange(1, 1, 1, GURU_HEADERS.length).setValues([GURU_HEADERS]);
      Logger.log('Sheet Guru dibuat dengan header.');
    }

    // 2. Sheet Booking
    var bookingSheet = getSheet('Booking', true);
    if (bookingSheet.getLastRow() === 0) {
      bookingSheet.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]);
      Logger.log('Sheet Booking dibuat dengan header.');
    }

    // 3. Sheet Kelas - isi 13 kelas
    initializeKelas_();

    // 4. Sheet Sesi - isi 8 sesi default
    initializeSesi();

    // 5. Sheet Config - set admin PIN default
    initializeAdmin();

    // 6. Sheet Mapel - isi 10 mapel default
    initializeMapel();

    Logger.log('=== Inisialisasi sistem selesai ===');

  } catch (err) {
    Logger.log('initializeSystem error: ' + err.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Inisialisasi 13 kelas default.
 * Hanya dijalankan jika sheet Kelas kosong.
 */
function initializeKelas_() {
  var sheet = getSheet('Kelas', true);

  // Cek apakah sudah ada data
  if (sheet.getLastRow() > 1) {
    Logger.log('Sheet Kelas sudah ada data, skip inisialisasi.');
    return;
  }

  var KELAS_HEADERS = ['ID', 'Nama_Kelas'];

  // 13 kelas sesuai spesifikasi
  var kelasList = [
    ['K001', 'Kelas 7 Abu Bakar'],
    ['K002', 'Kelas 7 Umar'],
    ['K003', 'Kelas 7 Khadijah'],
    ['K004', 'Kelas 7 Aisyah'],
    ['K005', 'Kelas 8 Abu Bakar'],
    ['K006', 'Kelas 8 Umar Bin Khattab'],
    ['K007', 'Kelas 8 Khadijah'],
    ['K008', 'Kelas 8 Aisyah'],
    ['K009', 'Kelas 9 Abu Bakar'],
    ['K010', 'Kelas 9 Umar Bin Khattab'],
    ['K011', 'Kelas 9 Utsman Bin Affan'],
    ['K012', 'Kelas 9 Khadijah'],
    ['K013', 'Kelas 9 Aisyah']
  ];

  // Tulis header
  sheet.getRange(1, 1, 1, KELAS_HEADERS.length).setValues([KELAS_HEADERS]);

  // Batch write semua kelas
  sheet.getRange(2, 1, kelasList.length, KELAS_HEADERS.length).setValues(kelasList);
  Logger.log('13 kelas berhasil diinisialisasi.');
}

/**
 * Fungsi test untuk memverifikasi setup.
 * Jalankan setelah initializeSystem() untuk memastikan semua berjalan.
 */
function testSetup() {
  Logger.log('=== Test Setup ===');

  // Test getSheet
  var sheets = ['Guru', 'Sesi', 'Booking', 'Kelas', 'Config'];
  for (var i = 0; i < sheets.length; i++) {
    var s = getSheet(sheets[i]);
    if (s) {
      Logger.log('✓ Sheet ' + sheets[i] + ' ditemukan. Baris: ' + s.getLastRow());
    } else {
      Logger.log('✗ Sheet ' + sheets[i] + ' TIDAK ditemukan!');
    }
  }

  // Test getAllSesi
  var sesiResult = getAllSesi();
  Logger.log('Sesi: ' + JSON.stringify(sesiResult));

  // Test getKelasList
  var kelasResult = getKelasList_();
  Logger.log('Kelas: ' + JSON.stringify(kelasResult));

  // Test getDashboardStats
  var statsResult = getDashboardStats();
  Logger.log('Stats: ' + JSON.stringify(statsResult));

  // Test hashPassword
  Logger.log('Hash "123456": ' + hashPassword('123456'));

  Logger.log('=== Test Selesai ===');
}
