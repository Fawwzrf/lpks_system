"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Flame, Eye, EyeOff, Loader2, HelpCircle } from "lucide-react";
import { handleEnterToNextField } from "@/lib/form-utils";
import { Modal } from "@/components/ui/modal";

export default function SiswaLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

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
        setError(data.error?.message ?? (typeof data.error === "string" ? data.error : "Username atau kata sandi salah."));
        return;
      }
      if (data.data?.user?.role !== "siswa") {
        setError("Akun ini bukan akun siswa. Gunakan halaman login admin.");
        return;
      }

      // Jika masih password default, arahkan ke halaman ganti sandi dulu
      if (data.data?.user?.is_password_default) {
        router.push("/siswa/akun?first_login=true");
      } else {
        router.push("/siswa/beranda");
      }
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
          <Flame className="h-7 w-7 text-[#DC2626]" aria-hidden="true" />
        </div>
        <h1 className="text-xl font-bold text-[#F9FAFB] tracking-tight">LPKS Sumbu Hidup</h1>
        <p className="text-xs text-[#6B7280] mt-1">Portal Siswa — Sistem Manajemen Pelatihan</p>
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
          {/* Username */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="identifier" className="text-xs font-medium text-[#9CA3AF]">
              Username
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              required
              placeholder="budi42"
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
              "Masuk"
            )}
          </button>
        </form>

        {/* Forgot password link */}
        <button
          type="button"
          onClick={() => setForgotOpen(true)}
          className="mt-4 flex items-center gap-1.5 text-[11px] text-[#6B7280] hover:text-[#9CA3AF] transition-colors mx-auto"
        >
          <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
          Lupa kata sandi?
        </button>
      </div>

      <p className="text-center text-[11px] text-[#4B5563] mt-5">
        LPKS Sumbu Hidup &copy; {new Date().getFullYear()}
      </p>

      {/* Forgot Password Modal */}
      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title="Lupa Kata Sandi?"
        size="sm"
      >
        <div className="flex flex-col gap-3 text-center">
          <div className="h-12 w-12 rounded-2xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center mx-auto">
            <HelpCircle className="h-6 w-6 text-[#F59E0B]" aria-hidden="true" />
          </div>
          <p className="text-xs text-[#D1D5DB] leading-relaxed">
            Untuk mengatur ulang kata sandi atau mengetahui username Anda, silakan{" "}
            <strong className="text-[#F9FAFB]">hubungi admin LPKS Sumbu Hidup</strong>{" "}
            secara langsung.
          </p>
          <p className="text-[11px] text-[#6B7280]">
            Admin dapat mengatur ulang kata sandi Anda dari sistem.
          </p>
          <button
            onClick={() => setForgotOpen(false)}
            className="h-9 w-full rounded-lg bg-[#1F2937] hover:bg-[#374151] text-xs font-medium text-[#F9FAFB] transition-colors"
          >
            Mengerti
          </button>
        </div>
      </Modal>
    </div>
  );
}
