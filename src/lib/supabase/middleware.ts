import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // If env vars are not set yet, allow request to proceed (for dev/build setup)
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value) // nosemgrep: javascript.koa.web.cookies-default-koa.cookies-default-koa
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, {
            ...options,
            sameSite: options?.sameSite ?? "lax",
            secure: process.env.NODE_ENV === "production",
          })
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rute publik yang tidak memerlukan login
  const isPublicRoute =
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/superadmin/login") ||
    pathname.startsWith("/kebijakan-privasi") ||
    pathname.startsWith("/api/"); // API route handlers mengelola auth & response status 401/403 sendiri

  // Jika belum login dan mengakses rute terlindungi
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    if (pathname.startsWith("/superadmin")) {
      url.pathname = "/superadmin/login";
    } else {
      url.pathname = "/login";
    }
    return NextResponse.redirect(url);
  }

  // Jika sudah login dan mencoba ke halaman login
  if (user && (pathname === "/login" || pathname === "/superadmin/login")) {
    const role = user.user_metadata?.role;
    const url = request.nextUrl.clone();
    if (role === "superadmin") {
      url.pathname = "/superadmin/dashboard";
    } else {
      url.pathname = "/siswa/beranda";
    }
    return NextResponse.redirect(url);
  }

  // Proteksi rute berdasarkan role
  if (user) {
    const role = user.user_metadata?.role;

    // Siswa mencoba masuk ke area /superadmin
    if (pathname.startsWith("/superadmin") && role !== "superadmin") {
      const url = request.nextUrl.clone();
      url.pathname = "/siswa/beranda";
      return NextResponse.redirect(url);
    }

    // Admin mencoba masuk ke area /siswa (opsional: izinkan atau redirect ke superadmin dashboard)
    if (pathname.startsWith("/siswa") && role === "superadmin") {
      const url = request.nextUrl.clone();
      url.pathname = "/superadmin/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
