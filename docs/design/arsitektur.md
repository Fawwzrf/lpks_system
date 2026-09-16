# Design: Arsitektur Sistem — LPKS Pengelasan Sumbu Hidup

---

## Dokumen 1: HLD (High-Level Design)

### Pola Arsitektur
**Monolitik Fullstack (Next.js App Router)**

Dipilih karena: satu developer, ~50 user, modal Rp 0, dan semua modul berbagi domain data yang sama (siswa, nilai, pembayaran). Tidak ada justifikasi memisah service. Arsitektur ini mudah di-deploy ke Vercel (gratis), mudah di-debug, dan mudah di-scale belakangan jika diperlukan (extract AI layer ke Edge Function terpisah).

---

### Diagram Komponen

```mermaid
flowchart LR
    subgraph Client["Browser / Smartphone (Siswa & Superadmin)"]
        FE["Next.js Frontend\n(App Router, React)"]
    end

    subgraph Server["Vercel (Free Tier)"]
        API["Next.js API Routes\n(REST, /api/*)"]
        EdgeFn["Supabase Edge Function\n(Cron: AI Weekly Summary)"]
    end

    subgraph Supabase["Supabase (Free Tier)"]
        Auth["Supabase Auth\n(2 role: superadmin, siswa)"]
        DB[("PostgreSQL\n(Supabase DB)")]
        Storage["Supabase Storage\n(template sertifikat PDF)"]
    end

    subgraph AI["AI Provider (Free Tier)"]
        Gemini["Gemini 2.5 Flash API\n(RAG Analytics)"]
        Claude["Claude 3.7 Sonnet API\n(Welding SOP/Consultant)"]
    end

    FE -->|REST fetch| API
    FE -->|GPS Geolocation| API
    FE -->|Supabase SDK auth| Auth
    API --> Auth
    API --> DB
    API --> Storage
    API -->|Prompt + Structured Data| Gemini
    EdgeFn -->|Scheduled Weekly| DB
    EdgeFn -->|Generate Summary| Gemini
```

---

### Tech Stack

| Layer | Teknologi | Alasan |
|---|---|---|
| **Frontend** | Next.js 15 (App Router, React 19) | Fullstack dalam satu repo, SSR/SSG, deploy gratis Vercel |
| **Backend/API** | Next.js API Routes | Satu codebase, tidak butuh server terpisah |
| **Database** | Supabase PostgreSQL | Free-tier generous (500MB), Row Level Security per-role |
| **Auth** | Supabase Auth | JWT bawaan, gratis, support custom roles (superadmin/siswa) |
| **ORM / Query** | Supabase JS Client (`@supabase/supabase-js`) | Native SDK, type-safe dengan `generate-types` |
| **AI (RAG + Summary)** | Gemini Flash API & Claude Sonnet API | Dual-model. Gemini untuk structured-data query cepat, Claude untuk penalaran SOP Las yang kompleks. |
| **Excel I/O** | SheetJS (`xlsx`) | Library client/server, parse & generate `.xlsx` tanpa dependensi berat |
| **PDF Sertifikat** | jsPDF + jsPDF-AutoTable | Generate PDF di sisi client, gratis, tanpa server tambahan |
| **GPS Geofencing** | Browser Native Geolocation API | Tidak butuh vendor pihak ketiga, nol biaya |
| **Charting (Grafik Nilai)** | Recharts | Lightweight, React-native, support line chart per kriteria |
| **Hosting** | Vercel (Free Hobby Tier) | Deploy otomatis dari Git, Edge Runtime, domain gratis |
| **Cron AI Summary** | Supabase Edge Functions (Deno) | Cron scheduler bawaan Supabase, gratis |

---

### Strategi Skalabilitas

Desain sederhana dulu, *scale-ready* belakangan:
- Database Supabase sudah managed PostgreSQL — koneksi pooling tersedia otomatis.
- Caching **belum diterapkan** di fase awal (50 user tidak memerlukan Redis layer). Jika load naik, tambah `unstable_cache` Next.js atau Supabase read replicas.
- AI query menggunakan **structured-data-to-context injection** (query SQL → format JSON/teks → inject ke prompt Gemini). Tidak butuh vector DB / embedding di skala ini.
- `ponytail:` caching skipped — 50 user aktif tidak perlu Redis. Tambah `unstable_cache` + connection pooler (PgBouncer, sudah ada di Supabase) jika MAU melebihi.

---

### Strategi Error Handling & Logging

- **Global Error Handler:** Next.js `error.tsx` per segment untuk FE; API Route wrapper `try/catch` standar yang selalu return `{ error: string, status: number }` terstruktur.
- **Validasi Input:** Zod di sisi API Route sebelum menyentuh database. Validasi geolocation (koordinat & radius) juga di backend, bukan hanya di FE, untuk mencegah manipulasi.
- **AI Fallback:** Jika Gemini API gagal/timeout → return pesan fallback "Asisten tidak tersedia saat ini, coba lagi." — tidak boleh crash halaman.
- **Logging:** `console.error` ke Vercel Log Drain (tersedia di free tier). Tidak pakai Sentry/Datadog dulu — `ponytail:` structured logging via Vercel cukup untuk 50 user; upgrade ke Sentry jika error rate naik.

---

### Environment & Branching

| Environment | Platform | Trigger |
|---|---|---|
| `development` | Localhost (`next dev`) | Kerja harian developer |
| `production` | Vercel | Push ke branch `main` |

- **Branching:** Trunk-based. Commit langsung ke `main` untuk fix kecil. Gunakan `feature/nama-fitur` branch pendek (max 2-3 hari) untuk fitur besar, lalu merge ke `main`.
- **Env Vars:** `.env.local` untuk dev, Vercel Environment Variables untuk prod. Secret tidak pernah di-commit ke repo.

---

## Dokumen 2: LLD (Low-Level Design)

### Struktur Folder Proyek

```
lpks-system/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (auth)/                 # Route group: login/logout pages
│   │   ├── (superadmin)/           # Route group: halaman superadmin
│   │   │   ├── layout.tsx          # Sidebar nav + header (notifications bell)
│   │   │   └── superadmin/
│   │   │       ├── dashboard/
│   │   │       ├── pendaftaran/
│   │   │       ├── siswa/          # Data Siswa (direktori)
│   │   │       ├── presensi/
│   │   │       ├── keuangan/
│   │   │       ├── penilaian/
│   │   │       ├── ujian/          # Ujian + antrean cetak sertifikat batch
│   │   │       ├── master/         # Master Data Dinamis (CRUD konfigurasi)
│   │   │       └── ai/             # AI Showcase (RAG + Summary)
│   │   ├── (siswa)/                # Route group: portal siswa
│   │   │   ├── layout.tsx          # Bottom nav bar + header (notifikasi)
│   │   │   └── siswa/
│   │   │       ├── beranda/        # Dashboard ringkasan pribadi
│   │   │       ├── presensi/       # Self check-in GPS geofencing
│   │   │       ├── nilai/          # Penilaian harian (siswa view)
│   │   │       ├── keuangan/       # Status keuangan siswa
│   │   │       ├── transkrip/      # Transkrip nilai + grafik tren
│   │   │       └── akun/           # Ganti password mandiri
│   │   └── api/v1/                 # API Routes (semua diawali /api/v1/)
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   ├── logout/
│   │       │   ├── me/
│   │       │   └── change-password/
│   │       ├── siswa/
│   │       │   ├── next-id/
│   │       │   └── [id]/credentials/
│   │       ├── presensi/
│   │       │   └── today/
│   │       ├── keuangan/
│   │       │   └── rekap/[siswa_id]/
│   │       ├── penilaian/
│   │       ├── ujian/
│   │       ├── sertifikat/
│   │       │   ├── queue/          # Antrean cetak sertifikat fisik batch
│   │       │   └── [siswa_id]/
│   │       ├── master/
│   │       ├── notifications/      # Notifikasi sistem (bell icon)
│   │       ├── ai/
│   │       │   ├── query/          # RAG endpoint
│   │       │   └── summary/[siswa_id]/
│   │       ├── excel/
│   │       │   ├── template/
│   │       │   ├── import/
│   │       │   └── export/
│   │       └── health/             # Health check endpoint
│   ├── components/                 # Shared UI components
│   ├── lib/
│   │   ├── supabase/               # Supabase client (server, browser, admin)
│   │   ├── api-response.ts         # Shared response helpers + RBAC guards
│   │   ├── gate-checks.ts          # Business logic gates (sertifikat eligibility, dll)
│   │   ├── date-utils.ts           # Format tanggal Indo, Roman month, dll
│   │   ├── nilai-utils.ts          # Kriteria pass map builder
│   │   └── gemini.ts               # Gemini AI client
│   └── types/
│       └── database.ts             # TypeScript types (dari `supabase gen types`)
└── tests/
    ├── unit/                       # Jest unit tests (gates, validasi, geofencing, dll)
    └── integration/                # Integration tests (auth-rbac, presensi flow)
```

---

### Modul-Modul Utama

#### M01 — Auth & Role Guard
- **Tanggung Jawab:** Login/logout Superadmin & Siswa. Normalisasi identifier login: email superadmin dipakai langsung, username siswa dinormalisasi ke `username@lpks.id`. Enforce route protection berdasarkan role via Supabase Auth JWT + Middleware Next.js. Ganti password mandiri via `/api/v1/auth/change-password` (siswa), reset via `/api/v1/siswa/[id]/credentials` (superadmin).
- **Kontrak:** `POST /api/v1/auth/login` `{ identifier, password }` → `{ user: { role, is_password_default, ... } }`. Middleware cek role di setiap request ke `(superadmin)/*` dan `(siswa)/*`.
- **Dependensi:** Supabase Auth, Next.js Middleware.

#### M02 — Modul Pendaftaran
- **Tanggung Jawab:** Verifikasi checklist berkas fisik (form boolean, default 5–6 syarat dari Master Berkas), input biodata siswa lengkap, auto-generate Nomor Induk. Email bersifat opsional (auto-fallback `username@lpks.id` jika kosong).
- **Kontrak:** `POST /api/v1/siswa` → `{ siswa_id, nomor_induk }`. Nomor Induk digenerate di server: cari `no_urut` berikutnya yang tersedia via `GET /api/v1/siswa/next-id`, format `kode_program.XXXX`. Nomor urut dari siswa yang dihapus dapat digunakan kembali.
- **Dependensi:** M08 (Master Program untuk kode program), Supabase DB.

#### M03 — Modul Manajemen Data Siswa
- **Tanggung Jawab:** CRUD biodata siswa, filter status Aktif/Alumni (via `tanggal_keluar`), Import/Export/Template Excel. Soft-delete dengan anonimisasi sesuai UU PDP.
- **Kontrak:** `GET|PUT|DELETE /api/v1/siswa/[id]`, `GET /api/v1/siswa?status=aktif`, Excel I/O via `/api/v1/excel/*`.
- **Dependensi:** Supabase DB, SheetJS (lib/excel).

#### M04 — Modul Presensi GPS Geofencing
- **Tanggung Jawab:** Terima koordinat GPS siswa, hitung jarak ke koordinat LPKS (Haversine formula), tolak jika > radius, catat presensi harian (1x/hari per siswa). Rate limit: max 3 percobaan/siswa/hari.
- **Kontrak:** `POST /api/v1/presensi` `{ lat, lng }` → `{ status, jarak_meter }`. `GET /api/v1/presensi/today` untuk status hari ini. Superadmin: `GET|PUT /api/v1/presensi[/id]` (rekap & override manual).
- **Dependensi:** M08 (Master Lokasi & Radius), Supabase DB.

#### M05 — Modul Catatan Keuangan
- **Tanggung Jawab:** CRUD transaksi pembayaran per siswa, kalkulasi sisa tagihan, status lunas/cicil. Export bulanan format buku kas.
- **Kontrak:** `GET /api/v1/keuangan/rekap/[siswa_id]` → `{ tagihan_total, terbayar, sisa, status }`. `POST /api/v1/keuangan` untuk tambah transaksi. `GET /api/v1/excel/export?modul=keuangan` untuk export buku kas.
- **Dependensi:** M03 (data siswa), M08 (harga program dari Master).

#### M06 — Modul Penilaian Harian
- **Tanggung Jawab:** CRUD nilai harian per siswa per kriteria (skala 0-100). Tentukan kelayakan ujian (semua 5 kriteria ≥ 80 pernah dicapai). Grafik tren Recharts per kriteria. Export Excel rekapan nilai.
- **Kontrak:** `POST /api/v1/penilaian` `{ siswa_id, tanggal, penilaian }`. `GET /api/v1/penilaian?siswa_id=` → riwayat nilai + status kelayakan.
- **Dependensi:** M08 (Master Kriteria), Supabase DB.

#### M07 — Modul Ujian Internal & Sertifikasi
- **Tanggung Jawab:** Input nilai ujian 5 kriteria praktek + teori. Gate-check lunas (M05) + lulus ujian sebelum generate PDF sertifikat. Antrean cetak sertifikat fisik batch untuk percetakan.
- **Kontrak:** `POST /api/v1/ujian` (input nilai). `GET /api/v1/sertifikat/[siswa_id]` → PDF blob. `POST /api/v1/sertifikat/queue` → batch antrean cetak.
- **Dependensi:** M05 (status lunas), Supabase DB, jsPDF, date-utils.

#### M08 — Modul Master Data Dinamis
- **Tanggung Jawab:** CRUD tabel-tabel master (program pelatihan, kriteria penilaian, syarat berkas, titik lokasi & radius GPS). Semua modul lain membaca konfigurasi dari master ini.
- **Kontrak:** `GET|POST|PUT|DELETE /api/v1/master/program|kriteria|syarat-berkas|lokasi`.
- **Dependensi:** Supabase DB.

#### M09 — Modul AI Showcase
- **Tanggung Jawab (RAG Query):** Terima query natural language dari Superadmin, translate ke SQL query, inject hasil ke prompt Gemini, return jawaban naratif.
- **Tanggung Jawab (Weekly Summary):** Edge Function terjadwal tiap Senin 07.00 WIB. Generate ringkasan progres per siswa, simpan ke `ai_ringkasan_mingguan`.
- **Kontrak:** `POST /api/v1/ai/query` `{ pertanyaan }` → `{ jawaban }`. `GET /api/v1/ai/summary/[siswa_id]` → ringkasan per siswa.
- **Dependensi:** Gemini Flash API (lib/gemini), Supabase DB, M06, M05.
- `ponytail:` RAG menggunakan structured-data injection (SQL result → JSON → prompt), bukan vector embedding. Upgrade ke pgvector jika pertanyaan free-form menjadi terlalu kompleks untuk template query.

#### M10 — Modul Notifikasi Sistem
- **Tanggung Jawab:** Menampilkan notifikasi operasional di header bell icon. Siswa: alert ganti password default. Superadmin: alert operasional sistem. Badge unread count auto-refresh.
- **Kontrak:** `GET /api/v1/notifications` → `{ data: [...notif], meta: { unread_count } }`.
- **Dependensi:** Supabase DB, M01 (status `is_password_default`).

---

## Dokumen 3: Sequence Diagram

### Alur 1 — Login & Role Routing (dengan Normalisasi Identifier)

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant FE as Next.js Frontend
    participant API as /api/v1/auth/login
    participant Auth as Supabase Auth
    participant DB as Supabase DB
    participant Mid as Next.js Middleware

    U->>FE: Isi form login (identifier + password)
    FE->>API: POST /api/v1/auth/login { identifier, password }
    API->>API: Normalisasi identifier
    alt Email lengkap non-lpks.id (admin)
        API->>Auth: signInWithPassword(email=identifier)
    else Username siswa (budi@01 / budi@lpks.id)
        API->>API: Strip @lpks.id → normalisasi → budi01@lpks.id
        API->>Auth: signInWithPassword(email=budi01@lpks.id)
    end
    Auth-->>API: Session JWT (role: superadmin|siswa)
    alt role = siswa
        API->>DB: SELECT is_password_default, username FROM siswa
        DB-->>API: { is_password_default: true, username: "budi@01" }
    end
    API-->>FE: { user: { role, is_password_default, ... } }
    FE->>Mid: Navigasi ke dashboard
    Mid->>Mid: Cek JWT role dari cookie
    alt role = superadmin
        Mid-->>FE: Redirect ke /(superadmin)/superadmin/dashboard
    else role = siswa
        Mid-->>FE: Redirect ke /(siswa)/siswa/beranda
    end
    FE-->>U: Dashboard sesuai role + banner jika password default
```

---

### Alur 2 — Pendaftaran Siswa Baru

```mermaid
sequenceDiagram
    participant SA as Superadmin
    participant FE as Frontend
    participant API as /api/v1/siswa
    participant DB as Supabase DB
    participant Auth as Supabase Auth

    SA->>FE: Centang semua 5 checklist berkas fisik
    FE->>FE: Aktifkan form biodata (client-side gate)
    SA->>FE: Pilih Program Pelatihan
    FE->>API: GET /api/v1/siswa/next-id?programId=X
    API->>DB: SELECT nomor_induk FROM siswa WHERE program_id=X ORDER BY created_at DESC
    DB-->>API: Nomor urut terakhir
    API-->>FE: Preview nomor_induk (misal: "01.0005")
    SA->>FE: Isi biodata lengkap (NIK, nama, alamat, tgl_masuk, dll.)
    FE->>API: POST /api/v1/siswa { ...biodata, program_id }
    API->>API: Validasi NIK 16 digit & cek duplikasi
    API->>DB: INSERT siswa { ...biodata, nomor_induk, is_password_default: true }
    DB-->>API: siswa_id
    API->>Auth: admin.createUser({ email: budi05@lpks.id, password: "budi@0005" })
    Auth-->>API: auth_user_id
    API->>DB: UPDATE siswa SET auth_id = auth_user_id, username = "budi@0005"
    API-->>FE: { siswa_id, nomor_induk, username, message: "Pendaftaran berhasil" }
    FE-->>SA: Tampilkan kartu konfirmasi No Induk & kredensial login siswa
```

---

### Alur 3 — Presensi Mandiri Siswa via GPS Geofencing

```mermaid
sequenceDiagram
    participant S as Siswa (Smartphone)
    participant FE as Frontend (Browser)
    participant API as /api/v1/presensi
    participant DB as Supabase DB
    participant Geo as lib/geo (Haversine)

    S->>FE: Buka halaman Presensi, klik "Presensi Hadir"
    FE->>FE: navigator.geolocation.getCurrentPosition()
    FE-->>S: Minta izin lokasi browser
    S-->>FE: Koordinat GPS saat ini (lat, lng)
    FE->>API: POST /api/v1/presensi { lat, lng } (Bearer cookie)
    API->>API: Resolve siswa_id dari auth cookie
    API->>DB: Cek presensi_attempts / duplikasi tanggal = hari ini
    alt Sudah presensi hari ini
        API-->>FE: 400 Bad Request { error: "Anda sudah melakukan presensi hari ini" }
    else Percobaan presensi > 3x hari ini
        API-->>FE: 429 Too Many Requests { error: "Batas 3 kali percobaan presensi hari ini terlampaui" }
    else Validasi radius
        API->>DB: SELECT lat, lng, radius_meter FROM master_lokasi
        DB-->>API: Titik koordinat LPKS & radius (default: 100m)
        API->>Geo: hitungJarak(lat, lng, lat_lpks, lng_lpks)
        Geo-->>API: jarak_meter
        alt jarak_meter <= radius_meter
            API->>DB: INSERT INTO presensi { siswa_id, tanggal, jam, lat, lng, jarak_meter, status: "Hadir" }
            API-->>FE: 201 Created { status: "Hadir", jarak_meter }
            FE-->>S: ✅ Presensi berhasil! Jarak: X meter
        else jarak_meter > radius_meter
            API-->>FE: 400 Bad Request { status: "ditolak", jarak_meter, pesan: "Di luar radius" }
            FE-->>S: ❌ Terlalu jauh (X meter). Harus dalam radius 100m.
        end
    end
```

---

### Alur 4 — RAG Query AI (Asisten Analitik)

```mermaid
sequenceDiagram
    participant SA as Superadmin
    participant FE as Frontend
    participant API as /api/v1/ai/query
    participant DB as Supabase DB
    participant AI as Gemini Flash API

    SA->>FE: Ketik pertanyaan: "Siapa siswa aktif yg capping < 80?"
    FE->>API: POST /api/v1/ai/query { pertanyaan }
    API->>API: Klasifikasi intent pertanyaan & pilih structured template
    API->>DB: Jalankan parameterized query (nilai_harian, siswa, keuangan)
    DB-->>API: Hasil query terstruktur (JSON rows)
    API->>API: Format data ke string konteks ringkas (hemat token)
    API->>AI: generateContent({ systemInstruction, prompt: konteks + pertanyaan })
    AI-->>API: Jawaban naratif bahasa Indonesia
    API-->>FE: { data: { jawaban: "Berikut siswa dengan capping < 80: ..." } }
    FE-->>SA: Tampilkan jawaban di chat UI
```

---

### Alur 5 — Gate Check, Antrean Cetak & Export Percetakan

```mermaid
sequenceDiagram
    participant SA as Superadmin
    participant FE as Frontend
    participant API as /api/v1/sertifikat/queue
    participant DB as Supabase DB
    participant Excel as /api/v1/excel/export

    SA->>FE: Buka menu Ujian & Sertifikat
    FE->>API: GET /api/v1/sertifikat/queue?status=antrean
    API->>DB: SELECT sertifikat JOIN siswa WHERE status = 'antrean'
    DB-->>API: Daftar antrean
    FE-->>SA: Tampilkan Tab "Antrean Cetak" + badge counter
    SA->>FE: Klik "Masukkan ke Antrean" untuk siswa lulus & lunas
    FE->>API: POST /api/v1/sertifikat/queue { siswa_id }
    API->>DB: Gate Check: Verifikasi sisa_tagihan = 0 DAN nilai ujian 5 kriteria >= 80
    alt Syarat belum terpenuhi
        API-->>FE: 400 Bad Request { error: "Belum memenuhi syarat kelulusan/pelunasan" }
    else Syarat terpenuhi
        API->>DB: INSERT INTO sertifikat { siswa_id, status: 'antrean', urutan_cetak, tgl_antrean }
        API-->>FE: 201 Created { message: "Berhasil dimasukkan ke antrean" }
    end
    SA->>FE: Klik "Ekspor Excel & Tandai Sudah Dicetak"
    FE->>Excel: GET /api/v1/excel/export?modul=sertifikat&source=queue&mark_as_printed=true
    Excel->>DB: UPDATE sertifikat SET status='dicetak', tgl_cetak=now() WHERE status='antrean'
    Excel-->>FE: File .xlsx format percetakan fisik
    FE-->>SA: Download otomatis file Excel + data dialihkan ke Tab "Riwayat Cetak"
```

---

### Alur 6 — Ganti Password Mandiri & Dismiss Banner

```mermaid
sequenceDiagram
    participant S as Siswa
    participant FE as Frontend (Portal Siswa)
    participant API as /api/v1/auth/change-password
    participant DB as Supabase DB
    participant Auth as Supabase Auth

    FE->>FE: Cek `user.is_password_default` saat render layout
    alt is_password_default = true
        FE-->>S: Tampilkan banner kuning peringatan ganti password + tombol [Ganti Sandi] + tombol silang [X]
    end
    alt Siswa klik tombol silang [X]
        FE->>FE: Set sessionStorage `dismiss_password_warning = true`
        FE-->>S: Banner dihilangkan tanpa mengganggu sesi belajar
    else Siswa klik [Ganti Sandi]
        S->>FE: Isi new_password & confirm_password di modal
        FE->>API: POST /api/v1/auth/change-password { new_password, confirm_password }
        API->>Auth: admin.updateUserById(auth_id, { password: new_password })
        API->>DB: UPDATE siswa SET is_password_default = false WHERE id = siswa_id
        API-->>FE: 200 OK { message: "Kata sandi berhasil diperbarui" }
        FE-->>S: Notifikasi toast sukses & banner peringatan hilang permanen
    end
```

---

### Alur 7 — Notifikasi Operasional Header (Auto-Refresh)

```mermaid
sequenceDiagram
    participant U as User (Admin / Siswa)
    participant FE as NotificationBell (Header)
    participant API as /api/v1/notifications
    participant DB as Supabase DB

    FE->>API: GET /api/v1/notifications (setiap 60 detik / saat load)
    alt Role = Superadmin
        API->>DB: COUNT(*) antrean sertifikat + COUNT(*) siswa siap ujian
        DB-->>API: { queueCount, siapUjianCount }
        API-->>FE: { data: [...alerts], meta: { unread_count: totalAlerts } }
    else Role = Siswa
        API->>DB: SELECT is_password_default FROM siswa WHERE id = siswa_id
        DB-->>API: is_password_default
        API-->>FE: { data: [...alerts], meta: { unread_count: is_password_default ? 1 : 0 } }
    end
    FE-->>U: Render red badge unread count & popover dropdown saat lonceng diklik
```
