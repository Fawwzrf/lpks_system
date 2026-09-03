# LPKS System — Sistem Manajemen Pelatihan Pengelasan "Sumbu Hidup"

Sistem informasi manajemen berbasis web untuk Lembaga Pelatihan Kerja Swasta (LPKS) spesialisasi pengelasan (SMAW, GTAW, GMAW). Dibangun dengan arsitektur monolitik modern berbasis **Next.js 15 App Router** dan **Supabase Backend-as-a-Service**.

## Modul Utama

1. **Pendaftaran Siswa Fisik & Nomor Induk Otomatis:** Verifikasi 5 berkas fisik dengan penomoran unik berurutan berbasis program (`{kode_program}.{no_urut}`).
2. **Data Siswa & Transkrip Akademik:** Filter siswa aktif & alumni, riwayat lengkap dan transkrip perkembangan.
3. **Presensi Harian Geofencing GPS:** Validasi kehadiran presisi tinggi dengan toleransi radius 100m, live-tracking real-time, dan proteksi anti trial-and-error.
4. **Penilaian Praktek Harian:** Input mandiri siswa & manual superadmin untuk 5 kriteria pengelasan (*Root, Hotpass, Filler, Capping, Gerinda*) divisualisasikan dengan Recharts.
5. **Pencatatan Keuangan:** Tracking transaksi pembayaran cicil/lunas dengan kalkulasi otomatis sisa tagihan.
6. **Ujian Internal & Sertifikat Resmi:** Syarat kelulusan mutlak ($\ge 80$) dengan gate-check otomatis (Lunas + Lulus) untuk download PDF sertifikat.
7. **Master Data Dinamis:** Manajemen program, kriteria nilai, syarat berkas, dan titik GPS koordinat LPKS.
8. **AI Showcase (Google Gemini Flash):** Analitik data berbasis teks bahasa alami (RAG) dan narasi progres mingguan siswa.

---

## Tech Stack

- **Frontend & Serverless:** Next.js 15 (App Router, React 19, TypeScript)
- **Styling:** Tailwind CSS v4 (Theme: Spark Merah `#DC2626` & Industrial Charcoal `#0B0F17`)
- **Backend & Database:** Supabase (PostgreSQL, Supabase Auth JWT, Row Level Security)
- **AI Analytics:** Google Gemini 2.5 Flash SDK (`@google/genai`)
- **Visualisasi & I/O:** Recharts, SheetJS (Excel), jsPDF (Sertifikat)

---

## Memulai Instalasi Lokal

### 1. Prasyarat
- Node.js v20+ atau v22+
- Akun Supabase (gratis)
- API Key Google Gemini (gratis via Google AI Studio)

### 2. Setup Environment
Salin file `.env.example` ke `.env.local`:
```bash
cp .env.example .env.local
```
Lalu lengkapi `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, dan `GEMINI_API_KEY`.

### 3. Setup Database
Buka SQL Editor di dashboard Supabase Anda, lalu salin dan jalankan isi file:
```
supabase/migrations/00001_initial_schema.sql
```

### 4. Menjalankan Server Development
```bash
npm run dev
```
Buka [http://localhost:3000](http://localhost:3000) pada browser Anda.
