-- Migrasi: Ubah unique constraint nomor_induk menjadi composite (nomor_induk, program_id)
-- Tujuan: Izinkan siswa yang sama (nomor induk sama) mengikuti program berbeda (kasus Banper)

-- 1. Hapus unique constraint lama pada kolom nomor_induk
ALTER TABLE siswa DROP CONSTRAINT IF EXISTS siswa_nomor_induk_key;

-- 2. Tambah unique composite index: nomor_induk + program_id
--    NULL program_id dianggap unik per baris (tidak dikelompokkan)
CREATE UNIQUE INDEX IF NOT EXISTS uq_siswa_nomor_induk_program
  ON siswa (nomor_induk, program_id)
  WHERE program_id IS NOT NULL;

-- Fallback: jika program_id NULL, nomor_induk tetap unik (siswa tanpa program tidak boleh duplikat)
CREATE UNIQUE INDEX IF NOT EXISTS uq_siswa_nomor_induk_no_program
  ON siswa (nomor_induk)
  WHERE program_id IS NULL;
