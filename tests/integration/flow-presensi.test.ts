import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { isWithinGeofence } from "../../src/lib/geo.ts";

describe("Alur Presensi & Kebijakan Jadwal Integration Tests", () => {
  const BENGKEL_LAT = -6.917464;
  const BENGKEL_LON = 107.619122;
  const RADIUS_M = 100;

  // Jadwal aktif pelatihan pengelasan: Senin(1) - Kamis(4) dan Sabtu(6)
  const HARI_AKTIF = [1, 2, 3, 4, 6];

  function validatePresensiSubmission(params: {
    dayOfWeek: number; // 0 = Minggu, 1 = Senin, dst.
    currentAttempts: number;
    alreadyPresensi: boolean;
    userLat: number;
    userLon: number;
  }): { allowed: boolean; code?: string; message: string } {
    // 1. Cek Hari Aktif
    if (!HARI_AKTIF.includes(params.dayOfWeek)) {
      return {
        allowed: false,
        code: "INVALID_SCHEDULE",
        message: "Presensi hanya dibuka pada hari Senin–Kamis dan Sabtu.",
      };
    }

    // 2. Cek Anti-Double Entry
    if (params.alreadyPresensi) {
      return {
        allowed: false,
        code: "ALREADY_CHECKED_IN",
        message: "Anda sudah melakukan presensi hari ini.",
      };
    }

    // 3. Cek Rate Limiting (Maksimal 3 percobaan per hari)
    if (params.currentAttempts >= 3) {
      return {
        allowed: false,
        code: "RATE_LIMIT_EXCEEDED",
        message: "Batas percobaan presensi hari ini telah habis (maksimal 3 kali).",
      };
    }

    // 4. Cek Geofencing
    const inRadius = isWithinGeofence(
      params.userLat,
      params.userLon,
      BENGKEL_LAT,
      BENGKEL_LON,
      RADIUS_M
    );
    if (!inRadius) {
      return {
        allowed: false,
        code: "OUT_OF_RANGE",
        message: "Posisi GPS berada di luar area bengkel pelatihan LPKS.",
      };
    }

    return {
      allowed: true,
      message: "Presensi berhasil tercatat.",
    };
  }

  test("Presensi di hari aktif (Senin) di dalam area bengkel berhasil", () => {
    const res = validatePresensiSubmission({
      dayOfWeek: 1, // Senin
      currentAttempts: 0,
      alreadyPresensi: false,
      userLat: BENGKEL_LAT + 0.0001, // ~11m
      userLon: BENGKEL_LON,
    });
    assert.equal(res.allowed, true);
  });

  test("Presensi di hari aktif (Sabtu) di dalam area bengkel berhasil", () => {
    const res = validatePresensiSubmission({
      dayOfWeek: 6, // Sabtu
      currentAttempts: 1,
      alreadyPresensi: false,
      userLat: BENGKEL_LAT,
      userLon: BENGKEL_LON,
    });
    assert.equal(res.allowed, true);
  });

  test("Presensi di hari Jumat atau Minggu DITOLAK sesuai regulasi workshop", () => {
    const resJumat = validatePresensiSubmission({
      dayOfWeek: 5, // Jumat
      currentAttempts: 0,
      alreadyPresensi: false,
      userLat: BENGKEL_LAT,
      userLon: BENGKEL_LON,
    });
    assert.equal(resJumat.allowed, false);
    assert.equal(resJumat.code, "INVALID_SCHEDULE");

    const resMinggu = validatePresensiSubmission({
      dayOfWeek: 0, // Minggu
      currentAttempts: 0,
      alreadyPresensi: false,
      userLat: BENGKEL_LAT,
      userLon: BENGKEL_LON,
    });
    assert.equal(resMinggu.allowed, false);
    assert.equal(resMinggu.code, "INVALID_SCHEDULE");
  });

  test("Presensi yang sudah pernah dilakukan hari ini DITOLAK (Anti Double-Entry)", () => {
    const res = validatePresensiSubmission({
      dayOfWeek: 2, // Selasa
      currentAttempts: 1,
      alreadyPresensi: true, // sudah absen
      userLat: BENGKEL_LAT,
      userLon: BENGKEL_LON,
    });
    assert.equal(res.allowed, false);
    assert.equal(res.code, "ALREADY_CHECKED_IN");
  });

  test("Percobaan presensi melebihi batas 3x DITOLAK (Rate Limiting L2)", () => {
    const res = validatePresensiSubmission({
      dayOfWeek: 3, // Rabu
      currentAttempts: 3, // batas tercapai
      alreadyPresensi: false,
      userLat: BENGKEL_LAT,
      userLon: BENGKEL_LON,
    });
    assert.equal(res.allowed, false);
    assert.equal(res.code, "RATE_LIMIT_EXCEEDED");
  });

  test("Presensi di luar radius bengkel (> 100 meter) DITOLAK", () => {
    const res = validatePresensiSubmission({
      dayOfWeek: 4, // Kamis
      currentAttempts: 0,
      alreadyPresensi: false,
      userLat: BENGKEL_LAT + 0.01, // ~1.1 km jauhnya
      userLon: BENGKEL_LON,
    });
    assert.equal(res.allowed, false);
    assert.equal(res.code, "OUT_OF_RANGE");
  });
});
