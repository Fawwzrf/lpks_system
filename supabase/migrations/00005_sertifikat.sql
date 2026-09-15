-- Migration: Tabel Sertifikat Percetakan Fisik
-- Status: 'antrean' (sedang disiapkan untuk dicetak) atau 'dicetak' (sudah diekspor ke percetakan)

CREATE TABLE IF NOT EXISTS public.sertifikat (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID UNIQUE NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL DEFAULT 'antrean' CHECK (status IN ('antrean', 'dicetak')),
    no_sertifikat VARCHAR(100),
    urutan_cetak INT,
    tgl_antrean TIMESTAMPTZ DEFAULT NOW(),
    tgl_cetak TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sertifikat_status ON public.sertifikat(status);
CREATE INDEX IF NOT EXISTS idx_sertifikat_siswa ON public.sertifikat(siswa_id);

ALTER TABLE public.sertifikat ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'sertifikat' AND policyname = 'Superadmin full access to sertifikat'
  ) THEN
    CREATE POLICY "Superadmin full access to sertifikat"
      ON public.sertifikat
      FOR ALL
      TO authenticated
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
END $$;
