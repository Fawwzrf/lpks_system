-- Migrasi: Ubah unique constraint email dan username menjadi composite dengan program_id
-- Tujuan: Izinkan siswa yang sama (email/username sama) mengikuti program berbeda (kasus Banper)

-- 1. Hapus unique constraint lama pada kolom email dan username
ALTER TABLE public.siswa DROP CONSTRAINT IF EXISTS siswa_email_key;
ALTER TABLE public.siswa DROP CONSTRAINT IF EXISTS siswa_username_key;

-- 2. Tambah unique composite index: email + program_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_siswa_email_program
  ON public.siswa (email, program_id)
  WHERE program_id IS NOT NULL;

-- 3. Tambah unique composite index: username + program_id
CREATE UNIQUE INDEX IF NOT EXISTS uq_siswa_username_program
  ON public.siswa (username, program_id)
  WHERE program_id IS NOT NULL;

-- Fallback jika program_id NULL
CREATE UNIQUE INDEX IF NOT EXISTS uq_siswa_email_no_program
  ON public.siswa (email)
  WHERE program_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_siswa_username_no_program
  ON public.siswa (username)
  WHERE program_id IS NULL;
