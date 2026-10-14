/**
 * Konstanta dan helper tanggal yang dipakai di seluruh API routes.
 * Menggunakan standar zona waktu WIB (Asia/Jakarta, UTC+7).
 */

export const TIMEZONE_WIB = "Asia/Jakarta";

export const NAMA_BULAN = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const NAMA_BULAN_UPPER = NAMA_BULAN.map((b) => b.toUpperCase());

export const ROMAN_MONTHS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];

/** Konversi nomor bulan (1–12) → angka romawi. */
export function toRomanMonth(monthNum: number): string {
  return ROMAN_MONTHS[(monthNum - 1) % 12] ?? "I";
}

/** Format Date → "DD Bulan YYYY" (Indonesia), e.g. "02 Juli 2026". */
export function formatIndoDate(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${day} ${NAMA_BULAN[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** Format Date → "DD/MM/YYYY". */
export function formatDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${d.getUTCFullYear()}`;
}

/** Tanggal saat ini dalam format YYYY-MM-DD waktu WIB (Asia/Jakarta). */
export function getWIBDateStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE_WIB,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Waktu saat ini dalam format HH:mm:ss waktu WIB (Asia/Jakarta). */
export function getWIBTimeStr(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIMEZONE_WIB,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/** Indeks hari dalam seminggu (0 = Minggu, 1 = Senin, ..., 6 = Sabtu) waktu WIB. */
export function getWIBDayOfWeek(date: Date = new Date()): number {
  const wibDate = getWIBDateStr(date);
  const [y, m, d] = wibDate.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

/** Today as YYYY-MM-DD string waktu WIB (Asia/Jakarta). */
export function todayStr(date: Date = new Date()): string {
  return getWIBDateStr(date);
}

/**
 * Format jam presensi untuk tampilan UI / Laporan agar sesuai WIB.
 * Mengutamakan createdAt jika tersedia karena merupakan timestamp absolut dari PostgreSQL.
 */
export function formatPresensiWIBTime(
  jam?: string | null,
  createdAt?: string | null,
  status?: string | null
): string {
  // Jika batch alpa otomatis atau nominal 17:00:00, pertahankan jam yang ditentukan
  if (jam === "17:00:00" && status === "Alpa") {
    return "17:00:00";
  }

  // Jika ada timestamp absolut created_at dari database
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return getWIBTimeStr(d);
    }
  }

  if (!jam) return "—";

  // Fallback: jika legacy jam tersimpan sebagai UTC (misal 00:27:03 atau 01:13:58),
  // di mana jam < 06:00:00 pagi (tidak mungkin jam operasional bengkel LPKS buka tengah malam)
  const match = jam.match(/^(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = match[2];
    const s = match[3] || "00";
    if (h >= 0 && h < 6) {
      // Terkonfirmasi disimpan dalam UTC (00:00 - 05:59 UTC = 07:00 - 12:59 WIB)
      const adjustedHour = String((h + 7) % 24).padStart(2, "0");
      return `${adjustedHour}:${m}:${s}`;
    }
  }

  return jam;
}

