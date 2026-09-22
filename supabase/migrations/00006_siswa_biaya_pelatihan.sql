-- Migration: Tambah kolom biaya_pelatihan kustom ke tabel siswa
-- Digunakan jika siswa memiliki tarif berbeda dengan master_program.biaya (misal: tarif angkatan lama, beasiswa, diskon)

ALTER TABLE public.siswa 
ADD COLUMN IF NOT EXISTS biaya_pelatihan DECIMAL(12,2) DEFAULT NULL;

COMMENT ON COLUMN public.siswa.biaya_pelatihan IS 'Biaya pelatihan khusus untuk siswa ini jika berbeda dengan master_program.biaya (misal: tarif lama, beasiswa, diskon). Jika NULL, sistem menggunakan master_program.biaya.';
