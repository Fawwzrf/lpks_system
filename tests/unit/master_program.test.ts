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

  test("Auto-grandfathering terdeteksi jika harga program berubah dari harga saat ini", () => {
    const shouldTriggerGrandfathering = (currentBiaya: number | null | undefined, newBiaya: number) => {
      return currentBiaya !== null && currentBiaya !== undefined && Number(currentBiaya) !== newBiaya;
    };

    // Harga naik dari 7.500.000 ke 8.000.000 -> harus trigger grandfathering
    assert.equal(shouldTriggerGrandfathering(7500000, 8000000), true);

    // Harga sama -> tidak trigger
    assert.equal(shouldTriggerGrandfathering(7500000, 7500000), false);

    // Current biaya null (program baru belum ada harga) -> tidak trigger
    assert.equal(shouldTriggerGrandfathering(null, 7500000), false);
  });

  test("Snapshot biaya siswa memprioritaskan biaya kustom jika ada, atau fallback ke harga program", () => {
    const resolveSiswaBiaya = (
      inputBiaya: string | number | null | undefined,
      programBiaya: number | null | undefined
    ): number | null => {
      if (inputBiaya !== undefined && inputBiaya !== null && inputBiaya !== "") {
        if (typeof inputBiaya === "number") return inputBiaya;
        let s = String(inputBiaya).trim();
        if (s.includes(".") && !s.includes(",")) {
          if (/\.\d{3}/.test(s)) s = s.replace(/\./g, "");
        } else if (s.includes(".") && s.includes(",")) {
          s = s.replace(/\./g, "").replace(",", ".");
        } else if (s.includes(",")) {
          s = s.replace(",", ".");
        } else {
          s = s.replace(/[^\d.-]/g, "");
        }
        const parsed = parseFloat(s);
        if (!isNaN(parsed) && parsed >= 0) return parsed;
      }
      return programBiaya !== undefined && programBiaya !== null ? Number(programBiaya) : null;
    };

    // Siswa didaftarkan tanpa input biaya -> otomatis mengambil snapshot harga program
    assert.equal(resolveSiswaBiaya(null, 7500000), 7500000);
    assert.equal(resolveSiswaBiaya("", 8500000), 8500000);

    // Siswa didaftarkan dengan beasiswa/diskon kustom -> memakai input kustom
    assert.equal(resolveSiswaBiaya("5.000.000", 7500000), 5000000);
    assert.equal(resolveSiswaBiaya(4000000, 7500000), 4000000);
  });

  test("Parsing is_active field pada payload master program", () => {
    const parsePayload = (p: { is_active?: boolean }) => ({
      is_active: p.is_active !== undefined ? Boolean(p.is_active) : true,
    });

    assert.equal(parsePayload({}).is_active, true);
    assert.equal(parsePayload({ is_active: true }).is_active, true);
    assert.equal(parsePayload({ is_active: false }).is_active, false);
  });

  test("Penyaringan active_only=true hanya meloloskan program aktif dan mengecualikan arsip", () => {
    const programs = [
      { id: "1", nama: "SMAW 6G", is_active: true },
      { id: "2", nama: "GTAW Pipe (Arsip)", is_active: false },
      { id: "3", nama: "FCAW 3G", is_active: true },
      { id: "4", nama: "Kombinasi Lama", is_active: false },
    ];

    const filterActiveOnly = (list: typeof programs, activeOnly: boolean) => {
      if (!activeOnly) return list;
      return list.filter((p) => p.is_active !== false);
    };

    const activeList = filterActiveOnly(programs, true);
    assert.equal(activeList.length, 2);
    assert.deepEqual(
      activeList.map((p) => p.nama),
      ["SMAW 6G", "FCAW 3G"]
    );

    const allList = filterActiveOnly(programs, false);
    assert.equal(allList.length, 4);
  });
});

