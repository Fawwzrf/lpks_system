import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { haversineDistance, isWithinGeofence, formatDistance } from "../../src/lib/geo.ts";

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
