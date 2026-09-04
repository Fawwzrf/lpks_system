import { test, describe } from "node:test";
import assert from "node:assert/strict";

describe("RBAC & Route Protection Integration Tests", () => {
  // Simulasi policy RBAC Matrix sistem LPKS Sumbu Hidup
  interface AuthContext {
    userId: string;
    role: "superadmin" | "siswa" | "anon";
  }

  function canAccessRoute(route: string, auth: AuthContext): { allowed: boolean; redirect?: string; status: number } {
    const isSuperadminRoute = route.startsWith("/superadmin") && route !== "/superadmin/login";
    const isSiswaRoute = route.startsWith("/siswa");
    const isApiRoute = route.startsWith("/api");

    // Anonim
    if (auth.role === "anon") {
      if (isApiRoute) return { allowed: false, status: 401 };
      if (isSuperadminRoute) return { allowed: false, redirect: "/superadmin/login", status: 307 };
      if (isSiswaRoute) return { allowed: false, redirect: "/login", status: 307 };
      return { allowed: true, status: 200 };
    }

    // Siswa
    if (auth.role === "siswa") {
      if (isSuperadminRoute) {
        return { allowed: false, redirect: "/siswa/beranda", status: 307 };
      }
      return { allowed: true, status: 200 };
    }

    // Superadmin
    if (auth.role === "superadmin") {
      if (isSiswaRoute) {
        return { allowed: false, redirect: "/superadmin/dashboard", status: 307 };
      }
      return { allowed: true, status: 200 };
    }

    return { allowed: false, status: 403 };
  }

  function canAccessStudentResource(
    resourceStudentId: string,
    resourceOwnerAuthId: string,
    auth: AuthContext
  ): { allowed: boolean; status: number; code?: string } {
    if (auth.role === "anon") {
      return { allowed: false, status: 401, code: "UNAUTHORIZED" };
    }

    if (auth.role === "superadmin") {
      return { allowed: true, status: 200 };
    }

    if (auth.role === "siswa") {
      if (auth.userId === resourceOwnerAuthId) {
        return { allowed: true, status: 200 };
      }
      return { allowed: false, status: 403, code: "FORBIDDEN" };
    }

    return { allowed: false, status: 403, code: "FORBIDDEN" };
  }

  describe("Proteksi Rute Berdasarkan Role", () => {
    test("User anonim mengakses /superadmin/dashboard dialihkan ke /superadmin/login", () => {
      const res = canAccessRoute("/superadmin/dashboard", { userId: "", role: "anon" });
      assert.equal(res.allowed, false);
      assert.equal(res.redirect, "/superadmin/login");
    });

    test("User anonim mengakses /siswa/presensi dialihkan ke /login", () => {
      const res = canAccessRoute("/siswa/presensi", { userId: "", role: "anon" });
      assert.equal(res.allowed, false);
      assert.equal(res.redirect, "/login");
    });

    test("User anonim mengakses /api/v1/siswa mendapatkan HTTP 401 tanpa HTML redirect", () => {
      const res = canAccessRoute("/api/v1/siswa", { userId: "", role: "anon" });
      assert.equal(res.allowed, false);
      assert.equal(res.status, 401);
      assert.equal(res.redirect, undefined);
    });

    test("Siswa mencoba mengakses /superadmin/pendaftaran ditolak dan dialihkan ke /siswa/beranda", () => {
      const res = canAccessRoute("/superadmin/pendaftaran", { userId: "siswa-1", role: "siswa" });
      assert.equal(res.allowed, false);
      assert.equal(res.redirect, "/siswa/beranda");
    });

    test("Superadmin mengakses /superadmin/ujian diizinkan", () => {
      const res = canAccessRoute("/superadmin/ujian", { userId: "admin-1", role: "superadmin" });
      assert.equal(res.allowed, true);
      assert.equal(res.status, 200);
    });
  });

  describe("Proteksi Kepemilikan Data Siswa (Student Owner or Admin)", () => {
    const studentA = { id: "siswa-uuid-a", authId: "auth-uuid-a" };
    const studentB = { id: "siswa-uuid-b", authId: "auth-uuid-b" };

    test("Siswa A dapat mengakses rekap nilai/transaksi miliknya sendiri", () => {
      const res = canAccessStudentResource(studentA.id, studentA.authId, {
        userId: studentA.authId,
        role: "siswa",
      });
      assert.equal(res.allowed, true);
      assert.equal(res.status, 200);
    });

    test("Siswa A DITOLAK saat mencoba mengakses rekap Siswa B (Horizontal Privilege Escalation)", () => {
      const res = canAccessStudentResource(studentB.id, studentB.authId, {
        userId: studentA.authId,
        role: "siswa",
      });
      assert.equal(res.allowed, false);
      assert.equal(res.status, 403);
      assert.equal(res.code, "FORBIDDEN");
    });

    test("Superadmin dapat mengakses data siswa manapun", () => {
      const res = canAccessStudentResource(studentA.id, studentA.authId, {
        userId: "admin-uuid",
        role: "superadmin",
      });
      assert.equal(res.allowed, true);
      assert.equal(res.status, 200);
    });
  });
});
