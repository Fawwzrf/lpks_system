import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("Lock Biaya Pelatihan Siswa (Student Locked Fee) Tests", () => {
  function calculateStudentBilling(
    biayaPelatihan: number | null | undefined,
    masterProgramBiaya: number,
    totalTerbayar: number
  ) {
    const totalBiaya =
      biayaPelatihan !== null && biayaPelatihan !== undefined
        ? Number(biayaPelatihan)
        : Number(masterProgramBiaya);

    const sisaTagihan = Math.max(0, totalBiaya - totalTerbayar);
    const isLunas = sisaTagihan === 0 && totalBiaya > 0;
    return {
      totalBiaya,
      totalTerbayar,
      sisaTagihan,
      status: isLunas ? "Lunas" : "Cicil",
      isLunas,
    };
  }

  test("Siswa dengan biaya_pelatihan Rp 8.000.000 tetap Lunas saat master_program dinaikkan ke Rp 10.000.000", () => {
    // Siswa lama bayar Rp 8.000.000
    const billBefore = calculateStudentBilling(8000000, 8000000, 8000000);
    assert.equal(billBefore.totalBiaya, 8000000);
    assert.equal(billBefore.sisaTagihan, 0);
    assert.equal(billBefore.status, "Lunas");

    // Harga master program dinaikkan ke Rp 10.000.000
    const billAfter = calculateStudentBilling(8000000, 10000000, 8000000);
    assert.equal(billAfter.totalBiaya, 8000000, "Biaya siswa harus tetap terkunci di 8jt, bukan 10jt");
    assert.equal(billAfter.sisaTagihan, 0, "Sisa tagihan harus tetap 0");
    assert.equal(billAfter.status, "Lunas", "Status siswa harus tetap Lunas");
  });

  test("Siswa tanpa biaya_pelatihan (null) mengikuti tarif master_program terkini", () => {
    const bill = calculateStudentBilling(null, 9500000, 5000000);
    assert.equal(bill.totalBiaya, 9500000);
    assert.equal(bill.sisaTagihan, 4500000);
    assert.equal(bill.status, "Cicil");
  });

  test("Siswa penerima beasiswa (biaya_pelatihan Rp 0) tidak terpengaruh kenaikan master data", () => {
    const bill = calculateStudentBilling(0, 8500000, 0);
    assert.equal(bill.totalBiaya, 0);
    assert.equal(bill.sisaTagihan, 0);
  });
});
