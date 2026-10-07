# Standar Operasional Pemeliharaan Sistem (Maintenance SOP) — LPKS Sumbu Hidup

Dokumen ini merupakan panduan resmi pemeliharaan sistem LPKS Sumbu Hidup setelah fase deployment, mencakup pilar **Preventive Maintenance**, prosedur mitigasi insiden (*Disaster Recovery & Restore*), jadwal pemeliharaan berkala, serta otomatisasi backup database independen.

---

## 1. Arsitektur Pemeliharaan (Maintenance Architecture)

Sistem LPKS Sumbu Hidup menerapkan 4 pilar pemeliharaan sesuai standar SDLC:

| Pilar | Deskripsi | Mekanisme / Alat |
|---|---|---|
| **Preventive Maintenance** | Pemeliharaan proaktif harian/berkala untuk mencegah downtime, penumpukan kuota, dan auto-pause database. | GitHub Actions Scheduled Workflow, Supabase Keep-Alive Ping, Audit Log Pruning. |
| **Corrective Maintenance** | Penanganan cepat atas bug atau galat tak terduga yang terjadi di lingkungan produksi. | Error boundary sistem, API error logging, dan health check endpoint `/api/v1/health`. |
| **Adaptive Maintenance** | Penyesuaian konfigurasi akibat perubahan platform pihak ketiga (Vercel, Supabase, Google Geolocation API). | Verifikasi berkala API contracts dan update environment variables. |
| **Perfective Maintenance** | Peningkatan performa, optimasi query, dan efisiensi UX berdasarkan umpan balik pengguna. | Profiling non-blocking Suspense streaming, index database tuning, dan refactoring berkala. |

---

## 2. Preventive Maintenance Suite

### A. Otomatisasi Backup Database Independen (Zero-Dependency)
- **Lokasi Skrip:** [`scripts/backup-db.mjs`](file:///d:/LPKS%20System/scripts/backup-db.mjs)
- **Cakupan Tabel:** Mengekspor seluruh 11 tabel operasional sistem secara terstruktur:
  1. `master_program`
  2. `master_kriteria`
  3. `master_lokasi`
  4. `master_syarat_berkas`
  5. `siswa`
  6. `presensi`
  7. `transaksi_keuangan`
  8. `penilaian`
  9. `ujian`
  10. `sertifikat`
  11. `audit_log`
- **Format Output:** File JSON terstruktur lengkap dengan metadata timestamp, hitungan baris data (*record counts*), dan snapshot isi tabel.
- **Penyimpanan:** 
  - Lokal: Direktori `backups/lpks-db-backup-<timestamp>.json`.
  - Cloud: Otomatis diunggah ke GitHub Actions Artifacts dengan masa retensi 90 hari.

### B. Mekanisme Keep-Alive Supabase Free-Tier
- **Permasalahan:** Paket Supabase Free Tier secara otomatis menonaktifkan (*pause*) project jika tidak menerima interaksi kueri database selama 7 hari berturut-turut.
- **Solusi Pencegahan:**
  1. GitHub Actions mengeksekusi ping otomatis harian ke endpoint `GET /api/v1/health`.
  2. Endpoint `/api/v1/health` melakukan kueri ringan ke tabel `master_program`, secara efektif mereset *inactivity timer* Supabase.
  3. Eksekusi `npm run db:backup` harian juga melakukan kueri langsung via Service Role Key yang menjamin database tetap aktif 100%.

### C. Retensi & Pembersihan Audit Log (Log Pruning)
- **Lokasi Skrip:** [`scripts/prune-audit-log.mjs`](file:///d:/LPKS%20System/scripts/prune-audit-log.mjs)
- **Tujuan:** Mencegah pembengkakan kuota baris database di Supabase akibat log aktivitas pengguna yang terus bertambah.
- **Standar Retensi:** Default 365 hari (1 tahun). Catatan log sebelum 365 hari akan dipangkas setelah dilakukan ekspor backup.

---

## 3. Otomatisasi CI/CD & Scheduled Workflows

Workflow GitHub Actions dikonfigurasi di [`.github/workflows/db-backup-and-keepalive.yml`](file:///d:/LPKS%20System/.github/workflows/db-backup-and-keepalive.yml).

### Jadwal Eksekusi
- **Jadwal Harian:** Pukul **02:00 WIB** (19:00 UTC) setiap hari secara otomatis.
- **Pemicu Manual (*Workflow Dispatch*):** Administrator dapat memicu backup atau pembersihan log secara instan kapan saja melalui menu **Actions** di repositori GitHub.

### Konfigurasi GitHub Repository Secrets
Untuk mengaktifkan workflow ini pada repositori GitHub produksi, pastikan secret berikut telah didaftarkan pada **Settings > Secrets and variables > Actions**:

| Secret Key | Keterangan | Contoh Nilai |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase produksi | `https://xyzproject.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase (Akses admin bypass RLS) | `eyJhbGciOi...` |
| `PRODUCTION_URL` *(Opsional)* | Domain publik aplikasi Vercel untuk ping health | `https://lpks-sumbu-hidup.vercel.app` |

---

## 4. Prosedur Pemulihan Bencana (Disaster Recovery & Restore SOP)

Jika terjadi insiden fatal (kesalahan manipulasi data, kerusakan data, atau migrasi darurat), lakukan prosedur restorasi berikut:

### Langkah 1: Siapkan File Snapshot Backup
1. Buka tab **Actions** pada repositori GitHub.
2. Pilih workflow **Database Maintenance & Health Keep-Alive** yang terakhir berhasil.
3. Unduh berkas artefak `lpks-db-backup-<run_id>.zip` dan ekstrak file JSON ke dalam folder `backups/` lokal, atau gunakan file backup yang tersimpan di server.

### Langkah 2: Verifikasi Integritas File
Buka file JSON dan periksa blok `metadata`:
```json
{
  "metadata": {
    "system": "LPKS Sumbu Hidup System",
    "version": "1.0",
    "created_at": "2026-10-07T14:00:00.000Z",
    "counts": { ... }
  }
}
```

### Langkah 3: Eksekusi Restorasi Bertahap
Jalankan skrip pemulihan melalui terminal:
```bash
npm run db:restore -- backups/lpks-db-backup-YYYY-MM-DDTHH-mm-ss.json
```

> **Keamanan Integritas Data:** Skrip `restore-db.mjs` menerapkan pemulihan berjenjang (*staged upsert*) sesuai aturan foreign key:
> 1. Memulihkan seluruh tabel master referensi terlebih dahulu (`master_program`, `master_kriteria`, `master_lokasi`, `master_syarat_berkas`).
> 2. Memulihkan data entitas utama (`siswa`).
> 3. Memulihkan data relasional operasional (`presensi`, `transaksi_keuangan`, `penilaian`, `ujian`, `sertifikat`, `audit_log`).
> Skrip menggunakan operasi `upsert` sehingga data yang sudah ada diperbarui tanpa menduplikasi Primary Key.

---

## 5. Ringkasan Perintah Pemeliharaan (CLI Cheat Sheet)

| Perintah | Deskripsi |
|---|---|
| `npm run db:backup` | Menjalankan backup database mandiri secara lokal ke folder `backups/`. |
| `npm run db:restore -- <path_file>` | Merestorasi snapshot database dari file JSON. |
| `npm run db:prune` | Menghapus log audit yang berusia lebih dari 365 hari. |
| `npm run db:prune -- 180` | Menghapus log audit yang berusia lebih dari 180 hari (custom cutoff). |
| `npm test` | Menjalankan seluruh pengujian regresi otomatis (117 test cases). |
| `npm audit` | Memeriksa kerentanan keamanan paket dependensi npm. |
