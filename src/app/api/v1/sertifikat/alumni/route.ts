import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { logAuditEvent } from "@/lib/audit";

// POST: Catat atau perbarui nomor sertifikat alumni secara langsung tanpa perlu nilai ujian
export async function POST(request: NextRequest) {
  try {
    const { errorResponse: authError, user } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json().catch(() => ({}));
    const { siswa_id, no_sertifikat, tgl_cetak } = body;

    if (!siswa_id || typeof siswa_id !== "string") {
      return errorResponse("VALIDATION_ERROR", "ID Siswa wajib disertakan.", 400);
    }

    const cleanNoSertifikat = typeof no_sertifikat === "string" ? no_sertifikat.trim() : "";
    if (!cleanNoSertifikat) {
      return errorResponse("VALIDATION_ERROR", "Nomor sertifikat wajib diisi.", 400);
    }

    const supabase = await createClient();

    // 1. Verifikasi data siswa
    const { data: siswa, error: siswaErr } = await supabase
      .from("siswa")
      .select("id, nama_lengkap, nomor_induk, status_siswa, tgl_keluar")
      .eq("id", siswa_id)
      .single();

    if (siswaErr || !siswa) {
      return errorResponse("NOT_FOUND", "Data siswa tidak ditemukan.", 404);
    }

    // 2. Concurrency & Uniqueness check: pastikan nomor sertifikat belum dipakai oleh siswa lain
    const { data: duplicateCert } = await supabase
      .from("sertifikat")
      .select("id, siswa_id, siswa:siswa(nama_lengkap, nomor_induk)")
      .eq("no_sertifikat", cleanNoSertifikat)
      .neq("siswa_id", siswa_id)
      .maybeSingle();

    if (duplicateCert) {
      const existingOwner = (duplicateCert.siswa as unknown as { nama_lengkap: string; nomor_induk: string })?.nama_lengkap || "siswa lain";
      return errorResponse(
        "DUPLICATE_CERTIFICATE_NUMBER",
        `Nomor sertifikat "${cleanNoSertifikat}" sudah digunakan oleh ${existingOwner}. Harap gunakan nomor sertifikat yang unik.`,
        409
      );
    }

    const now = new Date().toISOString();
    const finalTglCetak = tgl_cetak || siswa.tgl_keluar || now;

    // 3. Upsert ke tabel sertifikat dengan status 'dicetak'
    const { data: sertifikat, error: upsertErr } = await supabase
      .from("sertifikat")
      .upsert(
        {
          siswa_id,
          no_sertifikat: cleanNoSertifikat,
          status: "dicetak",
          tgl_cetak: finalTglCetak,
          updated_at: now,
        },
        { onConflict: "siswa_id" }
      )
      .select()
      .single();

    if (upsertErr) {
      return errorResponse("DATABASE_ERROR", "Gagal mencatat nomor sertifikat alumni.", 500, upsertErr.message);
    }

    // 4. Pastikan status siswa di tabel siswa diset 'alumni' jika belum
    if (siswa.status_siswa !== "alumni") {
      await supabase
        .from("siswa")
        .update({ status_siswa: "alumni", updated_at: now })
        .eq("id", siswa_id);
    }

    // Audit trail logging
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    await logAuditEvent(supabase, {
      actorId: user?.id || null,
      actorRole: user?.role || "superadmin",
      action: "SERTIFIKAT_ALUMNI_CATAT",
      targetTable: "sertifikat",
      targetId: sertifikat.id,
      details: {
        siswa_id,
        nama_siswa: siswa.nama_lengkap,
        no_sertifikat: cleanNoSertifikat,
        tgl_cetak: finalTglCetak,
      },
      ipAddress,
    });

    return successResponse(
      sertifikat,
      { message: `Nomor sertifikat untuk ${siswa.nama_lengkap} (${cleanNoSertifikat}) berhasil dicatat.` },
      201
    );
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Terjadi kesalahan server saat mencatat sertifikat alumni.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

// DELETE: Hapus pencatatan sertifikat alumni
export async function DELETE(request: NextRequest) {
  try {
    const { errorResponse: authError, user } = await requireSuperadmin();
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const siswa_id = searchParams.get("siswa_id");

    if (!siswa_id) {
      return errorResponse("VALIDATION_ERROR", "Parameter siswa_id wajib disertakan.", 400);
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("sertifikat")
      .delete()
      .eq("siswa_id", siswa_id);

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal menghapus sertifikat.", 500, error.message);
    }

    // Audit trail logging
    const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || null;
    await logAuditEvent(supabase, {
      actorId: user?.id || null,
      actorRole: user?.role || "superadmin",
      action: "SERTIFIKAT_ALUMNI_DELETE",
      targetTable: "sertifikat",
      targetId: siswa_id,
      details: {
        siswa_id,
      },
      ipAddress,
    });

    return successResponse(null, { message: "Pencatatan sertifikat berhasil dihapus." });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Terjadi kesalahan server saat menghapus sertifikat.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
