import { NextRequest } from "next/server";
import { successResponse, errorResponse, requireAuth } from "@/lib/api-response";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  try {
    const { user, errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const supabase = await createClient();
    const searchParams = request.nextUrl.searchParams;

    const tanggal = searchParams.get("tanggal");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const viewType = searchParams.get("view_type"); // 'all_students'
    let siswaId = searchParams.get("siswa_id");
    const status = searchParams.get("status");
    const programId = searchParams.get("program_id");
    const limit = parseInt(searchParams.get("limit") || "200", 10);

    // Jika siswa yang mengakses, batasi hanya ke data miliknya
    if (user?.role === "siswa") {
      const { data: selfSiswa } = await supabase
        .from("siswa")
        .select("id")
        .eq("auth_id", user.id)
        .single();
      if (!selfSiswa) {
        return errorResponse("STUDENT_NOT_FOUND", "Data siswa tidak ditemukan.", 404);
      }
      siswaId = selfSiswa.id;
    }

    // Mode all_students untuk Superadmin: kembalikan seluruh siswa aktif beserta status presensi pada tanggal tersebut
    if (user?.role === "superadmin" && viewType === "all_students") {
      const targetDate = tanggal || new Date().toISOString().split("T")[0];

      let siswaQuery = supabase
        .from("siswa")
        .select("id, nomor_induk, nama_lengkap, program_id, program:master_program(id, kode_program, nama)")
        .not("nik", "like", "ANON-%")
        .neq("alamat_lengkap", "[DATA DIHAPUS]")
        .order("urutan_nomor", { ascending: true, nullsFirst: false })
        .order("nomor_induk", { ascending: true });

      if (programId) {
        siswaQuery = siswaQuery.eq("program_id", programId);
      }

      const { data: allSiswa, error: siswaError } = await siswaQuery;
      if (siswaError) {
        return errorResponse("DATABASE_ERROR", "Gagal memuat data siswa.", 500, siswaError.message);
      }

      const { data: presensiList, error: presensiError } = await supabase
        .from("presensi")
        .select("id, siswa_id, tanggal, jam, status, jarak_meter, keterangan, created_by")
        .eq("tanggal", targetDate);

      if (presensiError) {
        return errorResponse("DATABASE_ERROR", "Gagal memuat presensi.", 500, presensiError.message);
      }

      const presensiMap = new Map<string, typeof presensiList[number]>();
      presensiList?.forEach((p) => {
        presensiMap.set(p.siswa_id, p);
      });

      const result = allSiswa?.map((s) => {
        const presensiRecord = presensiMap.get(s.id) || null;
        return {
          id: s.id,
          siswa: s,
          presensi: presensiRecord,
          status: presensiRecord ? presensiRecord.status : ("Belum Absen" as const),
        };
      }) || [];

      // Filter status jika diminta
      const filteredResult = status
        ? result.filter((item) => (status === "Belum Absen" ? !item.presensi : item.status === status))
        : result;

      return successResponse(filteredResult);
    }

    let query = supabase
      .from("presensi")
      .select("*, siswa:siswa(id, nomor_induk, nama_lengkap, program_id, program:master_program(id, kode_program, nama))");

    if (startDate && endDate) {
      query = query.gte("tanggal", startDate).lte("tanggal", endDate);
    } else if (tanggal) {
      query = query.eq("tanggal", tanggal);
    } else if (user?.role === "superadmin" && !siswaId) {
      const today = new Date().toISOString().split("T")[0];
      query = query.eq("tanggal", today);
    }

    if (siswaId) query = query.eq("siswa_id", siswaId);
    if (status) query = query.eq("status", status);

    query = query.order("tanggal", { ascending: false }).order("jam", { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) {
      return errorResponse("DATABASE_ERROR", "Gagal memuat log presensi.", 500, error.message);
    }

    return successResponse(data);
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Gagal memuat rekap presensi.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { user, errorResponse: authError } = await requireAuth();
    if (authError) return authError;

    const body = await request.json();
    const supabase = await createClient();
    const todayStr = new Date().toISOString().split("T")[0];

    // =========================================================================
    // 1. KASUS SUPERADMIN: Catat Manual / Override / Batch Alpa
    // =========================================================================
    if (user?.role === "superadmin") {
      // 1A. Batch Alpa: Tandai semua siswa aktif yang belum presensi di tanggal tersebut sebagai Alpa
      if (body.action === "batch_alpa") {
        const targetDate = body.tanggal || todayStr;

        // Ambil semua siswa aktif
        const { data: activeStudents, error: studentError } = await supabase
          .from("siswa")
          .select("id")
          .not("nik", "like", "ANON-%")
          .neq("alamat_lengkap", "[DATA DIHAPUS]");

        if (studentError || !activeStudents) {
          return errorResponse("DATABASE_ERROR", "Gagal memuat siswa aktif.", 500, studentError?.message);
        }

        // Ambil ID siswa yang sudah ada catatan presensi pada tanggal tersebut
        const { data: existingRecords } = await supabase
          .from("presensi")
          .select("siswa_id")
          .eq("tanggal", targetDate);

        const attendedSet = new Set((existingRecords || []).map((r) => r.siswa_id));
        const unrecordedStudents = activeStudents.filter((s) => !attendedSet.has(s.id));

        if (unrecordedStudents.length === 0) {
          return successResponse({
            count: 0,
            message: "Seluruh siswa aktif sudah memiliki catatan presensi pada tanggal ini.",
          });
        }

        const alpaRecords = unrecordedStudents.map((s) => ({
          siswa_id: s.id,
          tanggal: targetDate,
          jam: "17:00:00",
          status: "Alpa",
          keterangan: "Tidak hadir tanpa keterangan (Otomatis)",
          created_by: "superadmin",
        }));

        const { error: batchError } = await supabase.from("presensi").insert(alpaRecords);

        if (batchError) {
          return errorResponse("DATABASE_ERROR", "Gagal menyimpan catatan Alpa massal.", 500, batchError.message);
        }

        return successResponse({
          count: unrecordedStudents.length,
          message: `${unrecordedStudents.length} siswa berhasil ditandai Alpa pada tanggal ${targetDate}.`,
        });
      }

      // 1B. Catat Presensi Manual / Override untuk satu siswa
      const { siswa_id, tanggal, status, keterangan } = body;
      if (!siswa_id || !status) {
        return errorResponse("MISSING_FIELDS", "siswa_id dan status wajib disertakan.", 400);
      }

      const validStatuses = ["Hadir", "Izin", "Sakit", "Alpa"];
      if (!validStatuses.includes(status)) {
        return errorResponse("INVALID_STATUS", `Status harus salah satu dari: ${validStatuses.join(", ")}.`, 400);
      }

      const targetDate = tanggal || todayStr;

      // Cek apakah data presensi pada tanggal tersebut sudah ada
      const { data: existing } = await supabase
        .from("presensi")
        .select("id")
        .eq("siswa_id", siswa_id)
        .eq("tanggal", targetDate)
        .maybeSingle();

      if (existing) {
        // Update data yang sudah ada
        const { data: updated, error: updateError } = await supabase
          .from("presensi")
          .update({
            status,
            keterangan: keterangan || null,
            created_by: "superadmin",
          })
          .eq("id", existing.id)
          .select("*, siswa:siswa(id, nomor_induk, nama_lengkap)")
          .single();

        if (updateError) {
          return errorResponse("DATABASE_ERROR", "Gagal memperbarui presensi.", 500, updateError.message);
        }

        return successResponse({
          presensi: updated,
          message: `Presensi siswa berhasil diperbarui menjadi ${status}.`,
        });
      } else {
        // Insert record baru
        const now = new Date();
        const timeStr = now.toTimeString().split(" ")[0];

        const { data: inserted, error: insertError } = await supabase
          .from("presensi")
          .insert({
            siswa_id,
            tanggal: targetDate,
            jam: timeStr,
            status,
            keterangan: keterangan || null,
            created_by: "superadmin",
          })
          .select("*, siswa:siswa(id, nomor_induk, nama_lengkap)")
          .single();

        if (insertError) {
          return errorResponse("DATABASE_ERROR", "Gagal menyimpan presensi manual.", 500, insertError.message);
        }

        return successResponse(
          {
            presensi: inserted,
            message: `Presensi siswa berhasil dicatat sebagai ${status}.`,
          },
          undefined,
          201
        );
      }
    }

    // =========================================================================
    // 2. KASUS SISWA: Presensi Mandiri atau Pengajuan Izin / Sakit
    // =========================================================================

    // Dapatkan profil siswa berdasarkan auth user
    const { data: siswa } = await supabase
      .from("siswa")
      .select("id, nama_lengkap, nomor_induk")
      .eq("auth_id", user?.id)
      .single();

    if (!siswa) {
      return errorResponse("STUDENT_NOT_FOUND", "Data siswa Anda tidak ditemukan atau belum terhubung.", 404);
    }

    const requestedStatus = body.status || "Hadir";
    const targetDate = body.tanggal || todayStr;

    // Cek apakah sudah pernah presensi hari ini (Anti-Double Entry)
    const { data: existingPresensi } = await supabase
      .from("presensi")
      .select("id, tanggal, jam, status")
      .eq("siswa_id", siswa.id)
      .eq("tanggal", targetDate)
      .maybeSingle();

    if (existingPresensi) {
      return errorResponse(
        "ALREADY_CHECKED_IN",
        `Anda sudah tercatat memiliki presensi pada tanggal ini (${existingPresensi.tanggal}) dengan status ${existingPresensi.status}.`,
        409
      );
    }

    // 2A. Pengajuan Izin / Sakit (Bypass GPS Geofence)
    if (requestedStatus === "Izin" || requestedStatus === "Sakit") {
      const keterangan = String(body.keterangan || "").trim();
      if (!keterangan) {
        return errorResponse("REASON_REQUIRED", "Keterangan/alasan izin atau sakit wajib diisi.", 400);
      }

      const now = new Date();
      const timeStr = now.toTimeString().split(" ")[0];

      const { data: izinResult, error: izinError } = await supabase
        .from("presensi")
        .insert({
          siswa_id: siswa.id,
          tanggal: targetDate,
          jam: timeStr,
          status: requestedStatus,
          keterangan,
          created_by: "siswa",
        })
        .select()
        .single();

      if (izinError) {
        return errorResponse("DATABASE_ERROR", "Gagal mengajukan izin/sakit.", 500, izinError.message);
      }

      return successResponse(
        {
          ...izinResult,
          message: `Pengajuan ${requestedStatus} Anda berhasil disimpan.`,
        },
        undefined,
        201
      );
    }

    // 2B. Presensi Hadir (Menggunakan GPS Geofencing)
    const { lat, lng } = body;
    if (typeof lat !== "number" || typeof lng !== "number") {
      return errorResponse("INVALID_COORDINATES", "Koordinat GPS (lat dan lng) wajib disertakan dalam format numerik.", 400);
    }

    // Validasi hari: hanya Senin(1), Selasa(2), Rabu(3), Kamis(4), Sabtu(6)
    const hariIni = new Date().getDay();
    const hariAktif = [1, 2, 3, 4, 6];
    if (!hariAktif.includes(hariIni)) {
      return errorResponse("INVALID_DAY", "Presensi hanya dapat dilakukan pada hari Senin–Kamis dan Sabtu.", 400);
    }

    // Proteksi Rate Limit Percobaan Presensi (L2: Max 3x per hari per siswa)
    const { data: attemptRecord } = await supabase
      .from("presensi_attempts")
      .select("id, attempt_count")
      .eq("siswa_id", siswa.id)
      .eq("tanggal", todayStr)
      .single();

    if (attemptRecord && attemptRecord.attempt_count >= 3) {
      return errorResponse("RATE_LIMIT_EXCEEDED", "Batas percobaan presensi hari ini telah habis (maksimal 3 kali). Silakan hubungi admin.", 429);
    }

    // Catat/update attempt count
    if (attemptRecord) {
      await supabase
        .from("presensi_attempts")
        .update({
          attempt_count: attemptRecord.attempt_count + 1,
          last_attempt_at: new Date().toISOString(),
        })
        .eq("id", attemptRecord.id);
    } else {
      await supabase.from("presensi_attempts").insert({
        siswa_id: siswa.id,
        tanggal: todayStr,
        attempt_count: 1,
      });
    }

    // Ambil titik lokasi master LPKS & radius toleransi
    const { data: lokasiLpks } = await supabase
      .from("master_lokasi")
      .select("lat, lng, radius_meter")
      .eq("is_active", true)
      .order("updated_at", { ascending: false, nullsFirst: false })
      .limit(1)
      .maybeSingle();

    const targetLat = lokasiLpks?.lat ?? -6.917464;
    const targetLng = lokasiLpks?.lng ?? 107.619122;
    const maxRadius = lokasiLpks?.radius_meter ?? 100;

    // Kalkulasi Jarak Haversine di Sisi Server
    const { data: jarakMeter, error: rpcError } = await supabase.rpc(
      "calculate_haversine_distance",
      {
        lat1: lat,
        lon1: lng,
        lat2: targetLat,
        lon2: targetLng,
      }
    );

    if (rpcError) {
      return errorResponse("CALCULATION_ERROR", "Gagal memvalidasi jarak geofencing.", 500, rpcError.message);
    }

    const calculatedDistance = typeof jarakMeter === "number" ? jarakMeter : 999999;

    if (calculatedDistance > maxRadius) {
      return errorResponse(
        "OUT_OF_GEOFENCE_RADIUS",
        `Presensi ditolak: Anda terdeteksi berada ${calculatedDistance} meter dari LPKS (batas toleransi maksimal ${maxRadius} meter).`,
        400,
        { jarak_meter: calculatedDistance, max_radius: maxRadius }
      );
    }

    // Simpan Kehadiran
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0];

    const { data: presensiResult, error: insertError } = await supabase
      .from("presensi")
      .insert({
        siswa_id: siswa.id,
        tanggal: todayStr,
        jam: timeStr,
        lat,
        lng,
        jarak_meter: calculatedDistance,
        status: "Hadir",
        created_by: "siswa",
      })
      .select()
      .single();

    if (insertError) {
      return errorResponse("DATABASE_ERROR", "Gagal menyimpan presensi.", 500, insertError.message);
    }

    return successResponse(
      {
        ...presensiResult,
        message: `Presensi berhasil dicatat. Jarak Anda: ${calculatedDistance} meter dari LPKS.`,
      },
      undefined,
      201
    );
  } catch (err) {
    return errorResponse(
      "INTERNAL_ERROR",
      "Terjadi kesalahan saat memproses presensi.",
      500,
      err instanceof Error ? err.message : String(err)
    );
  }
}
