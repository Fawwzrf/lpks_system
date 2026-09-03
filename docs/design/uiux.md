# Design: UI/UX System — LPKS Pengelasan Sumbu Hidup

---

## Dokumen 1: UI Style Guide / Design System

### 1.1 Persona & User Journey Map

#### Persona 1: Instruktur / Superadmin (Pak Bambang)
- **Profil:** Bertanggung jawab atas administrasi, kelengkapan berkas fisik siswa, memantau keuangan, mengawasi praktek las di workshop, memverifikasi nilai harian, dan mencetak sertifikat resmi.
- **Perangkat:** Laptop di kantor LPKS dan Tablet saat berada di area workshop.
- **Journey Utama:**
  1. **Pendaftaran:** Buka menu Pendaftaran $\rightarrow$ Ceklis 5 berkas fisik $\rightarrow$ Input biodata lengkap siswa $\rightarrow$ Sistem otomatis men-generate Nomor Induk (`kode_program.No_siswa`).
  2. **Monitoring & Override Nilai:** Membuka dashboard Penilaian Harian $\rightarrow$ Memantau nilai yang diinput mandiri oleh siswa $\rightarrow$ Mengoreksi/override nilai jika terjadi kesalahan input atau menginputkan manual untuk siswa.
  3. **Kelulusan & Sertifikasi:** Cek status siswa di modul Ujian $\rightarrow$ Validasi gate-check otomatis (Status Keuangan: LUNAS dan Ujian Teori + 5 Kriteria Praktek $\ge 80$) $\rightarrow$ Klik "Cetak Sertifikat" (PDF siap unduh/cetak).

#### Persona 2: Siswa Welder (Fajar)
- **Profil:** Siswa pelatihan pengelasan yang fokus meningkatkan keterampilan 5 kriteria pengelasan (*Root, Hotpass, Filler, Capping, Gerinda*), datang harian, dan memantau status kelulusan pribadi.
- **Perangkat:** Smartphone pribadi (Android/iOS) via mobile browser.
- **Journey Utama:**
  1. **Presensi Harian:** Tiba di bengkel LPKS $\rightarrow$ Buka aplikasi di HP $\rightarrow$ Klik tombol "Absen Sekarang" $\rightarrow$ Validasi GPS geofencing radius $\le 100$ meter berhasil $\rightarrow$ Status "Hadir" tercatat.
  2. **Input Nilai Praktek Mandiri:** Selesai sesi pengelasan $\rightarrow$ Instruktur memeriksa hasil sambungan las dan memberikan nilai $\rightarrow$ Siswa membuka menu "Input Nilai" di HP $\rightarrow$ Memasukkan nilai per kriteria (0–100) yang didapat hari itu $\rightarrow$ Simpan.
  3. **Evaluasi Progres:** Buka menu "Transkrip" $\rightarrow$ Memantau grafik garis fluktuasi nilai 5 kriteria $\rightarrow$ Melihat kriteria mana yang sudah konsisten mencapai $\ge 80$ $\rightarrow$ Membaca Ringkasan Progres Mingguan dari AI.
  4. **Penyelesaian:** Cek status tagihan $\rightarrow$ Mengikuti ujian internal $\rightarrow$ Mengunduh E-Sertifikat saat seluruh syarat terpenuhi.

---

### 1.2 Arsitektur Informasi & Struktur Navigasi

```
LPKS Sumbu Hidup
├── (auth)
│   ├── Login (Email & Password - Superadmin & Siswa)
├── (superadmin) [Sidebar Desktop / Drawer Tablet]
│   ├── Dashboard (Statistik Siswa Aktif, Absensi Hari Ini, Pemasukan, AI Quick Insights)
│   ├── Pendaftaran (Checklist Berkas Fisik -> Form Input Biodata & Auto No Induk)
│   ├── Data Siswa (Direktori Siswa, Filter Aktif/Alumni, Download Template/Import/Export Excel)
│   ├── Presensi GPS (Log Kehadiran Harian, Jarak Meter, Override Manual Izin/Sakit/Alpa, Rekap Excel)
│   ├── Keuangan (Pencatatan Transaksi Pembayaran, Status Lunas/Cicil, Sisa Tagihan, Ekspor Excel)
│   ├── Penilaian Harian (Monitoring Nilai Siswa, Input/Override Admin, Riwayat & Grafik Tren)
│   ├── Ujian & Sertifikat (Input Nilai Ujian Teori & 5 Praktek, Gate Check Kelulusan & Cetak PDF)
│   ├── Master Data Dinamis (Titik Lokasi & Radius GPS, Program Pelatihan, Kriteria Nilai, Syarat Berkas)
│   └── AI Showcase (Chatbot Analitik RAG & Generator Ringkasan Mingguan)
└── (siswa) [Bottom Navigation Bar Mobile]
    ├── Beranda (Ringkasan Status Pribadi, Pengumuman, AI Weekly Narrative Summary)
    ├── Presensi (Tombol Presensi GPS 1-Tap, Indikator Jarak, Log Kehadiran)
    ├── Input Nilai (Form Input Nilai Mandiri per Kriteria yang Dinilai Instruktur)
    ├── Transkrip & Grafik (Visualisasi Tren 5 Kriteria, Status Kompetensi >= 80)
    └── Keuangan & Sertifikat (Rincian Cicilan/Lunas, Download E-Sertifikat PDF)
```

---

### 1.3 Design Tokens (Single Source of Truth)

Sesuai database **UI/UX Pro Max** untuk tema *Industrial Craftsmanship & Clean Technical SaaS*:

#### Warna (Color Tokens)
```css
:root {
  /* Brand & Struktur (Industrial Slate) */
  --color-primary: #0F172A;          /* Slate 900 */
  --color-on-primary: #FFFFFF;
  --color-secondary: #1E293B;        /* Slate 800 */
  --color-on-secondary: #F8FAFC;

  /* Accent & CTA (Welding Spark Merah) */
  --color-accent: #DC2626;           /* Red 600 - Percikan Api / Spark Merah */
  --color-accent-hover: #B91C1C;     /* Red 700 */
  --color-on-accent: #FFFFFF;

  /* Surfaces & Backgrounds */
  --color-background: #F8FAFC;       /* Slate 50 - Canvas Bersih */
  --color-foreground: #0F172A;       /* Slate 900 */
  --color-card: #FFFFFF;
  --color-card-foreground: #0F172A;
  --color-muted: #F1F5F9;            /* Slate 100 */
  --color-muted-foreground: #64748B; /* Slate 500 */
  --color-border: #E2E8F0;           /* Slate 200 */

  /* Feedback Status */
  --color-success: #059669;          /* Emerald 600 - Lulus / Lunas / Hadir */
  --color-on-success: #FFFFFF;
  --color-destructive: #991B1B;      /* Red 800 - Nilai < 80 / Alpa / Luar Radius */
  --color-on-destructive: #FFFFFF;
  --color-warning: #D97706;          /* Amber 600 - Cicil / Perlu Perhatian */
  --color-on-warning: #FFFFFF;
  --color-info: #0284C7;             /* Sky 600 - Info / Sedang Berjalan */

  /* Focus Ring */
  --color-ring: #DC2626;
}

/* Dark Mode Tokens (Opsional untuk Workshop Low-Glare) */
.dark {
  --color-background: #090D16;
  --color-foreground: #F8FAFC;
  --color-card: #0F172A;
  --color-card-foreground: #F8FAFC;
  --color-muted: #1E293B;
  --color-muted-foreground: #94A3B8;
  --color-border: #334155;
  --color-primary: #F8FAFC;
  --color-on-primary: #0F172A;
}
```

#### Tipografi (Typography Tokens)
- **Primary Font Family:** `'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif` (Keterbacaan tinggi di mobile dan tablet).
- **Data & Metric Font Family:** `'Fira Code', 'JetBrains Mono', monospace` (Untuk Nomor Induk, nilai numerik 0-100, jarak meter, dan nominal rupiah).

| Tingkat | Ukuran Font | Weight | Line Height | Tracking | Penggunaan |
|---|---|---|---|---|---|
| **Display / H1** | 28px (1.75rem) | 700 (Bold) | 1.2 | -0.02em | Judul Modul Utama Dashboard |
| **H2** | 20px (1.25rem) | 600 (Semi-Bold)| 1.3 | -0.01em | Judul Kartu / Section / Modal |
| **H3** | 16px (1rem) | 600 (Semi-Bold)| 1.4 | 0 | Sub-judul tabel / form header |
| **Body (Normal)** | 14px (0.875rem)| 400 (Regular) | 1.5 | 0 | Teks umum, instruksi, konten tabel |
| **Body (Small)** | 12px (0.75rem) | 500 (Medium) | 1.4 | +0.01em | Keterangan, badge status, label input |
| **Metric Large** | 32px (2rem) | 700 (Bold) | 1.1 | -0.02em | Angka skor nilai besar, status presensi |

#### Spacing & Radius
- **Base Unit:** `4px`
- **Scale:** `4px` (xs), `8px` (sm), `12px` (md), `16px` (lg), `24px` (xl), `32px` (2xl), `48px` (3xl)
- **Border Radius:** `6px` (sm - tombol/input), `10px` (md - card/dialog), `9999px` (full - badge/pill)

#### Ikonografi
- **Library:** `lucide-react`
- **Gaya:** Clean Outline, Stroke Width: `1.75px`
- **Ukuran Standar:** `18px` (dalam tombol/tabel), `24px` (navigasi), `32px` (kartu fitur)

---

### 1.4 Kondisi Elemen Interaktif (Component States)

| Komponen | Default | Hover | Active / Focus | Disabled |
|---|---|---|---|---|
| **Primary Button** (Spark Merah) | Background `#DC2626`, teks putih | Background `#B91C1C`, scale 1.01 | Outline ring 2px `#DC2626` offset 2px | Opacity 50%, cursor not-allowed |
| **Secondary Button** (Slate Outline) | Border 1px `#E2E8F0`, teks `#0F172A` | Background `#F1F5F9`, border `#CBD5E1` | Background `#E2E8F0` | Opacity 40%, border `#E2E8F0` |
| **Input Form** | Border 1px `#CBD5E1`, bg `#FFFFFF` | Border `#94A3B8` | Ring 2px `#DC2626`, border transparan | Bg `#F1F5F9`, teks `#94A3B8` |
| **Interactive Card** | Bg `#FFFFFF`, shadow-sm, border `#E2E8F0` | Border `#CBD5E1`, shadow-md | Border `#DC2626` | Opacity 60% |
| **Status Badge** | Padding 2px 8px, font 12px medium, rounded-full | - | - | - |

---

### 1.5 Prinsip Motion & Aksesibilitas

- **Motion Curves:** Transisi cepat `150ms – 200ms ease-out` untuk hover dan popup. Animasi pulse perlahan pada indikator GPS saat memindai lokasi.
- **Dukungan `prefers-reduced-motion`:** Menghilangkan transisi jika mode ini aktif di OS pengguna.
- **Aksesibilitas (WCAG AA Checklist):**
  - [x] Kontras rasio teks vs background minimal 4.5:1 untuk semua teks kritis (terbaca di bawah terik matahari atau pencahayaan bengkel).
  - [x] Target sentuh (*touch target*) minimal $48\times48\text{ px}$ pada mobile (terutama tombol Presensi dan tombol Simpan Nilai).
  - [x] Status tidak hanya ditandai warna: Badge "Lunas / $\ge 80$" memiliki ikon ceklis (`CheckCircle2`), sedangkan "Belum Lunas / $< 80$" memiliki ikon tanda seru (`AlertCircle`).
  - [x] Mendukung navigasi keyboard penuh (tabbing & focus indicator) di dashboard desktop.

---

## Dokumen 2: Wireframes (Spesifikasi Layar Utama)

### Layar 1: Portal Siswa — Beranda & Presensi GPS (Mobile View)
- **Header:** Salam personal, Nama Siswa, Nomor Induk (`01.0004`), Program (`SMAW 6G`).
- **GPS Presensi Card (Fokus Utama - Live Tracking via `navigator.geolocation.watchPosition`):**
  - Pelacakan Real-time: Browser otomatis melacak posisi tanpa reload halaman.
  - Indikator Jarak Dinamis: "Jarak Anda saat ini: X meter dari LPKS".
  - **Status Tombol Otomatis:**
    - Jika Jarak $> 100\text{m}$: Tombol `[📍 ABSEN SEKARANG]` **Disabled (abu-abu terkunci)**, disertai teks instruksi *"Mendekatlah ke area bengkel LPKS (dalam radius 100m) untuk mengaktifkan presensi."*
    - Jika Jarak $\le 100\text{m}$: Tombol otomatis **Enabled (Hijau Emerald menyala)**, teks *"Anda berada di area bengkel! Klik untuk presensi."*
  - Feedback jika sudah absen hari ini: Tombol berganti menjadi Banner Sukses *"✅ Anda sudah presensi hari ini pukul 07:45 WIB"*.
- **Ringkasan Nilai Card:**
  - Status Kelayakan Ujian: `[3 dari 5 Kriteria Telah Mencapai >= 80]`.
- **AI Weekly Insight Banner:**
  - Card ringkas berisi 2-3 kalimat narasi AI progres minggu ini: *"Performa capping Anda meningkat pesat (+15 poin), pertahankan konsistensi gerinda untuk persiapan ujian internal."*

### Layar 2: Portal Siswa — Form Input Nilai Mandiri (Mobile View)
- **Tujuan:** Memfasilitasi siswa mencatat nilai yang diberikan instruktur saat praktek.
- **Struktur Elemen:**
  - Tanggal Latihan: Date picker (default hari ini).
  - Pilihan Kriteria (Bisa centang 1 atau beberapa yang dinilai hari itu):
    - [ ] Root $\rightarrow$ [ Input Nilai: 0 - 100 ]
    - [ ] Hotpass $\rightarrow$ [ Input Nilai: 0 - 100 ]
    - [ ] Filler $\rightarrow$ [ Input Nilai: 0 - 100 ]
    - [ ] Capping $\rightarrow$ [ Input Nilai: 0 - 100 ]
    - [ ] Gerinda $\rightarrow$ [ Input Nilai: 0 - 100 ]
  - Tombol Simpan: `[Simpan Nilai Praktek]` (CTA Spark Merah).
  - Riwayat Input Terbaru: Daftar tanggal & skor yang baru saja diinput, dengan badge `Menunggu Verifikasi Instruktur` / `Tervalidasi`.

### Layar 3: Portal Siswa — Transkrip & Grafik Tren (Mobile/Desktop View)
- **Grafik Metrik Tren (Recharts):**
  - Multi-line chart interaktif menunjukkan progres harian (Sumbu X: Tanggal, Sumbu Y: Nilai 0–100).
  - Garis batas kompetensi: Garis putus-putus merah di angka **80**.
  - 5 garis warna berbeda untuk masing-masing kriteria (*Root, Hotpass, Filler, Capping, Gerinda*).
  - Titik data hanya muncul pada tanggal saat kriteria tersebut dinilai (tidak drop ke 0 saat tidak latihan/absen).
- **Tabel Rekapitulasi Status Kompetensi:**
  - Daftar 5 kriteria beserta nilai tertinggi yang pernah dicapai dan status: `Lulus Ambang Batas (>= 80)` atau `Belum Memenuhi (< 80)`.

### Layar 4: Superadmin — Dashboard & Pendaftaran (Desktop View)
- **Sidebar Navigasi:** Logo LPKS Sumbu Hidup, menu modul dengan badge indikator.
- **Modul Pendaftaran:**
  - **Tahap 1 (Checklist Berkas Fisik):**
    - [ ] Fotokopi Ijazah (2 lembar)
    - [ ] Fotokopi KTP (2 lembar)
    - [ ] Fotokopi KK (2 lembar)
    - [ ] Pas foto 3x4 latar merah (3 lembar)
    - [ ] Surat Keterangan Sehat (1 lembar)
  - **Tahap 2 (Form Biodata - Terbuka setelah 5 checklist tercentang):**
    - Dropdown Program Pelatihan (Kode otomatis terpilih, misal `01`).
    - Nomor Induk Preview: `01.0005` (terhitung otomatis dari nomor urut terakhir).
    - Grid Form: NIK (16 digit), Nama Lengkap, Tempat & Tgl Lahir, Alamat Lengkap, Orang Tua, Kontak, NISN, Tgl Masuk.
    - Tombol Submit: `[Daftarkan Siswa & Terbitkan No Induk]`.

### Layar 5: Superadmin — Manajemen Penilaian Harian (Desktop View)
- **Filter Bar:** Pilih Siswa, Pilih Program, Rentang Tanggal.
- **Tabel Nilai Harian:**
  - Kolom: Tanggal | Nama Siswa | Kriteria | Nilai | Input Oleh (`siswa` atau `superadmin`) | Aksi (Edit / Hapus).
- **Aksi Cepat Admin:**
  - Tombol `[+ Input Nilai Manual / Koreksi]`: Memungkinkan instruktur menginput nilai langsung atas nama siswa atau mengoreksi salah input dari siswa.
  - Tombol `[Template Excel]`, `[Import Excel]`, `[Export Excel]`.

### Layar 6: Superadmin — Ujian Internal & Cetak Sertifikat (Desktop View)
- **Tabel Siswa Siap Ujian:**
  - Siswa yang kelima kriteria hariannya sudah mencapai $\ge 80$.
- **Form Input Ujian:**
  - Input Nilai Teori (0-100) + Input 5 Kriteria Praktek Ujian (Root, Hotpass, Filler, Capping, Gerinda).
- **Gate-Check & Cetak Sertifikat Panel:**
  - Indikator Syarat 1: Ujian Internal $\ge 80$ di semua kriteria $\rightarrow$ `[TERPENUHI / BELUM]`.
  - Indikator Syarat 2: Keuangan $\rightarrow$ `[LUNAS (Rp 0 sisa) / BELUM LUNAS]`.
  - Tombol Aksi: `[Cetak Sertifikat Resmi (PDF)]` (Aktif hanya jika kedua syarat hijau; jika belum, muncul tooltip rincian kekurangan).

---

## Dokumen 3: Interactive Prototype Flow (Alur Kritis)

1. **Alur Presensi Siswa:**
   `Login Siswa` $\rightarrow$ `Dashboard Siswa` $\rightarrow$ `Deteksi Geolocation Browser` $\rightarrow$ `Hitung Jarak (Haversine)` $\rightarrow$ `Tekan Tombol Hadir` $\rightarrow$ `Status Berubah "Tercatat Hadir"`.
2. **Alur Penilaian Mandiri & Verifikasi:**
   `Siswa buka Input Nilai` $\rightarrow$ `Input Skor Praktek dari Instruktur` $\rightarrow$ `Simpan` $\rightarrow$ `Grafik Transkrip Otomatis Mengupdate Titik Data Baru` $\rightarrow$ `Admin memantau di tabel Penilaian Harian (dapat mengedit bila ada revisi)`.
3. **Alur Pendaftaran hingga Penerbitan No Induk:**
   `Admin buka Pendaftaran` $\rightarrow$ `Ceklis 5 Berkas Fisik` $\rightarrow$ `Form Biodata Aktif` $\rightarrow$ `Submit` $\rightarrow$ `No Induk 01.XXXX Terbit` $\rightarrow$ `Data Masuk ke Direktori Siswa Aktif`.
4. **Alur Gate-Check Sertifikat:**
   `Admin buka modul Ujian` $\rightarrow$ `Sistem memverifikasi status LUNAS dan UJIAN >= 80` $\rightarrow$ `Tombol Cetak Aktif` $\rightarrow$ `Unduh PDF Sertifikat Instan`.

---

## Dokumen 4: Daftar Aset Visual

1. **Ikonografi:** Lucide Icons (sudah terintegrasi dengan shadcn/ui & React):
   - `MapPin`, `Navigation` (Presensi GPS)
   - `CheckSquare`, `Square` (Checklist Berkas Fisik)
   - `Flame`, `ShieldCheck` (Pengelasan & Kualifikasi Kompetensi)
   - `TrendingUp`, `BarChart2` (Grafik Metrik Nilai)
   - `Award`, `FileText`, `Printer` (Sertifikat & Ujian)
   - `Sparkles`, `Bot` (Fitur AI Showcase & Weekly Narrative)
2. **Komponen UI:** shadcn/ui primitives (Dialog, Button, Card, Table, Form, Tabs, Badge, Tooltip, Calendar).
3. **Komponen Grafik:** Recharts (`ResponsiveContainer`, `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `Legend`, `ReferenceLine` pada nilai 80).
4. **Template Sertifikat:** Template SVG / Canvas standar dengan frame ornamen resmi LPKS, logo lembaga, stempel digital, dan tanda tangan instruktur.
