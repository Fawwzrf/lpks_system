import Link from "next/link";
import { Flame, MapPin, TrendingUp, Award, ArrowRight, Bot, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F9FAFB] flex flex-col font-sans">
      {/* Navbar */}
      <header className="border-b border-[#1F2937] bg-[#111827]/70 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#DC2626]/20 border border-[#DC2626]/40 flex items-center justify-center text-[#DC2626]">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-[#F9FAFB]">LPKS SUMBU HIDUP</span>
            <span className="block text-[10px] text-[#9CA3AF]">Sistem Pelatihan Pengelasan Terpadu</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/superadmin/login">
            <Button size="sm" variant="spark">
              <Monitor className="h-3.5 w-3.5 mr-1.5" />
              Portal Superadmin
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center max-w-4xl mx-auto space-y-6">
        <Badge variant="spark" className="text-xs px-3 py-1">
          Aplikasi Manajemen LPKS Sumbu Hidup
        </Badge>

        <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#F9FAFB] leading-tight">
          Sistem Manajemen Pelatihan Pengelasan{" "}
          <span className="text-[#DC2626]">Sumbu Hidup</span>
        </h1>

        <p className="text-sm sm:text-base text-[#9CA3AF] max-w-2xl leading-relaxed">
          Platform berbasis web Next.js 15 &amp; Supabase untuk otomasi operasional LPKS: pendaftaran berkas fisik,
          presensi GPS geofencing radius 100m, penilaian praktek 5 kriteria pengelasan, kalkulasi keuangan cicil/lunas,
          dan penerbitan sertifikat resmi ber-gate check.
        </p>

        {/* Action Button */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <Link href="/login">
            <Button size="lg" variant="spark" className="font-bold shadow-xl shadow-[#DC2626]/20">
              Masuk sebagai Siswa
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>

        </div>

        {/* Feature Grid Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-12 text-left w-full">
          <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] space-y-2">
            <MapPin className="h-5 w-5 text-[#DC2626]" />
            <h3 className="font-bold text-sm text-[#F9FAFB]">Presensi Geofencing</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Validasi jarak koordinat GPS bengkel (radius 100m) dengan perlindungan rate limit 3 percobaan/hari.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] space-y-2">
            <TrendingUp className="h-5 w-5 text-[#10B981]" />
            <h3 className="font-bold text-sm text-[#F9FAFB]">Grafik Tren Nilai</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Visualisasi tren Recharts multi-kriteria (Root, Hotpass, Filler, Capping, Gerinda) dengan garis ambang 80.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] space-y-2">
            <Award className="h-5 w-5 text-[#F59E0B]" />
            <h3 className="font-bold text-sm text-[#F9FAFB]">Gate-Check Sertifikat</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Pencetakan PDF resmi otomatis terkunci oleh server sampai syarat keuangan lunas dan ujian $\ge 80$ terpenuhi.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] space-y-2">
            <Bot className="h-5 w-5 text-[#38BDF8]" />
            <h3 className="font-bold text-sm text-[#F9FAFB]">AI RAG Showcase</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Asisten analitik berbasis Google Gemini Flash untuk pertanyaan data operasional bahasa alami.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#1F2937] py-6 px-4 text-center text-xs text-[#6B7280]">
        LPKS Pengelasan Sumbu Hidup &copy; {new Date().getFullYear()} &mdash; Arsitektur Monolitik Modal Rp 0 (Vercel &amp; Supabase Free Tier)
      </footer>
    </div>
  );
}
