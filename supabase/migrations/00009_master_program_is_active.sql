-- Migrasi: Tambah kolom is_active pada master_program
-- Tujuan: Memisahkan program pelatihan aktif (untuk pendaftaran baru) 
--         dari program arsip/format lama (hasil impor alumni atau program kedaluwarsa)

ALTER TABLE public.master_program
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.master_program.is_active IS 'TRUE = aktif untuk pendaftaran siswa baru. FALSE = arsip/format lama, tidak muncul di dropdown pendaftaran.';
