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
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
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
    pathname.startsWith("/kebijakan-privasi") ||
    pathname.startsWith("/api/v1/auth/login");

  // Jika belum login dan mengakses rute terlindungi
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Jika sudah login dan mencoba ke halaman login
  if (user && pathname.startsWith("/login")) {
    const role = user.user_metadata?.role;
    const url = request.nextUrl.clone();
    if (role === "superadmin") {
      url.pathname = "/admin/dashboard";
    } else {
      url.pathname = "/siswa/dashboard";
    }
    return NextResponse.redirect(url);
  }

  // Proteksi rute berdasarkan role
  if (user) {
    const role = user.user_metadata?.role;

    // Siswa mencoba masuk ke area /admin
    if (pathname.startsWith("/admin") && role !== "superadmin") {
      const url = request.nextUrl.clone();
      url.pathname = "/siswa/dashboard";
      return NextResponse.redirect(url);
    }

    // Admin mencoba masuk ke area /siswa
    if (pathname.startsWith("/siswa") && role === "superadmin") {
      // Izinkan admin melihat portal siswa jika diperlukan atau arahkan ke admin dashboard
    }
  }

  return supabaseResponse;
}
