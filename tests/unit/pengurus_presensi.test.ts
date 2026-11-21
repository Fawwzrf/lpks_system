import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Pengurus & Instruktur Presensi Logic Tests", () => {
  const VALID_PENGURUS_STATUSES = ["Hadir", "Izin", "Sakit", "Cuti", "Alpa", "Tugas Luar"];

  test("Daftar status presensi pengurus mendukung Cuti dan Tugas Luar", () => {
    assert.ok(VALID_PENGURUS_STATUSES.includes("Cuti"));
    assert.ok(VALID_PENGURUS_STATUSES.includes("Tugas Luar"));
    assert.ok(VALID_PENGURUS_STATUSES.includes("Hadir"));
    assert.equal(VALID_PENGURUS_STATUSES.length, 6);
  });

  test("Pemetaan kode status untuk laporan matriks Excel pengurus", () => {
    function getStatusKode(status: string): string {
      switch (status) {
        case "Hadir":
          return "H";
        case "Izin":
          return "I";
        case "Sakit":
          return "S";
        case "Cuti":
          return "C";
        case "Alpa":
          return "A";
        case "Tugas Luar":
          return "TL";
        default:
          return "";
      }
    }

    assert.equal(getStatusKode("Hadir"), "H");
    assert.equal(getStatusKode("Cuti"), "C");
    assert.equal(getStatusKode("Tugas Luar"), "TL");
    assert.equal(getStatusKode("Izin"), "I");
    assert.equal(getStatusKode("Belum Absen"), "");
  });

  test("Perhitungan persentase kehadiran pengurus memperhitungkan Tugas Luar sebagai hadir", () => {
    function calculatePengurusAttendance(records: string[]) {
      let hCount = 0;
      let iCount = 0;
      let sCount = 0;
      let cCount = 0;
      let aCount = 0;
      let tlCount = 0;

      records.forEach((st) => {
        if (st === "Hadir") hCount++;
        else if (st === "Izin") iCount++;
        else if (st === "Sakit") sCount++;
        else if (st === "Cuti") cCount++;
        else if (st === "Alpa") aCount++;
        else if (st === "Tugas Luar") tlCount++;
      });

      const totalMeetings = hCount + iCount + sCount + cCount + aCount + tlCount;
      const pct = totalMeetings > 0 ? `${Math.round(((hCount + tlCount) / totalMeetings) * 100)}%` : "-";

      return {
        hCount,
        iCount,
        sCount,
        cCount,
        aCount,
        tlCount,
        totalMeetings,
        pct,
      };
    }

    // 10 hari: 7 Hadir, 2 Tugas Luar, 1 Cuti => Hadir kerja = 9/10 = 90%
    const sample = ["Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Hadir", "Tugas Luar", "Tugas Luar", "Cuti"];
    const res = calculatePengurusAttendance(sample);

    assert.equal(res.hCount, 7);
    assert.equal(res.tlCount, 2);
    assert.equal(res.cCount, 1);
    assert.equal(res.totalMeetings, 10);
    assert.equal(res.pct, "90%");
  });

  test("Pemisahan modul export antara siswa dan pengurus menghasilkan parameter yang berbeda", () => {
    function buildExportUrl(target: "siswa" | "pengurus", mode: "bulan" | "custom", bulan: number, tahun: number, programId?: string) {
      const modul = target === "pengurus" ? "presensi_pengurus" : "presensi";
      let url = `/api/v1/excel/export?modul=${modul}`;
      if (mode === "bulan") {
        url += `&bulan=${bulan}&tahun=${tahun}`;
      }
      if (target === "siswa" && programId) {
        url += `&program_id=${programId}`;
      }
      return url;
    }

    const siswaUrl = buildExportUrl("siswa", "bulan", 11, 2026, "prog-01");
    assert.equal(siswaUrl, "/api/v1/excel/export?modul=presensi&bulan=11&tahun=2026&program_id=prog-01");

    const pengurusUrl = buildExportUrl("pengurus", "bulan", 11, 2026, "prog-01");
    // Pengurus tidak menyertakan program_id
    assert.equal(pengurusUrl, "/api/v1/excel/export?modul=presensi_pengurus&bulan=11&tahun=2026");
  });
});
