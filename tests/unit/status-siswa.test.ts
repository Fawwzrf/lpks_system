import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Status Siswa & Filter Keuangan / Verifikasi Sertifikat Tests", () => {
  describe("Filter Tab Keuangan Logic", () => {
    interface SiswaKeuanganMock {
      id: string;
      nama: string;
      status_siswa: "aktif" | "alumni" | "out";
      is_lunas: boolean;
    }

    const mockStudents: SiswaKeuanganMock[] = [
      { id: "1", nama: "Budi", status_siswa: "aktif", is_lunas: false },
      { id: "2", nama: "Siti", status_siswa: "aktif", is_lunas: true },
      { id: "3", nama: "Joko", status_siswa: "out", is_lunas: false },
      { id: "4", nama: "Dewi", status_siswa: "out", is_lunas: true },
      { id: "5", nama: "Ahmad", status_siswa: "alumni", is_lunas: true },
    ];

    test("Tab 'belum_lunas' hanya menyaring siswa aktif yang belum lunas (mengecualikan siswa out)", () => {
      const filtered = mockStudents.filter((s) => !s.is_lunas && s.status_siswa !== "out");
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].nama, "Budi");
    });

    test("Tab 'lunas' menyaring semua siswa yang telah lunas administrasi", () => {
      const filtered = mockStudents.filter((s) => s.is_lunas);
      assert.equal(filtered.length, 3);
      assert.deepEqual(filtered.map(s => s.nama), ["Siti", "Dewi", "Ahmad"]);
    });

    test("Tab 'out' menyaring siswa yang keluar di tengah pendidikan dan belum lunas", () => {
      const filtered = mockStudents.filter((s) => s.status_siswa === "out" && !s.is_lunas);
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].nama, "Joko");
    });

    test("Tab 'alumni' menyaring seluruh siswa berstatus alumni", () => {
      const filtered = mockStudents.filter((s) => s.status_siswa === "alumni");
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].nama, "Ahmad");
    });

    test("Tab 'semua' menampilkan seluruh siswa tanpa kecuali", () => {
      assert.equal(mockStudents.length, 5);
    });
  });

  describe("Pencatatan Keuangan Alumni & Opsi Cicilan / Lunas", () => {
    test("Skema Lunas menghasilkan 1 transaksi pelunasan pada tanggal bayar", () => {
      const row = {
        "Biaya Pelatihan": 7500000,
        "Skema Pembayaran": "Lunas",
        "Tgl. Pembayaran 1": "2018-01-15",
        "Nominal 1": 7500000,
      };
      const isCicilan = row["Skema Pembayaran"].toLowerCase().includes("cicil");
      const nominal = row["Nominal 1"] || row["Biaya Pelatihan"];
      const txs = [
        {
          nominal,
          tgl_bayar: row["Tgl. Pembayaran 1"],
          keterangan: isCicilan ? "Cicilan" : "Lunas",
        },
      ];
      assert.equal(txs.length, 1);
      assert.equal(txs[0].nominal, 7500000);
      assert.equal(txs[0].tgl_bayar, "2018-01-15");
      assert.equal(txs[0].keterangan, "Lunas");
    });

    test("Skema Cicilan menghasilkan 2 transaksi cicilan dengan tanggal masing-masing", () => {
      const row = {
        "Biaya Pelatihan": 7500000,
        "Skema Pembayaran": "Cicilan",
        "Tgl. Pembayaran 1": "2018-01-15",
        "Nominal 1": 4000000,
        "Tgl. Pembayaran 2": "2018-03-20",
        "Nominal 2": 3500000,
      };
      const txs = [];
      if (row["Nominal 1"] > 0) {
        txs.push({ nominal: row["Nominal 1"], tgl_bayar: row["Tgl. Pembayaran 1"], keterangan: "DP" });
      }
      if (row["Nominal 2"] > 0) {
        txs.push({ nominal: row["Nominal 2"], tgl_bayar: row["Tgl. Pembayaran 2"], keterangan: "Pelunasan" });
      }
      assert.equal(txs.length, 2);
      assert.equal(txs[0].nominal, 4000000);
      assert.equal(txs[0].tgl_bayar, "2018-01-15");
      assert.equal(txs[1].nominal, 3500000);
      assert.equal(txs[1].tgl_bayar, "2018-03-20");
      const totalTerbayar = txs.reduce((a, b) => a + b.nominal, 0);
      assert.equal(totalTerbayar, 7500000);
      assert.equal(totalTerbayar >= row["Biaya Pelatihan"], true);
    });

    test("Koreksi typo nominal transaksi (misal dari 750.000 menjadi 7.500.000) memperbarui total dan status lunas", () => {
      const totalBiaya = 7500000;
      const txs = [
        { id: "tx-1", nominal: 750000, tgl_bayar: "2026-09-01", metode: "Tunai", keterangan: "DP" }
      ];
      // Sebelum edit: belum lunas
      let total = txs.reduce((a, b) => a + b.nominal, 0);
      let isLunas = total >= totalBiaya;
      assert.equal(total, 750000);
      assert.equal(isLunas, false);

      // Admin mengoreksi typo menjadi 7.500.000
      const updatedTx = { ...txs[0], nominal: 7500000, keterangan: "Pelunasan" };
      txs[0] = updatedTx;

      // Setelah edit: lunas
      total = txs.reduce((a, b) => a + b.nominal, 0);
      isLunas = total >= totalBiaya;
      const sisaTagihan = Math.max(0, totalBiaya - total);
      assert.equal(total, 7500000);
      assert.equal(sisaTagihan, 0);
      assert.equal(isLunas, true);
    });

    test("Penghapusan transaksi yang salah input menghitung ulang akumulasi pembayaran", () => {
      const totalBiaya = 8500000;
      let txs = [
        { id: "tx-1", nominal: 4000000, tgl_bayar: "2026-09-01" },
        { id: "tx-2-duplikat", nominal: 4000000, tgl_bayar: "2026-09-01" }, // transaksi keliru / duplikat
      ];
      assert.equal(txs.length, 2);

      // Hapus transaksi keliru
      txs = txs.filter((t) => t.id !== "tx-2-duplikat");
      assert.equal(txs.length, 1);
      const total = txs.reduce((a, b) => a + b.nominal, 0);
      const sisa = totalBiaya - total;
      assert.equal(total, 4000000);
      assert.equal(sisa, 4500000);
    });

    test("Validasi nominal yang diedit harus angka positif > 0", () => {
      function validateEditNominal(nominal: unknown): boolean {
        const num = typeof nominal === "number" ? nominal : parseFloat(String(nominal));
        return !isNaN(num) && num > 0;
      }
      assert.equal(validateEditNominal(500000), true);
      assert.equal(validateEditNominal("1500000"), true);
      assert.equal(validateEditNominal(0), false);
      assert.equal(validateEditNominal(-10000), false);
      assert.equal(validateEditNominal("abc"), false);
    });
  });

  describe("Logika Verifikasi Nomor Sertifikat", () => {
    const certArchive = [
      { no_sertifikat: "LPKS/2026/WLD/001", nama: "Budi Santoso", nomor_induk: "01.0001" },
      { no_sertifikat: "05/LPK-S/XI/2018", nama: "Askuri", nomor_induk: "01.1110—Askuri" },
      { no_sertifikat: "12/LPK-S/XII/2015", nama: "Supardi", nomor_induk: "01.0012" },
    ];

    function verifyCert(query: string) {
      if (!query || query.trim().length < 3) return null;
      const cleanQ = query.trim().toLowerCase().replace(/[\s\-_/.]/g, "");
      return certArchive.find((item) => {
        const cleanNo = item.no_sertifikat.toLowerCase().replace(/[\s\-_/.]/g, "");
        return cleanNo === cleanQ;
      }) || null;
    }

    test("Verifikasi berhasil dengan nomor sertifikat format baru", () => {
      const result = verifyCert("LPKS/2026/WLD/001");
      assert.ok(result);
      assert.equal(result?.nama, "Budi Santoso");
    });

    test("Verifikasi berhasil dengan nomor sertifikat format lama 2018 tanpa memperhatikan spasi/tanda hubung", () => {
      const result = verifyCert("05-LPK-S-XI-2018");
      assert.ok(result);
      assert.equal(result?.nama, "Askuri");
    });

    test("Verifikasi mengembalikan null untuk nomor sertifikat palsu / tidak terdaftar", () => {
      const result = verifyCert("99/LPK-S/UNKNOWN/2020");
      assert.equal(result, null);
    });
  });

  describe("Penentuan Status Siswa Otomatis Berdasarkan Tanggal Keluar (Auto Alumni)", () => {
    function deriveStatus(
      rawStatusInput?: string | null,
      tglKeluar?: string | null,
      todayStr = "2026-09-19"
    ): "aktif" | "alumni" | "out" {
      const raw = String(rawStatusInput || "").trim().toLowerCase();
      if (raw.includes("out") || raw.includes("keluar")) return "out";
      if (raw.includes("alumni") || raw.includes("lulus")) return "alumni";
      if (tglKeluar && tglKeluar <= todayStr) return "alumni";
      return "aktif";
    }

    test("Data siswa lama tahun 2025 dengan tgl_keluar lampau otomatis berstatus 'alumni'", () => {
      const yusmantoStatus = deriveStatus(null, "2025-01-31", "2026-09-19");
      const irfanStatus = deriveStatus("", "2025-04-19", "2026-09-19");
      assert.equal(yusmantoStatus, "alumni");
      assert.equal(irfanStatus, "alumni");
    });

    test("Siswa baru dengan tgl_keluar masa depan tetap berstatus 'aktif'", () => {
      const status = deriveStatus(null, "2026-12-31", "2026-09-19");
      assert.equal(status, "aktif");
    });

    test("Siswa dengan catatan 'out' di Excel tetap berstatus 'out' meski tgl_keluar di masa lampau", () => {
      const status = deriveStatus("Out / Mengundurkan Diri", "2025-01-15", "2026-09-19");
      assert.equal(status, "out");
    });

    test("Siswa dengan status eksplisit 'alumni' selalu berstatus 'alumni'", () => {
      const status = deriveStatus("Alumni", "2026-10-01", "2026-09-19");
      assert.equal(status, "alumni");
    });
  });

  describe("Perhitungan Keuangan Berdasarkan Biaya Pelatihan Khusus Siswa (Tarif Lama vs Standar)", () => {
    interface StudentFinanceFixture {
      id: string;
      nama: string;
      programBiaya: number;
      biayaPelatihan: number | null;
      txs: number[];
    }

    function calculateFinance(fixture: StudentFinanceFixture) {
      const totalBiaya = fixture.biayaPelatihan !== null && fixture.biayaPelatihan !== undefined
        ? fixture.biayaPelatihan
        : fixture.programBiaya;
      const totalTerbayar = fixture.txs.reduce((a, b) => a + b, 0);
      const sisaTagihan = Math.max(0, totalBiaya - totalTerbayar);
      const isLunas = totalTerbayar >= totalBiaya;
      const persentase = totalBiaya > 0 ? Math.min(100, Math.round((totalTerbayar / totalBiaya) * 100)) : 100;

      return { totalBiaya, totalTerbayar, sisaTagihan, isLunas, persentase };
    }

    test("Siswa tanpa biaya_pelatihan (null) menggunakan tarif standar master_program (Rp 8.500.000)", () => {
      const student: StudentFinanceFixture = {
        id: "s1",
        nama: "Siswa Baru GTAW",
        programBiaya: 8500000,
        biayaPelatihan: null,
        txs: [8000000], // baru bayar 8jt
      };
      const result = calculateFinance(student);
      assert.equal(result.totalBiaya, 8500000);
      assert.equal(result.totalTerbayar, 8000000);
      assert.equal(result.sisaTagihan, 500000);
      assert.equal(result.isLunas, false);
      assert.equal(result.persentase, 94);
    });

    test("Siswa lama dengan biaya_pelatihan khusus Rp 8.000.000 tercatat Lunas saat membayar Rp 8.000.000", () => {
      const student: StudentFinanceFixture = {
        id: "s2",
        nama: "Siswa Lama GTAW 2024",
        programBiaya: 8500000, // tarif baru di master program
        biayaPelatihan: 8000000, // tarif lama yang berlaku untuk siswa ini
        txs: [8000000],
      };
      const result = calculateFinance(student);
      assert.equal(result.totalBiaya, 8000000);
      assert.equal(result.totalTerbayar, 8000000);
      assert.equal(result.sisaTagihan, 0);
      assert.equal(result.isLunas, true);
      assert.equal(result.persentase, 100);
    });

    test("Siswa penerima beasiswa / diskon khusus dengan biaya_pelatihan Rp 0 tercatat Lunas", () => {
      const student: StudentFinanceFixture = {
        id: "s3",
        nama: "Siswa Beasiswa Penuh",
        programBiaya: 8500000,
        biayaPelatihan: 0,
        txs: [],
      };
      const result = calculateFinance(student);
      assert.equal(result.totalBiaya, 0);
      assert.equal(result.totalTerbayar, 0);
      assert.equal(result.sisaTagihan, 0);
      assert.equal(result.isLunas, true);
      assert.equal(result.persentase, 100);
    });
  });
});


