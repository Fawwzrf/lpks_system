import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get("program_id");

    if (!programId) {
      return errorResponse("VALIDATION_ERROR", "Parameter program_id wajib disertakan.", 400);
    }

    const supabase = await createClient();

    // Dapatkan kode_program
    const { data: program } = await supabase
      .from("master_program")
      .select("kode_program")
      .eq("id", programId)
      .single();

    if (!program) {
      return errorResponse("NOT_FOUND", "Program pelatihan tidak ditemukan.", 404);
    }

    // Dapatkan nomor induk terakhir
    const { data: lastSiswa, error } = await supabase
      .from("siswa")
      .select("nomor_induk")
      .eq("program_id", programId)
      .order("nomor_induk", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal mengambil data siswa terakhir.", 500, error.message);
    }

    let nextUrutan = 1;
    if (lastSiswa?.nomor_induk) {
      const parts = lastSiswa.nomor_induk.split(".");
      if (parts.length === 2) {
        const lastUrutan = parseInt(parts[1].replace(/\D/g, ""), 10);
        if (!isNaN(lastUrutan)) {
          nextUrutan = lastUrutan + 1;
        }
      }
    }

    const nextNomorInduk = `${program.kode_program}.${String(nextUrutan).padStart(4, "0")}`;

    return successResponse({ next_nomor_induk: nextNomorInduk });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat preview nomor induk.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
