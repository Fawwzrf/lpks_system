/**
 * Client-side caching helper untuk profil siswa di portal (siswa)
 * Menghilangkan waterfall network call /api/v1/auth/me berulang di setiap navigasi tab.
 */

export interface CachedSiswaProfile {
  id: string;
  nama: string;
  nomor_induk?: string;
  is_password_default?: boolean;
  program?: string;
}

const STORAGE_KEY = "lpks_student_profile";

export function getCachedSiswaProfile(): CachedSiswaProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setCachedSiswaProfile(profile: CachedSiswaProfile): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {}
}

export function clearCachedSiswaProfile(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {}
}
