import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin, requireAuth } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const activeOnly = request.nextUrl.searchParams.get("active_only") === "true";

    const supabase = await createClient();
    let query = supabase
      .from("master_program")
      .select("*")
      .order("kode_program", { ascending: true });

    if (activeOnly) {
      query = query.or("is_active.eq.true,is_active.is.null");
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal mengambil daftar program.", 500, error.message);
    }

    return successResponse(data);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memproses data program.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
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

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("master_program")
      .insert({
        kode_program: String(kode_program).trim(),
        nama: String(nama).trim(),
        biaya: parseFloat(biaya),
        estimasi_durasi_hari: parseInt(estimasi_durasi_hari || 30, 10),
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      })
      .select()
      .single();

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

    const { data, error } = await supabase
      .from("master_program")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

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

