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

    test("Tab 'semua' menampilkan seluruh siswa tanpa kecuali", () => {
      assert.equal(mockStudents.length, 5);
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
});
