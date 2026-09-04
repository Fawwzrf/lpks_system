"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Eye, EyeOff, Loader2 } from "lucide-react";
import { handleEnterToNextField } from "@/lib/form-utils";

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const form = e.currentTarget;
    const identifier = (form.elements.namedItem("identifier") as HTMLInputElement).value;
    const password = (form.elements.namedItem("password") as HTMLInputElement).value;

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Email atau kata sandi salah.");
        return;
      }
      if (data.data?.user?.role !== "superadmin") {
        setError("Akun ini bukan akun admin. Gunakan halaman login siswa.");
        return;
      }
      router.push("/superadmin/dashboard");
    } catch {
      setError("Tidak dapat terhubung ke server. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="h-14 w-14 rounded-2xl bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center mb-4">
          <ShieldCheck className="h-7 w-7 text-[#DC2626]" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-[#F9FAFB] tracking-tight">Panel Admin</h1>
        <p className="text-xs text-[#6B7280] mt-1">LPKS Sumbu Hidup — Superadmin Access</p>
      </div>

      {/* Card */}
      <div className="rounded-2xl border border-[#1F2937] bg-[#111827] p-6">
        <form
          onSubmit={handleSubmit}
          data-form-container
          onKeyDown={handleEnterToNextField}
          className="flex flex-col gap-4"
          noValidate
        >
          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="identifier" className="text-xs font-medium text-[#9CA3AF]">
              Email Admin
            </label>
            <input
              id="identifier"
              name="identifier"
              type="email"
              autoComplete="email"
              required
              placeholder="admin@lpks.id"
              data-next="password"
              className="h-9 w-full rounded-lg border border-[#374151] bg-[#0B0F17] px-3 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#DC2626] transition-colors"
            />
          </div>

          {/* Password */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-xs font-medium text-[#9CA3AF]">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                data-next="submit"
                className="h-9 w-full rounded-lg border border-[#374151] bg-[#0B0F17] px-3 pr-9 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#DC2626] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#D1D5DB] transition-colors"
                aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-xs text-[#F43F5E] bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}

          {/* Submit */}
          <button
            id="submit"
            type="submit"
            disabled={loading}
            className="mt-1 h-9 w-full rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Masuk...</>
            ) : (
              "Masuk sebagai Admin"
            )}
          </button>
        </form>
      </div>

      <p className="text-center text-[11px] text-[#4B5563] mt-5">
        LPKS Sumbu Hidup &copy; {new Date().getFullYear()}
      </p>
    </div>
  );
}
