import { SupabaseClient } from "@supabase/supabase-js";

export interface DuplicatePaymentCheckParams {
  siswaId: string;
  nominal: number;
  tglBayar: string;
  thresholdSeconds?: number;
}

/**
 * Memeriksa apakah ada transaksi pembayaran serupa yang baru saja dicatat
 * dalam rentang waktu beberapa detik terakhir untuk mencegah double-submission.
 */
export async function checkDuplicatePayment(
  supabase: SupabaseClient,
  params: DuplicatePaymentCheckParams
): Promise<{ isDuplicate: boolean; existingId?: string }> {
  const thresholdSec = params.thresholdSeconds ?? 5;
  const timeThreshold = new Date(Date.now() - thresholdSec * 1000).toISOString();

  const { data: recentTx } = await supabase
    .from("transaksi_keuangan")
    .select("id, created_at")
    .eq("siswa_id", params.siswaId)
    .eq("nominal", params.nominal)
    .eq("tgl_bayar", params.tglBayar)
    .gte("created_at", timeThreshold)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recentTx) {
    return { isDuplicate: true, existingId: recentTx.id };
  }
  return { isDuplicate: false };
}
