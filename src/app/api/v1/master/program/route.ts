import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin, requireAuth } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const activeOnly = request.nextUrl.searchParams.get("active_only") === "true";

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("master_program")
      .select("*")
      .order("kode_program", { ascending: true });

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal mengambil daftar program.", 500, error.message);
    }

    let result = (data || []) as Array<Record<string, unknown>>;
    if (activeOnly) {
      // Saring program aktif secara aman di memori.
      // Jika kolom is_active belum dimigrasi di Postgres (undefined), seluruh program tetap tampil (graceful fallback).
      result = result.filter((p) => p.is_active !== false);
    }

    return successResponse(result);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses data program.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

function isColumnMissingError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { code?: string; message?: string };
  return (
    e.code === "PGRST204" ||
    e.code === "42703" ||
    (typeof e.message === "string" &&
      (e.message.includes("is_active") || e.message.includes("schema cache")))
  );
}

export async function POST(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const { kode_program, nama, biaya, estimasi_durasi_hari, is_active } = body;

    if (!kode_program || !nama || biaya === undefined) {
      return errorResponse("VALIDATION_ERROR", "Kode program, nama, dan biaya wajib diisi.", 400);
    }

    const insertPayload: Record<string, unknown> = {
      kode_program: String(kode_program).trim(),
      nama: String(nama).trim(),
      biaya: parseFloat(biaya),
      estimasi_durasi_hari: parseInt(estimasi_durasi_hari || 30, 10),
    };
    if (is_active !== undefined) {
      insertPayload.is_active = Boolean(is_active);
    }

    const supabase = await createClient();
    let { data, error } = await supabase
      .from("master_program")
      .insert(insertPayload)
      .select()
      .single();

    // Fallback jika kolom is_active belum dibuat di database (PGRST204 / 42703)
    if (isColumnMissingError(error) && "is_active" in insertPayload) {
      delete insertPayload.is_active;
      const retry = await supabase
        .from("master_program")
        .insert(insertPayload)
        .select()
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error) {
      if (error.code === "23505") {
        return errorResponse("DUPLICATE_CODE", "Kode program sudah digunakan.", 409);
      }
      return errorResponse("DATABASE_ERROR", "Gagal menambahkan program.", 500, error.message);
    }

    return successResponse(data, undefined, 201);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal membuat program pelatihan baru.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const body = await request.json();
    const { id, kode_program, nama, biaya, estimasi_durasi_hari, is_active } = body;

    if (!id || !kode_program || !nama || biaya === undefined) {
      return errorResponse("VALIDATION_ERROR", "ID, kode program, nama, dan biaya wajib diisi.", 400);
    }

    let numBiaya: number;
    if (typeof biaya === "number") {
      numBiaya = biaya;
    } else {
      let s = String(biaya).trim();
      if (s.includes(".") && !s.includes(",")) {
        if (/\.\d{3}/.test(s)) s = s.replace(/\./g, "");
      } else if (s.includes(".") && s.includes(",")) {
        s = s.replace(/\./g, "").replace(",", ".");
      } else if (s.includes(",")) {
        s = s.replace(",", ".");
      }
      numBiaya = parseFloat(s) || 0;
    }
    const durasi = parseInt(String(estimasi_durasi_hari || 30), 10) || 30;

    const supabase = await createClient();

    // Auto-grandfathering: Amankan siswa lama sebelum biaya program diperbarui.
    // Jika biaya berubah, kunci harga lama pada siswa yang masih bernilai NULL agar tidak terdampak secara retroaktif.
    const { data: currentProg } = await supabase
      .from("master_program")
      .select("biaya")
      .eq("id", id)
      .maybeSingle();

    if (currentProg && currentProg.biaya !== null && Number(currentProg.biaya) !== numBiaya) {
      await supabase
        .from("siswa")
        .update({ biaya_pelatihan: Number(currentProg.biaya) })
        .eq("program_id", id)
        .is("biaya_pelatihan", null);
    }

    const updatePayload: Record<string, unknown> = {
      kode_program: String(kode_program).trim(),
      nama: String(nama).trim(),
      biaya: numBiaya,
      estimasi_durasi_hari: durasi,
      updated_at: new Date().toISOString(),
    };
    if (is_active !== undefined) {
      updatePayload.is_active = Boolean(is_active);
    }

    let { data, error } = await supabase
      .from("master_program")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    // Fallback edukatif jika kolom is_active belum dibuat di database (PGRST204 / 42703)
    if (isColumnMissingError(error) && "is_active" in updatePayload) {
      delete updatePayload.is_active;
      // Coba perbarui field reguler lainnya jika ada
      await supabase
        .from("master_program")
        .update(updatePayload)
        .eq("id", id);

      return errorResponse(
        "MIGRATION_REQUIRED",
        "Fitur arsip memerlukan migrasi kolom 'is_active' di Supabase. Silakan jalankan query SQL berikut di Supabase SQL Editor: ALTER TABLE public.master_program ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;",
        400
      );
    }

    if (error) {
      if (error.code === "23505") {
        return errorResponse("DUPLICATE_CODE", "Kode program sudah digunakan.", 409);
      }
      return errorResponse("DATABASE_ERROR", "Gagal memperbarui program.", 500, error.message);
    }

    return successResponse(data);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memperbarui data program.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const id = request.nextUrl.searchParams.get("id");
    if (!id) {
      return errorResponse("VALIDATION_ERROR", "Parameter id wajib disertakan.", 400);
    }

    const supabase = await createClient();
    const { error } = await supabase.from("master_program").delete().eq("id", id);

    if (error) {
      if (error.code === "23503") {
        return errorResponse("FK_CONSTRAINT", "Program tidak dapat dihapus karena masih digunakan oleh data siswa.", 409);
      }
      return errorResponse("DATABASE_ERROR", "Gagal menghapus program.", 500, error.message);
    }

    return successResponse({ deleted_id: id });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal menghapus data program.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

