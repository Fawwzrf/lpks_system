"use client";

import React, { useEffect, useState, useCallback } from "react";
import { MapPin, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock, Navigation, ExternalLink, RefreshCw } from "lucide-react";
import { haversineDistance } from "@/lib/geo";
import { Skeleton } from "@/components/ui/skeleton";

// Default koordinat LPKS Sumbu Hidup (Cilacap) jika belum termuat dari master
const BENGKEL_LAT = -7.69897507696962;
const BENGKEL_LON = 109.010520861496;
const RADIUS_M = 100;

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
  Izin:  "text-[#F59E0B]",
  Sakit: "text-[#38BDF8]",
  Alpa:  "text-[#F43F5E]",
};

export default function PresensiSiswaPage() {
  // Validasi hari: Senin(1)–Kamis(4) + Sabtu(6)
  const hariIni = new Date().getDay();
  const isHariAktif = [1, 2, 3, 4, 6].includes(hariIni);
  const NAMA_HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const [bengkelLoc, setBengkelLoc] = useState({
    nama: "LPKS Sumbu Hidup",
    lat: BENGKEL_LAT,
    lng: BENGKEL_LON,
    radius: RADIUS_M,
  });
  const [position, setPosition] = useState<GeolocationPosition | null>(null);
  const [geoError, setGeoError] = useState<string | null>(
    typeof window !== "undefined" && !navigator.geolocation
      ? "Browser tidak mendukung geolokasi GPS."
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
  const [mapType, setMapType] = useState<"m" | "k">("m"); // m=normal map, k=satellite

  // Load initial data: master lokasi, status hari ini, dan riwayat presensi
  const loadData = useCallback(async () => {
    try {
      // 1. Lokasi LPKS dari database (handle format object maupun array)
      const resLokasi = await fetch("/api/v1/master/lokasi");
      if (resLokasi.ok) {
        const json = await resLokasi.json();
        const aktif = Array.isArray(json.data)
          ? json.data.find((l: { is_active?: boolean }) => l.is_active) || json.data[0]
          : json.data;

        if (aktif && typeof aktif.lat === "number" && typeof aktif.lng === "number") {
          setBengkelLoc({
            nama: aktif.nama_titik || "LPKS Sumbu Hidup",
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
      console.error("Gagal memuat data presensi:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Pantau posisi GPS real-time pengguna
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setPosition(pos);
        setGeoError(null);
        const d = haversineDistance(
          pos.coords.latitude,
          pos.coords.longitude,
          bengkelLoc.lat,
          bengkelLoc.lng
        );
        setDistance(Math.round(d));
      },
      (err) => {
        if (err.code === 1) {
          setGeoError("Akses lokasi ditolak. Silakan izinkan izin GPS di pengaturan browser.");
        } else if (err.code === 2) {
          setGeoError("Sinyal GPS tidak dapat ditemukan. Pastikan lokasi aktif.");
        } else {
          setGeoError("Waktu permintaan lokasi habis. Coba lagi.");
        }
      },
      { enableHighAccuracy: true, maximumAge: 3000, timeout: 15000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [bengkelLoc]);

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

      {/* Visualisasi Google Maps Resmi */}
      <div className="relative rounded-2xl border border-[#1F2937] bg-[#111827] overflow-hidden shadow-xl">
        {/* Kontrol Toggle Tampilan Google Maps */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-[#111827]/90 backdrop-blur-md border border-[#374151] p-1 rounded-xl shadow-lg">
          <button
            type="button"
            onClick={() => setMapType("m")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
              mapType === "m"
                ? "bg-[#DC2626] text-white shadow-sm"
                : "text-[#9CA3AF] hover:text-white"
            }`}
          >
            Peta
          </button>
          <button
            type="button"
            onClick={() => setMapType("k")}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors ${
              mapType === "k"
                ? "bg-[#DC2626] text-white shadow-sm"
                : "text-[#9CA3AF] hover:text-white"
            }`}
          >
            Satelit
          </button>
        </div>

        {/* Header Info Lokasi Google Maps */}
        <div className="absolute top-3 left-3 z-10 max-w-[calc(100%-140px)]">
          <div className="bg-[#111827]/90 backdrop-blur-md border border-[#374151] rounded-xl px-3 py-2 flex items-center gap-2.5 shadow-xl">
            <div className="w-7 h-7 rounded-lg bg-[#DC2626] flex items-center justify-center text-white shrink-0 shadow-md">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{bengkelLoc.nama}</p>
              <p className="text-[10px] text-[#9CA3AF] truncate">Radius Geofence: {bengkelLoc.radius}m</p>
            </div>
          </div>
        </div>

        {/* Google Maps Embed Frame */}
        <div className="relative w-full h-[260px] sm:h-[300px] bg-[#0E131F]">
          <iframe
            title="Google Maps Lokasi LPKS Sumbu Hidup"
            src={`https://maps.google.com/maps?q=${bengkelLoc.lat},${bengkelLoc.lng}&t=${mapType}&hl=id&z=18&output=embed`}
            className="w-full h-full border-0"
            loading="lazy"
            allowFullScreen
          />

          {/* Floating Action di Bawah Map */}
          <div className="absolute bottom-3 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
            <div
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold backdrop-blur-md border shadow-lg flex items-center gap-2 pointer-events-auto ${
                inZone
                  ? "bg-[#064E3B]/90 border-[#059669] text-[#34D399]"
                  : "bg-[#78350F]/90 border-[#D97706] text-[#FCD34D]"
              }`}
            >
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    inZone ? "bg-[#10B981]" : "bg-[#F59E0B]"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    inZone ? "bg-[#10B981]" : "bg-[#F59E0B]"
                  }`}
                />
              </span>
              <span>{inZone ? "Dalam Radius Presensi" : "Di Luar Radius"}</span>
            </div>

            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${bengkelLoc.lat},${bengkelLoc.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-white/95 hover:bg-white text-[#111827] text-xs font-bold px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1.5 transition-all pointer-events-auto shrink-0"
              title="Buka rute navigasi di Google Maps"
            >
              <Navigation className="h-3.5 w-3.5 text-[#2563EB]" />
              <span>Petunjuk Arah</span>
              <ExternalLink className="h-3 w-3 text-[#6B7280]" />
            </a>
          </div>
        </div>
      </div>

      {/* Distance Indicator */}
      <div
        className={`rounded-xl border p-4 flex items-center gap-3 transition-colors ${
          inZone ? "border-[#10B981]/30 bg-[#10B981]/8" : "border-[#F59E0B]/30 bg-[#F59E0B]/8"
        }`}
      >
        <MapPin
          className={`h-5 w-5 shrink-0 ${inZone ? "text-[#10B981]" : "text-[#F59E0B]"}`}
          aria-hidden="true"
        />
        <div className="flex-1">
          <p className={`text-sm font-bold ${inZone ? "text-[#10B981]" : "text-[#F9FAFB]"}`}>
            {geoError
              ? "Lokasi tidak tersedia"
              : distance !== null
              ? `${distance} m dari bengkel`
              : "Mendeteksi posisi GPS Anda..."}
          </p>
          <p className="text-[11px] text-[#6B7280]">
            {geoError
              ? geoError
              : inZone
              ? `Posisi terverifikasi di dalam area (toleransi maks. ${bengkelLoc.radius}m) ✓`
              : `Anda berada di luar batas absensi. Silakan mendekat ke area LPKS.`}
          </p>
        </div>
        {position && (
          <div className="text-right shrink-0 text-[10px] text-[#6B7280] hidden sm:block">
            Akurasi GPS: ±{Math.round(position.coords.accuracy)}m
          </div>
        )}
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
          {absenLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Mencatat absen...
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" aria-hidden="true" /> Absen Sekarang{" "}
              {remainingAttempts < 3 && `(Sisa ${remainingAttempts}x)`}
            </>
          )}
        </button>
      )}

      {/* Riwayat Log (Bone Page Skeleton saat Loading) */}
      <section aria-label="Riwayat presensi siswa">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-widest flex items-center gap-2">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" /> Riwayat Presensi
          </h2>
          <button
            onClick={loadData}
            className="p-1 rounded-lg hover:bg-[#1F2937] text-[#6B7280] hover:text-white transition-colors"
            title="Segarkan riwayat"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>

        {loadingHistory ? (
          <div className="flex flex-col gap-2">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 bg-[#111827] rounded-xl border border-[#1F2937] px-4 py-3.5"
              >
                <Skeleton className="h-4 w-4 rounded-full bg-[#1F2937]" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <Skeleton className="h-3.5 w-28 bg-[#1F2937]" />
                  <Skeleton className="h-2.5 w-20 bg-[#1F2937]/60" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <Skeleton className="h-3.5 w-12 bg-[#1F2937]" />
                  <Skeleton className="h-2.5 w-16 bg-[#1F2937]/60" />
                </div>
              </div>
            ))}
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
                    <p className="text-[11px] text-[#6B7280]">
                      {Math.round(entry.jarak_meter)} m dari bengkel
                    </p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-xs font-semibold ${STATUS_COLOR[entry.status] || "text-[#10B981]"}`}>
                    {entry.status}
                  </p>
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
