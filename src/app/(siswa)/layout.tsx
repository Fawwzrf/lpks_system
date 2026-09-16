"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, ClipboardList, BarChart2, Wallet, Flame, Settings, LogOut, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

const NAV_ITEMS = [
  { href: "/siswa/beranda",    icon: Home,          label: "Beranda" },
  { href: "/siswa/presensi",   icon: MapPin,         label: "Presensi" },
  { href: "/siswa/nilai",      icon: ClipboardList,  label: "Nilai" },
  { href: "/siswa/transkrip",  icon: BarChart2,      label: "Transkrip" },
  { href: "/siswa/keuangan",   icon: Wallet,         label: "Keuangan" },
] as const;

export default function SiswaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [userProfile, setUserProfile] = React.useState<{
    nama: string;
    nomor_induk?: string;
    is_password_default?: boolean;
  } | null>(null);
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);
  const [dismissBanner, setDismissBanner] = React.useState(false);

  React.useEffect(() => {
    try {
      if (sessionStorage.getItem("hide_pwd_warning") === "true") {
        setDismissBanner(true);
      }
    } catch {}
  }, []);

  React.useEffect(() => {
    async function getProfile() {
      try {
        const res = await fetch("/api/v1/auth/me");
        if (res.ok) {
          const json = await res.json();
          const u = json.data?.user;
          setUserProfile({
            nama: u?.nama || "Siswa",
            nomor_induk: u?.siswa?.nomor_induk || undefined,
            is_password_default: u?.siswa?.is_password_default ?? false,
          });
        }
      } catch (e) {
        console.error("Gagal memuat profil:", e);
      }
    }
    getProfile();
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Gagal logout:", e);
    } finally {
      window.location.href = "/login";
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F17]">
      {/* Default Password Warning Banner */}
      {userProfile?.is_password_default && !dismissBanner && !pathname.startsWith("/siswa/akun") && (
        <div className="bg-[#F59E0B]/15 border-b border-[#F59E0B]/30 px-4 py-2 flex items-center justify-between gap-2 text-xs">
          <span className="text-[#F59E0B] text-[11px] flex-1 min-w-0">
            ⚠️ Anda masih menggunakan kata sandi default. Segera ganti kata sandi demi keamanan akun.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              href="/siswa/akun"
              className="text-[11px] font-semibold text-[#F59E0B] underline hover:text-white transition-colors"
            >
              Ganti Sekarang
            </Link>
            <button
              type="button"
              onClick={() => {
                setDismissBanner(true);
                try {
                  sessionStorage.setItem("hide_pwd_warning", "true");
                } catch {}
              }}
              aria-label="Tutup peringatan"
              title="Tutup peringatan"
              className="h-5 w-5 rounded-md flex items-center justify-center text-[#F59E0B]/80 hover:text-white hover:bg-[#F59E0B]/30 transition-colors"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Top Header */}
      <header className="bg-[#111827] border-b border-[#1F2937] px-4 py-3 flex items-center gap-3 shrink-0 sticky top-0 z-10">
        <div className="h-7 w-7 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center">
          <Flame className="h-3.5 w-3.5 text-[#DC2626]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-[#F9FAFB] block truncate leading-tight">
            {userProfile?.nama ? userProfile.nama : "LPKS Sumbu Hidup"}
          </span>
          <span className="text-[10px] text-[#6B7280] block truncate leading-tight">
            {userProfile?.nomor_induk ? `No. Induk: ${userProfile.nomor_induk}` : "Portal Siswa"}
          </span>
        </div>
        
        {/* Action buttons: Pengaturan Akun & Logout */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/siswa/akun"
            aria-label="Pengaturan Akun"
            title="Pengaturan Akun"
            className={cn(
              "h-8 w-8 rounded-xl flex items-center justify-center border transition-colors",
              pathname.startsWith("/siswa/akun")
                ? "border-[#DC2626]/40 bg-[#DC2626]/15 text-[#DC2626]"
                : "border-[#1F2937] bg-[#0B0F17] text-[#6B7280] hover:text-[#D1D5DB] hover:border-[#374151]"
            )}
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => setShowLogoutModal(true)}
            aria-label="Keluar dari akun siswa"
            title="Keluar"
            className="h-8 w-8 rounded-xl flex items-center justify-center border border-[#1F2937] bg-[#0B0F17] text-[#6B7280] hover:text-[#F43F5E] hover:border-[#F43F5E]/40 hover:bg-[#F43F5E]/10 transition-colors"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      {/* Modal Konfirmasi Logout */}
      <Modal
        open={showLogoutModal}
        onClose={() => !loggingOut && setShowLogoutModal(false)}
        title="Keluar dari Portal Siswa"
        description="Apakah Anda yakin ingin keluar dari sesi akun siswa ini?"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-[#DC2626]/10 border border-[#DC2626]/20">
            <div className="h-8 w-8 rounded-lg bg-[#DC2626]/20 flex items-center justify-center shrink-0">
              <LogOut className="h-4 w-4 text-[#DC2626]" />
            </div>
            <div className="text-xs">
              <p className="font-semibold text-[#F9FAFB]">{userProfile?.nama || "Siswa"}</p>
              <p className="text-[#9CA3AF] text-[11px]">
                {userProfile?.nomor_induk ? `No. Induk: ${userProfile.nomor_induk}` : "Portal Siswa LPKS"}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={loggingOut}
              onClick={() => setShowLogoutModal(false)}
            >
              Batal
            </Button>
            <Button
              variant="danger"
              size="sm"
              disabled={loggingOut}
              onClick={handleLogout}
            >
              {loggingOut ? "Mengeluarkan..." : "Ya, Keluar"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Page Content */}
      <main className="flex-1 overflow-y-auto pb-20 px-4 pt-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav
        className="fixed bottom-0 inset-x-0 bg-[#111827] border-t border-[#1F2937] z-20 safe-area-inset-bottom"
        aria-label="Navigasi utama"
      >
        <div className="flex items-center justify-around px-2 py-1">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all duration-150 min-w-0",
                  active ? "text-[#DC2626]" : "text-[#6B7280] hover:text-[#9CA3AF]"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className="h-5 w-5 shrink-0" aria-hidden="true" />
                <span className={cn("text-[10px] leading-none font-medium truncate", active && "font-bold")}>
                  {label}
                </span>
                {active && (
                  <span className="h-1 w-1 rounded-full bg-[#DC2626]" aria-hidden="true" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
