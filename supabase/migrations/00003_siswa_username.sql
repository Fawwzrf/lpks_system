-- Migration: Tambah kolom username ke tabel siswa
-- Username format: namadepan + 2 digit random (contoh: budi42)
-- Supabase Auth email internal: username@lpks.id

ALTER TABLE public.siswa
  ADD COLUMN IF NOT EXISTS username VARCHAR(60) UNIQUE,
  ADD COLUMN IF NOT EXISTS is_password_default BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.siswa.username IS 'Username login siswa (tanpa @domain). Format: namadepan + 2 digit. Contoh: budi42';
COMMENT ON COLUMN public.siswa.is_password_default IS 'TRUE = masih menggunakan password default yang di-generate sistem. FALSE = sudah diganti siswa.';
