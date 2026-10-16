-- Migrasi: Perbaikan generate_nomor_induk agar mencakup seluruh siswa dengan kode program yang sama
-- Masalah sebelumnya: WHERE program_id = p_program_id hanya mencakup siswa pada UUID program yang sama persis,
-- mengabaikan siswa dengan kode_program sama dari batch berbeda atau siswa impor dengan program_id NULL,
-- serta memastikan pengurutan numerik akurat.

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

    -- Hitung urutan terakhir siswa pada program ini (mencakup pencarian nomor_induk berbasis kode program dan program_id)
    SELECT COALESCE(MAX(NULLIF(regexp_replace(split_part(nomor_induk, '.', 2), '[^0-9]', '', 'g'), '')::INT), 0)
    INTO v_last_no
    FROM public.siswa
    WHERE (nomor_induk ILIKE v_kode_program || '.%' OR program_id = p_program_id);

    v_next_no := v_last_no + 1;
    v_nomor_induk := v_kode_program || '.' || LPAD(v_next_no::TEXT, 4, '0');

    RETURN v_nomor_induk;
END;
$$ LANGUAGE plpgsql;
