/**
 * Konstanta dan helper tanggal yang dipakai di seluruh API routes.
 * Satu tempat → tidak ada duplikasi array NAMA_BULAN / ROMAN_MONTHS.
 */

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

/** Today as YYYY-MM-DD string (UTC). */
export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}
