-- ==============================================================================
-- Migrasi: 00011_pengurus_presensi.sql
-- Tujuan: Menambahkan tabel master pengurus/staf dan tabel presensi harian pengurus
--         terpisah dari presensi siswa (Opsi A: Clean Isolation).
-- ==============================================================================

-- 1. Tabel Master Pengurus / Instruktur / Staf LPKS
CREATE TABLE IF NOT EXISTS public.pengurus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    nip VARCHAR(50) UNIQUE NOT NULL, -- Nomor Induk Pegawai / ID Pengurus (contoh: P.001, INS.01)
    nama_lengkap VARCHAR(150) NOT NULL,
    jabatan VARCHAR(100) NOT NULL,   -- e.g. 'Instruktur Kepala 6G', 'Instruktur SMAW', 'Tata Usaha'
    no_hp VARCHAR(25),
    email VARCHAR(150),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pengurus_nip ON public.pengurus(nip);
CREATE INDEX IF NOT EXISTS idx_pengurus_is_active ON public.pengurus(is_active);
CREATE INDEX IF NOT EXISTS idx_pengurus_auth_id ON public.pengurus(auth_id);

COMMENT ON TABLE public.pengurus IS 'Master data pengurus, staf administrasi, dan instruktur LPKS Sumbu Hidup.';
COMMENT ON COLUMN public.pengurus.nip IS 'Nomor Induk Pegawai / ID unik pengurus.';
COMMENT ON COLUMN public.pengurus.jabatan IS 'Peran atau jabatan kerja di LPKS Sumbu Hidup.';

-- 2. Tabel Presensi Harian Pengurus (GPS Geofencing)
CREATE TABLE IF NOT EXISTS public.presensi_pengurus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pengurus_id UUID NOT NULL REFERENCES public.pengurus(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam TIME NOT NULL DEFAULT CURRENT_TIME,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    jarak_meter INT,
    status VARCHAR(20) NOT NULL DEFAULT 'Hadir' CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Cuti', 'Alpa', 'Tugas Luar')),
    keterangan TEXT,
    created_by VARCHAR(30) DEFAULT 'mandiri', -- 'mandiri' atau 'superadmin'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_presensi_pengurus_hari UNIQUE (pengurus_id, tanggal)
);

CREATE INDEX IF NOT EXISTS idx_presensi_pengurus_tanggal ON public.presensi_pengurus(tanggal);
CREATE INDEX IF NOT EXISTS idx_presensi_pengurus_pengurus_id ON public.presensi_pengurus(pengurus_id);
CREATE INDEX IF NOT EXISTS idx_presensi_pengurus_status ON public.presensi_pengurus(status);

COMMENT ON TABLE public.presensi_pengurus IS 'Log presensi harian pengurus dan instruktur berbasis GPS Geofencing (terpisah dari siswa).';

-- 3. Row Level Security (RLS)
ALTER TABLE public.pengurus ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presensi_pengurus ENABLE ROW LEVEL SECURITY;

-- Policy untuk tabel pengurus
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pengurus' AND policyname = 'Admin ALL pengurus'
  ) THEN
    CREATE POLICY "Admin ALL pengurus"
      ON public.pengurus
      FOR ALL
      TO authenticated
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pengurus' AND policyname = 'Public read active pengurus'
  ) THEN
    CREATE POLICY "Public read active pengurus"
      ON public.pengurus
      FOR SELECT
      TO authenticated
      USING (is_active = TRUE);
  END IF;
END $$;

-- Policy untuk tabel presensi_pengurus
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'presensi_pengurus' AND policyname = 'Admin ALL presensi_pengurus'
  ) THEN
    CREATE POLICY "Admin ALL presensi_pengurus"
      ON public.presensi_pengurus
      FOR ALL
      TO authenticated
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'presensi_pengurus' AND policyname = 'Pengurus view self presensi'
  ) THEN
    CREATE POLICY "Pengurus view self presensi"
      ON public.presensi_pengurus
      FOR SELECT
      TO authenticated
      USING (pengurus_id IN (SELECT id FROM public.pengurus WHERE auth_id = auth.uid()));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'presensi_pengurus' AND policyname = 'Pengurus insert self presensi'
  ) THEN
    CREATE POLICY "Pengurus insert self presensi"
      ON public.presensi_pengurus
      FOR INSERT
      TO authenticated
      WITH CHECK (pengurus_id IN (SELECT id FROM public.pengurus WHERE auth_id = auth.uid()));
  END IF;
END $$;

-- 4. Initial Seeding Pengurus Default LPKS Sumbu Hidup
INSERT INTO public.pengurus (nip, nama_lengkap, jabatan, no_hp, email)
VALUES
    ('P.001', 'Bambang Triyono, S.T., C.W.I', 'Direktur & Instruktur Kepala', '0812-3456-0001', 'bambang@sumbuhidup.id'),
    ('P.002', 'Eko Prasetyo, A.Md', 'Instruktur Senior SMAW & GTAW', '0812-3456-0002', 'eko@sumbuhidup.id'),
    ('P.003', 'Hendra Wijaya', 'Instruktur Praktek Bengkel', '0812-3456-0003', 'hendra@sumbuhidup.id'),
    ('P.004', 'Siti Nurhaliza, S.Ak', 'Staf Administrasi & Keuangan', '0812-3456-0004', 'siti@sumbuhidup.id')
ON CONFLICT (nip) DO UPDATE SET
    nama_lengkap = EXCLUDED.nama_lengkap,
    jabatan = EXCLUDED.jabatan,
    no_hp = EXCLUDED.no_hp,
    email = EXCLUDED.email;
