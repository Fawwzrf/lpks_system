import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { UserRole } from "@/types/database";
import { formatSuccessPayload, formatErrorPayload } from "./response-format.ts";

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
}

export function successResponse<T>(data: T, meta?: Record<string, unknown>, status = 200) {
  return NextResponse.json(formatSuccessPayload(data, meta), { status });
}

export function errorResponse(code: string, message: string, status = 400, details?: unknown) {
  return NextResponse.json(formatErrorPayload(code, message, details), { status });
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  const role = (user.user_metadata?.role as UserRole) || "siswa";
  return {
    id: user.id,
    email: user.email,
    role,
    user_metadata: user.user_metadata,
  };
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      errorResponse: errorResponse(
        "UNAUTHORIZED",
        "Sesi Anda tidak valid atau telah berakhir. Silakan login kembali.",
        401
      ),
    };
  }
  return { user, errorResponse: null };
}

export async function requireSuperadmin() {
  const { user, errorResponse: authError } = await requireAuth();
  if (authError) {
    return { user: null, errorResponse: authError };
  }

  if (user?.role !== "superadmin") {
    return {
      user: null,
      errorResponse: errorResponse(
        "FORBIDDEN",
        "Akses ditolak: Anda tidak memiliki izin untuk melakukan tindakan ini.",
        403
      ),
    };
  }

  return { user, errorResponse: null };
}

export async function requireStudentOwnerOrAdmin(targetSiswaId: string) {
  const { user, errorResponse: authError } = await requireAuth();
  if (authError) {
    return { user: null, errorResponse: authError };
  }

  if (user?.role === "superadmin") {
    return { user, errorResponse: null };
  }

  // Cek apakah auth_id cocok dengan siswa_id
  const supabase = await createClient();
  const { data: siswa } = await supabase
    .from("siswa")
    .select("id, auth_id")
    .eq("id", targetSiswaId)
    .single();

  if (!siswa || siswa.auth_id !== user?.id) {
    return {
      user: null,
      errorResponse: errorResponse(
        "FORBIDDEN",
        "Akses ditolak: Anda hanya dapat mengakses data Anda sendiri.",
        403
      ),
    };
  }

  return { user, errorResponse: null };
}
