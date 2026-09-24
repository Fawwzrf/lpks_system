import { test, describe } from "node:test";
import assert from "node:assert/strict";

/**
 * Unit test logika parsing dan validasi data pembaruan master program.
 * Memastikan payload biaya (number / string terformat), estimasi durasi, dan nama divalidasi dengan benar.
 */
function parseAndValidateProgramUpdate(payload: {
  id?: string;
  kode_program?: string;
  nama?: string;
  biaya?: unknown;
  estimasi_durasi_hari?: unknown;
}) {
  const { id, kode_program, nama, biaya, estimasi_durasi_hari } = payload;

  if (!id || !kode_program || !nama || biaya === undefined || biaya === null || biaya === "") {
    return { valid: false, error: "ID, kode program, nama, dan biaya wajib diisi." };
  }

  let numBiaya: number;
  if (typeof biaya === "number") {
    numBiaya = biaya;
  } else {
    let s = String(biaya).trim();
    if (s.includes(".") && !s.includes(",")) {
      if (/\.\d{3}/.test(s)) s = s.replace(/\./g, "");
    } else if (s.includes(".") && s.includes(",")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else if (s.includes(",")) {
      s = s.replace(",", ".");
    }
    numBiaya = parseFloat(s) || 0;
  }
  const durasi = parseInt(String(estimasi_durasi_hari || 30), 10) || 30;

  return {
    valid: true,
    data: {
      id,
      kode_program: String(kode_program).trim(),
      nama: String(nama).trim(),
      biaya: numBiaya,
      estimasi_durasi_hari: durasi,
    },
  };
}

describe("Master Program Update Logic Unit Tests", () => {
  test("Validasi gagal jika id, kode_program, nama, atau biaya kosong", () => {
    assert.equal(parseAndValidateProgramUpdate({}).valid, false);
    assert.equal(parseAndValidateProgramUpdate({ id: "p-1", kode_program: "01", nama: "" }).valid, false);
    assert.equal(parseAndValidateProgramUpdate({ id: "p-1", kode_program: "", nama: "SMAW" }).valid, false);
    assert.equal(parseAndValidateProgramUpdate({ id: "p-1", kode_program: "01", nama: "SMAW", biaya: "" }).valid, false);
  });

  test("Parsing biaya numerik langsung diterima dengan akurat", () => {
    const res = parseAndValidateProgramUpdate({
      id: "p-1",
      kode_program: "01",
      nama: "SMAW 6G",
      biaya: 7500000,
      estimasi_durasi_hari: 51,
    });

    assert.equal(res.valid, true);
    assert.equal(res.data?.biaya, 7500000);
    assert.equal(res.data?.estimasi_durasi_hari, 51);
    assert.equal(res.data?.nama, "SMAW 6G");
  });

  test("Parsing biaya dalam format string atau bertitik (misal: '8.500.000') dinormalisasi", () => {
    const res = parseAndValidateProgramUpdate({
      id: "p-2",
      kode_program: "02",
      nama: "GTAW",
      biaya: "8.500.000",
      estimasi_durasi_hari: "45",
    });

    assert.equal(res.valid, true);
    assert.equal(res.data?.biaya, 8500000);
    assert.equal(res.data?.estimasi_durasi_hari, 45);
  });

  test("Estimasi durasi default ke 30 hari jika tidak diberikan", () => {
    const res = parseAndValidateProgramUpdate({
      id: "p-3",
      kode_program: "01",
      nama: "SMAW 4G",
      biaya: 5000000,
    });

    assert.equal(res.valid, true);
    assert.equal(res.data?.estimasi_durasi_hari, 30);
  });
});
