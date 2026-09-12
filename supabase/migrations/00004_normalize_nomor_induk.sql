-- Migrasi: normalisasi format nomor_induk dan tambah sort index
-- Format baru: "03.1032" (bukan "03. 1032")

-- 1. Normalisasi data existing yang masih punya spasi setelah titik
UPDATE public.siswa
SET nomor_induk = regexp_replace(nomor_induk, '\.\s+', '.', 'g')
WHERE nomor_induk ~ '\.\s+';

-- 2. Tambahkan index untuk sort numerik yang benar
--    (sort by kode program, lalu by urutan numerik setelah titik)
CREATE INDEX IF NOT EXISTS idx_siswa_nomor_induk_sort
ON public.siswa (
  split_part(nomor_induk, '.', 1),
  CAST(NULLIF(regexp_replace(split_part(nomor_induk, '.', 2), '[^0-9]', '', 'g'), '') AS INTEGER)
);
