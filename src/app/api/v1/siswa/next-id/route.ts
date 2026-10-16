import { NextRequest, NextResponse } from "next/server";
import { errorResponse, requireSuperadmin } from "@/lib/api-response";
import { getNextNomorInduk } from "@/lib/nomor-induk";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const searchParams = request.nextUrl.searchParams;
    const programId = searchParams.get("program_id");

    if (!programId) {
      return errorResponse("VALIDATION_ERROR", "Parameter program_id wajib disertakan.", 400);
    }

    const result = await getNextNomorInduk(programId);

    const response = NextResponse.json({
      data: {
        next_nomor_induk: result.next_nomor_induk,
        next_no_urut: result.next_no_urut,
        kode_program: result.kode_program,
      },
    });

    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat preview nomor induk.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
