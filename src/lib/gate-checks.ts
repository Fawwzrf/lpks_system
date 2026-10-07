/**
 * Modul Evaluasi Gate Kelayakan Sistem SDLC LPKS Sumbu Hidup
 * Berisi fungsi murni (pure functions) untuk aturan bisnis sertifikasi dan kelulusan
 */

export interface SkorUjian {
  teori: number;
  root: number;
  hotpass: number;
  filler: number;
  capping: number;
  gerinda: number;
}

export const KRITERIA_UJIAN_KEYS: (keyof SkorUjian)[] = [
  "teori",
  "root",
  "hotpass",
  "filler",
  "capping",
  "gerinda",
];

export const STANDAR_LULUS_MINIMAL = 80;

/**
 * Gate 1: Cek apakah status pembayaran siswa telah lunas
 */
export function isKeuanganLunas(totalBiaya: number, totalTerbayar: number): boolean {
  if (totalBiaya <= 0) return false;
  return totalTerbayar >= totalBiaya;
}

/**
 * Gate 2: Cek apakah seluruh nilai 6 kriteria Ujian Internal memenuhi batas kelulusan (>= 80)
 */
export function isUjianLulus(skor: SkorUjian): {
  lulus: boolean;
  rataRata: number;
  kriteriaGagal: string[];
} {
  const kriteriaGagal: string[] = [];
  let total = 0;

  for (const k of KRITERIA_UJIAN_KEYS) {
    const val = skor[k] ?? 0;
    total += val;
    if (val < STANDAR_LULUS_MINIMAL) {
      kriteriaGagal.push(k);
    }
  }

  const rataRata = Math.round(total / KRITERIA_UJIAN_KEYS.length);
  const lulus = kriteriaGagal.length === 0;

  return {
    lulus,
    rataRata,
    kriteriaGagal,
  };
}

/**
 * Gate 3: Cek apakah siswa siap untuk mengikuti ujian berdasarkan nilai harian
 */
export function isSiapUjian(
  nilaiTertinggiPerKriteria: Record<string, number>,
  daftarKriteriaWajib: string[],
  ambangBatas = STANDAR_LULUS_MINIMAL
): {
  siap: boolean;
  kriteriaTerpenuhi: number;
  totalKriteria: number;
} {
  if (!daftarKriteriaWajib.length) {
    return { siap: false, kriteriaTerpenuhi: 0, totalKriteria: 0 };
  }

  let terpenuhi = 0;
  for (const k of daftarKriteriaWajib) {
    const nilai = nilaiTertinggiPerKriteria[k.toLowerCase()] ?? 0;
    if (nilai >= ambangBatas) {
      terpenuhi++;
    }
  }

  return {
    siap: terpenuhi === daftarKriteriaWajib.length,
    kriteriaTerpenuhi: terpenuhi,
    totalKriteria: daftarKriteriaWajib.length,
  };
}

/**
 * Gate Gabungan: Syarat Mutlak Penerbitan E-Sertifikat
 */
export function isSertifikatEligible(
  isLunas: boolean,
  isLulusUjian: boolean
): {
  eligible: boolean;
  alasan: string[];
} {
  const alasan: string[] = [];
  if (!isLunas) {
    alasan.push("Biaya pelatihan belum lunas.");
  }
  if (!isLulusUjian) {
    alasan.push("Ujian internal belum dinyatakan lulus (seluruh kriteria >= 80).");
  }

  return {
    eligible: isLunas && isLulusUjian,
    alasan,
  };
}

/**
 * Validator NIK: Wajib persis 16 karakter angka
 */
export function isValidNIK(nik: string): boolean {
  if (!nik || typeof nik !== "string") return false;
  return /^\d{16}$/.test(nik.trim());
}

/**
 * Validator Nilai: Skala 0 - 100
 */
export function isValidScore(score: unknown): boolean {
  if (typeof score !== "number" || isNaN(score)) return false;
  return Number.isInteger(score) && score >= 0 && score <= 100;
}

/**
 * Generator Username Default Siswa: Nama depan (lowercase, alphanumeric) + @urutan no induk
 * Format: "budi@0005"
 * @param urutanNoInduk — nomor urut atau nomor induk siswa (misal: "0005" atau "01.0005")
 */
export function generateStudentUsername(namaLengkap: string, urutanNoInduk?: string | number): string {
  const cleanFirst =
    namaLengkap.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "siswa";
  if (urutanNoInduk !== undefined) {
    const raw = String(urutanNoInduk);
    const urutanStr = raw.includes(".") ? raw.split(".")[1] : raw;
    return `${cleanFirst}@${urutanStr}`;
  }
  return `${cleanFirst}@0001`;
}

/**
 * Generator Password Default Siswa: Disamakan dengan username siswa (misal: "budi@0005")
 */
export function generateStudentPassword(username?: string): string {
  return username || "budi@0001";
}

/**
 * Resolver Kandidat Email Auth: Memetakan input identifier (username, no induk, email)
 * ke seluruh variasi email internal Supabase Auth yang mungkin terdaftar.
 */
export function resolveLoginCandidateEmails(identifier: string): string[] {
  if (!identifier || typeof identifier !== "string") return [];
  const trimmed = identifier.trim();
  const lower = trimmed.toLowerCase();
  const candidates: string[] = [];

  // 1. Email format lengkap (admin atau email pribadi)
  const isFullEmail = lower.includes("@") && lower.split("@").length === 2 && lower.split("@")[1].includes(".");
  if (isFullEmail) {
    candidates.push(trimmed);
  }

  let handle = lower;
  if (handle.endsWith("@lpks.id")) {
    handle = handle.slice(0, -"@lpks.id".length);
  }

  if (handle.includes("@")) {
    const [namePart, numPart] = handle.split("@");
    const cleanName = namePart.replace(/[^a-z0-9]/g, "");
    const cleanNum = numPart.replace(/[^a-z0-9]/g, "");
    const lastSegment = numPart.includes(".") ? numPart.split(".").pop()!.replace(/[^a-z0-9]/g, "") : cleanNum;

    if (cleanName && lastSegment) {
      candidates.push(`${cleanName}${lastSegment}@lpks.id`);
      candidates.push(`${cleanName}.${lastSegment}@lpks.id`);
    }
    if (cleanName && cleanNum && cleanNum !== lastSegment) {
      candidates.push(`${cleanName}${cleanNum}@lpks.id`);
      candidates.push(`${cleanName}.${cleanNum}@lpks.id`);
    }
  } else {
    const cleanHandle = handle.replace(/[^a-z0-9]/g, "");
    if (cleanHandle) {
      candidates.push(`${cleanHandle}@lpks.id`);
    }
    if (handle.includes(".")) {
      const lastPart = handle.split(".").pop()!.replace(/[^a-z0-9]/g, "");
      if (lastPart) {
        candidates.push(`siswa${lastPart}@lpks.id`);
        candidates.push(`siswa.${lastPart}@lpks.id`);
      }
    }
  }

  const directAtLpks = `${handle.replace(/@/g, "")}@lpks.id`;
  if (!candidates.includes(directAtLpks)) {
    candidates.push(directAtLpks);
  }

  return Array.from(new Set(candidates));
}

