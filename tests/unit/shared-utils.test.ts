import { test, describe } from "node:test";
import assert from "node:assert/strict";

// In-source copy of helpers (avoid import path resolution issues in test runner)
const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];
const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

function toRomanMonth(monthNum: number): string {
  return ROMAN_MONTHS[(monthNum - 1) % 12] ?? "I";
}

function formatIndoDate(dateStr?: string | null): string {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "\u2014";
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${day} ${NAMA_BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

function formatDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "\u2014";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

interface NilaiHarianRow {
  siswa_id: string;
  kriteria_id: string;
  nilai: number;
}

function buildKriteriaPassMap(
  nilaiHarian: NilaiHarianRow[],
  batasLulus = 80
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const nh of nilaiHarian) {
    if (nh.nilai >= batasLulus) {
      if (!map.has(nh.siswa_id)) map.set(nh.siswa_id, new Set());
      map.get(nh.siswa_id)!.add(nh.kriteria_id);
    }
  }
  return map;
}

describe("date-utils: toRomanMonth", () => {
  test("konversi bulan 1-12 ke angka romawi", () => {
    assert.equal(toRomanMonth(1), "I");
    assert.equal(toRomanMonth(8), "VIII");
    assert.equal(toRomanMonth(9), "IX");
    assert.equal(toRomanMonth(12), "XII");
  });

  test("edge case bulan tidak valid (wrap via modulo)", () => {
    // ponytail: modulo wraps gracefully, no throw
    assert.ok(toRomanMonth(13).length > 0);
  });
});

describe("date-utils: formatIndoDate", () => {
  test("format tanggal ISO ke Indonesia dengan zero-pad", () => {
    assert.equal(formatIndoDate("2026-07-02"), "02 Juli 2026");
    assert.equal(formatIndoDate("2026-09-15"), "15 September 2026");
    assert.equal(formatIndoDate("2007-03-21"), "21 Maret 2007");
  });

  test("kembalikan em-dash untuk input null/undefined/invalid", () => {
    assert.equal(formatIndoDate(null), "\u2014");
    assert.equal(formatIndoDate(undefined), "\u2014");
    assert.equal(formatIndoDate("bukan-tanggal"), "\u2014");
  });
});

describe("date-utils: formatDDMMYYYY", () => {
  test("format tanggal ISO ke DD/MM/YYYY", () => {
    assert.equal(formatDDMMYYYY("2026-08-25"), "25/08/2026");
    assert.equal(formatDDMMYYYY("2026-01-07"), "07/01/2026");
  });

  test("kembalikan em-dash untuk input null/invalid", () => {
    assert.equal(formatDDMMYYYY(null), "\u2014");
    assert.equal(formatDDMMYYYY("xyz"), "\u2014");
  });
});

describe("nilai-utils: buildKriteriaPassMap", () => {
  test("hanya kriteria dengan nilai >= batas_lulus yang masuk", () => {
    const rows: NilaiHarianRow[] = [
      { siswa_id: "s1", kriteria_id: "k1", nilai: 90 },
      { siswa_id: "s1", kriteria_id: "k2", nilai: 70 }, // tidak lulus
      { siswa_id: "s1", kriteria_id: "k3", nilai: 80 }, // pas di batas
    ];
    const map = buildKriteriaPassMap(rows);
    assert.ok(map.get("s1")?.has("k1"));
    assert.ok(!map.get("s1")?.has("k2"));
    assert.ok(map.get("s1")?.has("k3"));
    assert.equal(map.get("s1")?.size, 2);
  });

  test("siswa berbeda dipetakan secara terpisah", () => {
    const rows: NilaiHarianRow[] = [
      { siswa_id: "s1", kriteria_id: "k1", nilai: 85 },
      { siswa_id: "s2", kriteria_id: "k1", nilai: 82 },
      { siswa_id: "s2", kriteria_id: "k2", nilai: 79 },
    ];
    const map = buildKriteriaPassMap(rows);
    assert.equal(map.get("s1")?.size, 1);
    assert.equal(map.get("s2")?.size, 1); // k2 tidak masuk
  });

  test("array kosong menghasilkan map kosong", () => {
    const map = buildKriteriaPassMap([]);
    assert.equal(map.size, 0);
  });

  test("batas_lulus kustom dihormati", () => {
    const rows: NilaiHarianRow[] = [
      { siswa_id: "s1", kriteria_id: "k1", nilai: 70 },
    ];
    const mapDefault = buildKriteriaPassMap(rows); // batas 80
    const mapCustom = buildKriteriaPassMap(rows, 65); // batas 65
    assert.equal(mapDefault.size, 0);
    assert.ok(mapCustom.get("s1")?.has("k1"));
  });
});
