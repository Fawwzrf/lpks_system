import React from "react";
import {
  Users, UserCheck, Wallet, Sparkles,
  UserPlus, MapPin, ClipboardList, Award,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import Link from "next/link";

const STATS = [
  {
    title: "Siswa Aktif",
    value: "—",
    subtitle: "Terdaftar & aktif pelatihan",
    icon: <Users className="h-4 w-4" />,
    accentColor: "spark" as const,
  },
  {
    title: "Hadir Hari Ini",
    value: "—",
    subtitle: "Dari siswa aktif",
    icon: <UserCheck className="h-4 w-4" />,
    accentColor: "success" as const,
  },
  {
    title: "Total Pemasukan",
    value: "—",
    subtitle: "Bulan ini",
    icon: <Wallet className="h-4 w-4" />,
    accentColor: "warning" as const,
  },
  {
    title: "Layak Ujian",
    value: "—",
    subtitle: "Semua kriteria ≥ 80",
    icon: <Award className="h-4 w-4" />,
    accentColor: "info" as const,
  },
];

const QUICK_ACCESS = [
  { href: "/superadmin/pendaftaran", icon: UserPlus,      label: "Pendaftaran Baru", desc: "Input biodata & berkas siswa" },
  { href: "/superadmin/presensi",    icon: MapPin,         label: "Log Presensi",     desc: "Pantau kehadiran hari ini" },
  { href: "/superadmin/penilaian",   icon: ClipboardList,  label: "Input Nilai",      desc: "Masukkan atau koreksi nilai" },
  { href: "/superadmin/ujian",       icon: Award,          label: "Gate Sertifikat",  desc: "Cek kelayakan & cetak PDF" },
];

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Page title */}
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Dashboard</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Selamat datang — ringkasan kondisi kelas hari ini.</p>
      </div>

      {/* Stats grid */}
      <section aria-label="Statistik utama">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <StatCard key={s.title} {...s} />
          ))}
        </div>
      </section>

      {/* AI Quick Insight */}
      <section aria-label="AI Quick Insight">
        <div className="rounded-xl border border-[#DC2626]/25 bg-[#DC2626]/8 p-4 flex gap-3 items-start">
          <div className="h-8 w-8 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center shrink-0">
            <Sparkles className="h-4 w-4 text-[#DC2626]" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#F9FAFB] mb-1">AI Quick Insight</p>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Ringkasan performa kelas akan muncul di sini setelah data penilaian masuk.
              Kunjungi <Link href="/superadmin/ai" className="text-[#DC2626] hover:underline font-medium">AI Showcase</Link> untuk analitik mendalam.
            </p>
          </div>
        </div>
      </section>

      {/* Quick Access */}
      <section aria-label="Akses cepat modul">
        <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3">Akses Cepat</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACCESS.map(({ href, icon: Icon, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="rounded-xl border border-[#1F2937] bg-[#111827] hover:border-[#DC2626]/40 hover:bg-[#1F2937] p-4 flex flex-col gap-2 transition-all duration-150 group"
            >
              <div className="h-8 w-8 rounded-lg bg-[#1F2937] group-hover:bg-[#DC2626]/15 border border-[#374151] group-hover:border-[#DC2626]/30 flex items-center justify-center transition-all">
                <Icon className="h-4 w-4 text-[#9CA3AF] group-hover:text-[#DC2626] transition-colors" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#D1D5DB] group-hover:text-[#F9FAFB] leading-tight transition-colors">{label}</p>
                <p className="text-[11px] text-[#6B7280] mt-0.5 leading-tight">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
