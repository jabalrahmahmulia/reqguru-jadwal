/**
 * ============================================================
 * Utils.gs - Fungsi utilitas untuk JadwalGuru
 * ============================================================
 * Berisi helper functions yang dipakai di seluruh aplikasi:
 * - Akses spreadsheet
 * - Generate ID unik
 * - Hash password (SHA-256)
 * - Response JSON standar
 * - Parsing request GET/POST
 * - Konversi sheet <-> objects
 * ============================================================
 */

// Spreadsheet ID (production)
var SPREADSHEET_ID = '1aqjCKefabj2l1QdneJcQjNnBpL9fGPyEtEAyjc_nf-s';

/**
 * Mendapatkan referensi spreadsheet utama.
 * @returns {GoogleAppsScript.Spreadsheet.Spreadsheet}
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Mendapatkan sheet berdasarkan nama. Buat baru jika belum ada.
 * @param {string} name - Nama sheet
 * @param {boolean} [createIfMissing=false] - Buat sheet jika tidak ditemukan
 * @returns {GoogleAppsScript.Spreadsheet.Sheet|null}
 */
function getSheet(name, createIfMissing) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(name);
  if (!sheet && createIfMissing) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * Generate ID unik dengan prefix tertentu.
 * Format: PREFIX + 3-digit angka berurutan (misal G001, B001, S001)
 * Membaca semua ID yang ada di kolom pertama sheet terkait
 * untuk menentukan nomor berikutnya.
 * @param {string} prefix - Prefix ID (G untuk Guru, B untuk Booking, S untuk Sesi)
 * @returns {string} ID baru
 */
function generateId(prefix) {
  // Mapping prefix ke nama sheet
  var sheetMap = {
    'G': 'Guru',
    'B': 'Booking',
    'S': 'Sesi',
    'K': 'Kelas'
  };

  var sheetName = sheetMap[prefix] || 'Guru';
  var sheet = getSheet(sheetName);

  if (!sheet) {
    return prefix + '001';
  }

  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    // Hanya header atau kosong
    return prefix + '001';
  }

  // Baca semua ID di kolom 1 (baris 2 sampai terakhir)
  var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  var maxNum = 0;

  for (var i = 0; i < ids.length; i++) {
    var id = String(ids[i][0]);
    if (id.indexOf(prefix) === 0) {
      var num = parseInt(id.substring(prefix.length), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }

  var nextNum = maxNum + 1;
  // Pad ke 3 digit
  var padded = ('000' + nextNum).slice(-3);
  return prefix + padded;
}

/**
 * Hash password menggunakan SHA-256.
 * Mengubah password plaintext menjadi hex string.
 * @param {string} password - Password plaintext
 * @returns {string} Hash SHA-256 dalam format hex
 */
function hashPassword(password) {
  var rawHash = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, password);
  var hex = '';
  for (var i = 0; i < rawHash.length; i++) {
    var byte = rawHash[i];
    if (byte < 0) byte += 256; // convert signed to unsigned
    var hexByte = byte.toString(16);
    if (hexByte.length === 1) hexByte = '0' + hexByte;
    hex += hexByte;
  }
  return hex;
}

/**
 * Membuat response JSON standar.
 * Semua endpoint harus mengembalikan format ini.
 * @param {boolean} success - Apakah operasi berhasil
 * @param {*} data - Data response (bisa null)
 * @param {string} message - Pesan deskriptif
 * @returns {GoogleAppsScript.Content.TextOutput}
 */
function jsonResponse(success, data, message) {
  var payload = {
    success: success,
    data: data,
    message: message || ''
  };
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Parse request dari GET atau POST.
 * GET: parameter ada di e.parameter
 * POST: body JSON ada di e.postData.contents
 * @param {Object} e - Event object dari doGet/doPost
 * @returns {Object} Parameter yang sudah di-parse
 */
function parseRequest(e) {
  if (!e) return {};

  // Jika ada postData (POST request), parse JSON body
  if (e.postData && e.postData.contents) {
    try {
      var body = JSON.parse(e.postData.contents);
      return body;
    } catch (err) {
      Logger.log('Error parsing POST body: ' + err.message);
      return {};
    }
  }

  // Jika GET request, ambil dari e.parameter
  if (e.parameter) {
    return e.parameter;
  }

  return {};
}

/**
 * Konversi data sheet menjadi array of objects.
 * Baris pertama dianggap sebagai header (key).
 * Batch read: ambil semua data sekaligus dengan getDataRange().
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet yang akan dibaca
 * @returns {Object[]} Array of objects, tiap object = 1 baris data
 */
function sheetToObjects(sheet) {
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length < 2) return []; // Hanya header atau kosong

  var headers = data[0];
  var objects = [];

  for (var i = 1; i < data.length; i++) {
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      obj[headers[j]] = data[i][j];
    }
    // Tambahkan nomor baris (1-indexed, +2 karena header + 0-indexed)
    obj['_row'] = i + 1;
    objects.push(obj);
  }

  return objects;
}

/**
 * Tulis array of objects ke sheet.
 * Menimpa seluruh isi sheet (kecuali header tetap).
 * Batch write: tulis semua data sekaligus dengan setValues().
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - Sheet tujuan
 * @param {Object[]} objects - Array of objects
 * @param {string[]} headers - Urutan header/kolom
 */
function objectsToSheet(sheet, objects, headers) {
  if (!sheet || !objects || !headers) return;

  // Tulis header
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  if (objects.length === 0) {
    // Bersihkan data lama jika ada
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
    }
    return;
  }

  // Konversi objects ke 2D array
  var rows = [];
  for (var i = 0; i < objects.length; i++) {
    var row = [];
    for (var j = 0; j < headers.length; j++) {
      var val = objects[i][headers[j]];
      row.push(val !== undefined && val !== null ? val : '');
    }
    rows.push(row);
  }

  // Bersihkan data lama yang mungkin lebih panjang
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, headers.length).clearContent();
  }

  // Tulis data baru sekaligus (batch write)
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
}

/**
 * Format tanggal ke string Indonesia.
 * @param {Date} date - Tanggal
 * @returns {string} Format: dd/MM/yyyy HH:mm
 */
function formatDateId(date) {
  if (!date) date = new Date();
  return Utilities.formatDate(date, 'Asia/Jakarta', 'dd/MM/yyyy HH:mm');
}

/**
 * Validasi bahwa field wajib ada di data.
 * @param {Object} data - Object data
 * @param {string[]} fields - Array nama field wajib
 * @returns {string|null} Pesan error atau null jika valid
 */
function validateRequired(data, fields) {
  var missing = [];
  for (var i = 0; i < fields.length; i++) {
    if (data[fields[i]] === undefined || data[fields[i]] === null || data[fields[i]] === '') {
      missing.push(fields[i]);
    }
  }
  if (missing.length > 0) {
    return 'Field wajib belum diisi: ' + missing.join(', ');
  }
  return null;
}

/**
 * Membersihkan nomor HP agar selalu berformat 8xxxxxx.
 * Menghapus prefix 628 atau 08 otomatis.
 * @param {string|number} noHp - Nomor HP asal
 * @returns {string} Nomor HP bersih
 */
function cleanPhone(noHp) {
  if (!noHp) return '';
  var cleaned = String(noHp).trim().replace(/[^0-9]/g, '');
  if (cleaned.indexOf('628') === 0) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.indexOf('08') === 0) {
    cleaned = cleaned.substring(1);
  }
  return cleaned;
}
