"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, CheckCircle2, Eye, EyeOff, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleEnterToNextField } from "@/lib/form-utils";

export default function AkunPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isFirstLogin = searchParams.get("first_login") === "true";

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordBaru, setPasswordBaru] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<{ username?: string; nama?: string } | null>(null);

  React.useEffect(() => {
    async function loadMe() {
      try {
        const res = await fetch("/api/v1/auth/me");
        if (res.ok) {
          const json = await res.json();
          const u = json.data?.user;
          setProfile({
            username: u?.siswa?.username || u?.username,
            nama: u?.siswa?.nama_lengkap || u?.nama,
          });
        }
      } catch (err) {
        console.error("Gagal memuat info profil akun:", err);
      }
    }
    loadMe();
  }, []);

  const match = passwordBaru === konfirmasi;
  const minLength = passwordBaru.length >= 6;
  const canSubmit = passwordBaru && konfirmasi && match && minLength && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password_baru: passwordBaru }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.message ?? (typeof data.error === "string" ? data.error : "Gagal mengubah kata sandi."));
        return;
      }
      setDone(true);
    } catch {
      setError("Tidak dapat terhubung ke server.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
        <CheckCircle2 className="h-12 w-12 text-[#10B981]" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold text-[#F9FAFB]">Kata Sandi Berhasil Diubah</p>
          <p className="text-xs text-[#9CA3AF] mt-1">
            Gunakan kata sandi baru Anda untuk login berikutnya.
          </p>
        </div>
        <Button onClick={() => router.push("/siswa/beranda")}>
          Ke Beranda
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 max-w-sm mx-auto">
      {/* First login banner */}
      {isFirstLogin && (
        <div className="rounded-xl border border-[#F59E0B]/30 bg-[#F59E0B]/10 p-4 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-[#F59E0B] shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <p className="text-xs font-semibold text-[#F59E0B]">Kata Sandi Default Aktif</p>
            <p className="text-[11px] text-[#9CA3AF] mt-1 leading-relaxed">
              Anda masih menggunakan kata sandi default dari admin. Segera buat kata sandi baru yang hanya Anda ketahui.
            </p>
          </div>
        </div>
      )}

      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Pengaturan Akun</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Ganti kata sandi akun siswa Anda.</p>
      </div>

      {profile && (
        <div className="rounded-xl border border-[#1F2937] bg-[#111827] px-4 py-3 flex items-center justify-between text-xs">
          <div>
            <p className="text-[10px] text-[#6B7280]">Akun Siswa</p>
            <p className="font-semibold text-[#F9FAFB]">{profile.nama || "Siswa"}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-[#6B7280]">Username Login</p>
            <p className="font-mono font-bold text-[#DC2626]">{profile.username || "—"}</p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="h-8 w-8 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center">
            <KeyRound className="h-4 w-4 text-[#DC2626]" aria-hidden="true" />
          </div>
          <p className="text-xs font-semibold text-[#F9FAFB]">Ganti Kata Sandi</p>
        </div>

        <form
          onSubmit={handleSubmit}
          data-form-container
          onKeyDown={handleEnterToNextField}
          className="flex flex-col gap-4"
          noValidate
        >
          {/* Password Baru */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password-baru" className="text-xs font-medium text-[#9CA3AF]">
              Kata Sandi Baru
            </label>
            <div className="relative">
              <input
                id="password-baru"
                type={showNew ? "text" : "password"}
                value={passwordBaru}
                onChange={(e) => setPasswordBaru(e.target.value)}
                placeholder="Minimal 6 karakter"
                autoComplete="new-password"
                data-next="konfirmasi"
                className={`h-9 w-full rounded-lg border bg-[#0B0F17] px-3 pr-9 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none transition-colors ${
                  passwordBaru && !minLength ? "border-[#F43F5E] focus:border-[#F43F5E]" : "border-[#374151] focus:border-[#DC2626]"
                }`}
              />
              <button type="button" onClick={() => setShowNew((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#D1D5DB] transition-colors"
                aria-label={showNew ? "Sembunyikan" : "Tampilkan"}
              >
                {showNew ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {passwordBaru && !minLength && (
              <span className="text-[11px] text-[#F43F5E]">Minimal 6 karakter</span>
            )}
          </div>

          {/* Konfirmasi */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="konfirmasi" className="text-xs font-medium text-[#9CA3AF]">
              Konfirmasi Kata Sandi
            </label>
            <div className="relative">
              <input
                id="konfirmasi"
                type={showConfirm ? "text" : "password"}
                value={konfirmasi}
                onChange={(e) => setKonfirmasi(e.target.value)}
                placeholder="Ulangi kata sandi baru"
                autoComplete="new-password"
                data-next="submit"
                className={`h-9 w-full rounded-lg border bg-[#0B0F17] px-3 pr-9 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none transition-colors ${
                  konfirmasi && !match ? "border-[#F43F5E] focus:border-[#F43F5E]" : "border-[#374151] focus:border-[#DC2626]"
                }`}
              />
              <button type="button" onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#D1D5DB] transition-colors"
                aria-label={showConfirm ? "Sembunyikan" : "Tampilkan"}
              >
                {showConfirm ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
            {konfirmasi && !match && (
              <span className="text-[11px] text-[#F43F5E]">Kata sandi tidak cocok</span>
            )}
          </div>

          {error && (
            <p className="text-xs text-[#F43F5E] bg-[#F43F5E]/10 border border-[#F43F5E]/20 rounded-lg px-3 py-2" role="alert">
              {error}
            </p>
          )}

          <Button id="submit" type="submit" disabled={!canSubmit} className="mt-1">
            {loading ? "Menyimpan..." : "Simpan Kata Sandi Baru"}
          </Button>
        </form>
      </div>
    </div>
  );
}
