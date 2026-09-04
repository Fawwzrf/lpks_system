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
