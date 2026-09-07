"use client";

import React, { useState } from "react";
import {
  Flame,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Award,
  Users,
  FileSpreadsheet,
  Download,
  Upload,
  Bot,
  Sparkles,
  ShieldCheck,
  Lock,
  Unlock,
  Printer,
  Navigation,
  Eye,
  EyeOff,
  Copy,
  Check,
  Crosshair,
  CornerDownLeft,
} from "lucide-react";
import { handleEnterToNextField } from "@/lib/form-utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Legend,
} from "recharts";

type ActiveTab =
  | "siswa_beranda"
  | "siswa_presensi"
  | "siswa_input_nilai"
  | "siswa_grafik"
  | "admin_pendaftaran"
  | "admin_penilaian"
  | "admin_ujian"
  | "ai_showcase";

export default function MockupPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("siswa_presensi");

  // State Layar Presensi (Live GPS Geofence Simulator)
  const [gpsDistance, setGpsDistance] = useState<number>(35); // default 35 meter (dalam radius)
  const [hasCheckedIn, setHasCheckedIn] = useState<boolean>(false);

  // State Grafik Tren (Interactive Focus / Opacity Filter)
  const [focusedCriteria, setFocusedCriteria] = useState<string>("all");

  // State Input Nilai Mandiri
  const [checkedCriteria, setCheckedCriteria] = useState<{ [key: string]: boolean }>({
    root: true,
    hotpass: true,
    filler: false,
    capping: false,
    gerinda: false,
  });
  const [scores, setScores] = useState<{ [key: string]: number | string }>({
    root: 84,
    hotpass: 78,
    filler: 75,
    capping: 72,
    gerinda: 88,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // State Admin Pendaftaran 2-Step
  const [selectedProgram, setSelectedProgram] = useState<string>("01");
  const [namaSiswa, setNamaSiswa] = useState<string>("Budi Santoso");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [copiedCreds, setCopiedCreds] = useState<boolean>(false);
  const [registeredSuccess, setRegisteredSuccess] = useState<{
    nama: string;
    nomorInduk: string;
    username: string;
    passwordDefault: string;
    programName: string;
  } | null>(null);
  const [registeredAccounts, setRegisteredAccounts] = useState<string[]>([
    "ahmad@0001",
    "joko@0002",
    "rizky@0003",
    "hendra@0004",
  ]);
  const [registerError, setRegisterError] = useState<string | null>(null);

  const programMap: { [key: string]: string } = {
    "01": "SMAW 6G Pipa Industri",
    "02": "GTAW / TIG 6G",
    "03": "GMAW / MIG 3G",
  };

  const [checklists, setChecklists] = useState<{ [key: string]: boolean }>({
    ijazah: true,
    ktp: true,
    kk: true,
    foto: true,
    suket_sehat: true,
  });

  // State Layar Ujian & Gate-Check
  const [gateCondition, setGateCondition] = useState<"locked" | "unlocked">("unlocked");

  const allChecklistsPassed = Object.values(checklists).every(Boolean);

  // Data time-series grafik Recharts
  const chartData = [
    { tanggal: "20 Ags", root: 65, hotpass: 70, filler: null, capping: null, gerinda: 80 },
    { tanggal: "22 Ags", root: 72, hotpass: 74, filler: 68, capping: 60, gerinda: 82 },
    { tanggal: "25 Ags", root: 78, hotpass: 76, filler: 72, capping: 65, gerinda: 85 },
    { tanggal: "28 Ags", root: 82, hotpass: 80, filler: 75, capping: 72, gerinda: 88 },
    { tanggal: "01 Sep", root: 85, hotpass: 82, filler: 80, capping: 78, gerinda: 90 },
    { tanggal: "03 Sep", root: 88, hotpass: 85, filler: 84, capping: 82, gerinda: 92 },
  ];

  // Helper opacity untuk filter grafik
  const getLineOpacity = (key: string) => {
    if (focusedCriteria === "all" || focusedCriteria === key) return 1;
    return 0.15;
  };

  const getLineWidth = (key: string) => {
    if (focusedCriteria === key) return 3.5;
    return 2;
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F9FAFB] flex flex-col font-sans">
      {/* Top Header & Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#111827]/95 backdrop-blur-md border-b border-[#1F2937] px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-[#DC2626]/20 border border-[#DC2626]/40 flex items-center justify-center text-[#DC2626]">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm tracking-tight text-[#F9FAFB]">LPKS SUMBU HIDUP</span>
              <Badge variant="spark" className="text-[10px]">MOCKUP VISUAL TAHAP 3</Badge>
            </div>
            <p className="text-[11px] text-[#9CA3AF]">
              Sistem Manajemen Pelatihan Pengelasan — Verifikasi Antarmuka
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <nav className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 lg:pb-0 scrollbar-none">
          <div className="flex items-center gap-1 bg-[#0B0F17] p-1 rounded-lg border border-[#1F2937]">
            <span className="text-[10px] uppercase font-bold text-[#9CA3AF] px-2">Portal Siswa:</span>
            <Button
              size="sm"
              variant={activeTab === "siswa_beranda" ? "spark" : "ghost"}
              onClick={() => setActiveTab("siswa_beranda")}
              className="h-7 text-xs px-2.5"
            >
              Beranda
            </Button>
            <Button
              size="sm"
              variant={activeTab === "siswa_presensi" ? "spark" : "ghost"}
              onClick={() => setActiveTab("siswa_presensi")}
              className="h-7 text-xs px-2.5"
            >
              <MapPin className="h-3 w-3 mr-1 text-[#DC2626]" />
              Presensi GPS
            </Button>
            <Button
              size="sm"
              variant={activeTab === "siswa_input_nilai" ? "spark" : "ghost"}
              onClick={() => setActiveTab("siswa_input_nilai")}
              className="h-7 text-xs px-2.5"
            >
              Input Nilai
            </Button>
            <Button
              size="sm"
              variant={activeTab === "siswa_grafik" ? "spark" : "ghost"}
              onClick={() => setActiveTab("siswa_grafik")}
              className="h-7 text-xs px-2.5"
            >
              <TrendingUp className="h-3 w-3 mr-1 text-[#10B981]" />
              Grafik Tren
            </Button>
          </div>

          <div className="flex items-center gap-1 bg-[#0B0F17] p-1 rounded-lg border border-[#1F2937]">
            <span className="text-[10px] uppercase font-bold text-[#9CA3AF] px-2">Superadmin:</span>
            <Button
              size="sm"
              variant={activeTab === "admin_pendaftaran" ? "spark" : "ghost"}
              onClick={() => setActiveTab("admin_pendaftaran")}
              className="h-7 text-xs px-2.5"
            >
              <Users className="h-3 w-3 mr-1" />
              Pendaftaran
            </Button>
            <Button
              size="sm"
              variant={activeTab === "admin_penilaian" ? "spark" : "ghost"}
              onClick={() => setActiveTab("admin_penilaian")}
              className="h-7 text-xs px-2.5"
            >
              <FileSpreadsheet className="h-3 w-3 mr-1 text-[#10B981]" />
              Penilaian &amp; Excel
            </Button>
            <Button
              size="sm"
              variant={activeTab === "admin_ujian" ? "spark" : "ghost"}
              onClick={() => setActiveTab("admin_ujian")}
              className="h-7 text-xs px-2.5"
            >
              <Award className="h-3 w-3 mr-1 text-[#F59E0B]" />
              Gate-Check
            </Button>
            <Button
              size="sm"
              variant={activeTab === "ai_showcase" ? "spark" : "ghost"}
              onClick={() => setActiveTab("ai_showcase")}
              className="h-7 text-xs px-2.5"
            >
              <Bot className="h-3 w-3 mr-1 text-[#38BDF8]" />
              AI Showcase
            </Button>
          </div>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">

        {/* =========================================================================
            PORTAL SISWA — BERANDA (DASHBOARD SISWA)
            ========================================================================= */}
        {activeTab === "siswa_beranda" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
              <h2 className="text-base font-bold text-[#F9FAFB]">
                Portal Siswa — Beranda &amp; Evaluasi Mingguan AI
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Halaman beranda terpisah dari halaman presensi GPS. Berisi ringkasan personal, status kelayakan ujian, dan narasi perkembangan AI.
              </p>
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-sm rounded-[36px] border-[6px] border-[#1F2937] bg-[#0B0F17] overflow-hidden shadow-2xl p-5 space-y-4">
                {/* Mobile Top Bar */}
                <div className="flex justify-between items-center text-xs text-[#9CA3AF] pb-1 border-b border-[#1F2937]">
                  <span className="font-semibold text-[#F9FAFB]">07:45</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px]">LPKS NET</span>
                    <span className="text-[10px]">98%</span>
                  </div>
                </div>

                {/* Profile Banner */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-xs text-[#9CA3AF]">Selamat pagi,</span>
                    <h3 className="text-base font-bold text-[#F9FAFB]">Fajar Pratama</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary">01.0004</Badge>
                      <Badge variant="spark">SMAW 6G</Badge>
                    </div>
                  </div>
                  <div className="h-11 w-11 rounded-full bg-[#1F2937] border border-[#374151] flex items-center justify-center font-bold text-sm text-[#DC2626]">
                    FP
                  </div>
                </div>

                {/* Status Ringkasan Cepat */}
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="p-3 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <span className="text-[11px] text-[#9CA3AF] block">Kehadiran Bulan Ini</span>
                    <span className="text-lg font-bold text-[#F9FAFB] block mt-0.5">24 Hari</span>
                    <div className="flex items-center gap-1 text-[10px] text-[#10B981] mt-1">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Presensi 100%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#111827] border border-[#1F2937]">
                    <span className="text-[11px] text-[#9CA3AF] block">Status Keuangan</span>
                    <span className="text-lg font-bold text-[#10B981] block mt-0.5">LUNAS</span>
                    <div className="flex items-center gap-1 text-[10px] text-[#9CA3AF] mt-1">
                      <span>Sisa: Rp 0</span>
                    </div>
                  </div>
                </div>

                {/* Ringkasan Kelayakan Ujian */}
                <Card className="border-[#1F2937] bg-[#111827]">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-xs text-[#9CA3AF] flex items-center justify-between">
                      <span>Status Kelayakan Ujian Internal</span>
                      <span className="text-[#10B981] font-bold">4 dari 5 Lulus</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-2">
                    <div className="w-full bg-[#1F2937] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#DC2626] h-full w-[80%]" />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[#F59E0B] mt-2">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                      <span>Tinggal kriteria Capping (78) yang perlu mencapai ≥ 80.</span>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Weekly Insight Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-[#1E293B] to-[#111827] border border-[#374151] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F9FAFB]">
                    <Sparkles className="h-3.5 w-3.5 text-[#DC2626]" />
                    <span>AI Weekly Progress Insight</span>
                  </div>
                  <p className="text-xs text-[#D1D5DB] leading-relaxed">
                    &quot;Penetrasi Root Pass Anda meningkat pesat (+10 poin). Perhatikan sudut kemiringan elektroda 45° saat Capping agar rigi-rigi las lebih seragam dan siap ujian internal.&quot;
                  </p>
                  <span className="text-[10px] text-[#9CA3AF] block">Diperbarui: 03 Sep 2026 via Gemini Flash</span>
                </div>

                {/* Shortcut ke Presensi GPS */}
                <Button
                  className="w-full h-11 text-xs font-bold"
                  variant="outline"
                  onClick={() => setActiveTab("siswa_presensi")}
                >
                  <MapPin className="h-3.5 w-3.5 mr-2 text-[#DC2626]" />
                  Buka Menu Presensi GPS &amp; Peta
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PORTAL SISWA — PRESENSI GPS DENGAN LIVE MAP RADAR (PAGE TERSENDIRI)
            ========================================================================= */}
        {activeTab === "siswa_presensi" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
              <div>
                <h2 className="text-base font-bold text-[#F9FAFB]">
                  Portal Siswa — Halaman Presensi GPS &amp; Live Map Geofencing
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Halaman khusus presensi mandiri siswa dilengkapi peta radar deteksi lokasi real-time vs titik bengkel LPKS.
                </p>
              </div>

              {/* Simulator Jarak GPS */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9CA3AF]">Simulasi Lokasi Siswa:</span>
                <Button
                  size="sm"
                  variant={gpsDistance > 100 ? "danger" : "outline"}
                  onClick={() => {
                    setGpsDistance(145);
                    setHasCheckedIn(false);
                  }}
                  className="text-xs h-8"
                >
                  Luar Radius (145m)
                </Button>
                <Button
                  size="sm"
                  variant={gpsDistance <= 100 && !hasCheckedIn ? "emerald" : "outline"}
                  onClick={() => {
                    setGpsDistance(35);
                    setHasCheckedIn(false);
                  }}
                  className="text-xs h-8"
                >
                  Dalam Radius (35m)
                </Button>
                <Button
                  size="sm"
                  variant={hasCheckedIn ? "spark" : "outline"}
                  onClick={() => setHasCheckedIn(true)}
                  className="text-xs h-8"
                >
                  Sudah Presensi
                </Button>
              </div>
            </div>

            {/* Mobile Phone Mockup Frame */}
            <div className="flex justify-center">
              <div className="w-full max-w-sm rounded-[36px] border-[6px] border-[#1F2937] bg-[#0B0F17] overflow-hidden shadow-2xl p-5 space-y-4">
                {/* Header Presensi */}
                <div className="flex justify-between items-center pb-2 border-b border-[#1F2937]">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-[#DC2626]" />
                    <h3 className="font-bold text-sm text-[#F9FAFB]">Presensi Geofencing</h3>
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    Maks. Radius 100m
                  </Badge>
                </div>

                {/* LIVE MAP RADAR CANVAS (PETA VISUAL LOKASI SISWA) */}
                <div className="relative w-full h-52 rounded-2xl bg-[#0F172A] border border-[#1E293B] overflow-hidden flex items-center justify-center">
                  {/* Grid peta latar belakang */}
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38BDF8_1px,transparent_1px)] [background-size:16px_16px]" />

                  {/* Lingkaran Radius Toleransi 100m LPKS */}
                  <div className="absolute h-36 w-36 rounded-full border-2 border-dashed border-[#10B981]/50 bg-[#10B981]/5 flex items-center justify-center">
                    <span className="text-[9px] text-[#10B981] font-mono mt-16 bg-[#0B0F17]/80 px-1.5 py-0.5 rounded border border-[#10B981]/30">
                      ZONA 100M LPKS
                    </span>
                  </div>

                  {/* Marker Pusat LPKS */}
                  <div className="absolute flex flex-col items-center z-10">
                    <div className="h-7 w-7 rounded-full bg-[#DC2626] text-white flex items-center justify-center shadow-lg shadow-[#DC2626]/50">
                      <Flame className="h-4 w-4" />
                    </div>
                    <span className="text-[9px] font-bold text-[#F9FAFB] bg-[#111827] px-1 rounded border border-[#374151] mt-0.5">
                      Bengkel LPKS
                    </span>
                  </div>

                  {/* Marker Posisi Siswa Real-Time */}
                  <div
                    className={`absolute flex flex-col items-center transition-all duration-700 z-20 ${
                      gpsDistance <= 100 ? "translate-x-8 translate-y-6" : "translate-x-28 -translate-y-16"
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-full flex items-center justify-center text-white shadow-lg animate-bounce ${
                        gpsDistance <= 100 ? "bg-[#10B981] shadow-[#10B981]/50" : "bg-[#F43F5E] shadow-[#F43F5E]/50"
                      }`}
                    >
                      <Crosshair className="h-3.5 w-3.5" />
                    </div>
                    <span className="text-[9px] font-bold text-[#F9FAFB] bg-[#111827] px-1 rounded border border-[#374151] mt-0.5 whitespace-nowrap">
                      Anda ({gpsDistance}m)
                    </span>
                  </div>

                  {/* Garis Jarak antara Siswa dan LPKS */}
                  <div className="absolute bottom-2 left-2 bg-[#0B0F17]/90 px-2 py-1 rounded-lg border border-[#1F2937] text-[10px] text-[#9CA3AF] flex items-center gap-1.5">
                    <Navigation className="h-3 w-3 text-[#38BDF8]" />
                    <span>Jarak: <strong className="text-[#F9FAFB] font-mono">{gpsDistance} meter</strong></span>
                  </div>

                  <div className="absolute top-2 right-2 bg-[#0B0F17]/90 px-2 py-0.5 rounded text-[9px] text-[#10B981] font-mono border border-[#1F2937]">
                    GPS AKTIF (LIVE)
                  </div>
                </div>

                {/* Status Geofence Card */}
                {hasCheckedIn ? (
                  <div className="p-4 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 text-center space-y-1">
                    <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto mb-1" />
                    <span className="font-bold text-sm text-[#10B981]">Kehadiran Tercatat Hari Ini</span>
                    <p className="text-xs text-[#D1D5DB]">Tercatat pada 07:45:12 WIB — Jarak 34 meter</p>
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      Created by Siswa (Mandiri)
                    </Badge>
                  </div>
                ) : (
                  <>
                    {gpsDistance > 100 ? (
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-xs text-[#F43F5E] flex items-start gap-2">
                          <XCircle className="h-4 w-4 shrink-0 mt-0.5 text-[#F43F5E]" />
                          <div>
                            <span className="font-semibold">Di Luar Area Bengkel ({gpsDistance}m)</span>
                            <p className="text-[11px] text-[#FCA5A5] mt-0.5">
                              Tombol presensi terkunci. Anda harus berada dalam radius 100 meter dari bengkel las LPKS.
                            </p>
                          </div>
                        </div>

                        <Button disabled className="w-full h-12 text-sm font-semibold" variant="spark">
                          <Lock className="h-4 w-4 mr-2" />
                          ABSEN SEKARANG (TERKUNCI)
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-xs text-[#10B981] flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#10B981]" />
                          <div>
                            <span className="font-semibold">Dalam Area Bengkel ({gpsDistance}m)</span>
                            <p className="text-[11px] text-[#6EE7B7] mt-0.5">
                              Koordinat GPS valid. Silakan tekan tombol di bawah untuk mencatat kehadiran.
                            </p>
                          </div>
                        </div>

                        <Button
                          className="w-full h-12 text-sm font-bold animate-pulse shadow-lg shadow-[#10B981]/20"
                          variant="emerald"
                          onClick={() => setHasCheckedIn(true)}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          📍 ABSEN SEKARANG (HADIR)
                        </Button>
                      </div>
                    )}
                  </>
                )}

                {/* Log Riwayat Presensi Singkat */}
                <div className="pt-2 border-t border-[#1F2937]">
                  <span className="text-[11px] font-bold text-[#9CA3AF] uppercase block mb-2">
                    Riwayat Presensi Minggu Ini:
                  </span>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { tgl: "03 Sep", jam: "07:45 WIB", jarak: "34m", status: "Hadir" },
                      { tgl: "02 Sep", jam: "07:48 WIB", jarak: "42m", status: "Hadir" },
                      { tgl: "01 Sep", jam: "07:40 WIB", jarak: "28m", status: "Hadir" },
                    ].map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#111827] border border-[#1F2937]"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" />
                          <span className="font-mono text-[11px] text-[#F9FAFB]">{item.tgl}</span>
                          <span className="text-[#9CA3AF] text-[11px]">{item.jam}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#6B7280]">{item.jarak}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PORTAL SISWA — FORM INPUT NILAI MANDIRI
            ========================================================================= */}
        {activeTab === "siswa_input_nilai" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
              <h2 className="text-base font-bold text-[#F9FAFB]">
                Portal Siswa — Form Input Nilai Praktek Mandiri
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Siswa menginput nilai per kriteria yang diberikan instruktur setelah latihan. Kriteria yang tidak dinilai tidak dicentang (tidak bernilai 0).
              </p>
            </div>

            <div className="flex justify-center">
              <div
                data-form-container="true"
                className="w-full max-w-sm rounded-[36px] border-[6px] border-[#1F2937] bg-[#0B0F17] overflow-hidden shadow-2xl p-5 space-y-4"
              >
                <div className="flex items-center justify-between pb-2 border-b border-[#1F2937]">
                  <h3 className="font-bold text-sm text-[#F9FAFB]">Input Nilai Praktek</h3>
                  <Badge variant="secondary">03 Sep 2026</Badge>
                </div>

                {/* Keyboard Navigation Tip */}
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#111827] border border-[#1F2937] text-[10px] text-[#9CA3AF]">
                  <CornerDownLeft className="h-3 w-3 text-[#10B981] shrink-0" />
                  <span>Tekan <strong className="text-[#F9FAFB] font-mono">Enter</strong> pada kolom skor untuk langsung lompat &amp; seleksi kriteria berikutnya.</span>
                </div>

                <div className="space-y-3">
                  <label className="text-xs text-[#9CA3AF] block font-medium">
                    Pilih Kriteria yang Dinilai Instruktur Hari Ini:
                  </label>

                  {[
                    { id: "root", label: "Root Pass (Penetrasi Awal)", min: 80 },
                    { id: "hotpass", label: "Hot Pass (Lapis 2)", min: 80 },
                    { id: "filler", label: "Filler Pass (Pengisian)", min: 80 },
                    { id: "capping", label: "Capping Pass (Penutup)", min: 80 },
                    { id: "gerinda", label: "Gerinda & Bevel Prep", min: 80 },
                  ].map((item) => {
                    const isChecked = checkedCriteria[item.id] || false;
                    const val = scores[item.id] !== undefined ? scores[item.id] : "";
                    const isPassed = Number(val || 0) >= item.min;

                    return (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-colors ${
                          isChecked
                            ? "bg-[#111827] border-[#DC2626]/50"
                            : "bg-[#0B0F17] border-[#1F2937] opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-[#F9FAFB]">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                setCheckedCriteria({
                                  ...checkedCriteria,
                                  [item.id]: e.target.checked,
                                })
                              }
                              className="h-4 w-4 rounded bg-[#1F2937] border-[#374151] text-[#DC2626] focus:ring-[#DC2626]"
                            />
                            <span>{item.label}</span>
                          </label>
                          <span className="text-[10px] text-[#9CA3AF]">Batas: {item.min}</span>
                        </div>

                        {isChecked && (
                          <div className="mt-2.5 flex items-center justify-between gap-3 pt-2 border-t border-[#1F2937]">
                            <span className="text-xs text-[#D1D5DB]">Nilai dari Instruktur:</span>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={val}
                                onKeyDown={handleEnterToNextField}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === "") {
                                    setScores({
                                      ...scores,
                                      [item.id]: "",
                                    });
                                    return;
                                  }
                                  let num = parseInt(raw, 10);
                                  if (isNaN(num)) num = 0;
                                  if (num > 100) num = 100;
                                  if (num < 0) num = 0;
                                  setScores({
                                    ...scores,
                                    [item.id]: num,
                                  });
                                }}
                                onBlur={() => {
                                  if (scores[item.id] === "" || scores[item.id] === undefined) {
                                    setScores({
                                      ...scores,
                                      [item.id]: 0,
                                    });
                                  }
                                }}
                                className="w-16 h-8 text-center text-sm font-bold bg-[#1F2937] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                              />

                              {/* Indikator dengan Icon Lucide (Bukan teks / karakter mentah) */}
                              {isPassed ? (
                                <div className="flex items-center gap-1 text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded border border-[#10B981]/30 text-[11px] font-semibold">
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  <span>Lulus</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-[#F59E0B] bg-[#F59E0B]/15 px-2 py-0.5 rounded border border-[#F59E0B]/30 text-[11px] font-semibold">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span>Kurang</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {savedSuccess ? (
                  <div className="p-3 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 text-center text-xs text-[#10B981] font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Nilai Praktek Berhasil Disimpan &amp; Masuk Grafik Tren!</span>
                  </div>
                ) : (
                  <Button
                    className="w-full h-11 text-sm font-bold"
                    variant="spark"
                    onClick={() => {
                      setSavedSuccess(true);
                      setTimeout(() => setSavedSuccess(false), 3000);
                    }}
                  >
                    Simpan Nilai Praktek
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            PORTAL SISWA — GRAFIK TREN DENGAN FILTER FOKUS KRITERIA
            ========================================================================= */}
        {activeTab === "siswa_grafik" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-[#F9FAFB]">
                  Portal Siswa — Grafik Tren Fluktuasi Nilai (Filter Kriteria Interaktif)
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Pilih kriteria untuk menonjolkan garis tertentu agar warna tidak bertabrakan (garis lain akan meredup/transparan).
                </p>
              </div>
              <Badge variant="spark">Ambang Kelulusan: 80</Badge>
            </div>

            <Card className="border-[#1F2937]">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                  <CardTitle className="text-sm">Perkembangan Kompetensi: Fajar Pratama (01.0004)</CardTitle>
                  <CardDescription>Program: SMAW 6G Pipa Industri</CardDescription>
                </div>

                {/* Filter Kriteria Toggle Buttons (Solusi Anti Tabrakan Warna) */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs text-[#9CA3AF] mr-1 flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" /> Fokus:
                  </span>
                  {[
                    { id: "all", label: "Semua Kriteria", color: "#F9FAFB" },
                    { id: "root", label: "Root Pass", color: "#38BDF8" },
                    { id: "hotpass", label: "Hot Pass", color: "#F59E0B" },
                    { id: "filler", label: "Filler Pass", color: "#A78BFA" },
                    { id: "capping", label: "Capping Pass", color: "#F43F5E" },
                    { id: "gerinda", label: "Gerinda", color: "#10B981" },
                  ].map((btn) => (
                    <Button
                      key={btn.id}
                      size="sm"
                      variant={focusedCriteria === btn.id ? "spark" : "outline"}
                      onClick={() => setFocusedCriteria(btn.id)}
                      className="h-7 text-xs px-2.5"
                    >
                      {btn.label}
                    </Button>
                  ))}
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80 w-full pt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" />
                      <XAxis dataKey="tanggal" stroke="#9CA3AF" fontSize={11} />
                      <YAxis domain={[50, 100]} stroke="#9CA3AF" fontSize={11} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#111827",
                          borderColor: "#374151",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
                      <ReferenceLine
                        y={80}
                        stroke="#DC2626"
                        strokeDasharray="4 4"
                        strokeWidth={2}
                        label={{ value: "Ambang Lulus (80)", fill: "#DC2626", fontSize: 10 }}
                      />

                      <Line
                        type="monotone"
                        dataKey="root"
                        name="Root Pass"
                        stroke="#38BDF8"
                        strokeWidth={getLineWidth("root")}
                        strokeOpacity={getLineOpacity("root")}
                        dot={{ r: focusedCriteria === "root" ? 6 : 3, fill: "#38BDF8" }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="hotpass"
                        name="Hot Pass"
                        stroke="#F59E0B"
                        strokeWidth={getLineWidth("hotpass")}
                        strokeOpacity={getLineOpacity("hotpass")}
                        dot={{ r: focusedCriteria === "hotpass" ? 6 : 3, fill: "#F59E0B" }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="filler"
                        name="Filler Pass"
                        stroke="#A78BFA"
                        strokeWidth={getLineWidth("filler")}
                        strokeOpacity={getLineOpacity("filler")}
                        dot={{ r: focusedCriteria === "filler" ? 6 : 3, fill: "#A78BFA" }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="capping"
                        name="Capping Pass"
                        stroke="#F43F5E"
                        strokeWidth={getLineWidth("capping")}
                        strokeOpacity={getLineOpacity("capping")}
                        dot={{ r: focusedCriteria === "capping" ? 6 : 3, fill: "#F43F5E" }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="gerinda"
                        name="Gerinda"
                        stroke="#10B981"
                        strokeWidth={getLineWidth("gerinda")}
                        strokeOpacity={getLineOpacity("gerinda")}
                        dot={{ r: focusedCriteria === "gerinda" ? 6 : 3, fill: "#10B981" }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Status Rekap Kompetensi dengan Icon Lucide Resmi */}
                <div className="mt-6 border-t border-[#1F2937] pt-4">
                  <h4 className="text-xs font-bold text-[#F9FAFB] uppercase tracking-wider mb-3">
                    Status Kompetensi 5 Kriteria Praktek:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { nama: "Root Pass", max: 88, status: "Lulus", isPassed: true },
                      { nama: "Hot Pass", max: 85, status: "Lulus", isPassed: true },
                      { nama: "Filler Pass", max: 84, status: "Lulus", isPassed: true },
                      { nama: "Capping Pass", max: 78, status: "Kurang", isPassed: false },
                      { nama: "Gerinda", max: 92, status: "Lulus", isPassed: true },
                    ].map((k) => (
                      <div key={k.nama} className="p-3 rounded-lg bg-[#0B0F17] border border-[#1F2937]">
                        <span className="text-xs text-[#9CA3AF] block">{k.nama}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-base font-bold text-[#F9FAFB]">{k.max}</span>
                          {k.isPassed ? (
                            <div className="flex items-center gap-1 text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded text-[11px] font-semibold">
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Lulus</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-[#F59E0B] bg-[#F59E0B]/15 px-2 py-0.5 rounded text-[11px] font-semibold">
                              <AlertTriangle className="h-3 w-3" />
                              <span>Kurang</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* =========================================================================
            SUPERADMIN — PENDAFTARAN SISWA DENGAN AUTO NO INDUK MENONJOL
            ========================================================================= */}
        {activeTab === "admin_pendaftaran" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
              <h2 className="text-base font-bold text-[#F9FAFB]">
                Layar 4: Superadmin — Form Pendaftaran Siswa 2-Tahap
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Tahap 1 verifikasi 5 berkas fisik wajib. Nomor induk digenerate secara otomatis dan ditampilkan menonjol kepada admin.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kolom Kiri: Checklist Berkas Fisik */}
              <Card className="border-[#1F2937] lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="spark">Tahap 1</Badge>
                    <span className="text-xs text-[#9CA3AF]">Verifikasi Fisik</span>
                  </div>
                  <CardTitle className="text-sm">Checklist 5 Berkas Fisik</CardTitle>
                  <CardDescription>
                    Calon siswa menyerahkan berkas asli/fotokopi di kantor pendaftaran.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { id: "ijazah", label: "Fotokopi Ijazah Terakhir (2 lembar)" },
                    { id: "ktp", label: "Fotokopi KTP Calon Siswa (2 lembar)" },
                    { id: "kk", label: "Fotokopi Kartu Keluarga (2 lembar)" },
                    { id: "foto", label: "Pas Foto 3x4 Background Merah (3 lembar)" },
                    { id: "suket_sehat", label: "Surat Keterangan Sehat Dokter (1 lembar)" },
                  ].map((doc) => (
                    <label
                      key={doc.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-[#1F2937] bg-[#0B0F17] cursor-pointer hover:border-[#374151] transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checklists[doc.id] || false}
                        onChange={(e) =>
                          setChecklists({
                            ...checklists,
                            [doc.id]: e.target.checked,
                          })
                        }
                        className="h-4 w-4 rounded bg-[#1F2937] border-[#374151] text-[#DC2626] focus:ring-[#DC2626] mt-0.5"
                      />
                      <span className="text-xs text-[#F9FAFB] leading-tight">{doc.label}</span>
                    </label>
                  ))}

                  <div className="pt-2">
                    {allChecklistsPassed ? (
                      <div className="p-2.5 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-xs text-[#10B981] flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>5 Berkas Fisik Lengkap. Form Biodata Terbuka.</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#F59E0B] flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        <span>Lengkapi seluruh 5 berkas untuk membuka form.</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Kolom Kanan: Form Biodata & Banner Nomor Induk Besar / Kartu Hasil Kredensial */}
              {registeredSuccess ? (
                <Card className="border-[#10B981]/40 bg-[#111827] lg:col-span-2 shadow-2xl">
                  <CardHeader>
                    <div className="flex items-center gap-3 bg-[#10B981]/15 border border-[#10B981]/30 rounded-xl p-3.5">
                      <CheckCircle2 className="h-7 w-7 text-[#10B981] shrink-0" />
                      <div>
                        <h3 className="text-sm font-bold text-[#F9FAFB]">Pendaftaran Berhasil Diterbitkan!</h3>
                        <p className="text-xs text-[#9CA3AF]">
                          Siswa <strong className="text-white">{registeredSuccess.nama}</strong> telah resmi terdaftar pada program <strong className="text-[#38BDF8]">{registeredSuccess.programName}</strong>.
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-xl border border-[#DC2626]/40 bg-[#0B0F17] p-5 space-y-4">
                      <div className="flex items-center justify-between border-b border-[#1F2937] pb-3">
                        <span className="text-xs font-bold text-[#F9FAFB] uppercase tracking-wider flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-[#DC2626]" />
                          Kredensial Akun Siswa (Otomatis Diterbitkan)
                        </span>
                        <Badge variant="spark" className="text-[10px]">Auto-Generated</Badge>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                        <div className="p-3.5 bg-[#111827] border border-[#1F2937] rounded-xl">
                          <span className="text-[11px] text-[#9CA3AF] block mb-1">Nomor Induk Siswa:</span>
                          <span className="font-mono text-base font-extrabold text-[#F9FAFB]">{registeredSuccess.nomorInduk}</span>
                          <p className="text-[10px] text-[#6B7280] mt-0.5">Format: kode_program.urutan</p>
                        </div>

                        <div className="p-3.5 bg-[#111827] border border-[#1F2937] rounded-xl">
                          <span className="text-[11px] text-[#9CA3AF] block mb-1">Username Login Siswa:</span>
                          <span className="font-mono text-base font-extrabold text-[#DC2626]">{registeredSuccess.username}</span>
                          <p className="text-[10px] text-[#6B7280] mt-0.5">Format: nama@urutan</p>
                        </div>

                        <div className="p-3.5 bg-[#111827] border border-[#1F2937] rounded-xl">
                          <span className="text-[11px] text-[#9CA3AF] block mb-1">Password Default:</span>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-base font-extrabold text-[#10B981]">
                              {showPassword ? registeredSuccess.passwordDefault : "••••••••"}
                            </span>
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors p-1"
                              title={showPassword ? "Sembunyikan" : "Tampilkan"}
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <p className="text-[10px] text-[#6B7280] mt-0.5">Sama dengan Username</p>
                        </div>
                      </div>

                      <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#1F2937]">
                        <p className="text-xs text-[#9CA3AF]">
                          *Format username: <code className="text-[#DC2626]">nama@urutan</code> (misal: budi@0005). Password default dibuat sama dengan username.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const text = `Kredensial Akun Siswa LPKS Sumbu Hidup:\nNama: ${registeredSuccess.nama}\nNo Induk: ${registeredSuccess.nomorInduk}\nProgram: ${registeredSuccess.programName}\nUsername: ${registeredSuccess.username}\nPassword: ${registeredSuccess.passwordDefault}\nURL Login: http://localhost:3000/login`;
                            navigator.clipboard.writeText(text);
                            setCopiedCreds(true);
                            setTimeout(() => setCopiedCreds(false), 2000);
                          }}
                          className="text-xs h-8"
                        >
                          {copiedCreds ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-[#10B981] mr-1" />
                              Tersalin ke Clipboard!
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 mr-1" />
                              Salin Kredensial
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* PREVIEW VISIBILITAS DI MENU SUPERADMIN / DATA SISWA */}
                    <div className="p-3.5 rounded-xl bg-[#0B0F17] border border-[#1F2937] space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#F9FAFB] flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-[#DC2626]" />
                          Visibilitas di Superadmin &rarr; Data Siswa (/superadmin/siswa):
                        </span>
                        <Badge variant="outline" className="text-[10px] text-[#10B981] border-[#10B981]/30">
                          Tersinkronisasi Otomatis
                        </Badge>
                      </div>

                      {/* Mockup Baris Tabel Data Siswa */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-[11px] border border-[#1F2937] rounded-lg overflow-hidden bg-[#111827]">
                          <thead className="bg-[#1F2937]/70 text-[#9CA3AF]">
                            <tr>
                              <th className="p-2 text-left font-medium">No. Induk</th>
                              <th className="p-2 text-left font-medium">Nama Siswa &amp; Akun</th>
                              <th className="p-2 text-left font-medium">Program</th>
                              <th className="p-2 text-center font-medium">Status Password</th>
                              <th className="p-2 text-right font-medium">Aksi Admin</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1F2937] text-[#D1D5DB]">
                            <tr>
                              <td className="p-2 font-mono font-bold text-[#DC2626]">{registeredSuccess.nomorInduk}</td>
                              <td className="p-2">
                                <span className="font-semibold text-white block">{registeredSuccess.nama}</span>
                                <span className="text-[#9CA3AF] font-mono text-[10px]">User: {registeredSuccess.username}</span>
                              </td>
                              <td className="p-2 text-[10px]">{registeredSuccess.programName}</td>
                              <td className="p-2 text-center">
                                <span className="inline-block text-[10px] text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded font-medium">
                                  Pass Default ({registeredSuccess.passwordDefault})
                                </span>
                              </td>
                              <td className="p-2 text-right">
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#0B0F17] border border-[#374151] text-[10px] text-white font-medium">
                                  <Lock className="h-3 w-3 text-[#DC2626]" /> Kelola Akun
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Penjelasan Keamanan Password & Update Otomatis */}
                      <div className="p-2.5 rounded-lg bg-[#111827]/80 border border-[#374151]/50 text-[11px] text-[#9CA3AF] space-y-1 leading-relaxed">
                        <p className="text-[#F9FAFB] font-medium flex items-center gap-1.5">
                          <ShieldCheck className="h-3.5 w-3.5 text-[#10B981]" />
                          Apakah password terbaru otomatis update di Superadmin?
                        </p>
                        <p>
                          1. <strong>Password Default:</strong> Superadmin mengetahui password awal siswa karena sama persis dengan username (<code className="text-[#10B981] font-mono">{registeredSuccess.passwordDefault}</code>).
                        </p>
                        <p>
                          2. <strong>Saat Siswa Mengubah Password:</strong> Berdasarkan standar keamanan siber &amp; privasi (OWASP / Enkripsi Hash Satu Arah), teks kata sandi baru <em>tidak disimpan polos</em>, melainkan dienkripsi hash di Supabase Auth. Di tabel Superadmin, statusnya otomatis berubah dari <span className="text-amber-400 font-semibold">&quot;Pass Default&quot;</span> menjadi <span className="text-emerald-400 font-semibold">&quot;Pass Diubah Siswa&quot;</span>.
                        </p>
                        <p>
                          3. <strong>Fitur Reset oleh Superadmin:</strong> Jika siswa lupa password barunya, Superadmin memiliki kontrol penuh melalui tombol <strong>Kelola Akun</strong> untuk mereset/mengganti password siswa secara instan.
                        </p>
                      </div>
                    </div>

                    <div className="pt-3 flex justify-between items-center">
                      <span className="text-xs text-[#6B7280]">Status data tersimpan di direktori siswa.</span>
                      <Button
                        variant="spark"
                        onClick={() => setRegisteredSuccess(null)}
                        className="text-xs h-10 px-5 font-bold"
                      >
                        + Daftarkan Siswa Baru Lainnya
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card
                  className={`border-[#1F2937] lg:col-span-2 transition-opacity ${
                    allChecklistsPassed ? "opacity-100" : "opacity-40 pointer-events-none"
                  }`}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary">Tahap 2</Badge>
                      <span className="text-xs text-[#10B981]">Siap Didaftarkan</span>
                    </div>
                    <CardTitle className="text-sm">Biodata Siswa Baru</CardTitle>
                  </CardHeader>
                  <CardContent data-form-container="true" className="space-y-4">
                    {/* Pesan Validasi Duplikat Akun */}
                    {registerError && (
                      <div className="p-3.5 rounded-xl bg-[#F43F5E]/15 border border-[#F43F5E]/40 text-xs text-[#F43F5E] flex items-center gap-2.5">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-[#F43F5E]" />
                        <span className="font-semibold">{registerError}</span>
                      </div>
                    )}

                    {/* CALLOUT NOMOR INDUK BESAR & MENONJOL (SESUAI REQUEST USER) */}
                    <div className="p-4 rounded-xl bg-gradient-to-r from-[#1F2937] to-[#111827] border-l-4 border-[#DC2626] border-y border-r border-[#374151] flex flex-wrap items-center justify-between gap-4 shadow-lg">
                      <div>
                        <span className="text-[11px] uppercase tracking-wider font-bold text-[#F87171] block">
                          NOMOR INDUK SISWA OTOMATIS TERBIT:
                        </span>
                        <span className="text-3xl font-mono font-extrabold text-[#F9FAFB] tracking-wider block mt-1">
                          {selectedProgram}.0005
                        </span>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">
                          Format: <code className="text-[#F9FAFB] font-mono">kode_program.urutan</code> (Pessimistic Locking anti-tabrakan)
                        </p>
                      </div>

                      <div className="text-right">
                        <Badge variant="spark" className="text-xs py-1 px-3">
                          Program: {programMap[selectedProgram] || "SMAW 6G"}
                        </Badge>
                        <span className="block text-[11px] text-[#9CA3AF] mt-1">Status: Calon Siswa Aktif</span>
                      </div>
                    </div>

                    {/* Keyboard Navigation Tip */}
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#0B0F17] border border-[#1F2937] text-xs text-[#9CA3AF]">
                      <CornerDownLeft className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
                      <span>
                        <strong>Mode Input Cepat:</strong> Tekan <strong className="text-[#F9FAFB] font-mono">Enter</strong> di setiap kolom untuk langsung beralih dan memilih teks pada kolom berikutnya tanpa perlu menggunakan mouse.
                      </span>
                    </div>

                    {/* Form Grid Lengkap */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
                      <div>
                        <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                          Program Pelatihan:
                        </label>
                        <select
                          value={selectedProgram}
                          onChange={(e) => setSelectedProgram(e.target.value)}
                          onKeyDown={handleEnterToNextField}
                          className="w-full h-9 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                        >
                          <option value="01">01 — SMAW 6G Pipa Industri (Rp 8.500.000)</option>
                          <option value="02">02 — GTAW / TIG 6G (Rp 9.500.000)</option>
                          <option value="03">03 — GMAW / MIG 3G (Rp 7.500.000)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                          Nama Lengkap:
                        </label>
                        <input
                          type="text"
                          value={namaSiswa}
                          onChange={(e) => setNamaSiswa(e.target.value)}
                          onKeyDown={handleEnterToNextField}
                          className="w-full h-9 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                          NIK (16 Digit Wajib):
                        </label>
                        <input
                          type="text"
                          defaultValue="3201234567890005"
                          maxLength={16}
                          onKeyDown={handleEnterToNextField}
                          className="w-full h-9 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                          Email Siswa:
                        </label>
                        <input
                          type="email"
                          defaultValue="budi.santoso@gmail.com"
                          onKeyDown={handleEnterToNextField}
                          className="w-full h-9 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                          Tempat &amp; Tanggal Lahir:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            defaultValue="Bandung"
                            placeholder="Tempat"
                            onKeyDown={handleEnterToNextField}
                            className="w-full h-9 px-2 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:outline-none"
                          />
                          <input
                            type="date"
                            defaultValue="2003-04-12"
                            onKeyDown={handleEnterToNextField}
                            className="w-full h-9 px-2 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                          No. WhatsApp / HP:
                        </label>
                        <input
                          type="text"
                          defaultValue="081234567895"
                          onKeyDown={handleEnterToNextField}
                          className="w-full h-9 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                          Nama Orang Tua (Ayah / Ibu):
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            defaultValue="Sutrisno"
                            placeholder="Nama Ayah"
                            onKeyDown={handleEnterToNextField}
                            className="w-full h-9 px-2 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:outline-none"
                          />
                          <input
                            type="text"
                            defaultValue="Sri Wahyuni"
                            placeholder="Nama Ibu"
                            onKeyDown={handleEnterToNextField}
                            className="w-full h-9 px-2 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                          Pendidikan Terakhir &amp; NISN:
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            defaultValue="SMK Teknik Mesin"
                            placeholder="Pendidikan"
                            onKeyDown={handleEnterToNextField}
                            className="w-full h-9 px-2 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:outline-none"
                          />
                          <input
                            type="text"
                            defaultValue="0034567891"
                            placeholder="NISN"
                            onKeyDown={handleEnterToNextField}
                            className="w-full h-9 px-2 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:outline-none font-mono"
                          />
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                          Alamat Lengkap Siswa:
                        </label>
                        <input
                          type="text"
                          defaultValue="Jl. Raya Barat Industri No. 45, RT 02/04, Bandung"
                          onKeyDown={handleEnterToNextField}
                          className="w-full h-9 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="pt-3 flex justify-end">
                      <Button
                        variant="spark"
                        size="md"
                        data-submit-btn="true"
                        onClick={() => {
                          const cleanName = (namaSiswa.trim().split(/\s+/)[0] || "siswa").toLowerCase().replace(/[^a-z0-9]/g, "");
                          const urutan = "0005";
                          const generatedUsername = `${cleanName}@${urutan}`;

                          if (registeredAccounts.includes(generatedUsername)) {
                            setRegisterError(`Validasi Akun Gagal: Username "${generatedUsername}" sudah terdaftar dalam sistem. Pendaftaran ditolak untuk mencegah duplikasi akun.`);
                            return;
                          }

                          setRegisterError(null);
                          setRegisteredAccounts((prev) => [...prev, generatedUsername]);
                          setRegisteredSuccess({
                            nama: namaSiswa.trim() || "Budi Santoso",
                            nomorInduk: `${selectedProgram}.${urutan}`,
                            username: generatedUsername,
                            passwordDefault: generatedUsername,
                            programName: programMap[selectedProgram] || "SMAW 6G Pipa Industri",
                          });
                        }}
                        className="font-bold text-xs h-11 px-6"
                      >
                        Daftarkan Siswa &amp; Terbitkan No Induk {selectedProgram}.0005
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            SUPERADMIN — MANAJEMEN PENILAIAN & TOOLBAR EXCEL
            ========================================================================= */}
        {activeTab === "admin_penilaian" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#F9FAFB]">
                  Layar 5: Superadmin — Monitoring Penilaian Harian &amp; Bulk Excel
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Instruktur memantau nilai yang diinput mandiri oleh siswa, mengoreksi, atau import/export masal spreadsheet.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="text-xs">
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1 text-[#10B981]" />
                  Template Excel
                </Button>
                <Button size="sm" variant="outline" className="text-xs">
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Import Excel
                </Button>
                <Button size="sm" variant="outline" className="text-xs">
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Export Excel
                </Button>
                <Button size="sm" variant="spark" className="text-xs">
                  + Input / Koreksi Manual
                </Button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-[#111827] border border-[#1F2937] rounded-xl">
              <input
                type="text"
                placeholder="Cari nama siswa / nomor induk..."
                className="h-9 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:outline-none"
              />
              <select className="h-9 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:outline-none">
                <option>Semua Program (SMAW, GTAW, GMAW)</option>
                <option>01 — SMAW 6G</option>
                <option>02 — GTAW 6G</option>
              </select>
              <input
                type="date"
                defaultValue="2026-09-03"
                className="h-9 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:outline-none"
              />
            </div>

            {/* Tabel Penilaian */}
            <Card className="border-[#1F2937] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B0F17] text-[#9CA3AF] border-b border-[#1F2937]">
                    <tr>
                      <th className="p-3.5">Tanggal</th>
                      <th className="p-3.5">Nomor Induk &amp; Siswa</th>
                      <th className="p-3.5">Kriteria Praktek</th>
                      <th className="p-3.5 text-center">Nilai (0-100)</th>
                      <th className="p-3.5">Status Evaluasi</th>
                      <th className="p-3.5">Sumber Input</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {[
                      {
                        tgl: "03 Sep 2026",
                        nama: "Fajar Pratama",
                        noInduk: "01.0004",
                        kriteria: "Root Pass",
                        skor: 88,
                        creator: "siswa",
                      },
                      {
                        tgl: "03 Sep 2026",
                        nama: "Fajar Pratama",
                        noInduk: "01.0004",
                        kriteria: "Hot Pass",
                        skor: 85,
                        creator: "siswa",
                      },
                      {
                        tgl: "03 Sep 2026",
                        nama: "Budi Santoso",
                        noInduk: "01.0002",
                        kriteria: "Capping Pass",
                        skor: 74,
                        creator: "superadmin",
                      },
                      {
                        tgl: "02 Sep 2026",
                        nama: "Hendra Wijaya",
                        noInduk: "01.0003",
                        kriteria: "Gerinda Akhir",
                        skor: 92,
                        creator: "siswa",
                      },
                    ].map((row, idx) => {
                      const isLulus = row.skor >= 80;
                      return (
                        <tr key={idx} className="hover:bg-[#1F2937]/40 transition-colors">
                          <td className="p-3.5 font-mono text-[#9CA3AF]">{row.tgl}</td>
                          <td className="p-3.5">
                            <span className="font-semibold text-[#F9FAFB] block">{row.nama}</span>
                            <span className="font-mono text-[10px] text-[#9CA3AF]">{row.noInduk}</span>
                          </td>
                          <td className="p-3.5 text-[#D1D5DB] font-medium">{row.kriteria}</td>
                          <td className="p-3.5 text-center font-mono font-bold text-sm text-[#F9FAFB]">
                            {row.skor}
                          </td>
                          <td className="p-3.5">
                            {isLulus ? (
                              <div className="inline-flex items-center gap-1 text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded text-[11px] font-semibold">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>≥ 80 (Lulus)</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 text-[#F59E0B] bg-[#F59E0B]/15 px-2 py-0.5 rounded text-[11px] font-semibold">
                                <AlertTriangle className="h-3 w-3" />
                                <span>&lt; 80 (Kurang)</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            {row.creator === "siswa" ? (
                              <Badge variant="secondary">Mandiri Siswa</Badge>
                            ) : (
                              <Badge variant="spark">Instruktur LPKS</Badge>
                            )}
                          </td>
                          <td className="p-3.5 text-right space-x-2">
                            <Button size="sm" variant="ghost" className="h-7 text-xs">
                              Koreksi
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* =========================================================================
            SUPERADMIN — UJIAN & GATE-CHECK SERTIFIKAT
            ========================================================================= */}
        {activeTab === "admin_ujian" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#F9FAFB]">
                  Layar 6: Superadmin — Ujian Internal &amp; Panel Gate-Check Sertifikat
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Simulasikan 2 kondisi gate: Sertifikat terkunci (syarat belum terpenuhi) vs Terbuka siap cetak PDF resmi.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9CA3AF]">Simulasi Kondisi Gate:</span>
                <Button
                  size="sm"
                  variant={gateCondition === "locked" ? "danger" : "outline"}
                  onClick={() => setGateCondition("locked")}
                  className="text-xs"
                >
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  Terkunci (Cicilan / Nilai &lt; 80)
                </Button>
                <Button
                  size="sm"
                  variant={gateCondition === "unlocked" ? "emerald" : "outline"}
                  onClick={() => setGateCondition("unlocked")}
                  className="text-xs"
                >
                  <Unlock className="h-3.5 w-3.5 mr-1" />
                  Terbuka (Lunas &amp; Lulus)
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Input Ujian Internal */}
              <Card className="border-[#1F2937] lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-sm">Penilaian Ujian Akhir Internal</CardTitle>
                  <CardDescription>
                    Siswa: Fajar Pratama (01.0004) — Program: SMAW 6G Pipa Industri
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { key: "teori", label: "Teori Pengelasan", val: gateCondition === "unlocked" ? 85 : 85 },
                      { key: "root", label: "Root Pass", val: gateCondition === "unlocked" ? 85 : 82 },
                      { key: "hotpass", label: "Hot Pass", val: gateCondition === "unlocked" ? 82 : 80 },
                      { key: "filler", label: "Filler Pass", val: gateCondition === "unlocked" ? 80 : 74 },
                      { key: "capping", label: "Capping Pass", val: gateCondition === "unlocked" ? 88 : 85 },
                      { key: "gerinda", label: "Gerinda Akhir", val: gateCondition === "unlocked" ? 90 : 88 },
                    ].map((u) => {
                      const isPassed = u.val >= 80;
                      return (
                        <div key={u.key} className="p-3 bg-[#0B0F17] border border-[#1F2937] rounded-lg">
                          <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                            {u.label}
                          </label>
                          <div className="flex items-center justify-between">
                            <input
                              type="number"
                              readOnly
                              value={u.val}
                              className="w-16 h-8 text-center font-bold bg-[#1F2937] rounded text-sm text-[#F9FAFB] font-mono"
                            />
                            {isPassed ? (
                              <div className="flex items-center gap-1 text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded text-[10px] font-semibold">
                                <CheckCircle2 className="h-3 w-3" />
                                <span>≥ 80</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-[#F43F5E] bg-[#F43F5E]/15 px-2 py-0.5 rounded text-[10px] font-semibold">
                                <XCircle className="h-3 w-3" />
                                <span>&lt; 80</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#0B0F17] border border-[#1F2937] flex items-center justify-between text-xs">
                    <span className="text-[#9CA3AF]">Status Evaluasi Kelulusan Ujian:</span>
                    {gateCondition === "unlocked" ? (
                      <div className="flex items-center gap-1.5 text-[#10B981] font-bold">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>LULUS UJIAN INTERNAL (Semua kriteria ≥ 80)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[#F43F5E] font-bold">
                        <XCircle className="h-4 w-4" />
                        <span>BELUM LULUS (Filler Pass = 74 &lt; 80)</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Panel Gate-Check Mutlak */}
              <Card className="border-[#1F2937] lg:col-span-1 flex flex-col justify-between">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-[#DC2626]" />
                    Gate-Check Sertifikat
                  </CardTitle>
                  <CardDescription>
                    Pencetakan sertifikat terkunci otomatis oleh server hingga 2 syarat terpenuhi.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Syarat 1: Keuangan */}
                  <div className="p-3.5 rounded-lg border border-[#1F2937] bg-[#0B0F17] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9CA3AF] font-medium">Syarat 1: Keuangan</span>
                      {gateCondition === "unlocked" ? (
                        <div className="flex items-center gap-1 text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded text-[11px] font-bold">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>LUNAS (Rp 0 sisa)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[#F59E0B] bg-[#F59E0B]/15 px-2 py-0.5 rounded text-[11px] font-bold">
                          <AlertTriangle className="h-3 w-3" />
                          <span>CICIL (Sisa Rp 3.5jt)</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6B7280]">
                      Biaya Program: Rp 8.500.000 — Pembayaran masuk valid
                    </p>
                  </div>

                  {/* Syarat 2: Ujian */}
                  <div className="p-3.5 rounded-lg border border-[#1F2937] bg-[#0B0F17] space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9CA3AF] font-medium">Syarat 2: Ujian Internal</span>
                      {gateCondition === "unlocked" ? (
                        <div className="flex items-center gap-1 text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded text-[11px] font-bold">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>LULUS (Semua ≥ 80)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-[#F43F5E] bg-[#F43F5E]/15 px-2 py-0.5 rounded text-[11px] font-bold">
                          <XCircle className="h-3 w-3" />
                          <span>BELUM LULUS</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6B7280]">
                      Standar industri mutlak tanpa kompromi
                    </p>
                  </div>

                  {/* Tombol Cetak Gate-Check */}
                  <div className="pt-2">
                    {gateCondition === "unlocked" ? (
                      <Button
                        className="w-full h-12 text-sm font-bold shadow-lg shadow-[#DC2626]/25"
                        variant="spark"
                        onClick={() => alert("Simulasi: Mengunduh file Sertifikat_01.0004_Fajar_Pratama.pdf")}
                      >
                        <Printer className="h-4 w-4 mr-2" />
                        Cetak Sertifikat Resmi (PDF)
                      </Button>
                    ) : (
                      <div>
                        <Button disabled className="w-full h-12 text-sm" variant="spark">
                          <Lock className="h-4 w-4 mr-2" />
                          Sertifikat Terkunci
                        </Button>
                        <p className="text-[10px] text-[#F43F5E] text-center mt-2 leading-tight">
                          Pelunasan tagihan &amp; kelulusan ujian wajib tuntas sebelum tombol aktif.
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* =========================================================================
            SHOWCASE: ASISTEN ANALITIK AI (GOOGLE GEMINI FLASH)
            ========================================================================= */}
        {activeTab === "ai_showcase" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#DC2626]" />
                <h2 className="text-base font-bold text-[#F9FAFB]">
                  Showcase: Asisten Analitik AI (RAG Google Gemini Flash)
                </h2>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Instruktur dapat menanyakan pertanyaan analitik bebas seputar performa bengkel, nilai, dan absensi siswa.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kolom Kiri: Prompt Box */}
              <Card className="border-[#1F2937] lg:col-span-1 space-y-3">
                <CardHeader>
                  <CardTitle className="text-sm">Pertanyaan Instruktur</CardTitle>
                  <CardDescription>Pilih contoh pertanyaan cepat atau ketik sendiri:</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "Siapa siswa SMAW 6G yang nilai Capping-nya masih di bawah 80?",
                    "Berapa rata-rata kehadiran siswa program GTAW minggu ini?",
                    "Siapa saja siswa yang sudah lunas dan siap dijadwalkan ujian?",
                  ].map((q, i) => (
                    <button
                      key={i}
                      className="w-full text-left p-2.5 rounded-lg bg-[#0B0F17] border border-[#1F2937] text-xs text-[#D1D5DB] hover:border-[#DC2626]/50 transition-colors"
                    >
                      &quot;{q}&quot;
                    </button>
                  ))}

                  <div className="pt-2">
                    <textarea
                      rows={3}
                      defaultValue="Siapa siswa SMAW 6G yang nilai Capping-nya masih di bawah 80?"
                      className="w-full p-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                    />
                    <Button className="w-full mt-2" size="sm" variant="spark">
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      Analisis dengan Gemini Flash
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Kolom Kanan: Respon Analitik AI */}
              <Card className="border-[#1F2937] lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="spark">RAG Context: 45 Data Siswa</Badge>
                    <Badge variant="outline">Model: Gemini 2.5 Flash</Badge>
                  </div>
                  <CardTitle className="text-sm">Hasil Analisis Terstruktur</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-xl bg-[#0B0F17] border border-[#1F2937] space-y-3 text-xs leading-relaxed text-[#D1D5DB]">
                    <p className="font-semibold text-[#F9FAFB]">
                      Berdasarkan data penilaian terbaru, ditemukan 2 siswa di program SMAW 6G dengan nilai Capping di bawah 80:
                    </p>

                    <div className="space-y-2 pl-2">
                      <div className="p-2.5 rounded bg-[#111827] border border-[#374151]/50">
                        <span className="font-bold text-[#F87171]">1. Budi Santoso (01.0002)</span>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                          Nilai Capping: <strong className="text-[#F59E0B]">74</strong> (Kurang 6 poin). Catatan instruktur: Terjadi sedikit undercut pada jalur las kedua.
                        </p>
                      </div>

                      <div className="p-2.5 rounded bg-[#111827] border border-[#374151]/50">
                        <span className="font-bold text-[#F87171]">2. Hendra Wijaya (01.0003)</span>
                        <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                          Nilai Capping: <strong className="text-[#F59E0B]">68</strong> (Kurang 12 poin). Catatan instruktur: Kecepatan ayunan terlalu cepat, lebar mahkota belum seragam.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#DC2626]/10 border border-[#DC2626]/30 text-xs text-[#FCA5A5]">
                      <strong>Rekomendasi Instruktur:</strong> Jadwalkan 2 jam latihan penyesuaian sudut elektroda 45° dan pengaturan ampere mesin (90-100A) sebelum ujian remedi internal.
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
