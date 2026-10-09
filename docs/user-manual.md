# Buku Panduan Pengguna (User Manual) — LPKS Sumbu Hidup

## Pendahuluan
Aplikasi LPKS Sumbu Hidup adalah sistem manajemen pelatihan pengelasan terpadu berbasis *continuous enrollment* (per-anak). Sistem ini dirancang untuk memudahkan instruktur (Superadmin) dalam mengelola pendaftaran, presensi geofencing, penilaian harian 5 kriteria pengelasan, pencatatan keuangan, pelaksanaan ujian internal, siklus antrean cetak sertifikat ke percetakan fisik, serta memberikan portal mandiri bagi siswa dari smartphone.

## Memulai (Getting Started)
- **Akses Aplikasi:** Buka browser (Chrome / Safari) dan akses tautan aplikasi: `https://lpks-sumbu-hidup.vercel.app` (atau `http://localhost:3000` di lokal).
- **Halaman Login Terpadu (`/login`):**
  - **Superadmin:** Masukkan email resmi LPKS (contoh: `admin@sumbuhidup.com`) dan kata sandi admin.
  - **Siswa:** Masukkan **Username** (contoh: `budi@0001` atau `budi@01`) dan **Password** yang diberikan oleh admin saat pendaftaran. Sistem akan melakukan normalisasi otomatis dan mengarahkan langsung ke portal siswa.

---

## Panduan Fitur Utama

### 1. Pendaftaran Siswa & Manajemen Program (Superadmin)
- **Cara Mengakses:** Menu Sidebar -> **Pendaftaran** (atau **Master Data** untuk kelola program)
- **Katalog Program Aktif vs Arsip:**
  - Pilihan program di dropdown formulir pendaftaran hanya menampilkan program berstatus **Aktif**. Program lama yang diarsipkan melalui menu Master Data tidak akan membingungkan admin.
- **Langkah Penggunaan:**
  1. Terima berkas fisik dari calon siswa, centang 5 syarat berkas fisik yang sesuai di sistem (Ijazah, KTP, KK, Pas Foto 3x4 latar merah, Surat Keterangan Sehat).
  2. Setelah 5 berkas tercentang, formulir biodata otomatis terbuka.
  3. Pilih **Program Pelatihan** aktif (misal: *SMAW 6G 7,5jt 51 hari*). Sistem menampilkan pratinjau **Nomor Induk Otomatis** (misal: `01.0005`).
  4. Isi formulir data diri siswa secara lengkap (NIK 16 digit, Nama, Alamat, Kontak, dll.).
  5. Klik tombol **Daftar Siswa & Terbitkan No Induk**.
  6. **Kunci Tarif Otomatis (Fee Lock):** Sistem mengunci nominal biaya pelatihan siswa saat pendaftaran. Jika di kemudian hari harga program di Master Data dinaikkan/diubah, tagihan siswa terdahulu tetap terlindungi dan tidak berubah secara retroaktif.
  7. Sistem otomatis menerbitkan kredensial akun login siswa (`Username: budi@0005`, `Password: budi@0005`). Salin kredensial ini dan serahkan ke siswa.

### 2. Presensi Harian Mandiri (Siswa)
- **Cara Mengakses:** Login Siswa -> Menu Navigasi Bawah -> **Presensi**
- **Langkah Penggunaan:**
  1. Pastikan siswa telah tiba di area workshop LPKS Sumbu Hidup.
  2. Buka halaman Presensi di smartphone dan izinkan akses Lokasi (GPS) browser.
  3. Radar GPS akan menampilkan jarak aktual ke titik workshop LPKS secara *real-time*.
  4. Klik tombol hijau **"Presensi Hadir"**. Sistem memverifikasi bahwa siswa berada dalam radius $\le 100$ meter dari LPKS (batas presensi: 1x per hari kalender, maksimal 3x percobaan gagal).
  5. Status kehadiran langsung terekam dan muncul di riwayat presensi harian.

### 3. Penilaian Kriteria Las (Superadmin & Siswa)
- **Cara Mengakses Admin:** Menu Sidebar -> **Penilaian Harian**
- **Langkah Penggunaan:**
  1. Pilih nama siswa yang sedang dinilai.
  2. Masukkan skor (0–100) untuk salah satu atau beberapa kriteria (*Root, Hotpass, Filler, Capping, Gerinda*).
  3. Tekan `Enter` untuk loncat ke kriteria berikutnya, lalu klik **Simpan Nilai**.
  4. Nilai langsung masuk ke database dan membentuk grafik tren fluktuasi di transkrip siswa.
  5. Jika siswa mencapai nilai $\ge 80$ di seluruh 5 kriteria, sistem otomatis menetapkan siswa berstatus **"Siap Ujian"**.

### 4. Ujian Internal & Siklus Antrean Cetak Sertifikat (Superadmin)
- **Cara Mengakses Admin:** Menu Sidebar -> **Ujian & Sertifikat**
- **Penyaringan Otomatis:** Daftar ujian internal secara cerdas hanya menampilkan siswa yang belum memiliki sertifikat (`!status_sertifikat`). Siswa yang sudah antre cetak atau bersertifikat otomatis disaring keluar agar daftar kerja admin tetap fokus.
- **Struktur Halaman (3 Tab):**
  1. **Tab 1: Penilaian & Ujian:**
     - Lihat daftar siswa yang telah mencapai kompetensi harian ($\ge 80$).
     - Masukkan nilai Ujian Internal (Teori + 5 Kriteria Praktek). Semua 6 komponen harus bernilai $\ge 80$ untuk dinyatakan LULUS.
     - Periksa panel **Double Gate-Check**:
       - *Syarat 1 (Kompetensi):* Lulus Ujian Internal ($\ge 80$ di semua kriteria).
       - *Syarat 2 (Administrasi):* Status Keuangan LUNAS (atau Rp 0 untuk program beasiswa).
     - Jika kedua indikator menyala hijau, klik tombol **[+ Masukkan ke Antrean Cetak]**.
  2. **Tab 2: Antrean Cetak (Percetakan Fisik):**
     - Memuat daftar siswa yang siap dikirim datanya ke percetakan fisik.
     - Klik tombol **Review Detail** pada baris siswa untuk mempratinjau data lengkap (NIK, nama, tanggal lahir, perolehan nilai, dan nomor seri sertifikat resmi dengan format bulan Romawi, misal: `01/LPKS-SH/IX/2026`).
     - Jika data sudah terverifikasi, klik tombol utama **[Ekspor Excel & Tandai Sudah Dicetak]**.
     - File `.xlsx` format percetakan fisik akan terunduh otomatis, status sertifikat berubah menjadi `dicetak`, tanggal cetak terisi, dan siswa resmi beralih status menjadi Alumni.
  3. **Tab 3: Riwayat Cetak:**
     - Arsip seluruh sertifikat alumni yang telah dicetak fisik beserta nomor sertifikat dan tanggal cetak.
     - Jika sertifikat fisik siswa hilang/rusak, klik **[Cetak Ulang / Re-Queue]** untuk memasukkan kembali siswa ke antrean percetakan.

### 5. Portal Mandiri & Pengaturan Akun (Siswa)
- **Navigasi Tab Cepat & Ringan:**
  - Navigasi antar-tab (Beranda, Presensi, Nilai, Transkrip, Keuangan) telah dioptimalkan dengan *client-side session caching*. Siswa dapat berpindah halaman secara instan tanpa jeda pemuatan atau konsumsi kuota berlebih.
- **Banner Peringatan Ganti Password:**
  - Siswa yang masih memakai kata sandi default akan melihat banner kuning di beranda.
  - Siswa dapat menutup banner menggunakan tombol silang `[X]` agar tidak mengganggu sesi belajar saat itu.
  - Untuk keamanan akun, siswa dapat mengklik tombol **[Ganti Sandi]**, memasukkan kata sandi baru (minimal 6 karakter), dan menyimpannya. Peringatan akan hilang permanen dan status di admin berubah menjadi *"Pass Diubah Siswa"*.
- **Keluar / Logout:**
  - Klik tombol **Logout** di header atau menu profil.
  - Sistem menampilkan dialog konfirmasi: *"Apakah Anda yakin ingin keluar?"* untuk mencegah siswa keluar tanpa sengaja.

### 6. Notifikasi Operasional Header
- Ikon lonceng di navbar header dilengkapi badge unread count *real-time*:
  - **Superadmin:** Menerima peringatan jika ada siswa yang siap mengikuti ujian dan jumlah siswa yang mengantre cetak ke percetakan. Klik notifikasi untuk langsung menuju modul terkait.
  - **Siswa:** Menerima pengingat untuk segera memperbarui kata sandi default.

### 7. Konsultan SOP Las & RAG AI (Superadmin)
- **Cara Mengakses:** Menu Sidebar -> **AI Assistant**
- **Langkah Penggunaan:**
  1. Ajukan pertanyaan natural (contoh: *"Siapa siswa SMAW 6G yang nilai capping-nya masih di bawah 80?"* atau *"Bagaimana SOP penyetelan amper las FCAW 3G?"*).
  2. AI Assistant (berbasis model Gemini Flash) membaca data terstruktur sistem dan standar pengelasan resmi untuk memberikan ringkasan analisis yang tepat.

---

## Pemecahan Masalah Umum (Troubleshooting)

**Masalah:** Siswa gagal melakukan presensi (Muncul pesan "Lokasi di luar radius").
**Solusi:** Pastikan siswa berada di area bengkel pelatihan LPKS dan GPS HP aktif dengan akurasi tinggi. Jika simulasi/demo dilakukan di dalam ruangan tertutup atau jarak sedikit bergeser, Superadmin dapat sementara memperluas radius toleransi di menu **Master Data -> Lokasi & Radius**, atau melakukan entri presensi manual via menu **Presensi (Admin)**.

**Masalah:** Siswa lupa kata sandi akunnya.
**Solusi:** Superadmin membuka menu **Data Siswa**, klik tombol Edit pada siswa tersebut, lalu pilih **"Kelola Akun & Reset Sandi"**. Kata sandi akan dikembalikan ke sandi awal dan statusnya kembali menjadi *Pass Default*.

**Masalah:** Tombol "Masukkan ke Antrean Cetak" tidak dapat diklik.
**Solusi:** Sistem menerapkan *double gate-check*. Pastikan:
1. Siswa telah lulus seluruh kriteria ujian internal ($\ge 80$).
2. Status keuangan siswa LUNAS. Bagi siswa penerima beasiswa penuh (biaya pelatihan Rp 0), sistem otomatis meloloskan syarat keuangan tanpa perlu input transaksi tambahan.

**Masalah:** Program pelatihan lama membingungkan saat pendaftaran siswa baru.
**Solusi:** Buka menu **Master Data**, cari program pelatihan lama, lalu klik tombol **Arsipkan**. Program tersebut otomatis disembunyikan dari pilihan formulir pendaftaran tanpa merusak histori data siswa lama yang sudah terdaftar di program tersebut.

---

## Kontak Dukungan
Jika Anda mengalami kendala teknis atau menemukan anomali data, silakan hubungi tim administrator IT LPKS Sumbu Hidup melalui email resmi lembaga.
