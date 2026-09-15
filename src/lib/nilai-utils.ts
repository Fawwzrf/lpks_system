/**
 * Helper untuk membangun Map nilai harian siswa per kriteria.
 * Fungsi ini duplikat di ujian/route.ts dan notifications/route.ts;
 * dipindah ke sini agar bisa dipakai bersama.
 */

export interface NilaiHarianRow {
  siswa_id: string;
  kriteria_id: string;
  nilai: number;
}

/**
 * Dari array penilaian harian, bangun Map<siswa_id, Set<kriteria_id>>
 * yang hanya berisi kriteria dengan nilai >= batas_lulus (default 80).
 */
export function buildKriteriaPassMap(
  nilaiHarian: NilaiHarianRow[],
  batasLulus = 80
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const nh of nilaiHarian) {
    if (nh.nilai >= batasLulus) {
      if (!map.has(nh.siswa_id)) map.set(nh.siswa_id, new Set());
      map.get(nh.siswa_id)!.add(nh.kriteria_id);
    }
  }
  return map;
}
