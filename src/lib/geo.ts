/**
 * Modul Utilitas Geofencing dan Haversine Distance
 * Digunakan untuk validasi presensi siswa dan radar live UI
 */

const EARTH_RADIUS_METERS = 6371000;

/**
 * Menghitung jarak lingkaran besar (Great Circle Distance) antara dua titik koordinat
 * menggunakan formula Haversine dalam satuan meter.
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const radLat1 = (lat1 * Math.PI) / 180;
  const radLat2 = (lat2 * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(EARTH_RADIUS_METERS * c * 100) / 100;
}

/**
 * Mengecek apakah posisi pengguna berada dalam batas radius geofencing bengkel LPKS
 */
export function isWithinGeofence(
  userLat: number,
  userLon: number,
  centerLat: number,
  centerLon: number,
  radiusMeter: number
): boolean {
  if (radiusMeter <= 0) return false;
  const distance = haversineDistance(userLat, userLon, centerLat, centerLon);
  return distance <= radiusMeter;
}

/**
 * Format jarak manusiawi (misal: "45 m" atau "1.2 km")
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
}

export interface GpsTelemetry {
  accuracy: number;
  altitude?: number | null;
  altitudeAccuracy?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
  is_mocked?: boolean;
}

export interface TelemetryValidationResult {
  valid: boolean;
  code?: string;
  message?: string;
}

/**
 * Memeriksa keabsahan telemetri GPS browser untuk mendeteksi Fake GPS / Emulator / Mock Provider.
 *
 * Kriteria Pemeriksaan:
 * 1. Kelengkapan: accuracy & timestamp numerik wajib ada.
 * 2. Client Mock Flag: deteksi navigator.webdriver atau flag manipulasi sensor.
 * 3. Akurasi Tidak Wajar (accuracy <= 0.5m): GPS satelit ponsel nyata memiliki fluktuasi alami;
 *    akurasi 0m adalah penanda khas simulator/fake GPS manual.
 * 4. Akurasi Terlalu Lemah (> 150m): Sinyal GPS belum terkunci (hanya triangulasi seluler).
 * 5. Timestamp Drift: Menolak replay payload koordinat rekaman masa lalu (toleransi maks 35 detik).
 */
export function inspectGpsTelemetry(
  telemetry: unknown,
  serverTimeMs: number = Date.now()
): TelemetryValidationResult {
  if (!telemetry || typeof telemetry !== "object") {
    return {
      valid: false,
      code: "MISSING_TELEMETRY",
      message: "Data telemetri sensor GPS wajib disertakan saat melakukan presensi hadir.",
    };
  }

  const t = telemetry as Partial<GpsTelemetry>;

  if (typeof t.accuracy !== "number" || isNaN(t.accuracy)) {
    return {
      valid: false,
      code: "INVALID_ACCURACY",
      message: "Data akurasi sinyal GPS tidak valid atau tidak terbaca.",
    };
  }

  if (typeof t.timestamp !== "number" || isNaN(t.timestamp)) {
    return {
      valid: false,
      code: "INVALID_TIMESTAMP",
      message: "Timestamp sensor GPS tidak valid.",
    };
  }

  // 1. Deteksi tanda Mocking / Automation
  if (t.is_mocked) {
    return {
      valid: false,
      code: "MOCK_LOCATION_DETECTED",
      message: "Presensi ditolak: Terdeteksi penggunaan fitur peniru lokasi (Mock Location / Emulator) pada perangkat Anda.",
    };
  }

  // 2. Akurasi Tidak Wajar (Mock Zero / Micro Precision)
  if (t.accuracy <= 0.5) {
    return {
      valid: false,
      code: "UNREALISTIC_ACCURACY",
      message: `Presensi ditolak: Akurasi GPS tidak wajar (${t.accuracy.toFixed(1)}m). Terindikasi penggunaan simulator atau manipulasi koordinat.`,
    };
  }

  // 3. Akurasi Terlalu Lemah (> 150m)
  if (t.accuracy > 150) {
    return {
      valid: false,
      code: "LOW_GPS_ACCURACY",
      message: `Sinyal GPS terlalu lemah (akurasi ±${Math.round(t.accuracy)}m, batas maksimal 150m). Silakan aktifkan mode Akurasi Tinggi (High Accuracy) dan pastikan berada di area terbuka.`,
    };
  }

  // 4. Timestamp Drift / Anti-Replay
  const driftMs = serverTimeMs - t.timestamp;
  if (driftMs > 35000) {
    return {
      valid: false,
      code: "STALE_GPS_DATA",
      message: "Data koordinat GPS kedaluwarsa atau terindikasi rekaman ulang (replay). Silakan muat ulang halaman dan coba lagi.",
    };
  }
  if (driftMs < -10000) {
    return {
      valid: false,
      code: "FUTURE_GPS_TIMESTAMP",
      message: "Waktu sensor GPS tidak sinkron (berada di masa depan). Periksa sinkronisasi jam perangkat Anda.",
    };
  }

  return { valid: true };
}

