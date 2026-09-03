-- ==============================================================================
-- SKEMA BASIS DATA AWAL — LPKS SUMBU HIDUP
-- Sesuai: docs/design/basis-data.md & docs/design/keamanan.md
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. MASTER DATA
-- ==============================================================================

-- 2.1 Master Program Pelatihan
CREATE TABLE IF NOT EXISTS public.master_program (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_program VARCHAR(10) UNIQUE NOT NULL, -- Contoh: '01', '02'
    nama VARCHAR(150) NOT NULL,              -- Contoh: 'SMAW 6G'
    biaya NUMERIC(12, 2) NOT NULL DEFAULT 0, -- Contoh: 8500000
    estimasi_durasi_hari INT NOT NULL DEFAULT 30,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Master Kriteria Penilaian Praktek
CREATE TABLE IF NOT EXISTS public.master_kriteria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_kriteria VARCHAR(100) UNIQUE NOT NULL, -- 'Root', 'Hotpass', 'Filler', 'Capping', 'Gerinda'
    batas_lulus INT NOT NULL DEFAULT 80,
    urutan INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Master Syarat Berkas Fisik Pendaftaran
CREATE TABLE IF NOT EXISTS public.master_syarat_berkas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    kode_berkas VARCHAR(50) UNIQUE NOT NULL, -- 'ijazah', 'ktp', 'kk', 'foto', 'suket_sehat'
    nama_berkas VARCHAR(150) NOT NULL,
    wajib BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Master Lokasi & Geofencing LPKS
CREATE TABLE IF NOT EXISTS public.master_lokasi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nama_titik VARCHAR(100) NOT NULL DEFAULT 'Bengkel Utama LPKS Sumbu Hidup',
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    radius_meter INT NOT NULL DEFAULT 100,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. TABEL OPERASIONAL UTAMA
-- ==============================================================================

-- 3.1 Data Siswa
CREATE TABLE IF NOT EXISTS public.siswa (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_id UUID UNIQUE, -- Relasi ke auth.users (bisa NULL jika belum registrasi akun login)
    nomor_induk VARCHAR(30) UNIQUE, -- Format otomatis: {kode_program}.{nomor_urut 4 digit}
    program_id UUID NOT NULL REFERENCES public.master_program(id) ON DELETE RESTRICT,
    nama_lengkap VARCHAR(150) NOT NULL,
    nik VARCHAR(20) NOT NULL, -- Kolom sensitif
    tempat_lahir VARCHAR(100),
    tgl_lahir DATE,
    alamat_lengkap TEXT,
    nama_ayah VARCHAR(100),
    nama_ibu VARCHAR(100),
    no_hp VARCHAR(25),        -- Kolom sensitif
    email VARCHAR(150) UNIQUE NOT NULL,
    pendidikan_terakhir VARCHAR(50),
    nisn VARCHAR(30),
    tgl_masuk DATE NOT NULL DEFAULT CURRENT_DATE,
    tgl_keluar DATE DEFAULT NULL, -- NULL = siswa aktif; Terisi = alumni/lulus/keluar
    checklist_berkas JSONB DEFAULT '{}'::jsonb, -- Konfirmasi verifikasi 5 berkas fisik
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_siswa_program_status ON public.siswa(program_id, tgl_keluar);
CREATE INDEX IF NOT EXISTS idx_siswa_nik ON public.siswa(nik);

-- 3.2 Presensi Harian Siswa (GPS Geofencing)
CREATE TABLE IF NOT EXISTS public.presensi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    jam TIME NOT NULL DEFAULT CURRENT_TIME,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    jarak_meter INT,
    status VARCHAR(20) NOT NULL DEFAULT 'Hadir' CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpa')),
    keterangan TEXT,
    created_by VARCHAR(30) DEFAULT 'siswa', -- 'siswa' (mandiri) atau 'superadmin' (override)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_presensi_siswa_hari UNIQUE (siswa_id, tanggal)
);

CREATE INDEX IF NOT EXISTS idx_presensi_tanggal ON public.presensi(tanggal);

-- 3.3 Rate Limit Attempt Presensi Siswa (Anti Trial & Error GPS Spoofing)
CREATE TABLE IF NOT EXISTS public.presensi_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    attempt_count INT NOT NULL DEFAULT 1,
    last_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_attempt_siswa_hari UNIQUE (siswa_id, tanggal)
);

-- 3.4 Penilaian Harian Praktek
CREATE TABLE IF NOT EXISTS public.penilaian_harian (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
    kriteria_id UUID NOT NULL REFERENCES public.master_kriteria(id) ON DELETE RESTRICT,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    nilai INT NOT NULL CHECK (nilai >= 0 AND nilai <= 100),
    created_by VARCHAR(30) NOT NULL DEFAULT 'siswa', -- 'siswa' atau 'superadmin'
    catatan TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nilai_siswa_kriteria ON public.penilaian_harian(siswa_id, kriteria_id, tanggal);

-- 3.5 Catatan Keuangan & Transaksi Pembayaran
CREATE TABLE IF NOT EXISTS public.transaksi_keuangan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE RESTRICT,
    tgl_bayar DATE NOT NULL DEFAULT CURRENT_DATE,
    nominal NUMERIC(12, 2) NOT NULL CHECK (nominal > 0),
    metode VARCHAR(50) NOT NULL DEFAULT 'Tunai', -- 'Tunai', 'Transfer Bank', dll
    keterangan TEXT,
    penerima VARCHAR(100) DEFAULT 'Superadmin',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_keuangan_siswa ON public.transaksi_keuangan(siswa_id);

-- 3.6 Ujian Internal Akhir (Flatten 5 Kriteria + Teori)
CREATE TABLE IF NOT EXISTS public.ujian (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID UNIQUE NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
    tgl_ujian DATE NOT NULL DEFAULT CURRENT_DATE,
    teori INT NOT NULL DEFAULT 0 CHECK (teori >= 0 AND teori <= 100),
    root INT NOT NULL DEFAULT 0 CHECK (root >= 0 AND root <= 100),
    hotpass INT NOT NULL DEFAULT 0 CHECK (hotpass >= 0 AND hotpass <= 100),
    filler INT NOT NULL DEFAULT 0 CHECK (filler >= 0 AND filler <= 100),
    capping INT NOT NULL DEFAULT 0 CHECK (capping >= 0 AND capping <= 100),
    gerinda INT NOT NULL DEFAULT 0 CHECK (gerinda >= 0 AND gerinda <= 100),
    is_lulus BOOLEAN NOT NULL DEFAULT FALSE,
    catatan_penguji TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.7 Ringkasan Perkembangan AI (Showcase / Narrative Progress)
CREATE TABLE IF NOT EXISTS public.ai_ringkasan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siswa_id UUID NOT NULL REFERENCES public.siswa(id) ON DELETE CASCADE,
    tgl_generate DATE NOT NULL DEFAULT CURRENT_DATE,
    ringkasan TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3.8 Audit Trail Keamanan
CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID,
    actor_role VARCHAR(30) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_table VARCHAR(50),
    target_id VARCHAR(50),
    details JSONB DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON public.audit_log(created_at DESC);

-- ==============================================================================
-- 4. FUNGSI DATABASE (STORED PROCEDURES)
-- ==============================================================================

-- 4.1 Kalkulasi Jarak Haversine (Dalam Satuan Meter)
CREATE OR REPLACE FUNCTION public.calculate_haversine_distance(
    lat1 DOUBLE PRECISION,
    lon1 DOUBLE PRECISION,
    lat2 DOUBLE PRECISION,
    lon2 DOUBLE PRECISION
)
RETURNS INT AS $$
DECLARE
    r DOUBLE PRECISION := 6371000; -- Radius bumi dalam meter
    phi1 DOUBLE PRECISION;
    phi2 DOUBLE PRECISION;
    delta_phi DOUBLE PRECISION;
    delta_lambda DOUBLE PRECISION;
    a DOUBLE PRECISION;
    c DOUBLE PRECISION;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN 999999;
    END IF;

    phi1 := radians(lat1);
    phi2 := radians(lat2);
    delta_phi := radians(lat2 - lat1);
    delta_lambda := radians(lon2 - lon1);

    a := sin(delta_phi / 2.0) ^ 2 + cos(phi1) * cos(phi2) * (sin(delta_lambda / 2.0) ^ 2);
    c := 2.0 * atan2(sqrt(a), sqrt(1.0 - a));

    RETURN ROUND(r * c);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- 4.2 Auto-generate Nomor Induk Siswa dengan Pessimistic Locking
CREATE OR REPLACE FUNCTION public.generate_nomor_induk(p_program_id UUID)
RETURNS VARCHAR AS $$
DECLARE
    v_kode_program VARCHAR(10);
    v_last_no INT := 0;
    v_next_no INT := 1;
    v_nomor_induk VARCHAR(30);
BEGIN
    -- Ambil kode program dan kunci baris untuk konkurensi aman
    SELECT kode_program INTO v_kode_program
    FROM public.master_program
    WHERE id = p_program_id
    FOR UPDATE;

    IF v_kode_program IS NULL THEN
        RAISE EXCEPTION 'Program tidak ditemukan.';
    END IF;

    -- Hitung urutan terakhir siswa pada program ini
    SELECT COALESCE(MAX(NULLIF(regexp_replace(split_part(nomor_induk, '.', 2), '[^0-9]', '', 'g'), '')::INT), 0)
    INTO v_last_no
    FROM public.siswa
    WHERE program_id = p_program_id;

    v_next_no := v_last_no + 1;
    v_nomor_induk := v_kode_program || '.' || LPAD(v_next_no::TEXT, 4, '0');

    RETURN v_nomor_induk;
END;
$$ LANGUAGE plpgsql;

-- Trigger untuk otomatis menghitung kelulusan Ujian
CREATE OR REPLACE FUNCTION public.trg_check_kelulusan_ujian()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.teori >= 80 AND NEW.root >= 80 AND NEW.hotpass >= 80 
       AND NEW.filler >= 80 AND NEW.capping >= 80 AND NEW.gerinda >= 80 THEN
        NEW.is_lulus := TRUE;
    ELSE
        NEW.is_lulus := FALSE;
    END IF;
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ujian_kelulusan
BEFORE INSERT OR UPDATE ON public.ujian
FOR EACH ROW EXECUTE FUNCTION public.trg_check_kelulusan_ujian();

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- Sesuai: docs/design/keamanan.md
-- ==============================================================================

ALTER TABLE public.master_program ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_kriteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_syarat_berkas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.master_lokasi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.siswa ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presensi ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.penilaian_harian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaksi_keuangan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ujian ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_ringkasan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Helper fungsi cek apakah user aktif adalah Superadmin
CREATE OR REPLACE FUNCTION public.is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN (auth.jwt() -> 'user_metadata' ->> 'role') = 'superadmin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5.1 Policies: Master Data (Semua authenticated user bisa baca, Superadmin bisa ubah)
CREATE POLICY "Public read master_program" ON public.master_program FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin CRUD master_program" ON public.master_program FOR ALL TO authenticated USING (public.is_superadmin());

CREATE POLICY "Public read master_kriteria" ON public.master_kriteria FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin CRUD master_kriteria" ON public.master_kriteria FOR ALL TO authenticated USING (public.is_superadmin());

CREATE POLICY "Public read master_syarat_berkas" ON public.master_syarat_berkas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin CRUD master_syarat_berkas" ON public.master_syarat_berkas FOR ALL TO authenticated USING (public.is_superadmin());

CREATE POLICY "Public read master_lokasi" ON public.master_lokasi FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin CRUD master_lokasi" ON public.master_lokasi FOR ALL TO authenticated USING (public.is_superadmin());

-- 5.2 Policies: Siswa
CREATE POLICY "Admin ALL siswa" ON public.siswa FOR ALL TO authenticated USING (public.is_superadmin());
CREATE POLICY "Siswa view self profile" ON public.siswa FOR SELECT TO authenticated USING (auth.uid() = auth_id);

-- 5.3 Policies: Presensi
CREATE POLICY "Admin ALL presensi" ON public.presensi FOR ALL TO authenticated USING (public.is_superadmin());
CREATE POLICY "Siswa view self presensi" ON public.presensi FOR SELECT TO authenticated 
USING (siswa_id IN (SELECT id FROM public.siswa WHERE auth_id = auth.uid()));
CREATE POLICY "Siswa insert self presensi" ON public.presensi FOR INSERT TO authenticated 
WITH CHECK (siswa_id IN (SELECT id FROM public.siswa WHERE auth_id = auth.uid()));

-- 5.4 Policies: Penilaian Harian
CREATE POLICY "Admin ALL penilaian" ON public.penilaian_harian FOR ALL TO authenticated USING (public.is_superadmin());
CREATE POLICY "Siswa view self penilaian" ON public.penilaian_harian FOR SELECT TO authenticated 
USING (siswa_id IN (SELECT id FROM public.siswa WHERE auth_id = auth.uid()));
CREATE POLICY "Siswa insert self penilaian" ON public.penilaian_harian FOR INSERT TO authenticated 
WITH CHECK (siswa_id IN (SELECT id FROM public.siswa WHERE auth_id = auth.uid()));

-- 5.5 Policies: Keuangan
CREATE POLICY "Admin ALL keuangan" ON public.transaksi_keuangan FOR ALL TO authenticated USING (public.is_superadmin());
CREATE POLICY "Siswa view self keuangan" ON public.transaksi_keuangan FOR SELECT TO authenticated 
USING (siswa_id IN (SELECT id FROM public.siswa WHERE auth_id = auth.uid()));

-- 5.6 Policies: Ujian
CREATE POLICY "Admin ALL ujian" ON public.ujian FOR ALL TO authenticated USING (public.is_superadmin());
CREATE POLICY "Siswa view self ujian" ON public.ujian FOR SELECT TO authenticated 
USING (siswa_id IN (SELECT id FROM public.siswa WHERE auth_id = auth.uid()));

-- 5.7 Policies: AI Ringkasan
CREATE POLICY "Admin ALL ai_ringkasan" ON public.ai_ringkasan FOR ALL TO authenticated USING (public.is_superadmin());
CREATE POLICY "Siswa view self ai_ringkasan" ON public.ai_ringkasan FOR SELECT TO authenticated 
USING (siswa_id IN (SELECT id FROM public.siswa WHERE auth_id = auth.uid()));

-- 5.8 Policies: Audit Log (Hanya Superadmin yang bisa membaca)
CREATE POLICY "Admin view audit_log" ON public.audit_log FOR SELECT TO authenticated USING (public.is_superadmin());

-- ==============================================================================
-- 6. DATA AWAL (SEEDING DEFAULT)
-- ==============================================================================

-- Program Pengelasan Utama
INSERT INTO public.master_program (kode_program, nama, biaya, estimasi_durasi_hari)
VALUES 
    ('01', 'SMAW 6G (Pipa)', 8500000, 30),
    ('02', 'GTAW / TIG 6G', 9500000, 30),
    ('03', 'GMAW / MIG 3G', 7500000, 25)
ON CONFLICT (kode_program) DO NOTHING;

-- 5 Kriteria Penilaian Praktek Pengelasan
INSERT INTO public.master_kriteria (nama_kriteria, batas_lulus, urutan)
VALUES 
    ('Root', 80, 1),
    ('Hotpass', 80, 2),
    ('Filler', 80, 3),
    ('Capping', 80, 4),
    ('Gerinda', 80, 5)
ON CONFLICT (nama_kriteria) DO NOTHING;

-- Syarat Berkas Fisik Pendaftaran
INSERT INTO public.master_syarat_berkas (kode_berkas, nama_berkas, wajib)
VALUES 
    ('ijazah', 'Fotokopi Ijazah Terakhir', true),
    ('ktp', 'Fotokopi KTP / Identitas', true),
    ('kk', 'Fotokopi Kartu Keluarga', true),
    ('foto', 'Pas Foto 3x4 (3 Lembar)', true),
    ('suket_sehat', 'Surat Keterangan Sehat Dokter', true)
ON CONFLICT (kode_berkas) DO NOTHING;

-- Lokasi Default Bengkel LPKS (Contoh: Bandung/Pusat LPKS)
INSERT INTO public.master_lokasi (nama_titik, lat, lng, radius_meter, is_active)
VALUES 
    ('Bengkel Las LPKS Sumbu Hidup', -6.917464, 107.619122, 100, true)
ON CONFLICT DO NOTHING;
