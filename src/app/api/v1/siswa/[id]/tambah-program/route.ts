import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireSuperadmin } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateStudentUsername, generateStudentPassword } from "@/lib/gate-checks";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { errorResponse: authError } = await requireSuperadmin();
    if (authError) return authError;

    const { id: sourceSiswaId } = await params;
    if (!sourceSiswaId) {
      return errorResponse("VALIDATION_ERROR", "ID siswa asal wajib disertakan.", 400);
    }

    const body = await request.json();
    const { program_id, nomor_induk, biaya_pelatihan, tgl_masuk, tgl_keluar } = body;

    if (!program_id) {
      return errorResponse("VALIDATION_ERROR", "Program pelatihan baru wajib dipilih.", 400);
    }

    const supabase = await createClient();

    // 1. Ambil data lengkap siswa asal
    const { data: sourceSiswa, error: fetchError } = await supabase
      .from("siswa")
      .select("*")
      .eq("id", sourceSiswaId)
      .single();

    if (fetchError || !sourceSiswa) {
      return errorResponse("NOT_FOUND", "Data siswa asal tidak ditemukan.", 404);
    }

    // 2. Ambil data program baru
    const { data: targetProgram, error: progError } = await supabase
      .from("master_program")
      .select("id, kode_program, nama, biaya, estimasi_durasi_hari")
      .eq("id", program_id)
      .single();

    if (progError || !targetProgram) {
      return errorResponse("NOT_FOUND", "Program pelatihan baru tidak ditemukan.", 404);
    }

    // 3. Pastikan siswa belum terdaftar di program baru ini (mencegah duplikasi data di program yang sama)
    const { data: existingInTarget } = await supabase
      .from("siswa")
      .select("id, nomor_induk")
      .eq("nik", sourceSiswa.nik)
      .eq("program_id", program_id)
      .maybeSingle();

    if (existingInTarget) {
      return errorResponse(
        "DUPLICATE_PROGRAM",
        `Siswa ini sudah terdaftar dalam program ${targetProgram.nama} dengan nomor induk ${existingInTarget.nomor_induk}.`,
        409
      );
    }

    // 4. Tentukan nomor induk baru
    let finalNomorInduk = "";
    if (nomor_induk && String(nomor_induk).trim()) {
      finalNomorInduk = String(nomor_induk).trim();
    } else {
      // Cari nomor urut tertinggi untuk kode_program ini
      const { data: allSiswaInProg } = await supabase
        .from("siswa")
        .select("nomor_induk")
        .not("nik", "like", "ANON-%")
        .ilike("nomor_induk", `${targetProgram.kode_program}.%`);

      let maxUrutan = 0;
      allSiswaInProg?.forEach((s) => {
        if (s.nomor_induk) {
          const parts = s.nomor_induk.split(".");
          if (parts.length >= 2) {
            const num = parseInt(parts[1].replace(/\D/g, ""), 10);
            if (!isNaN(num) && num > maxUrutan) {
              maxUrutan = num;
            }
          }
        }
      });
      const nextNoUrut = String(maxUrutan + 1).padStart(4, "0");
      finalNomorInduk = `${targetProgram.kode_program}.${nextNoUrut}`;
    }

    // Cek duplikasi nomor induk di program tujuan
    const { data: duplicateNoInduk } = await supabase
      .from("siswa")
      .select("id, nama_lengkap")
      .eq("nomor_induk", finalNomorInduk)
      .eq("program_id", program_id)
      .maybeSingle();

    if (duplicateNoInduk) {
      return errorResponse(
        "DUPLICATE_NOMOR_INDUK",
        `Nomor induk ${finalNomorInduk} sudah digunakan oleh ${duplicateNoInduk.nama_lengkap} di program ini. Silakan gunakan nomor induk lain.`,
        409
      );
    }

    // 5. Tentukan tanggal masuk dan estimasi tanggal keluar
    const finalTglMasuk = tgl_masuk || new Date().toISOString().split("T")[0];
    let finalTglKeluar = tgl_keluar || null;
    if (!finalTglKeluar && targetProgram.estimasi_durasi_hari) {
      const d = new Date(finalTglMasuk);
      d.setDate(d.getDate() + Number(targetProgram.estimasi_durasi_hari));
      finalTglKeluar = d.toISOString().split("T")[0];
    }

    // 6. Tentukan biaya pelatihan
    let finalBiaya: number | null = null;
    if (biaya_pelatihan !== undefined && biaya_pelatihan !== null && biaya_pelatihan !== "") {
      if (typeof biaya_pelatihan === "number") {
        finalBiaya = biaya_pelatihan;
      } else {
        let s = String(biaya_pelatihan).trim();
        if (s.includes(".") && !s.includes(",")) {
          if (/\.\d{3}/.test(s)) s = s.replace(/\./g, "");
        } else if (s.includes(".") && s.includes(",")) {
          s = s.replace(/\./g, "").replace(",", ".");
        } else if (s.includes(",")) {
          s = s.replace(",", ".");
        }
        finalBiaya = parseFloat(s) || 0;
      }
    } else if (targetProgram.biaya !== undefined) {
      finalBiaya = Number(targetProgram.biaya);
    }

    // 7. Generate username & kredensial baru untuk program ini
    const urutanRaw = finalNomorInduk.includes(".")
      ? finalNomorInduk.split(".")[1].trim()
      : finalNomorInduk;
    const urutanNomor = parseInt(urutanRaw.replace(/\D/g, ""), 10) || null;
    const newUsername = generateStudentUsername(sourceSiswa.nama_lengkap, urutanRaw);
    const newPassword = generateStudentPassword(newUsername);

    const namaDepanClean = sourceSiswa.nama_lengkap.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "") || "siswa";
    const cleanUrutan = urutanRaw.replace(/\D/g, "") || String(Math.floor(1000 + Math.random() * 9000));
    const authEmail = `${namaDepanClean}.${cleanUrutan}@lpks.id`;

    let authUserId: string | null = null;
    try {
      const supabaseAdmin = createAdminClient();
      const { data: authData } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password: newPassword,
        email_confirm: true,
        user_metadata: { role: "siswa", nama: sourceSiswa.nama_lengkap.trim() },
      });
      if (authData?.user?.id) {
        authUserId = authData.user.id;
      }
    } catch {
      // Supabase admin fallback jika key tidak tersedia
    }

    // 8. Masukkan data siswa baru untuk program ini
    const { data: newSiswa, error: insertError } = await supabase
      .from("siswa")
      .insert({
        program_id: targetProgram.id,
        nomor_induk: finalNomorInduk,
        urutan_nomor: urutanNomor,
        nama_lengkap: sourceSiswa.nama_lengkap,
        nik: sourceSiswa.nik,
        tempat_lahir: sourceSiswa.tempat_lahir,
        tgl_lahir: sourceSiswa.tgl_lahir,
        alamat_lengkap: sourceSiswa.alamat_lengkap,
        nama_ayah: sourceSiswa.nama_ayah,
        nama_ibu: sourceSiswa.nama_ibu,
        no_hp: sourceSiswa.no_hp,
        email: sourceSiswa.email && !sourceSiswa.email.includes("@lpks.id") ? sourceSiswa.email : authEmail,
        pendidikan_terakhir: sourceSiswa.pendidikan_terakhir,
        nisn: sourceSiswa.nisn,
        tgl_masuk: finalTglMasuk,
        tgl_keluar: finalTglKeluar,
        status_siswa: "aktif",
        checklist_berkas: sourceSiswa.checklist_berkas || {},
        biaya_pelatihan: finalBiaya,
        username: newUsername,
        auth_id: authUserId,
        is_password_default: true,
      })
      .select("*, program:master_program(id, kode_program, nama, biaya)")
      .single();

    if (insertError) {
      return errorResponse("DATABASE_ERROR", "Gagal mendaftarkan siswa ke program baru.", 500, insertError.message);
    }

    return successResponse(
      newSiswa,
      {
        message: `Berhasil mendaftarkan ${sourceSiswa.nama_lengkap} ke program ${targetProgram.nama} dengan nomor induk ${finalNomorInduk}.`,
      },
      201
    );
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Terjadi kesalahan pada server saat mendaftarkan siswa ke program baru.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
