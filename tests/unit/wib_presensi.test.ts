import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  getWIBDateStr,
  getWIBTimeStr,
  getWIBDayOfWeek,
  todayStr,
  formatPresensiWIBTime,
} from "../../src/lib/date-utils.ts";

describe("WIB Date & Presensi Time Synchronization Tests", () => {
  test("getWIBDateStr mengonversi UTC malam ke tanggal WIB keesokan harinya", () => {
    // 2026-10-13 23:30:00 UTC = 2026-10-14 06:30:00 WIB
    const utcDate = new Date("2026-10-13T23:30:00.000Z");
    assert.equal(getWIBDateStr(utcDate), "2026-10-14");
    assert.equal(todayStr(utcDate), "2026-10-14");
  });

  test("getWIBTimeStr mengonversi UTC ke jam WIB (UTC+7)", () => {
    // 2026-10-14 00:27:03 UTC = 07:27:03 WIB (sesuai contoh Prayoga)
    const prayogaDate = new Date("2026-10-14T00:27:03.000Z");
    assert.equal(getWIBTimeStr(prayogaDate), "07:27:03");

    // 2026-10-14 01:13:58 UTC = 08:13:58 WIB (sesuai contoh Ari Julian)
    const ariDate = new Date("2026-10-14T01:13:58.000Z");
    assert.equal(getWIBTimeStr(ariDate), "08:13:58");
  });

  test("getWIBDayOfWeek mengembalikan hari dalam zona WIB", () => {
    // 2026-10-11 23:30:00 UTC adalah Minggu malam UTC, tapi sudah Senin 06:30 WIB!
    const seninPagiWIB = new Date("2026-10-11T23:30:00.000Z");
    assert.equal(getWIBDayOfWeek(seninPagiWIB), 1); // 1 = Senin
  });

  test("formatPresensiWIBTime mengonversi legacy jam tersimpan UTC (00:27:03 -> 07:27:03)", () => {
    // Kasus 1: Dengan createdAt ISO UTC
    const res1 = formatPresensiWIBTime("00:27:03", "2026-10-14T00:27:03.123Z");
    assert.equal(res1, "07:27:03");

    // Kasus 2: Hanya jam legacy tanpa createdAt
    const res2 = formatPresensiWIBTime("00:27:03");
    assert.equal(res2, "07:27:03");

    // Kasus 3: Ari Julian jam 01:13:58 -> 08:13:58
    const res3 = formatPresensiWIBTime("01:13:58", "2026-10-14T01:13:58.456Z");
    assert.equal(res3, "08:13:58");
  });

  test("formatPresensiWIBTime mempertahankan jam yang sudah benar (>= 06:00) dan Batch Alpa", () => {
    // Record baru yang sudah disimpan dalam WIB
    assert.equal(formatPresensiWIBTime("07:27:03"), "07:27:03");
    assert.equal(formatPresensiWIBTime("08:15:00"), "08:15:00");

    // Batch Alpa 17:00:00
    assert.equal(formatPresensiWIBTime("17:00:00", "2026-10-14T10:15:00.000Z", "Alpa"), "17:00:00");
  });
});
