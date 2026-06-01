/**
 * ============================================================
 * BookingService.gs - Layanan Booking Sesi (CRITICAL)
 * ============================================================
 * Semua operasi write di sini WAJIB menggunakan LockService
 * untuk mencegah race condition (2 guru booking slot yang sama).
 * 
 * HEADER sheet Booking:
 * ID | Guru_ID | Guru_Nama | Hari | Sesi_ID | Sesi_Nama | Kelas | Status | Waktu_Booking | Waktu_Batal
 * 
 * Status: Aktif | Dibatalkan
 * Hari: Senin | Selasa | Rabu | Kamis | Jumat
 * ============================================================
 */

// Header kolom sheet Booking
var BOOKING_HEADERS = ['ID', 'Guru_ID', 'Guru_Nama', 'Hari', 'Sesi_ID', 'Sesi_Nama', 'Kelas', 'Status', 'Waktu_Booking', 'Waktu_Batal'];

// Daftar hari yang valid
var HARI_VALID = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/**
 * Booking sesi untuk guru.
 * 
 * Validasi yang dilakukan (berurutan):
 * 1. Verifikasi kredensial guru (ID + noHP)
 * 2. Validasi hari yang valid
 * 3. Cek sesi ada dan bukan tipe Istirahat
 * 4. Cek guru diizinkan di hari ini (Hari_Allowed)
 * 5. Cek guru diizinkan di sesi ini (Sesi_Allowed)
 * 6. Cek kelas termasuk kelas guru (Kelas)
 * 7. Cek slot belum dibooking guru/orang lain (hari + sesi + kelas)
 * 8. Cek guru tidak double-booked (hari + sesi yang sama, kelas berbeda)
 * 9. Cek kuota sesi guru belum habis
 * 
 * @param {string} guruId - ID guru
 * @param {string} hari - Hari (Senin-Jumat)
 * @param {string} sesiId - ID sesi
 * @param {string} kelas - Nama kelas
 * @param {string} noHp - Nomor HP untuk verifikasi
 * @returns {Object} {success, data: {bookingId}, message}
 */
function bookSesi(guruId, hari, sesiId, kelas, noHp) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    // === VALIDASI 1: Verifikasi kredensial guru ===
    var verifyResult = verifyGuru(guruId, noHp);
    if (!verifyResult.success) {
      return verifyResult;
    }
    var guru = verifyResult.data;

    // === VALIDASI 2: Hari valid ===
    if (HARI_VALID.indexOf(hari) === -1) {
      return { success: false, data: null, message: 'Hari "' + hari + '" tidak valid. Pilih: ' + HARI_VALID.join(', ') };
    }

    // === VALIDASI 3: Sesi ada dan bukan Istirahat ===
    var sesiSheet = getSheet('Sesi');
    if (!sesiSheet) {
      return { success: false, data: null, message: 'Data sesi belum diatur.' };
    }
    var sesiList = sheetToObjects(sesiSheet);
    var sesi = null;
    for (var s = 0; s < sesiList.length; s++) {
      if (String(sesiList[s]['ID']) === String(sesiId)) {
        sesi = sesiList[s];
        break;
      }
    }
    if (!sesi) {
      return { success: false, data: null, message: 'Sesi dengan ID "' + sesiId + '" tidak ditemukan.' };
    }
    if (sesi['Tipe'] === 'Istirahat') {
      return { success: false, data: null, message: 'Tidak bisa booking sesi istirahat.' };
    }
    if (sesi['Hari'] && String(sesi['Hari']) !== String(hari)) {
      return { success: false, data: null, message: 'Hari sesi (' + sesi['Hari'] + ') tidak cocok dengan hari booking (' + hari + ').' };
    }

    // === VALIDASI 4: Cek guru diizinkan di hari ini ===
    var hariAllowed = String(guru['Hari_Allowed'] || '');
    if (hariAllowed && hariAllowed.trim() !== '') {
      var hariArr = hariAllowed.split(',');
      // Trim setiap elemen
      for (var h = 0; h < hariArr.length; h++) {
        hariArr[h] = hariArr[h].trim();
      }
      if (hariArr.indexOf(hari) === -1) {
        return { success: false, data: null, message: 'Anda tidak diizinkan mengajar pada hari ' + hari + '. Hari yang diizinkan: ' + hariAllowed };
      }
    }

    // === VALIDASI 5: Cek guru diizinkan di sesi ini ===
    var sesiAllowed = String(guru['Sesi_Allowed'] || '');
    if (sesiAllowed && sesiAllowed.trim() !== '') {
      var sesiArr = sesiAllowed.split(',');
      for (var sa = 0; sa < sesiArr.length; sa++) {
        sesiArr[sa] = sesiArr[sa].trim();
      }
      if (sesiArr.indexOf(String(sesiId)) === -1) {
        return { success: false, data: null, message: 'Anda tidak diizinkan mengajar pada sesi ' + sesi['Nama_Sesi'] + '.' };
      }
    }

    // === VALIDASI 6: Cek kelas termasuk kelas guru ===
    var kelasGuru = String(guru['Kelas'] || '');
    if (kelasGuru && kelasGuru.trim() !== '') {
      var kelasArr = kelasGuru.split(',');
      for (var k = 0; k < kelasArr.length; k++) {
        kelasArr[k] = kelasArr[k].trim();
      }
      if (kelasArr.indexOf(kelas) === -1) {
        return { success: false, data: null, message: 'Kelas "' + kelas + '" bukan kelas yang ditugaskan kepada Anda. Kelas Anda: ' + kelasGuru };
      }
    }

    // === Ambil data booking untuk validasi 7, 8, 9 ===
    var bookingSheet = getSheet('Booking', true);
    // Pastikan header ada
    if (bookingSheet.getLastRow() === 0) {
      bookingSheet.getRange(1, 1, 1, BOOKING_HEADERS.length).setValues([BOOKING_HEADERS]);
    }
    var bookings = sheetToObjects(bookingSheet);

    // Filter hanya booking aktif
    var activeBookings = [];
    for (var b = 0; b < bookings.length; b++) {
      if (bookings[b]['Status'] === 'Aktif') {
        activeBookings.push(bookings[b]);
      }
    }

    // === VALIDASI 7: Cek slot belum dibooking (hari + sesi + kelas) ===
    for (var v7 = 0; v7 < activeBookings.length; v7++) {
      var ab = activeBookings[v7];
      if (ab['Hari'] === hari && String(ab['Sesi_ID']) === String(sesiId) && ab['Kelas'] === kelas) {
        return {
          success: false,
          data: null,
          message: 'Slot ' + hari + ' - ' + sesi['Nama_Sesi'] + ' - ' + kelas + ' sudah dibooking oleh ' + ab['Guru_Nama'] + '.'
        };
      }
    }

    // === VALIDASI 8: Cek guru tidak double-booked (hari + sesi sama) ===
    for (var v8 = 0; v8 < activeBookings.length; v8++) {
      var ab2 = activeBookings[v8];
      if (String(ab2['Guru_ID']) === String(guruId) && ab2['Hari'] === hari && String(ab2['Sesi_ID']) === String(sesiId)) {
        return {
          success: false,
          data: null,
          message: 'Anda sudah memiliki booking pada ' + hari + ' - ' + sesi['Nama_Sesi'] + ' di kelas ' + ab2['Kelas'] + '. Tidak bisa mengajar 2 kelas di sesi yang sama.'
        };
      }
    }

    // === VALIDASI 9: Cek kuota sesi belum habis ===
    var kuotaSesi = parseInt(guru['Kuota_Sesi']) || 0;
    var sesiTerpakai = 0;
    for (var v9 = 0; v9 < activeBookings.length; v9++) {
      if (String(activeBookings[v9]['Guru_ID']) === String(guruId)) {
        sesiTerpakai++;
      }
    }
    if (kuotaSesi > 0 && sesiTerpakai >= kuotaSesi) {
      return {
        success: false,
        data: null,
        message: 'Kuota sesi Anda sudah penuh (' + sesiTerpakai + '/' + kuotaSesi + '). Tidak bisa menambah booking baru.'
      };
    }

    // === SEMUA VALIDASI LOLOS - Proses booking ===
    var bookingId = generateId('B');
    var waktuBooking = formatDateId(new Date());

    var newBooking = [
      bookingId,
      guruId,
      guru['Nama'],
      hari,
      sesiId,
      sesi['Nama_Sesi'],
      kelas,
      'Aktif',
      waktuBooking,
      ''  // Waktu_Batal kosong
    ];

    // Tulis booking baru
    bookingSheet.getRange(bookingSheet.getLastRow() + 1, 1, 1, newBooking.length).setValues([newBooking]);

    // Update Sesi_Terpakai di sheet Guru (increment)
    var guruSheet = getSheet('Guru');
    guruSheet.getRange(guru['_row'], 7).setValue(sesiTerpakai + 1);

    return {
      success: true,
      data: {
        bookingId: bookingId,
        hari: hari,
        sesi: sesi['Nama_Sesi'],
        kelas: kelas,
        sesiTerpakai: sesiTerpakai + 1,
        kuotaSesi: kuotaSesi
      },
      message: 'Booking berhasil! ' + hari + ' - ' + sesi['Nama_Sesi'] + ' - ' + kelas + '. Sesi terpakai: ' + (sesiTerpakai + 1) + '/' + kuotaSesi
    };

  } catch (err) {
    Logger.log('bookSesi error: ' + err.message);
    return { success: false, data: null, message: 'Terjadi kesalahan saat booking: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Melepas/membatalkan booking.
 * Guru hanya bisa melepas bookingnya sendiri.
 * @param {string} bookingId - ID booking
 * @param {string} guruId - ID guru (pemilik booking)
 * @param {string} noHp - Nomor HP untuk verifikasi
 * @returns {Object} {success, data, message}
 */
function releaseSesi(bookingId, guruId, noHp) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!bookingId || !guruId || !noHp) {
      return { success: false, data: null, message: 'Booking ID, Guru ID, dan Nomor HP wajib diisi.' };
    }

    // Verifikasi kredensial guru
    var verifyResult = verifyGuru(guruId, noHp);
    if (!verifyResult.success) {
      return verifyResult;
    }

    var bookingSheet = getSheet('Booking');
    if (!bookingSheet) {
      return { success: false, data: null, message: 'Sheet Booking tidak ditemukan.' };
    }

    var bookings = sheetToObjects(bookingSheet);
    var booking = null;

    for (var i = 0; i < bookings.length; i++) {
      if (String(bookings[i]['ID']) === String(bookingId)) {
        booking = bookings[i];
        break;
      }
    }

    if (!booking) {
      return { success: false, data: null, message: 'Booking dengan ID "' + bookingId + '" tidak ditemukan.' };
    }

    // Cek kepemilikan booking
    if (String(booking['Guru_ID']) !== String(guruId)) {
      return { success: false, data: null, message: 'Anda tidak memiliki booking ini. Booking ini milik guru lain.' };
    }

    // Cek status masih aktif
    if (booking['Status'] !== 'Aktif') {
      return { success: false, data: null, message: 'Booking sudah dibatalkan sebelumnya.' };
    }

    // Set status = Dibatalkan dan catat waktu batal
    var rowNum = booking['_row'];
    bookingSheet.getRange(rowNum, 8).setValue('Dibatalkan');  // Kolom Status
    bookingSheet.getRange(rowNum, 10).setValue(formatDateId(new Date()));  // Kolom Waktu_Batal

    // Decrement Sesi_Terpakai di sheet Guru
    var guruSheet = getSheet('Guru');
    var guruList = sheetToObjects(guruSheet);
    for (var g = 0; g < guruList.length; g++) {
      if (String(guruList[g]['ID']) === String(guruId)) {
        var current = parseInt(guruList[g]['Sesi_Terpakai']) || 0;
        var newVal = Math.max(0, current - 1);
        guruSheet.getRange(guruList[g]['_row'], 7).setValue(newVal);
        break;
      }
    }

    return {
      success: true,
      data: { bookingId: bookingId },
      message: 'Booking ' + booking['Hari'] + ' - ' + booking['Sesi_Nama'] + ' - ' + booking['Kelas'] + ' berhasil dibatalkan.'
    };

  } catch (err) {
    Logger.log('releaseSesi error: ' + err.message);
    return { success: false, data: null, message: 'Terjadi kesalahan saat membatalkan booking: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Mendapatkan semua booking aktif untuk hari tertentu.
 * @param {string} hari - Hari (Senin-Jumat)
 * @returns {Object} {success, data: bookingArray, message}
 */
function getBookingByHari(hari) {
  try {
    if (!hari) {
      return { success: false, data: null, message: 'Hari wajib diisi.' };
    }

    var sheet = getSheet('Booking');
    if (!sheet) {
      return { success: true, data: [], message: 'Belum ada booking.' };
    }

    // Load guru phone map
    var guruSheet = getSheet('Guru');
    var guruPhoneMap = {};
    if (guruSheet) {
      var guruList = sheetToObjects(guruSheet);
      for (var k = 0; k < guruList.length; k++) {
        guruPhoneMap[guruList[k]['ID']] = guruList[k]['NoHP_Hash'];
      }
    }

    var bookings = sheetToObjects(sheet);
    var result = [];

    for (var i = 0; i < bookings.length; i++) {
      var b = bookings[i];
      if (b['Hari'] === hari && b['Status'] === 'Aktif') {
        var gId = b['Guru_ID'];
        var phone = cleanPhone(guruPhoneMap[gId] || '');
        result.push({
          id: b['ID'],
          guruId: gId,
          guruNama: b['Guru_Nama'],
          hari: b['Hari'],
          sesiId: b['Sesi_ID'],
          sesiNama: b['Sesi_Nama'],
          kelas: b['Kelas'],
          status: b['Status'],
          waktuBooking: b['Waktu_Booking'],
          guruNoHp: phone
        });
      }
    }

    return { success: true, data: result, message: 'Booking hari ' + hari + ' berhasil diambil.' };

  } catch (err) {
    Logger.log('getBookingByHari error: ' + err.message);
    return { success: false, data: null, message: 'Gagal mengambil booking: ' + err.message };
  }
}

/**
 * Mendapatkan semua booking aktif.
 * @returns {Object} {success, data: bookingArray, message}
 */
function getAllBooking() {
  try {
    var sheet = getSheet('Booking');
    if (!sheet) {
      return { success: true, data: [], message: 'Belum ada booking.' };
    }

    // Load guru phone map
    var guruSheet = getSheet('Guru');
    var guruPhoneMap = {};
    if (guruSheet) {
      var guruList = sheetToObjects(guruSheet);
      for (var k = 0; k < guruList.length; k++) {
        guruPhoneMap[guruList[k]['ID']] = guruList[k]['NoHP_Hash'];
      }
    }

    var bookings = sheetToObjects(sheet);
    var result = [];

    for (var i = 0; i < bookings.length; i++) {
      var b = bookings[i];
      if (b['Status'] === 'Aktif') {
        var gId = b['Guru_ID'];
        var phone = cleanPhone(guruPhoneMap[gId] || '');
        result.push({
          id: b['ID'],
          guruId: gId,
          guruNama: b['Guru_Nama'],
          hari: b['Hari'],
          sesiId: b['Sesi_ID'],
          sesiNama: b['Sesi_Nama'],
          kelas: b['Kelas'],
          status: b['Status'],
          waktuBooking: b['Waktu_Booking'],
          guruNoHp: phone
        });
      }
    }

    return { success: true, data: result, message: 'Semua booking aktif berhasil diambil.' };

  } catch (err) {
    Logger.log('getAllBooking error: ' + err.message);
    return { success: false, data: null, message: 'Gagal mengambil data booking: ' + err.message };
  }
}

/**
 * Mendapatkan jadwal seorang guru (semua booking aktifnya).
 * @param {string} guruId - ID guru
 * @returns {Object} {success, data: bookingArray, message}
 */
function getGuruSchedule(guruId) {
  try {
    if (!guruId) {
      return { success: false, data: null, message: 'ID guru wajib diisi.' };
    }

    var sheet = getSheet('Booking');
    if (!sheet) {
      return { success: true, data: [], message: 'Belum ada booking.' };
    }

    var bookings = sheetToObjects(sheet);
    var result = [];

    for (var i = 0; i < bookings.length; i++) {
      var b = bookings[i];
      if (String(b['Guru_ID']) === String(guruId) && b['Status'] === 'Aktif') {
        result.push({
          id: b['ID'],
          guruId: b['Guru_ID'],
          guruNama: b['Guru_Nama'],
          hari: b['Hari'],
          sesiId: b['Sesi_ID'],
          sesiNama: b['Sesi_Nama'],
          kelas: b['Kelas'],
          status: b['Status'],
          waktuBooking: b['Waktu_Booking']
        });
      }
    }

    return { success: true, data: result, message: 'Jadwal guru berhasil diambil.' };

  } catch (err) {
    Logger.log('getGuruSchedule error: ' + err.message);
    return { success: false, data: null, message: 'Gagal mengambil jadwal guru: ' + err.message };
  }
}

/**
 * Admin force release - membatalkan booking tanpa verifikasi guru.
 * Hanya admin yang bisa memanggil fungsi ini.
 * @param {string} bookingId - ID booking
 * @returns {Object} {success, data, message}
 */
function forceRelease(bookingId) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    if (!bookingId) {
      return { success: false, data: null, message: 'Booking ID wajib diisi.' };
    }

    var bookingSheet = getSheet('Booking');
    if (!bookingSheet) {
      return { success: false, data: null, message: 'Sheet Booking tidak ditemukan.' };
    }

    var bookings = sheetToObjects(bookingSheet);
    var booking = null;

    for (var i = 0; i < bookings.length; i++) {
      if (String(bookings[i]['ID']) === String(bookingId)) {
        booking = bookings[i];
        break;
      }
    }

    if (!booking) {
      return { success: false, data: null, message: 'Booking tidak ditemukan.' };
    }

    if (booking['Status'] !== 'Aktif') {
      return { success: false, data: null, message: 'Booking sudah tidak aktif.' };
    }

    // Batalkan booking
    var rowNum = booking['_row'];
    bookingSheet.getRange(rowNum, 8).setValue('Dibatalkan');
    bookingSheet.getRange(rowNum, 10).setValue(formatDateId(new Date()));

    // Decrement Sesi_Terpakai guru
    var guruId = booking['Guru_ID'];
    var guruSheet = getSheet('Guru');
    if (guruSheet) {
      var guruList = sheetToObjects(guruSheet);
      for (var g = 0; g < guruList.length; g++) {
        if (String(guruList[g]['ID']) === String(guruId)) {
          var current = parseInt(guruList[g]['Sesi_Terpakai']) || 0;
          guruSheet.getRange(guruList[g]['_row'], 7).setValue(Math.max(0, current - 1));
          break;
        }
      }
    }

    return {
      success: true,
      data: { bookingId: bookingId },
      message: 'Booking ' + booking['Hari'] + ' - ' + booking['Sesi_Nama'] + ' - ' + booking['Kelas'] + ' (' + booking['Guru_Nama'] + ') berhasil dibatalkan oleh admin.'
    };

  } catch (err) {
    Logger.log('forceRelease error: ' + err.message);
    return { success: false, data: null, message: 'Gagal membatalkan booking: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Admin bulk release - membatalkan SEMUA booking aktif.
 * Digunakan untuk reset jadwal (misal awal semester).
 * @returns {Object} {success, data: {count}, message}
 */
function bulkRelease() {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var bookingSheet = getSheet('Booking');
    if (!bookingSheet) {
      return { success: true, data: { count: 0 }, message: 'Tidak ada booking untuk direset.' };
    }

    var bookings = sheetToObjects(bookingSheet);
    var count = 0;
    var waktuBatal = formatDateId(new Date());
    var guruIds = {}; // Track guru yang terdampak

    // Batch: kumpulkan semua update dulu
    var updates = [];
    for (var i = 0; i < bookings.length; i++) {
      if (bookings[i]['Status'] === 'Aktif') {
        updates.push({
          row: bookings[i]['_row'],
          guruId: bookings[i]['Guru_ID']
        });
        guruIds[bookings[i]['Guru_ID']] = true;
        count++;
      }
    }

    if (count === 0) {
      return { success: true, data: { count: 0 }, message: 'Tidak ada booking aktif untuk direset.' };
    }

    // Update status semua booking ke Dibatalkan
    for (var j = 0; j < updates.length; j++) {
      bookingSheet.getRange(updates[j].row, 8).setValue('Dibatalkan');
      bookingSheet.getRange(updates[j].row, 10).setValue(waktuBatal);
    }

    // Reset Sesi_Terpakai semua guru yang terdampak ke 0
    var guruSheet = getSheet('Guru');
    if (guruSheet) {
      var guruList = sheetToObjects(guruSheet);
      for (var g = 0; g < guruList.length; g++) {
        if (guruIds[guruList[g]['ID']]) {
          guruSheet.getRange(guruList[g]['_row'], 7).setValue(0);
        }
      }
    }

    return {
      success: true,
      data: { count: count },
      message: count + ' booking berhasil direset. Semua kuota guru telah dikembalikan.'
    };

  } catch (err) {
    Logger.log('bulkRelease error: ' + err.message);
    return { success: false, data: null, message: 'Gagal mereset booking: ' + err.message };
  } finally {
    lock.releaseLock();
  }
}
