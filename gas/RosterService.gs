/**
 * ============================================================
 * RosterService.gs - Layanan Roster & Dashboard
 * ============================================================
 * Menghasilkan roster lengkap jadwal seluruh sekolah
 * dan statistik dashboard untuk admin.
 * ============================================================
 */

/**
 * Generate roster lengkap.
 * Struktur output: { hari: { kelas: { sesiId: {guru, mapel, bookingId} } } }
 * 
 * Ini menggabungkan data dari sheet Booking, Sesi, dan Kelas
 * untuk menghasilkan tampilan jadwal yang lengkap.
 * 
 * @returns {Object} {success, data: rosterObject, message}
 */
function getRoster() {
  try {
    // Ambil semua data yang dibutuhkan (batch read)
    var bookingSheet = getSheet('Booking');
    var sesiSheet = getSheet('Sesi');
    var kelasSheet = getSheet('Kelas');

    // Daftar sesi (hanya yang Reguler, urut)
    var sesiList = [];
    if (sesiSheet) {
      var allSesi = sheetToObjects(sesiSheet);
      allSesi.sort(function(a, b) {
        return (parseInt(a['Urutan']) || 0) - (parseInt(b['Urutan']) || 0);
      });
      for (var s = 0; s < allSesi.length; s++) {
        sesiList.push({
          id: allSesi[s]['ID'],
          nama: allSesi[s]['Nama_Sesi'],
          jamMulai: allSesi[s]['Jam_Mulai'],
          jamSelesai: allSesi[s]['Jam_Selesai'],
          tipe: allSesi[s]['Tipe'],
          urutan: allSesi[s]['Urutan']
        });
      }
    }

    // Daftar kelas
    var kelasList = [];
    if (kelasSheet) {
      var allKelas = sheetToObjects(kelasSheet);
      for (var k = 0; k < allKelas.length; k++) {
        kelasList.push(allKelas[k]['Nama_Kelas']);
      }
    }

    // Booking aktif
    var activeBookings = [];
    if (bookingSheet) {
      var allBookings = sheetToObjects(bookingSheet);
      for (var b = 0; b < allBookings.length; b++) {
        if (allBookings[b]['Status'] === 'Aktif') {
          activeBookings.push(allBookings[b]);
        }
      }
    }

    // Bangun roster: hari -> kelas -> sesiId -> info
    var hari_list = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    var roster = {};

    for (var h = 0; h < hari_list.length; h++) {
      var hariName = hari_list[h];
      roster[hariName] = {};

      for (var kk = 0; kk < kelasList.length; kk++) {
        var kelasName = kelasList[kk];
        roster[hariName][kelasName] = {};

        for (var ss = 0; ss < sesiList.length; ss++) {
          var sesiItem = sesiList[ss];
          roster[hariName][kelasName][sesiItem.id] = {
            sesiNama: sesiItem.nama,
            jamMulai: sesiItem.jamMulai,
            jamSelesai: sesiItem.jamSelesai,
            tipe: sesiItem.tipe,
            guru: null,
            mapel: null,
            bookingId: null
          };
        }
      }
    }

    // Isi roster dengan booking
    for (var bi = 0; bi < activeBookings.length; bi++) {
      var bk = activeBookings[bi];
      var bHari = bk['Hari'];
      var bKelas = bk['Kelas'];
      var bSesiId = bk['Sesi_ID'];

      if (roster[bHari] && roster[bHari][bKelas] && roster[bHari][bKelas][bSesiId]) {
        roster[bHari][bKelas][bSesiId].guru = bk['Guru_Nama'];
        roster[bHari][bKelas][bSesiId].mapel = '';  // Mapel dari guru
        roster[bHari][bKelas][bSesiId].bookingId = bk['ID'];
        roster[bHari][bKelas][bSesiId].guruId = bk['Guru_ID'];
      }
    }

    // Tambahkan mata pelajaran guru ke roster
    var guruSheet = getSheet('Guru');
    if (guruSheet) {
      var guruList = sheetToObjects(guruSheet);
      var guruMap = {};
      for (var g = 0; g < guruList.length; g++) {
        guruMap[guruList[g]['ID']] = guruList[g]['Mata_Pelajaran'];
      }

      // Isi mapel di roster
      for (var rh in roster) {
        for (var rk in roster[rh]) {
          for (var rs in roster[rh][rk]) {
            var slot = roster[rh][rk][rs];
            if (slot.guruId && guruMap[slot.guruId]) {
              slot.mapel = guruMap[slot.guruId];
            }
          }
        }
      }
    }

    return {
      success: true,
      data: {
        roster: roster,
        sesiList: sesiList,
        kelasList: kelasList,
        hariList: hari_list
      },
      message: 'Roster berhasil di-generate.'
    };

  } catch (err) {
    Logger.log('getRoster error: ' + err.message);
    return { success: false, data: null, message: 'Gagal generate roster: ' + err.message };
  }
}

/**
 * Mendapatkan statistik dashboard admin.
 * Menghitung:
 * - Total guru aktif
 * - Total sesi yang dikonfigurasi
 * - Total booking aktif
 * - Sesi kosong per hari (slot yang belum diisi)
 * - Guru yang belum memenuhi kuota
 * 
 * @returns {Object} {success, data: statsObject, message}
 */
function getDashboardStats() {
  try {
    // === Hitung total guru aktif ===
    var guruSheet = getSheet('Guru');
    var totalGuruAktif = 0;
    var guruBelumKuota = []; // Guru yang sesi terpakai < kuota

    if (guruSheet) {
      var guruList = sheetToObjects(guruSheet);
      for (var g = 0; g < guruList.length; g++) {
        if (guruList[g]['Status'] !== 'Nonaktif') {
          totalGuruAktif++;
          var kuota = parseInt(guruList[g]['Kuota_Sesi']) || 0;
          var terpakai = parseInt(guruList[g]['Sesi_Terpakai']) || 0;
          if (kuota > 0 && terpakai < kuota) {
            guruBelumKuota.push({
              id: guruList[g]['ID'],
              nama: guruList[g]['Nama'],
              kuota: kuota,
              terpakai: terpakai,
              sisa: kuota - terpakai
            });
          }
        }
      }
    }

    // === Hitung total sesi ===
    var sesiSheet = getSheet('Sesi');
    var totalSesi = 0;
    var totalSesiReguler = 0;

    if (sesiSheet) {
      var sesiList = sheetToObjects(sesiSheet);
      totalSesi = sesiList.length;
      for (var s = 0; s < sesiList.length; s++) {
        if (sesiList[s]['Tipe'] === 'Reguler') {
          totalSesiReguler++;
        }
      }
    }

    // === Hitung booking aktif ===
    var bookingSheet = getSheet('Booking');
    var totalBookingAktif = 0;
    var bookingPerHari = { 'Senin': 0, 'Selasa': 0, 'Rabu': 0, 'Kamis': 0, 'Jumat': 0, 'Sabtu': 0 };

    if (bookingSheet) {
      var bookings = sheetToObjects(bookingSheet);
      for (var b = 0; b < bookings.length; b++) {
        if (bookings[b]['Status'] === 'Aktif') {
          totalBookingAktif++;
          var bHari = bookings[b]['Hari'];
          if (bookingPerHari[bHari] !== undefined) {
            bookingPerHari[bHari]++;
          }
        }
      }
    }

    // === Hitung sesi kosong per hari ===
    var kelasSheet = getSheet('Kelas');
    var totalKelas = 0;
    if (kelasSheet) {
      var kelasList = sheetToObjects(kelasSheet);
      totalKelas = kelasList.length;
    }

    // Total slot per hari = jumlah kelas × jumlah sesi reguler
    var totalSlotPerHari = totalKelas * totalSesiReguler;
    var sesiKosongPerHari = {};
    var hariList = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

    for (var h = 0; h < hariList.length; h++) {
      var hari = hariList[h];
      sesiKosongPerHari[hari] = totalSlotPerHari - (bookingPerHari[hari] || 0);
    }

    // === Susun hasil ===
    var stats = {
      totalGuruAktif: totalGuruAktif,
      totalGuru: totalGuruAktif,
      totalSesi: totalSesi,
      totalSesiReguler: totalSesiReguler,
      totalKelas: totalKelas,
      totalBookingAktif: totalBookingAktif,
      totalBooking: totalBookingAktif,
      totalSlotPerHari: totalSlotPerHari,
      totalSlotPerminggu: totalSlotPerHari * 6,
      totalSlot: totalSlotPerHari * 6,
      filledSlot: totalBookingAktif,
      emptySlot: (totalSlotPerHari * 6) - totalBookingAktif,
      sesiKosongPerHari: sesiKosongPerHari,
      bookingPerHari: bookingPerHari,
      guruBelumKuota: guruBelumKuota
    };

    return { success: true, data: stats, message: 'Statistik dashboard berhasil diambil.' };

  } catch (err) {
    Logger.log('getDashboardStats error: ' + err.message);
    return { success: false, data: null, message: 'Gagal mengambil statistik: ' + err.message };
  }
}
