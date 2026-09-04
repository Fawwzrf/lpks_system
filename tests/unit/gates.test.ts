import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  isKeuanganLunas,
  isUjianLulus,
  isSiapUjian,
  isSertifikatEligible,
  type SkorUjian,
} from "../../src/lib/gate-checks.ts";

describe("Gate-Check Kelayakan & Sertifikasi Unit Tests", () => {
  describe("Gate 1: Keuangan Lunas", () => {
    test("Biaya terbayar sama dengan total tagihan dinyatakan LUNAS", () => {
      assert.equal(isKeuanganLunas(8500000, 8500000), true);
    });

    test("Biaya terbayar melebihi total tagihan (overpayment) tetap LUNAS", () => {
      assert.equal(isKeuanganLunas(8500000, 9000000), true);
    });

    test("Pembayaran parsial / cicilan dinyatakan BELUM LUNAS", () => {
      assert.equal(isKeuanganLunas(8500000, 4000000), false);
      assert.equal(isKeuanganLunas(8500000, 8499999), false);
    });

    test("Total biaya 0 tidak valid sebagai status lunas", () => {
      assert.equal(isKeuanganLunas(0, 0), false);
    });
  });

  describe("Gate 2: Ujian Internal (Standar Kelulusan >= 80 per Kriteria)", () => {
    test("Semua kriteria bernilai >= 80 dinyatakan LULUS", () => {
      const skor: SkorUjian = {
        teori: 85,
        root: 80,
        hotpass: 82,
        filler: 88,
        capping: 81,
        gerinda: 90,
      };
      const hasil = isUjianLulus(skor);
      assert.equal(hasil.lulus, true);
      assert.equal(hasil.kriteriaGagal.length, 0);
      assert.ok(hasil.rataRata >= 80);
    });

    test("Jika ada SATU kriteria bernilai 79 (di bawah 80), dinyatakan TIDAK LULUS", () => {
      const skor: SkorUjian = {
        teori: 95,
        root: 79, // gagal
        hotpass: 90,
        filler: 92,
        capping: 88,
        gerinda: 94,
      };
      const hasil = isUjianLulus(skor);
      assert.equal(hasil.lulus, false);
      assert.deepEqual(hasil.kriteriaGagal, ["root"]);
    });

    test("Banyak kriteria di bawah 80 harus mencatat seluruh kriteria yang gagal", () => {
      const skor: SkorUjian = {
        teori: 75, // gagal
        root: 60, // gagal
        hotpass: 80,
        filler: 85,
        capping: 70, // gagal
        gerinda: 82,
      };
      const hasil = isUjianLulus(skor);
      assert.equal(hasil.lulus, false);
      assert.deepEqual(hasil.kriteriaGagal, ["teori", "root", "capping"]);
    });
  });

  describe("Gate 3: Kesiapan Ujian dari Nilai Latihan Harian", () => {
    const kriteriaWajib = ["root", "hotpass", "filler", "capping", "gerinda"];

    test("Semua kriteria wajib memiliki nilai tertinggi >= 80 dinyatakan SIAP", () => {
      const nilaiTertinggi = {
        root: 85,
        hotpass: 82,
        filler: 88,
        capping: 80,
        gerinda: 83,
      };
      const res = isSiapUjian(nilaiTertinggi, kriteriaWajib);
      assert.equal(res.siap, true);
      assert.equal(res.kriteriaTerpenuhi, 5);
      assert.equal(res.totalKriteria, 5);
    });

    test("Jika salah satu kriteria wajib belum mencapai 80 dinyatakan BELUM SIAP", () => {
      const nilaiTertinggi = {
        root: 85,
        hotpass: 78, // belum mencapai 80
        filler: 88,
        capping: 80,
        gerinda: 83,
      };
      const res = isSiapUjian(nilaiTertinggi, kriteriaWajib);
      assert.equal(res.siap, false);
      assert.equal(res.kriteriaTerpenuhi, 4);
    });
  });

  describe("Gate Gabungan: Penerbitan E-Sertifikat", () => {
    test("Hanya diterbitkan jika Keuangan LUNAS dan Ujian LULUS", () => {
      assert.equal(isSertifikatEligible(true, true).eligible, true);
    });

    test("Terkunci jika keuangan belum lunas meski ujian lulus", () => {
      const res = isSertifikatEligible(false, true);
      assert.equal(res.eligible, false);
      assert.ok(res.alasan.some((a) => a.includes("belum lunas")));
    });

    test("Terkunci jika ujian belum lulus meski keuangan lunas", () => {
      const res = isSertifikatEligible(true, false);
      assert.equal(res.eligible, false);
      assert.ok(res.alasan.some((a) => a.includes("Ujian internal belum dinyatakan lulus")));
    });

    test("Terkunci jika kedua syarat belum terpenuhi", () => {
      const res = isSertifikatEligible(false, false);
      assert.equal(res.eligible, false);
      assert.equal(res.alasan.length, 2);
    });
  });
});
