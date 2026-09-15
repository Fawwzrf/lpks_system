import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Template Excel Percetakan Sertifikat Unit Tests", () => {
  const ROMAN_MONTHS = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  const NAMA_BULAN_INDO = [
    "Januari", "Februari", "Maret", "April", "Mei", "Juni",
    "Juli", "Agustus", "September", "Oktober", "November", "Desember"
  ];

  function formatNoSertifikat(toDateStr: string): string {
    const d = new Date(toDateStr);
    const romanMonth = ROMAN_MONTHS[d.getMonth() + 1] || "I";
    const year = d.getFullYear();
    return `STF / LPKS -  SH / ${romanMonth} / ${year}`;
  }

  function formatPlaceAndDob(tempat?: string | null, dob?: string | null): string {
    if (!dob) return tempat || "-";
    const d = new Date(dob);
    if (isNaN(d.getTime())) return tempat || "-";
    const day = String(d.getDate()).padStart(2, "0");
    const month = NAMA_BULAN_INDO[d.getMonth()];
    const year = d.getFullYear();
    const dobStr = `${day} ${month} ${year}`;
    return tempat ? `${tempat}, ${dobStr}` : dobStr;
  }

  function formatDateOfIssue(toDateStr: string): string {
    const d = new Date(toDateStr);
    const day = String(d.getDate()).padStart(2, "0");
    const month = NAMA_BULAN_INDO[d.getMonth()];
    const year = d.getFullYear();
    return `Cilacap, ${day} ${month} ${year}`;
  }

  function formatProgramDisplay(progName?: string | null): string {
    if (!progName) return "-";
    const p = progName.trim();
    if (/kombinasi|gtaw\s*\+\s*smaw|gtaw\s*\/\s*smaw/i.test(p)) {
      return "Kombinasi";
    }
    if (/smaw\s*4g/i.test(p)) return "SMAW 4G";
    if (/smaw\s*6g/i.test(p)) return "SMAW 6G";
    if (/smaw\s*3g/i.test(p)) return "SMAW 3G";
    if (/gtaw\s*6g/i.test(p)) return "GTAW 6G";
    return p;
  }

  test("Format Nomor Sertifikat dengan angka romawi bulan dan tahun terbit", () => {
    assert.equal(formatNoSertifikat("2026-08-25"), "STF / LPKS -  SH / VIII / 2026");
    assert.equal(formatNoSertifikat("2026-09-07"), "STF / LPKS -  SH / IX / 2026");
    assert.equal(formatNoSertifikat("2026-10-10"), "STF / LPKS -  SH / X / 2026");
    assert.equal(formatNoSertifikat("2026-01-15"), "STF / LPKS -  SH / I / 2026");
  });

  test("Format Tempat & Tanggal Lahir (Place & Date of Birth) dengan leading zero pada tanggal", () => {
    assert.equal(formatPlaceAndDob("Sembulang", "2007-03-21"), "Sembulang, 21 Maret 2007");
    assert.equal(formatPlaceAndDob("Cilacap", "2008-07-02"), "Cilacap, 02 Juli 2008");
    assert.equal(formatPlaceAndDob("Cilacap", "2007-12-01"), "Cilacap, 01 Desember 2007");
  });

  test("Format Date of Issue (Cilacap, tgl bulan tahun)", () => {
    assert.equal(formatDateOfIssue("2026-08-25"), "Cilacap, 25 Agustus 2026");
    assert.equal(formatDateOfIssue("2026-09-07"), "Cilacap, 07 September 2026");
    assert.equal(formatDateOfIssue("2026-09-30"), "Cilacap, 30 September 2026");
  });

  test("Format nama program pengelasan sesuai template percetakan", () => {
    assert.equal(formatProgramDisplay("SMAW 4G (Pelat)"), "SMAW 4G");
    assert.equal(formatProgramDisplay("GTAW + SMAW 6G"), "Kombinasi");
    assert.equal(formatProgramDisplay("Kombinasi 6G"), "Kombinasi");
    assert.equal(formatProgramDisplay("SMAW 6G (Pipa)"), "SMAW 6G");
  });

  test("Pengurutan siswa berdasarkan tanggal pendaftaran terbaru (tgl_masuk DESC)", () => {
    const list = [
      { nama: "Budi (Agustus)", tgl_masuk: "2026-08-01" },
      { nama: "Andi (September)", tgl_masuk: "2026-09-11" },
      { nama: "Candra (Juli)", tgl_masuk: "2026-07-15" }
    ];

    list.sort((a, b) => b.tgl_masuk.localeCompare(a.tgl_masuk));

    assert.equal(list[0].nama, "Andi (September)"); // nomor urut 001
    assert.equal(list[1].nama, "Budi (Agustus)");   // nomor urut 002
    assert.equal(list[2].nama, "Candra (Juli)");   // nomor urut 003
  });
});
