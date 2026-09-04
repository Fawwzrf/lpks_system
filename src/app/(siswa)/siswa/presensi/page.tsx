"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { MapPin, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";

const BENGKEL_LAT = -6.2088;
const BENGKEL_LON = 106.8456;
const RADIUS_M = 100;

// Haversine distance in meters
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface PresensiItem {
  id: string;
  tanggal: string;
  jam: string;
  status: "Hadir" | "Izin" | "Sakit" | "Alpa";
  jarak_meter?: number;
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  Hadir: <CheckCircle2 className="h-3.5 w-3.5 text-[#10B981]" aria-hidden="true" />,
  Izin:  <AlertTriangle className="h-3.5 w-3.5 text-[#F59E0B]" aria-hidden="true" />,
  Sakit: <AlertTriangle className="h-3.5 w-3.5 text-[#38BDF8]" aria-hidden="true" />,
  Alpa:  <XCircle className="h-3.5 w-3.5 text-[#F43F5E]" aria-hidden="true" />,
};
const STATUS_COLOR: Record<string, string> = {
  Hadir: "text-[#10B981]",
  Izin: "text-[#F59E0B]",
  Sakit: "text-[#38BDF8]",
  Alpa: "text-[#F43F5E]"
};

export default function PresensiSiswaPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Validasi hari: Senin(1)–Kamis(4) + Sabtu(6)
  const hariIni = new Date().getDay();
  const isHariAktif = [1, 2, 3, 4, 6].includes(hariIni);
  const NAMA_HARI = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];

  const [bengkelLoc, setBengkelLoc] = useState({ lat: BENGKEL_LAT, lng: BENGKEL_LON, radius: RADIUS_M });
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [geoError, setGeoError] = useState<string | null>(
    typeof window !== "undefined" && !navigator.geolocation
      ? "Browser tidak mendukung geolokasi."
      : null
  );
  const [distance, setDistance] = useState<number | null>(null);
  const [absenDone, setAbsenDone] = useState(false);
  const [absenLoading, setAbsenLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);
  const [riwayat, setRiwayat] = useState<PresensiItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(3);

  // Load initial data: master lokasi, status hari ini, dan riwayat presensi
  const loadData = useCallback(async () => {
    try {
      // 1. Lokasi LPKS
      const resLokasi = await fetch("/api/v1/master/lokasi");
      if (resLokasi.ok) {
        const json = await resLokasi.json();
        const aktif = json.data?.find((l: { is_active: boolean }) => l.is_active) || json.data?.[0];
        if (aktif) {
          setBengkelLoc({
            lat: Number(aktif.lat),
            lng: Number(aktif.lng),
            radius: Number(aktif.radius_meter) || RADIUS_M,
          });
        }
      }

      // 2. Status Presensi Hari Ini
      const resToday = await fetch("/api/v1/presensi/today");
      if (resToday.ok) {
        const json = await resToday.json();
        if (json.data?.sudah_absen) {
          setAbsenDone(true);
        }
        if (typeof json.data?.sisa_percobaan_hari_ini === "number") {
          setRemainingAttempts(json.data.sisa_percobaan_hari_ini);
        }
      }

      // 3. Riwayat Presensi
      const resHistory = await fetch("/api/v1/presensi?limit=10");
      if (resHistory.ok) {
        const json = await resHistory.json();
        setRiwayat(json.data || []);
      }
    } catch (err) {
      console.error("Gagal memuat status presensi:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Radar canvas draw
  const drawRadar = useCallback((dist: number | null) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { width: W, height: H } = canvas;
    const cx = W / 2, cy = H / 2;
    const maxR = W / 2 - 8;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#0B0F17";
    ctx.fillRect(0, 0, W, H);

    // Grid circles
    [0.25, 0.5, 0.75, 1].forEach((f) => {
      ctx.beginPath();
      ctx.arc(cx, cy, maxR * f, 0, Math.PI * 2);
      ctx.strokeStyle = "#1F2937";
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    // Bengkel center dot
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#DC2626";
    ctx.fill();

    // Safe zone ring (radius toleransi)
    ctx.beginPath();
    ctx.arc(cx, cy, maxR * 0.5, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(220,38,38,0.35)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = "#6B7280";
    ctx.font = "10px system-ui";
    ctx.textAlign = "left";
    ctx.fillText(`${bengkelLoc.radius}m`, cx + maxR * 0.5 + 4, cy + 4);
    ctx.fillText(`${bengkelLoc.radius * 2}m`, cx + maxR * 1 + 4, cy + 4);

    // User pin
    if (dist !== null) {
      const maxRange = bengkelLoc.radius * 2;
      const clampedFraction = Math.min(dist / maxRange, 1);
      const userR = maxR * clampedFraction;
      const inZone = dist <= bengkelLoc.radius;

      // Pulse ring
      ctx.beginPath();
      ctx.arc(cx + userR * 0.7, cy - userR * 0.3, 10, 0, Math.PI * 2);
      ctx.strokeStyle = inZone ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)";
      ctx.lineWidth = 4;
      ctx.stroke();

      // Pin
      ctx.beginPath();
      ctx.arc(cx + userR * 0.7, cy - userR * 0.3, 6, 0, Math.PI * 2);
      ctx.fillStyle = inZone ? "#10B981" : "#F59E0B";
      ctx.fill();
    }
  }, [bengkelLoc]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos);
        setGeoError(null);
        const d = haversine(pos.coords.latitude, pos.coords.longitude, bengkelLoc.lat, bengkelLoc.lng);
        setDistance(Math.round(d));
        drawRadar(d);
      },
      () => setGeoError("Izin lokasi ditolak atau tidak tersedia. Pastikan GPS aktif."),
      { enableHighAccuracy: true, maximumAge: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [drawRadar, bengkelLoc]);

  useEffect(() => {
    drawRadar(distance);
  }, [distance, drawRadar]);

  const inZone = distance !== null && distance <= bengkelLoc.radius;
  const alreadyAbsen = absenDone;

  async function doAbsen() {
    if (!inZone || alreadyAbsen || !position) return;
    setAbsenLoading(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const res = await fetch("/api/v1/presensi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error?.message || "Gagal mencatat presensi.");
        if (data.error?.code === "ALREADY_CHECKED_IN") {
          setAbsenDone(true);
        }
        return;
      }

      setSubmitSuccess(data.data?.message || "Presensi berhasil dicatat!");
      setAbsenDone(true);
      await loadData();
    } catch {
      setSubmitError("Tidak dapat terhubung ke server presensi.");
    } finally {
      setAbsenLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">Presensi GPS</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">
          Absen tersedia Senin–Kamis dan Sabtu, di area bengkel (radius {bengkelLoc.radius}m).
        </p>
      </div>

      {/* Banner hari tidak aktif */}
      {!isHariAktif && (
        <div className="rounded-xl border border-[#6B7280]/30 bg-[#1F2937] px-4 py-3 flex items-center gap-3">
          <span className="text-lg" aria-hidden="true">🚫</span>
          <div>
            <p className="text-xs font-semibold text-[#D1D5DB]">
              Hari {NAMA_HARI[hariIni]} — Tidak Ada Sesi
            </p>
            <p className="text-[11px] text-[#6B7280] mt-0.5">
              Presensi hanya bisa dilakukan Senin–Kamis dan Sabtu.
            </p>
          </div>
        </div>
      )}

      {/* Radar Map */}
      <div className="rounded-xl border border-[#1F2937] bg-[#111827] overflow-hidden">
        <canvas
          ref={canvasRef}
          width={320}
          height={220}
          className="w-full"
          style={{ maxHeight: 220 }}
          aria-label="Peta radar geofencing bengkel"
        />
      </div>

      {/* Distance Indicator */}
      <div className={`rounded-xl border p-4 flex items-center gap-3 ${inZone ? "border-[#10B981]/30 bg-[#10B981]/8" : "border-[#F59E0B]/30 bg-[#F59E0B]/8"}`}>
        <MapPin className={`h-5 w-5 shrink-0 ${inZone ? "text-[#10B981]" : "text-[#F59E0B]"}`} aria-hidden="true" />
        <div className="flex-1">
          <p className={`text-sm font-bold ${inZone ? "text-[#10B981]" : "text-[#F9FAFB]"}`}>
            {geoError
              ? "Lokasi tidak tersedia"
              : distance !== null
                ? `${distance} m dari bengkel`
                : "Mendeteksi lokasi..."}
          </p>
          <p className="text-[11px] text-[#6B7280]">
            {inZone
              ? `Anda berada dalam zona presensi (maks. ${bengkelLoc.radius}m) ✓`
              : `Di luar zona presensi (> ${bengkelLoc.radius}m)`}
          </p>
        </div>
      </div>

      {/* Feedback Messages */}
      {submitError && (
        <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs text-[#F43F5E] flex items-center gap-2">
          <XCircle className="h-4 w-4 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}
      {submitSuccess && (
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-xs text-[#10B981] flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{submitSuccess}</span>
        </div>
      )}

      {/* Absen Button */}
      {alreadyAbsen ? (
        <div className="flex items-center justify-center gap-2 h-12 rounded-xl bg-[#10B981]/15 border border-[#10B981]/30 text-[#10B981] text-sm font-semibold">
          <CheckCircle2 className="h-5 w-5" aria-hidden="true" /> Absen Hari Ini Tercatat!
        </div>
      ) : (
        <button
          onClick={doAbsen}
          disabled={!inZone || absenLoading || !isHariAktif || remainingAttempts <= 0}
          className="h-12 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
          aria-disabled={!inZone || !isHariAktif || remainingAttempts <= 0}
        >
          {absenLoading
            ? <><Loader2 className="h-4 w-4 animate-spin" /> Mencatat absen...</>
            : <><MapPin className="h-4 w-4" aria-hidden="true" /> Absen Sekarang {remainingAttempts < 3 && `(Sisa ${remainingAttempts}x)`}</>}
        </button>
      )}

      {/* Riwayat Log */}
      <section aria-label="Riwayat presensi siswa">
        <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest mb-3 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Riwayat Presensi
        </h2>
        {loadingHistory ? (
          <div className="flex items-center justify-center py-6 text-xs text-[#6B7280] gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-[#DC2626]" /> Memuat riwayat...
          </div>
        ) : riwayat.length === 0 ? (
          <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-6 text-center text-xs text-[#6B7280]">
            Belum ada riwayat presensi yang tercatat.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {riwayat.map((entry) => (
              <li
                key={entry.id}
                className="flex items-center gap-3 bg-[#111827] rounded-xl border border-[#1F2937] px-4 py-3"
              >
                {STATUS_ICON[entry.status] || STATUS_ICON["Hadir"]}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[#D1D5DB] truncate">{entry.tanggal}</p>
                  {typeof entry.jarak_meter === "number" && (
                    <p className="text-[11px] text-[#6B7280]">{Math.round(entry.jarak_meter)} m dari bengkel</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-semibold ${STATUS_COLOR[entry.status] || "text-[#10B981]"}`}>{entry.status}</p>
                  <p className="text-[10px] font-mono text-[#6B7280]">{entry.jam || "—"}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
