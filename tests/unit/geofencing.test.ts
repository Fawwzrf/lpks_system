import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  haversineDistance,
  isWithinGeofence,
  formatDistance,
  inspectGpsTelemetry,
} from "../../src/lib/geo.ts";

describe("Geofencing & Haversine Distance Unit Tests", () => {
  // Titik Referensi Bengkel LPKS Sumbu Hidup
  const BENGKEL_LAT = -6.917464;
  const BENGKEL_LON = 107.619122;
  const RADIUS_M = 100;

  test("Jarak antara titik yang sama persis harus bernilai 0", () => {
    const dist = haversineDistance(BENGKEL_LAT, BENGKEL_LON, BENGKEL_LAT, BENGKEL_LON);
    assert.equal(dist, 0);
    assert.equal(isWithinGeofence(BENGKEL_LAT, BENGKEL_LON, BENGKEL_LAT, BENGKEL_LON, RADIUS_M), true);
  });

  test("Jarak pada deviasi kecil (sekitar 30 meter) harus berada dalam radius toleransi 100m", () => {
    // Geser latitude sekitar 0.00027 derajat (~30 meter ke utara)
    const userLat = BENGKEL_LAT + 0.00027;
    const userLon = BENGKEL_LON;

    const dist = haversineDistance(userLat, userLon, BENGKEL_LAT, BENGKEL_LON);
    assert.ok(dist > 25 && dist < 35, `Jarak terhitung: ${dist}m, diharapkan ~30m`);
    assert.equal(isWithinGeofence(userLat, userLon, BENGKEL_LAT, BENGKEL_LON, RADIUS_M), true);
  });

  test("Jarak pada batas luar (misal 500 meter) harus berada di luar radius 100m", () => {
    // Geser latitude sekitar 0.0045 derajat (~500 meter)
    const userLat = BENGKEL_LAT + 0.0045;
    const userLon = BENGKEL_LON;

    const dist = haversineDistance(userLat, userLon, BENGKEL_LAT, BENGKEL_LON);
    assert.ok(dist > 450 && dist < 550, `Jarak terhitung: ${dist}m, diharapkan ~500m`);
    assert.equal(isWithinGeofence(userLat, userLon, BENGKEL_LAT, BENGKEL_LON, RADIUS_M), false);
  });

  test("Radius nol atau negatif tidak boleh mengizinkan geofence", () => {
    assert.equal(isWithinGeofence(BENGKEL_LAT, BENGKEL_LON, BENGKEL_LAT, BENGKEL_LON, 0), false);
    assert.equal(isWithinGeofence(BENGKEL_LAT, BENGKEL_LON, BENGKEL_LAT, BENGKEL_LON, -50), false);
  });

  test("Format jarak manusiawi harus akurat untuk meter dan kilometer", () => {
    assert.equal(formatDistance(45), "45 m");
    assert.equal(formatDistance(99.4), "99 m");
    assert.equal(formatDistance(1250), "1.3 km");
    assert.equal(formatDistance(5000), "5.0 km");
  });
});

describe("GPS Telemetry Inspection Unit Tests (Anti-Fake GPS)", () => {
  const FIXED_NOW = 1700000000000;

  test("Telemetri GPS normal dari perangkat fisik diterima dengan valid", () => {
    const res = inspectGpsTelemetry(
      {
        accuracy: 12.4,
        altitude: 45.2,
        timestamp: FIXED_NOW - 1500, // 1.5 detik lalu
        is_mocked: false,
      },
      FIXED_NOW
    );

    assert.equal(res.valid, true);
  });

  test("Ditolak jika payload telemetri tidak disertakan", () => {
    assert.equal(inspectGpsTelemetry(null, FIXED_NOW).code, "MISSING_TELEMETRY");
    assert.equal(inspectGpsTelemetry(undefined, FIXED_NOW).code, "MISSING_TELEMETRY");
    assert.equal(inspectGpsTelemetry("invalid", FIXED_NOW).code, "MISSING_TELEMETRY");
  });

  test("Ditolak jika akurasi bernilai 0 atau micro precision <= 0.5m (khas simulator/mock location)", () => {
    const resZero = inspectGpsTelemetry(
      {
        accuracy: 0,
        timestamp: FIXED_NOW - 1000,
      },
      FIXED_NOW
    );
    assert.equal(resZero.valid, false);
    assert.equal(resZero.code, "UNREALISTIC_ACCURACY");

    const resMicro = inspectGpsTelemetry(
      {
        accuracy: 0.2,
        timestamp: FIXED_NOW - 1000,
      },
      FIXED_NOW
    );
    assert.equal(resMicro.valid, false);
    assert.equal(resMicro.code, "UNREALISTIC_ACCURACY");
  });

  test("Ditolak jika akurasi GPS terlalu lemah (> 150m, triangulasi seluler kasar)", () => {
    const resWeak = inspectGpsTelemetry(
      {
        accuracy: 250,
        timestamp: FIXED_NOW - 2000,
      },
      FIXED_NOW
    );
    assert.equal(resWeak.valid, false);
    assert.equal(resWeak.code, "LOW_GPS_ACCURACY");
  });

  test("Ditolak jika data GPS kedaluwarsa atau terindikasi replay attack (timestamp drift > 35 detik)", () => {
    const resStale = inspectGpsTelemetry(
      {
        accuracy: 15,
        timestamp: FIXED_NOW - 60000, // 60 detik lalu
      },
      FIXED_NOW
    );
    assert.equal(resStale.valid, false);
    assert.equal(resStale.code, "STALE_GPS_DATA");
  });

  test("Ditolak jika timestamp sensor GPS berada di masa depan (> 10 detik)", () => {
    const resFuture = inspectGpsTelemetry(
      {
        accuracy: 10,
        timestamp: FIXED_NOW + 20000, // 20 detik ke masa depan
      },
      FIXED_NOW
    );
    assert.equal(resFuture.valid, false);
    assert.equal(resFuture.code, "FUTURE_GPS_TIMESTAMP");
  });

  test("Ditolak jika terindikasi mock provider atau client automation", () => {
    const resMock = inspectGpsTelemetry(
      {
        accuracy: 8.5,
        timestamp: FIXED_NOW - 1000,
        is_mocked: true,
      },
      FIXED_NOW
    );
    assert.equal(resMock.valid, false);
    assert.equal(resMock.code, "MOCK_LOCATION_DETECTED");
  });
});

