/**
 * Mengekstrak nomor urut integer dari format nomor induk apapun.
 * Contoh:
 * - "03.1148" -> 1148
 * - "03. 1149" -> 1149
 * - "01.1110—Askuri" -> 1110
 * - "3.1150" -> 1150
 * - "1148" -> 1148
 * - null / "" / "invalid" -> 0
 */
export function extractSequenceNumber(nomorInduk?: string | null): number {
  if (!nomorInduk || typeof nomorInduk !== "string") return 0;
  const trimmed = nomorInduk.trim();
  if (!trimmed) return 0;

  // Jika ada pemisah titik (standar format {kode_program}.{urutan})
  if (trimmed.includes(".")) {
    const parts = trimmed.split(".");
    const afterDot = parts.slice(1).join(".");
    const match = afterDot.match(/\d+/);
    if (match) {
      const val = parseInt(match[0], 10);
      return isNaN(val) ? 0 : val;
    }
  }

  // Fallback tanpa titik (hanya angka)
  const match = trimmed.match(/\d+/);
  if (match) {
    const val = parseInt(match[0], 10);
    return isNaN(val) ? 0 : val;
  }

  return 0;
}

export interface NextNomorIndukResult {
  next_no_urut: string;
  next_nomor_induk: string;
  kode_program: string;
  max_sequence: number;
}

/**
 * Menghitung nomor induk dan nomor urut berikutnya secara akurat & aman dari duplikasi.
 * - Menggunakan service_role client untuk memotong RLS dan melihat semua record (termasuk arsip/ANON).
 * - Tidak memfilter nik 'ANON-%' sehingga arsip alumni tetap dihitung.
 * - Mendukung paginasi chunk sehingga tidak terpotong batasan default 1000 baris PostgREST.
 * - Memeriksa kolom integer urutan_nomor maupun teks nomor_induk.
 */
export async function getNextNomorInduk(
  programId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  customClient?: any
): Promise<NextNomorIndukResult> {
  let db = customClient;
  if (!db) {
    try {
      const { createAdminClient } = await import("./supabase/admin");
      db = createAdminClient();
    } catch {
      const { createClient } = await import("./supabase/server");
      db = await createClient();
    }
  }

  // 1. Dapatkan master program & kode_program
  const { data: program, error: progErr } = await db
    .from("master_program")
    .select("id, kode_program, nama")
    .eq("id", programId)
    .maybeSingle();

  if (progErr || !program) {
    throw new Error(progErr?.message || "Program pelatihan tidak ditemukan.");
  }

  const kodeProgram = program.kode_program || "01";
  let maxUrutan = 0;

  // 2. Query cepat dari urutan_nomor tertinggi (descending)
  try {
    const { data: topRows } = await db
      .from("siswa")
      .select("urutan_nomor, nomor_induk")
      .or(`nomor_induk.ilike.${kodeProgram}.%,program_id.eq.${programId}`)
      .order("urutan_nomor", { ascending: false, nullsFirst: false })
      .limit(25);

    topRows?.forEach((r: { urutan_nomor?: number | null; nomor_induk?: string | null }) => {
      if (r.urutan_nomor && r.urutan_nomor > maxUrutan) {
        maxUrutan = r.urutan_nomor;
      }
      const numFromStr = extractSequenceNumber(r.nomor_induk);
      if (numFromStr > maxUrutan) {
        maxUrutan = numFromStr;
      }
    });
  } catch {
    // Abaikan jika order urutan_nomor gagal, lanjut ke full chunk scan
  }

  // 3. Scan semua siswa untuk program ini dengan paginasi chunk (menghindari limit 1000 PostgREST)
  try {
    let offset = 0;
    const chunkSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const { data: chunk, error: chunkErr } = await db
        .from("siswa")
        .select("nomor_induk, urutan_nomor")
        .or(`nomor_induk.ilike.${kodeProgram}.%,program_id.eq.${programId}`)
        .range(offset, offset + chunkSize - 1);

      if (chunkErr || !chunk || chunk.length === 0) break;

      for (const s of chunk) {
        if (s.urutan_nomor && s.urutan_nomor > maxUrutan) {
          maxUrutan = s.urutan_nomor;
        }
        const num = extractSequenceNumber(s.nomor_induk);
        if (num > maxUrutan) {
          maxUrutan = num;
        }
      }

      if (chunk.length < chunkSize) {
        hasMore = false;
      } else {
        offset += chunkSize;
      }
    }
  } catch {
    // Selesai scan
  }

  // 4. Periksa PostgreSQL RPC generate_nomor_induk sebagai verifikasi silang (jika ada)
  try {
    const { data: rpcRes } = await db.rpc("generate_nomor_induk", { p_program_id: programId });
    if (rpcRes) {
      const rpcSeq = extractSequenceNumber(rpcRes);
      // RPC generate_nomor_induk mengembalikan sequence berikutnya (max + 1)
      if (rpcSeq - 1 > maxUrutan) {
        maxUrutan = rpcSeq - 1;
      }
    }
  } catch {
    // RPC bersifat opsional
  }

  const nextUrutan = maxUrutan + 1;
  const nextNoUrut = String(nextUrutan).padStart(4, "0");
  const nextNomorInduk = `${kodeProgram}.${nextNoUrut}`;

  return {
    next_no_urut: nextNoUrut,
    next_nomor_induk: nextNomorInduk,
    kode_program: kodeProgram,
    max_sequence: maxUrutan,
  };
}
