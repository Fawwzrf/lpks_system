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

    // Dapatkan semua nomor induk yang menggunakan kode_program ini untuk mencari nomor urut tertinggi
    const { data: allSiswa, error } = await supabase
      .from("siswa")
      .select("nomor_induk")
      .not("nik", "like", "ANON-%")
      .ilike("nomor_induk", `${program.kode_program}.%`);

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal mengambil data siswa.", 500, error.message);
    }

    let maxUrutan = 0;
    allSiswa?.forEach((s) => {
      if (s.nomor_induk) {
        const parts = s.nomor_induk.split(".");
        if (parts.length >= 2) {
          const num = parseInt(parts[1].replace(/\D/g, ""), 10);
          if (!isNaN(num) && num > maxUrutan) {
            maxUrutan = num;
          }
        }
      }
    });

    const nextUrutan = maxUrutan + 1;
    const nextNoUrut = String(nextUrutan).padStart(4, "0");
    const nextNomorInduk = `${program.kode_program}.${nextNoUrut}`;

    return successResponse({
      next_nomor_induk: nextNomorInduk,
      next_no_urut: nextNoUrut,
      kode_program: program.kode_program,
    });
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat preview nomor induk.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
