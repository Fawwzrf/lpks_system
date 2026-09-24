import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Unit test logika cloning dan validasi pendaftaran program baru bagi siswa yang sudah terdaftar.
 */

interface SourceStudent {
  id: string;
  nomor_induk: string;
  nama_lengkap: string;
  nik: string;
  tempat_lahir?: string;
  tgl_lahir?: string;
  alamat_lengkap?: string;
  nama_ayah?: string;
  nama_ibu?: string;
  no_hp?: string;
  email?: string;
  pendidikan_terakhir?: string;
  program_id: string;
}

interface TargetProgram {
  id: string;
  kode_program: string;
  nama: string;
  biaya: number;
  estimasi_durasi_hari: number;
}

function cloneStudentForNewProgram(
  source: SourceStudent,
  targetProgram: TargetProgram,
  existingEnrollments: { nik: string; program_id: string; nomor_induk: string }[],
  input: {
    nomor_induk?: string;
    biaya_pelatihan?: unknown;
    tgl_masuk?: string;
  }
) {
  // 1. Cek apakah siswa sudah terdaftar di program ini
  const alreadyEnrolled = existingEnrollments.find(
    (e) => e.nik === source.nik && e.program_id === targetProgram.id
  );
  if (alreadyEnrolled) {
    return {
      success: false,
      error: `Siswa ini sudah terdaftar dalam program ${targetProgram.nama} dengan nomor induk ${alreadyEnrolled.nomor_induk}.`,
    };
  }

  // 2. Tentukan nomor induk
  let finalNoInduk = input.nomor_induk?.trim();
  if (!finalNoInduk) {
    // Generate next no induk
    const currentProgEnrollments = existingEnrollments.filter(
      (e) => e.nomor_induk.startsWith(`${targetProgram.kode_program}.`)
    );
    const maxUrutan = currentProgEnrollments.reduce((max, e) => {
      const parts = e.nomor_induk.split(".");
      const num = parseInt(parts[1] || "0", 10);
      return num > max ? num : max;
    }, 0);
    finalNoInduk = `${targetProgram.kode_program}.${String(maxUrutan + 1).padStart(4, "0")}`;
  }

  // 3. Tentukan biaya
  let finalBiaya = targetProgram.biaya;
  if (input.biaya_pelatihan !== undefined && input.biaya_pelatihan !== null && input.biaya_pelatihan !== "") {
    const s = String(input.biaya_pelatihan).replace(/\./g, "").replace(",", ".");
    finalBiaya = parseFloat(s) || 0;
  }

  // 4. Hitung tanggal masuk & keluar
  const tglMasuk = input.tgl_masuk || new Date().toISOString().split("T")[0];
  const d = new Date(tglMasuk);
  d.setDate(d.getDate() + targetProgram.estimasi_durasi_hari);
  const tglKeluar = d.toISOString().split("T")[0];

  return {
    success: true,
    data: {
      nama_lengkap: source.nama_lengkap,
      nik: source.nik,
      tempat_lahir: source.tempat_lahir,
      tgl_lahir: source.tgl_lahir,
      alamat_lengkap: source.alamat_lengkap,
      no_hp: source.no_hp,
      email: source.email,
      program_id: targetProgram.id,
      nomor_induk: finalNoInduk,
      biaya_pelatihan: finalBiaya,
      tgl_masuk: tglMasuk,
      tgl_keluar: tglKeluar,
      status_siswa: "aktif",
    },
  };
}

describe("Tambah Program Siswa (Multi-program) Unit Tests", () => {
  const dummySiswa: SourceStudent = {
    id: "siswa-1",
    nomor_induk: "01.0970",
    nama_lengkap: "Ade Mei",
    nik: "3201012345678901",
    tempat_lahir: "Bandung",
    tgl_lahir: "2000-05-15",
    alamat_lengkap: "Jl. Las No. 10",
    no_hp: "081234567890",
    email: "ademei@gmail.com",
    pendidikan_terakhir: "SMK",
    program_id: "prog-smaw-6g",
  };

  const programSMAW6G: TargetProgram = {
    id: "prog-smaw-6g",
    kode_program: "01",
    nama: "SMAW 6G",
    biaya: 7500000,
    estimasi_durasi_hari: 51,
  };

  const programBanper: TargetProgram = {
    id: "prog-banper",
    kode_program: "01",
    nama: "SMAW 6G (Banper)",
    biaya: 14000000,
    estimasi_durasi_hari: 51,
  };

  const existingDB = [
    { nik: "3201012345678901", program_id: "prog-smaw-6g", nomor_induk: "01.0970" },
    { nik: "3201019999999999", program_id: "prog-banper", nomor_induk: "01.1030" },
  ];

  test("Menolak pendaftaran jika siswa sudah terdaftar di program yang sama", () => {
    const res = cloneStudentForNewProgram(dummySiswa, programSMAW6G, existingDB, {});
    assert.equal(res.success, false);
    assert.ok(res.error?.includes("sudah terdaftar"));
  });

  test("Menyalin seluruh data identitas pribadi saat mendaftar program baru", () => {
    const res = cloneStudentForNewProgram(dummySiswa, programBanper, existingDB, {
      nomor_induk: "01.0970", // Menggunakan nomor induk yang sama untuk program berbeda
      biaya_pelatihan: 14000000,
      tgl_masuk: "2026-09-01",
    });

    assert.equal(res.success, true);
    assert.equal(res.data?.nama_lengkap, dummySiswa.nama_lengkap);
    assert.equal(res.data?.nik, dummySiswa.nik);
    assert.equal(res.data?.alamat_lengkap, dummySiswa.alamat_lengkap);
    assert.equal(res.data?.program_id, programBanper.id);
    assert.equal(res.data?.nomor_induk, "01.0970");
    assert.equal(res.data?.biaya_pelatihan, 14000000);
    assert.equal(res.data?.tgl_masuk, "2026-09-01");
    assert.equal(res.data?.status_siswa, "aktif");
  });

  test("Menghitung nomor induk otomatis berikutnya jika tidak diisi manual", () => {
    const res = cloneStudentForNewProgram(dummySiswa, programBanper, existingDB, {});
    assert.equal(res.success, true);
    assert.equal(res.data?.nomor_induk, "01.1031");
    assert.equal(res.data?.biaya_pelatihan, programBanper.biaya);
  });

  test("Mendukung penetapan tarif kustom (misal diskon atau beasiswa)", () => {
    const res = cloneStudentForNewProgram(dummySiswa, programBanper, existingDB, {
      biaya_pelatihan: "0",
    });
    assert.equal(res.success, true);
    assert.equal(res.data?.biaya_pelatihan, 0);
  });
});
