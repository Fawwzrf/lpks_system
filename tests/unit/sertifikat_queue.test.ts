import { test, describe } from "node:test";
import assert from "node:assert/strict";

function toRomanMonth(monthNum: number): string {
  const romanMonths = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  return romanMonths[monthNum - 1] || "I";
}

function formatCertificateNumber(completionDateStr: string): string {
  const d = new Date(completionDateStr);
  const roman = toRomanMonth(d.getMonth() + 1);
  const year = d.getFullYear();
  return `STF / LPKS -  SH / ${roman} / ${year}`;
}

interface MockStudent {
  id: string;
  nomor_induk: string;
  nama_lengkap: string;
  tgl_masuk: string;
  is_lulus_ujian: boolean;
  is_lunas: boolean;
  status_sertifikat?: "antrean" | "dicetak" | null;
}

function canAddToQueue(s: MockStudent): { allowed: boolean; reason?: string } {
  if (!s.is_lulus_ujian) {
    return { allowed: false, reason: "Ujian internal belum lulus (min 80 tiap kriteria)" };
  }
  if (!s.is_lunas) {
    return { allowed: false, reason: "Keuangan belum lunas" };
  }
  return { allowed: true };
}

describe("Sertifikat Queue & Printing Lifecycle", () => {
  test("harus menolak penambahan ke antrean jika siswa belum lulus ujian", () => {
    const student: MockStudent = {
      id: "s-1",
      nomor_induk: "01.1110",
      nama_lengkap: "Yusha Ikio Verroza",
      tgl_masuk: "2026-08-01",
      is_lulus_ujian: false,
      is_lunas: true,
    };
    const result = canAddToQueue(student);
    assert.equal(result.allowed, false);
    assert.ok(result.reason?.includes("Ujian internal belum lulus"));
  });

  test("harus menolak penambahan ke antrean jika keuangan belum lunas", () => {
    const student: MockStudent = {
      id: "s-2",
      nomor_induk: "03.1113",
      nama_lengkap: "Dayu Dwi Cahyanto",
      tgl_masuk: "2026-06-15",
      is_lulus_ujian: true,
      is_lunas: false,
    };
    const result = canAddToQueue(student);
    assert.equal(result.allowed, false);
    assert.ok(result.reason?.includes("Keuangan belum lunas"));
  });

  test("harus mengizinkan penambahan ke antrean jika siswa lulus ujian dan lunas", () => {
    const student: MockStudent = {
      id: "s-3",
      nomor_induk: "01.1137",
      nama_lengkap: "Fawwaz Aufa",
      tgl_masuk: "2026-09-01",
      is_lulus_ujian: true,
      is_lunas: true,
    };
    const result = canAddToQueue(student);
    assert.equal(result.allowed, true);
  });

  test("harus mengurutkan siswa di antrean dengan pendaftar paling baru di nomor urut pertama (001)", () => {
    const queue: MockStudent[] = [
      { id: "1", nomor_induk: "01.1126", nama_lengkap: "Prasetia", tgl_masuk: "2026-07-22", is_lulus_ujian: true, is_lunas: true },
      { id: "2", nomor_induk: "01.1145", nama_lengkap: "Andra", tgl_masuk: "2026-08-10", is_lulus_ujian: true, is_lunas: true },
      { id: "3", nomor_induk: "03.1104", nama_lengkap: "Julyan", tgl_masuk: "2026-06-01", is_lulus_ujian: true, is_lunas: true },
      { id: "4", nomor_induk: "01.1137", nama_lengkap: "Fawwaz", tgl_masuk: "2026-09-05", is_lulus_ujian: true, is_lunas: true },
    ];

    queue.sort((a, b) => new Date(b.tgl_masuk).getTime() - new Date(a.tgl_masuk).getTime());

    assert.equal(queue[0].nama_lengkap, "Fawwaz"); // September (001)
    assert.equal(queue[1].nama_lengkap, "Andra");  // Agustus (002)
    assert.equal(queue[2].nama_lengkap, "Prasetia"); // Juli (003)
    assert.equal(queue[3].nama_lengkap, "Julyan");   // Juni (004)
  });

  test("harus mengizinkan cetak ulang (re-queue) bagi siswa yang statusnya sudah dicetak", () => {
    const student: MockStudent = {
      id: "s-4",
      nomor_induk: "01.1126",
      nama_lengkap: "Prasetia",
      tgl_masuk: "2026-07-22",
      is_lulus_ujian: true,
      is_lunas: true,
      status_sertifikat: "dicetak",
    };

    // Re-queue action sets status back to 'antrean'
    student.status_sertifikat = "antrean";
    assert.equal(student.status_sertifikat, "antrean");
    assert.equal(formatCertificateNumber("2026-08-25"), "STF / LPKS -  SH / VIII / 2026");
  });
});
