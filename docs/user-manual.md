# Buku Panduan Pengguna (User Manual) — LPKS Sumbu Hidup

## Pendahuluan
Aplikasi LPKS Sumbu Hidup adalah sistem manajemen pelatihan pengelasan terpadu. Sistem ini dirancang untuk memudahkan instruktur (Superadmin) dalam mengelola pendaftaran, presensi, penilaian, dan keuangan siswa, serta memberikan portal mandiri bagi siswa untuk memantau progres belajar mereka dari smartphone.

## Memulai (Getting Started)
- **Akses Aplikasi:** Buka browser (Chrome/Safari) dan akses tautan: `https://lpks-sumbu-hidup.vercel.app`
- **Login Superadmin:** Kunjungi `/superadmin/login`. Masukkan email dan password admin yang diberikan oleh pihak LPKS.
- **Login Siswa:** Kunjungi halaman utama (login siswa). Masukkan **Username** (contoh: `budi@0001`) dan **Password** yang diberikan oleh admin saat pendaftaran. Anda sangat disarankan untuk mengubah password Anda segera setelah masuk ke sistem.

---

## Panduan Fitur Utama

### 1. Pendaftaran Siswa (Superadmin)
Cara mengakses: Menu Utama -> Pendaftaran Siswa Baru
Langkah penggunaan:
1. Terima berkas fisik dari siswa, centang 5 syarat berkas fisik yang sesuai di dalam sistem.
2. Isi formulir data diri siswa secara lengkap dan pilih program (misal: SMAW 6G).
3. Klik tombol Daftar. Sistem akan otomatis memberikan **Nomor Induk** dan **Akun Login** untuk siswa tersebut. Berikan informasi akun ini kepada siswa.

### 2. Presensi Harian Mandiri (Siswa)
Cara mengakses: Login Siswa -> Presensi
Langkah penggunaan:
1. Pastikan Anda berada di area bengkel LPKS Sumbu Hidup.
2. Izinkan akses Lokasi (GPS) saat browser memintanya.
3. Klik tombol "Presensi Hadir". Sistem akan memverifikasi bahwa Anda berada dalam radius 100 meter dari LPKS. (Batas presensi: 1x sehari).

### 3. Penilaian Kriteria Las (Superadmin)
Cara mengakses: Menu Utama -> Penilaian Harian
Langkah penggunaan:
1. Pilih nama siswa yang sedang praktek.
2. Masukkan nilai (0-100) untuk salah satu atau beberapa kriteria (*Root, Hotpass, Filler, Capping, Gerinda*).
3. Klik Simpan. Nilai akan langsung masuk ke transkrip siswa dan membentuk grafik progres harian.

### 4. Konsultan SOP Las & RAG (Superadmin)
Cara mengakses: Menu Utama -> AI Assistant
Langkah penggunaan:
1. Ketik pertanyaan Anda (contoh: "Tolong rangkum progres belajar Budi minggu ini" atau "Bagaimana SOP pengelasan SMAW 6G yang benar?").
2. AI akan membaca data *real-time* siswa atau referensi pengelasan dan memberikan jawaban yang akurat.

---

## Pemecahan Masalah Umum (Troubleshooting)

**Masalah:** Siswa gagal melakukan presensi (Muncul pesan "Lokasi di luar radius").
**Solusi:** Pastikan siswa benar-benar berada di bengkel. Jika GPS siswa tidak akurat karena cuaca/sinyal, Superadmin dapat melakukan presensi manual melalui menu **Presensi (Admin)**.

**Masalah:** Siswa lupa password.
**Solusi:** Superadmin dapat mereset password siswa dengan masuk ke menu **Data Siswa**, klik ikon pensil (Edit) pada siswa tersebut, lalu klik **"Kelola Akun & Reset Sandi"**.

**Masalah:** Tombol Cetak Sertifikat terkunci (berwarna abu-abu).
**Solusi:** Sertifikat hanya bisa dicetak jika siswa telah (1) Lulus ujian internal (semua 5 kriteria nilai >= 80) DAN (2) Status keuangannya sudah Lunas. Periksa transkrip nilai atau status pembayaran siswa.

---

## Kontak Dukungan
Jika Anda mengalami masalah sistem yang tidak dapat diselesaikan dengan panduan di atas, silakan hubungi tim IT Administrator melalui email resmi LPKS.
