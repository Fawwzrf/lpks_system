"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MapPin, ClipboardList, BarChart2, Wallet, Flame, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/siswa/beranda",    icon: Home,          label: "Beranda" },
  { href: "/siswa/presensi",   icon: MapPin,         label: "Presensi" },
  { href: "/siswa/nilai",      icon: ClipboardList,  label: "Nilai" },
  { href: "/siswa/transkrip",  icon: BarChart2,      label: "Transkrip" },
  { href: "/siswa/keuangan",   icon: Wallet,         label: "Keuangan" },
] as const;

export default function SiswaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col min-h-screen bg-[#0B0F17]">
      {/* Top Header */}
      <header className="bg-[#111827] border-b border-[#1F2937] px-4 py-3 flex items-center gap-3 shrink-0 sticky top-0 z-10">
        <div className="h-7 w-7 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center">
          <Flame className="h-3.5 w-3.5 text-[#DC2626]" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-bold text-[#F9FAFB] block truncate leading-tight">LPKS Sumbu Hidup</span>
          <span className="text-[10px] text-[#6B7280] block truncate leading-tight">Portal Siswa</span>
        </div>
        {/* Gear icon — menuju pengaturan akun */}
        <Link
          href="/siswa/akun"
          aria-label="Pengaturan Akun"
          className={cn(
            "h-8 w-8 rounded-xl flex items-center justify-center border transition-colors shrink-0",
            pathname.startsWith("/siswa/akun")
              ? "border-[#DC2626]/40 bg-[#DC2626]/15 text-[#DC2626]"
              : "border-[#1F2937] bg-[#0B0F17] text-[#6B7280] hover:text-[#D1D5DB] hover:border-[#374151]"
          )}
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
        </Link>
      </header>

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
