"use client";

import React, { useState } from "react";
import {
  Flame,
  MapPin,
  CheckCircle2,
  AlertCircle,
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
  Smartphone,
  Monitor,
} from "lucide-react";
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

type ActiveTab = "layar1" | "layar2" | "layar3" | "layar4" | "layar5" | "layar6" | "ai";

export default function MockupPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("layar1");

  // State Layar 1 (Presensi Simulator)
  const [gpsState, setGpsState] = useState<"outside" | "inside" | "done">("inside");

  // State Layar 2 (Input Nilai Mandiri)
  const [checkedCriteria, setCheckedCriteria] = useState<{ [key: string]: boolean }>({
    root: true,
    hotpass: true,
    filler: false,
    capping: false,
    gerinda: false,
  });
  const [scores, setScores] = useState<{ [key: string]: number }>({
    root: 82,
    hotpass: 78,
    filler: 75,
    capping: 70,
    gerinda: 85,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // State Layar 4 (Pendaftaran 2-Step)
  const [checklists, setChecklists] = useState<{ [key: string]: boolean }>({
    ijazah: true,
    ktp: true,
    kk: true,
    foto: true,
    suket_sehat: true,
  });

  // State Layar 6 (Gate-Check Simulator)
  const [gateCondition, setGateCondition] = useState<"locked" | "unlocked">("unlocked");

  // Sample data untuk grafik Recharts (Layar 3)
  const chartData = [
    { tanggal: "20 Ags", root: 65, hotpass: 70, filler: null, capping: null, gerinda: 80 },
    { tanggal: "22 Ags", root: 72, hotpass: 74, filler: 68, capping: 60, gerinda: 82 },
    { tanggal: "25 Ags", root: 78, hotpass: 76, filler: 72, capping: 65, gerinda: 85 },
    { tanggal: "28 Ags", root: 82, hotpass: 80, filler: 75, capping: 72, gerinda: 88 },
    { tanggal: "01 Sep", root: 85, hotpass: 82, filler: 80, capping: 78, gerinda: 90 },
    { tanggal: "03 Sep", root: 88, hotpass: 85, filler: 84, capping: 82, gerinda: 92 },
  ];

  const allChecklistsPassed = Object.values(checklists).every(Boolean);

  return (
    <div className="min-h-screen bg-[#0B0F17] text-[#F9FAFB] flex flex-col font-sans">
      {/* Top Header & Navigation Bar */}
      <header className="sticky top-0 z-50 bg-[#111827]/90 backdrop-blur-md border-b border-[#1F2937] px-4 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-[#DC2626]/20 border border-[#DC2626]/40 flex items-center justify-center text-[#DC2626]">
            <Flame className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-[#F9FAFB]">LPKS SUMBU HIDUP</span>
              <Badge variant="spark">MOCKUP VISUAL TAHAP 3</Badge>
            </div>
            <p className="text-xs text-[#9CA3AF]">
              Sistem Manajemen Pelatihan Pengelasan — Verifikasi Antarmuka
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <nav className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 lg:pb-0 scrollbar-none">
          <Button
            size="sm"
            variant={activeTab === "layar1" ? "spark" : "ghost"}
            onClick={() => setActiveTab("layar1")}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs"
          >
            <Smartphone className="h-3.5 w-3.5" />
            Layar 1: Siswa Presensi
          </Button>

          <Button
            size="sm"
            variant={activeTab === "layar2" ? "spark" : "ghost"}
            onClick={() => setActiveTab("layar2")}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs"
          >
            <Smartphone className="h-3.5 w-3.5" />
            Layar 2: Siswa Input Nilai
          </Button>

          <Button
            size="sm"
            variant={activeTab === "layar3" ? "spark" : "ghost"}
            onClick={() => setActiveTab("layar3")}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs"
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Layar 3: Grafik Tren
          </Button>

          <Button
            size="sm"
            variant={activeTab === "layar4" ? "spark" : "ghost"}
            onClick={() => setActiveTab("layar4")}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs"
          >
            <Monitor className="h-3.5 w-3.5" />
            Layar 4: Admin Pendaftaran
          </Button>

          <Button
            size="sm"
            variant={activeTab === "layar5" ? "spark" : "ghost"}
            onClick={() => setActiveTab("layar5")}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs"
          >
            <Users className="h-3.5 w-3.5" />
            Layar 5: Admin Penilaian & Excel
          </Button>

          <Button
            size="sm"
            variant={activeTab === "layar6" ? "spark" : "ghost"}
            onClick={() => setActiveTab("layar6")}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs"
          >
            <Award className="h-3.5 w-3.5" />
            Layar 6: Ujian & Gate-Check
          </Button>

          <Button
            size="sm"
            variant={activeTab === "ai" ? "spark" : "ghost"}
            onClick={() => setActiveTab("ai")}
            className="flex items-center gap-1.5 whitespace-nowrap text-xs"
          >
            <Bot className="h-3.5 w-3.5" />
            Showcase AI
          </Button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 lg:p-8 max-w-7xl mx-auto w-full">
        {/* =========================================================================
            LAYAR 1: PORTAL SISWA — BERANDA & PRESENSI GPS (MOBILE VIEW)
            ========================================================================= */}
        {activeTab === "layar1" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
              <div>
                <h2 className="text-base font-bold text-[#F9FAFB]">
                  Layar 1: Portal Siswa — Beranda & Live GPS Geofencing (Mobile UI)
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Simulasikan status jarak GPS siswa terhadap bengkel las LPKS (Batas radius: 100m)
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9CA3AF]">Simulator Sinyal GPS:</span>
                <Button
                  size="sm"
                  variant={gpsState === "outside" ? "danger" : "outline"}
                  onClick={() => setGpsState("outside")}
                >
                  Luar Radius (145m)
                </Button>
                <Button
                  size="sm"
                  variant={gpsState === "inside" ? "emerald" : "outline"}
                  onClick={() => setGpsState("inside")}
                >
                  Dalam Radius (35m)
                </Button>
                <Button
                  size="sm"
                  variant={gpsState === "done" ? "spark" : "outline"}
                  onClick={() => setGpsState("done")}
                >
                  Sudah Absen
                </Button>
              </div>
            </div>

            {/* Mobile Phone Mockup Frame */}
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

                {/* Greeting & Header */}
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

                {/* GPS Presensi Card (Fokus Utama) */}
                <Card className="border-[#374151] bg-[#111827]">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-[#DC2626]" />
                        <CardTitle className="text-sm">Presensi Harian</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-[11px]">
                        Radius 100m
                      </Badge>
                    </div>
                    <CardDescription>Validasi koordinat GPS bengkel pelatihan</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 pt-2">
                    {gpsState === "outside" && (
                      <>
                        <div className="p-3 rounded-lg bg-[#F43F5E]/10 border border-[#F43F5E]/30 text-xs text-[#F43F5E] flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Di luar jangkauan (145 meter)</span>
                            <p className="text-[11px] text-[#FCA5A5] mt-0.5">
                              Mendekatlah ke area bengkel las LPKS untuk mengaktifkan tombol presensi.
                            </p>
                          </div>
                        </div>
                        <Button disabled className="w-full h-12 text-sm" variant="spark">
                          <MapPin className="h-4 w-4 mr-2" />
                          ABSEN SEKARANG (TERKUNCI)
                        </Button>
                      </>
                    )}

                    {gpsState === "inside" && (
                      <>
                        <div className="p-3 rounded-lg bg-[#10B981]/10 border border-[#10B981]/30 text-xs text-[#10B981] flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-semibold">Dalam jangkauan bengkel (35 meter)</span>
                            <p className="text-[11px] text-[#6EE7B7] mt-0.5">
                              Sinyal GPS terverifikasi. Anda dapat melakukan presensi sekarang.
                            </p>
                          </div>
                        </div>
                        <Button
                          className="w-full h-12 text-sm font-bold animate-pulse shadow-lg shadow-[#10B981]/20"
                          variant="emerald"
                          onClick={() => setGpsState("done")}
                        >
                          <MapPin className="h-4 w-4 mr-2" />
                          📍 ABSEN SEKARANG (HADIR)
                        </Button>
                      </>
                    )}

                    {gpsState === "done" && (
                      <div className="p-4 rounded-xl bg-[#10B981]/15 border border-[#10B981]/40 text-center space-y-1">
                        <CheckCircle2 className="h-8 w-8 text-[#10B981] mx-auto mb-1" />
                        <span className="font-bold text-sm text-[#10B981]">Anda Sudah Hadir</span>
                        <p className="text-xs text-[#D1D5DB]">Tercatat hari ini pukul 07:45:12 WIB</p>
                        <Badge variant="outline" className="mt-2 text-[10px]">
                          Jarak: 34 meter
                        </Badge>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Ringkasan Kelayakan Ujian */}
                <Card className="border-[#1F2937] bg-[#111827]">
                  <CardHeader className="p-3 pb-1">
                    <CardTitle className="text-xs text-[#9CA3AF] flex items-center justify-between">
                      <span>Status Kelayakan Ujian Internal</span>
                      <span className="text-[#10B981] font-bold">4 / 5 Kriteria</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 pt-2">
                    <div className="w-full bg-[#1F2937] h-2 rounded-full overflow-hidden">
                      <div className="bg-[#DC2626] h-full w-[80%]" />
                    </div>
                    <p className="text-[11px] text-[#9CA3AF] mt-2">
                      Tinggal kriteria <span className="text-[#F87171] font-semibold">Capping (78)</span>{" "}
                      untuk memenuhi syarat ujian.
                    </p>
                  </CardContent>
                </Card>

                {/* AI Weekly Insight Card */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#1E293B] to-[#111827] border border-[#374151] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#F9FAFB]">
                    <Sparkles className="h-3.5 w-3.5 text-[#DC2626]" />
                    <span>AI Weekly Evaluasi</span>
                  </div>
                  <p className="text-[11px] text-[#D1D5DB] leading-relaxed">
                    &quot;Penetrasi Root Pass meningkat pesat (+10 poin). Perhatikan sudut elektroda saat
                    Capping agar terbebas dari undercut sebelum jadwal ujian.&quot;
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            LAYAR 2: PORTAL SISWA — FORM INPUT NILAI MANDIRI (MOBILE VIEW)
            ========================================================================= */}
        {activeTab === "layar2" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
              <h2 className="text-base font-bold text-[#F9FAFB]">
                Layar 2: Portal Siswa — Form Input Nilai Mandiri Praktek
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Siswa mencatat skor yang diberikan instruktur saat praktek. Kriteria yang tidak dinilai
                tidak dicentang dan tidak bernilai 0.
              </p>
            </div>

            <div className="flex justify-center">
              <div className="w-full max-w-sm rounded-[36px] border-[6px] border-[#1F2937] bg-[#0B0F17] overflow-hidden shadow-2xl p-5 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-[#1F2937]">
                  <h3 className="font-bold text-sm text-[#F9FAFB]">Input Nilai Praktek</h3>
                  <Badge variant="secondary">03 Sep 2026</Badge>
                </div>

                <div className="space-y-3">
                  <label className="text-xs text-[#9CA3AF] block font-medium">
                    Pilih Kriteria yang Dinilai Hari Ini:
                  </label>

                  {[
                    { id: "root", label: "Root Pass (Penetrasi Awal)", min: 80 },
                    { id: "hotpass", label: "Hot Pass (Pengisi Lapis 2)", min: 80 },
                    { id: "filler", label: "Filler Pass (Pengisian Kampuh)", min: 80 },
                    { id: "capping", label: "Capping Pass (Lapis Penutup)", min: 80 },
                    { id: "gerinda", label: "Gerinda & Bevel Prep", min: 80 },
                  ].map((item) => {
                    const isChecked = checkedCriteria[item.id] || false;
                    const val = scores[item.id] || 0;

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
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={val}
                                onChange={(e) =>
                                  setScores({
                                    ...scores,
                                    [item.id]: parseInt(e.target.value, 10) || 0,
                                  })
                                }
                                className="w-16 h-8 text-center text-sm font-bold bg-[#1F2937] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                              />
                              <span
                                className={`text-xs font-bold ${
                                  val >= 80 ? "text-[#10B981]" : "text-[#F59E0B]"
                                }`}
                              >
                                {val >= 80 ? "✓ Lulus" : "! Kurang"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {savedSuccess ? (
                  <div className="p-3 rounded-lg bg-[#10B981]/15 border border-[#10B981]/40 text-center text-xs text-[#10B981] font-semibold">
                    ✓ 2 Nilai Harian Berhasil Disimpan & Masuk Grafik Tren!
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
            LAYAR 3: PORTAL SISWA — TRANSKRIP & GRAFIK TREN (RECHARTS)
            ========================================================================= */}
        {activeTab === "layar3" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#F9FAFB]">
                  Layar 3: Transkrip Nilai & Grafik Tren Progres Belajar (Recharts)
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Visualisasi multi-line chart perkembangan per kriteria dengan garis referensi kelulusan (80).
                </p>
              </div>
              <Badge variant="spark">Target: Minimal 80</Badge>
            </div>

            <Card className="border-[#1F2937]">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-sm">Grafik Metrik Pengelasan (Fajar Pratama — 01.0004)</CardTitle>
                  <CardDescription>Program: SMAW 6G Pipa Industri</CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Multi-Line Series</Badge>
                  <Badge variant="success">Ambang Batas: 80</Badge>
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
                        label={{ value: "Batas Lulus (80)", fill: "#DC2626", fontSize: 10 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="root"
                        name="Root Pass"
                        stroke="#38BDF8"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="hotpass"
                        name="Hot Pass"
                        stroke="#F59E0B"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="filler"
                        name="Filler Pass"
                        stroke="#A78BFA"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="capping"
                        name="Capping Pass"
                        stroke="#F43F5E"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="gerinda"
                        name="Gerinda"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Status Tabel Kelayakan Kompetensi */}
                <div className="mt-6 border-t border-[#1F2937] pt-4">
                  <h4 className="text-xs font-bold text-[#F9FAFB] uppercase tracking-wider mb-3">
                    Rekap Status Kompetensi 5 Kriteria:
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                      { nama: "Root Pass", max: 88, status: "Lulus" },
                      { nama: "Hot Pass", max: 85, status: "Lulus" },
                      { nama: "Filler Pass", max: 84, status: "Lulus" },
                      { nama: "Capping Pass", max: 82, status: "Lulus" },
                      { nama: "Gerinda", max: 92, status: "Lulus" },
                    ].map((k) => (
                      <div key={k.nama} className="p-3 rounded-lg bg-[#0B0F17] border border-[#1F2937]">
                        <span className="text-xs text-[#9CA3AF] block">{k.nama}</span>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-base font-bold text-[#F9FAFB]">{k.max}</span>
                          <Badge variant="success">✓ Lulus</Badge>
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
            LAYAR 4: SUPERADMIN — PENDAFTARAN SISWA 2-TAHAP (DESKTOP VIEW)
            ========================================================================= */}
        {activeTab === "layar4" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
              <h2 className="text-base font-bold text-[#F9FAFB]">
                Layar 4: Superadmin — Form Pendaftaran 2-Tahap (Continuous Enrollment)
              </h2>
              <p className="text-xs text-[#9CA3AF]">
                Tahap 1 (Verifikasi Berkas Fisik) wajib tuntas 100% sebelum Tahap 2 (Form Biodata & Auto No Induk) aktif.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Kolom Kiri: Tahap 1 (Checklist Berkas Fisik) */}
              <Card className="border-[#1F2937] lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="spark">Tahap 1</Badge>
                    <span className="text-xs text-[#9CA3AF]">Verifikasi Fisik</span>
                  </div>
                  <CardTitle className="text-sm">Checklist 5 Berkas Fisik</CardTitle>
                  <CardDescription>
                    Centang berkas asli/fotokopi yang telah diserahkan calon siswa di kantor.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { id: "ijazah", label: "Fotokopi Ijazah Terakhir (2 lembar)" },
                    { id: "ktp", label: "Fotokopi KTP Calon Siswa (2 lembar)" },
                    { id: "kk", label: "Fotokopi Kartu Keluarga (2 lembar)" },
                    { id: "foto", label: "Pas Foto 3x4 Background Merah (3 lbr)" },
                    { id: "suket_sehat", label: "Surat Keterangan Sehat Dokter (1 lbr)" },
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
                        <span>5 Berkas Lengkap. Form Biodata Terbuka.</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-xs text-[#F59E0B] flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>Lengkapi seluruh 5 berkas untuk membuka form.</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Kolom Kanan: Tahap 2 (Form Biodata & Auto No Induk) */}
              <Card
                className={`border-[#1F2937] lg:col-span-2 transition-opacity ${
                  allChecklistsPassed ? "opacity-100" : "opacity-40 pointer-events-none"
                }`}
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">Tahap 2</Badge>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[#9CA3AF]">Auto-Generated Nomor Induk:</span>
                      <Badge variant="spark" className="text-xs font-mono font-bold">
                        01.0005
                      </Badge>
                    </div>
                  </div>
                  <CardTitle className="text-sm">Biodata Calon Siswa Baru</CardTitle>
                  <CardDescription>
                    Nomor Induk digenerate otomatis menggunakan pessimistic locking di database.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                        Program Pelatihan:
                      </label>
                      <select className="w-full h-10 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none">
                        <option value="01">01 — SMAW 6G Pipa (Rp 8.500.000)</option>
                        <option value="02">02 — GTAW 6G (Rp 9.500.000)</option>
                        <option value="03">03 — GMAW 3G (Rp 7.500.000)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                        Nama Lengkap Siswa:
                      </label>
                      <input
                        type="text"
                        defaultValue="Budi Santoso"
                        className="w-full h-10 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                        NIK (Tepat 16 Digit):
                      </label>
                      <input
                        type="text"
                        defaultValue="3201234567890005"
                        maxLength={16}
                        className="w-full h-10 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                        Email Siswa:
                      </label>
                      <input
                        type="email"
                        defaultValue="budi.santoso@gmail.com"
                        className="w-full h-10 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                        Nomor WhatsApp / HP:
                      </label>
                      <input
                        type="text"
                        defaultValue="081234567891"
                        className="w-full h-10 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                        Tanggal Masuk Pelatihan:
                      </label>
                      <input
                        type="date"
                        defaultValue="2026-09-03"
                        className="w-full h-10 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:border-[#DC2626] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button variant="spark" size="md">
                      Daftarkan Siswa & Terbitkan No Induk 01.0005
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* =========================================================================
            LAYAR 5: SUPERADMIN — MANAJEMEN PENILAIAN HARIAN (DESKTOP VIEW)
            ========================================================================= */}
        {activeTab === "layar5" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#F9FAFB]">
                  Layar 5: Superadmin — Monitoring Penilaian & Toolbar Excel
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Instrutur memantau nilai yang diinput mandiri oleh siswa, mengoreksi, atau import/export masal.
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
                placeholder="Cari siswa / nomor induk..."
                className="h-9 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:outline-none"
              />
              <select className="h-9 px-3 text-xs bg-[#0B0F17] border border-[#374151] rounded-lg text-[#F9FAFB] focus:outline-none">
                <option>Semua Program (SMAW, GTAW, GMAW)</option>
                <option>SMAW 6G</option>
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
                      <th className="p-3.5">Siswa</th>
                      <th className="p-3.5">Kriteria</th>
                      <th className="p-3.5 text-center">Nilai</th>
                      <th className="p-3.5">Sumber Input</th>
                      <th className="p-3.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1F2937]">
                    {[
                      {
                        tgl: "03 Sep 2026",
                        nama: "Fajar Pratama (01.0004)",
                        kriteria: "Root Pass",
                        skor: 88,
                        creator: "siswa",
                      },
                      {
                        tgl: "03 Sep 2026",
                        nama: "Fajar Pratama (01.0004)",
                        kriteria: "Hot Pass",
                        skor: 85,
                        creator: "siswa",
                      },
                      {
                        tgl: "03 Sep 2026",
                        nama: "Budi Santoso (01.0002)",
                        kriteria: "Capping Pass",
                        skor: 74,
                        creator: "superadmin",
                      },
                      {
                        tgl: "02 Sep 2026",
                        nama: "Hendra Wijaya (01.0003)",
                        kriteria: "Gerinda",
                        skor: 92,
                        creator: "siswa",
                      },
                    ].map((row, idx) => (
                      <tr key={idx} className="hover:bg-[#1F2937]/40 transition-colors">
                        <td className="p-3.5 font-mono text-[#9CA3AF]">{row.tgl}</td>
                        <td className="p-3.5 font-semibold text-[#F9FAFB]">{row.nama}</td>
                        <td className="p-3.5 text-[#D1D5DB]">{row.kriteria}</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`font-bold px-2 py-0.5 rounded ${
                              row.skor >= 80
                                ? "bg-[#10B981]/20 text-[#10B981]"
                                : "bg-[#F59E0B]/20 text-[#F59E0B]"
                            }`}
                          >
                            {row.skor}
                          </span>
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
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}

        {/* =========================================================================
            LAYAR 6: SUPERADMIN — UJIAN INTERNAL & GATE-CHECK SERTIFIKAT (DESKTOP)
            ========================================================================= */}
        {activeTab === "layar6" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937] flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-[#F9FAFB]">
                  Layar 6: Superadmin — Ujian Internal & Panel Gate-Check Sertifikat
                </h2>
                <p className="text-xs text-[#9CA3AF]">
                  Simulasikan 2 kondisi gate: Sertifikat terkunci (syarat belum terpenuhi) vs Terbuka siap cetak PDF.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#9CA3AF]">Simulasi Kondisi Gate:</span>
                <Button
                  size="sm"
                  variant={gateCondition === "locked" ? "danger" : "outline"}
                  onClick={() => setGateCondition("locked")}
                >
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  Terkunci (Belum Lunas / Nilai &lt; 80)
                </Button>
                <Button
                  size="sm"
                  variant={gateCondition === "unlocked" ? "emerald" : "outline"}
                  onClick={() => setGateCondition("unlocked")}
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
                    Siswa: Fajar Pratama (01.0004) — Program: SMAW 6G Pipa
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
                    ].map((u) => (
                      <div key={u.key} className="p-3 bg-[#0B0F17] border border-[#1F2937] rounded-lg">
                        <label className="text-xs text-[#9CA3AF] block font-medium mb-1">
                          {u.label}
                        </label>
                        <div className="flex items-center justify-between">
                          <input
                            type="number"
                            readOnly
                            value={u.val}
                            className="w-16 h-8 text-center font-bold bg-[#1F2937] rounded text-sm text-[#F9FAFB]"
                          />
                          <Badge variant={u.val >= 80 ? "success" : "danger"}>
                            {u.val >= 80 ? "≥ 80" : "< 80"}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded-lg bg-[#0B0F17] border border-[#1F2937] flex items-center justify-between text-xs">
                    <span className="text-[#9CA3AF]">Status Evaluasi Kelulusan Ujian:</span>
                    {gateCondition === "unlocked" ? (
                      <Badge variant="success" className="text-xs font-bold">
                        ✓ LULUS UJIAN INTERNAL (Semua kriteria ≥ 80)
                      </Badge>
                    ) : (
                      <Badge variant="danger" className="text-xs font-bold">
                        ✕ BELUM LULUS (Filler Pass = 74 &lt; 80)
                      </Badge>
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
                  <div className="p-3 rounded-lg border border-[#1F2937] bg-[#0B0F17] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9CA3AF]">Syarat 1: Keuangan</span>
                      {gateCondition === "unlocked" ? (
                        <Badge variant="success">LUNAS (Rp 0 sisa)</Badge>
                      ) : (
                        <Badge variant="warning">CICIL (Sisa Rp 3.5jt)</Badge>
                      )}
                    </div>
                    <p className="text-[11px] text-[#6B7280]">
                      Total Biaya Program: Rp 8.500.000
                    </p>
                  </div>

                  {/* Syarat 2: Ujian */}
                  <div className="p-3 rounded-lg border border-[#1F2937] bg-[#0B0F17] space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[#9CA3AF]">Syarat 2: Ujian Internal</span>
                      {gateCondition === "unlocked" ? (
                        <Badge variant="success">LULUS (Semua ≥ 80)</Badge>
                      ) : (
                        <Badge variant="danger">BELUM LULUS</Badge>
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
        {activeTab === "ai" && (
          <div className="space-y-6">
            <div className="p-4 rounded-xl bg-[#111827] border border-[#1F2937]">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-[#DC2626]" />
                <h2 className="text-base font-bold text-[#F9FAFB]">
                  Showcase: Asisten Analitik AI (RAG Gemini Flash)
                </h2>
              </div>
              <p className="text-xs text-[#9CA3AF] mt-1">
                Instruktur dapat menanyakan pertanyaan analitik bebas seputar performa bengkel dan siswa.
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
