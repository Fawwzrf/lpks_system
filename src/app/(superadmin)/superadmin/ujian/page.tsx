import React, { Suspense } from "react";
import { CardSkeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { buildKriteriaPassMap } from "@/lib/nilai-utils";
import { toRomanMonth, formatIndoDate, formatDDMMYYYY } from "@/lib/date-utils";
import {
  UjianClient,
  type SiswaUjianItem,
  type QueueItem,
} from "./ujian-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ujian Internal & Antrean Sertifikat — LPKS Sumbu Hidup",
  description:
    "Pelaksanaan ujian internal 6 mata uji pengelasan, verifikasi kelayakan nilai harian, dan antrean percetakan sertifikat resmi.",
};

async function getInitialUjianData(): Promise<{
  data: SiswaUjianItem[];
  queueData: QueueItem[];
  historyData: QueueItem[];
}> {
  try {
    const supabase = await createClient();

    // Query paralel data siswa, ujian, sertifikat, transaksi, kriteria, nilai_harian, dan antrean
    const [
      siswaRes,
      ujianRes,
      sertifikatRes,
      txRes,
      kriteriaRes,
      nilaiRes,
      queueRes,
    ] = await Promise.all([
      supabase
        .from("siswa")
        .select(
          "id, nomor_induk, nama_lengkap, tgl_masuk, tgl_keluar, biaya_pelatihan, program:master_program(id, nama, biaya)"
        )
        .not("nik", "like", "ANON-%")
        .neq("alamat_lengkap", "[DATA DIHAPUS]")
        .order("urutan_nomor", { ascending: true, nullsFirst: false })
        .order("nomor_induk", { ascending: true }),
      supabase.from("ujian").select("*"),
      supabase.from("sertifikat").select("siswa_id, status, tgl_cetak, tgl_antrean"),
      supabase.from("transaksi_keuangan").select("siswa_id, nominal"),
      supabase.from("master_kriteria").select("id, nama_kriteria, batas_lulus"),
      supabase.from("penilaian_harian").select("siswa_id, kriteria_id, nilai"),
      supabase.from("sertifikat").select(`
        id,
        siswa_id,
        status,
        no_sertifikat,
        urutan_cetak,
        tgl_antrean,
        tgl_cetak,
        created_at,
        updated_at,
        siswa:siswa(
          id,
          nomor_induk,
          nama_lengkap,
          nik,
          tempat_lahir,
          tgl_lahir,
          alamat_lengkap,
          no_hp,
          tgl_masuk,
          tgl_keluar,
          program:master_program(id, kode_program, nama, biaya, estimasi_durasi_hari)
        )
      `),
    ]);

    const siswaList = siswaRes.data || [];
    const ujianList = ujianRes.data || [];
    const sertifikatList = sertifikatRes.data || [];
    const txList = txRes.data || [];
    const masterKriteria = kriteriaRes.data || [];
    const nilaiHarian = nilaiRes.data || [];
    const allQueueList = queueRes.data || [];

    const ujianMap = new Map(ujianList.map((u) => [u.siswa_id, u]));
    const sertifikatMap = new Map(sertifikatList.map((st) => [st.siswa_id, st]));

    const txMap = new Map<string, number>();
    txList.forEach((tx) => {
      txMap.set(tx.siswa_id, (txMap.get(tx.siswa_id) || 0) + Number(tx.nominal || 0));
    });

    const totalKriteria = masterKriteria.length || 5;
    const studentKriteriaPass = buildKriteriaPassMap(nilaiHarian);

    const data: SiswaUjianItem[] = siswaList.map((s) => {
      const u = ujianMap.get(s.id) || null;
      const st = sertifikatMap.get(s.id) || null;
      const program = s.program as unknown as { nama: string; biaya: number } | null;
      const programBiaya = Number(program?.biaya || 0);
      const totalBiaya =
        s.biaya_pelatihan !== null && s.biaya_pelatihan !== undefined
          ? Number(s.biaya_pelatihan)
          : programBiaya;
      const totalTerbayar = txMap.get(s.id) || 0;
      const isLunas = totalBiaya > 0 && totalTerbayar >= totalBiaya;
      const passedKriteriaCount = studentKriteriaPass.get(s.id)?.size || 0;
      const isNilaiHarianOk = passedKriteriaCount >= totalKriteria && totalKriteria > 0;

      return {
        id: s.id,
        nomor_induk: s.nomor_induk,
        nama_lengkap: s.nama_lengkap,
        program_nama: program?.nama || "Umum",
        tgl_masuk: s.tgl_masuk,
        tgl_keluar: s.tgl_keluar,
        total_biaya: totalBiaya,
        total_terbayar: totalTerbayar,
        is_lunas: isLunas,
        nilai_harian_ok: isNilaiHarianOk,
        ujian: u,
        status_sertifikat: st?.status as "antrean" | "dicetak" | null,
        tgl_cetak_sertifikat: st?.tgl_cetak || null,
        tgl_antrean_sertifikat: st?.tgl_antrean || null,
      };
    }).filter((s) => s.status_sertifikat !== "dicetak");

    data.sort((a, b) => {
      const getPriority = (item: typeof a) => {
        if (item.nilai_harian_ok && !item.ujian?.is_lulus) return 0;
        if (item.nilai_harian_ok && item.ujian?.is_lulus && item.status_sertifikat !== "dicetak") return 1;
        if (!item.nilai_harian_ok && !item.ujian?.is_lulus) return 2;
        return 3;
      };

      const pDiff = getPriority(a) - getPriority(b);
      if (pDiff !== 0) return pDiff;

      const getUrutan = (noInduk?: string | null) => {
        if (!noInduk) return 999999;
        if (noInduk.includes("—") || noInduk.includes("-")) return 1110.5;
        const parts = noInduk.split(".");
        const lastPart = parts.length > 1 ? parts.slice(1).join(".") : parts[0];
        const num = parseInt(lastPart.replace(/\D/g, ""), 10);
        return isNaN(num) ? 999999 : num;
      };
      return getUrutan(a.nomor_induk) - getUrutan(b.nomor_induk);
    });

    // Format Queue & History items
    const formatQueueItem = (item: (typeof allQueueList)[number]): QueueItem | null => {
      const s = item.siswa as unknown as {
        id: string;
        nomor_induk: string;
        nama_lengkap: string;
        nik: string;
        tempat_lahir?: string;
        tgl_lahir?: string;
        alamat_lengkap?: string;
        no_hp?: string;
        tgl_masuk: string;
        tgl_keluar?: string;
        program?: {
          id: string;
          kode_program: string;
          nama: string;
          biaya: number;
          estimasi_durasi_hari: number;
        };
      } | null;

      if (!s) return null;

      let toDateStr = s.tgl_keluar;
      if (!toDateStr && s.tgl_masuk) {
        const startDate = new Date(s.tgl_masuk);
        const durasi = s.program?.estimasi_durasi_hari || 30;
        startDate.setDate(startDate.getDate() + durasi);
        toDateStr = startDate.toISOString().split("T")[0];
      }

      const toDate = toDateStr ? new Date(toDateStr) : new Date();
      const certMonthRoman = toRomanMonth(toDate.getMonth() + 1);
      const certYear = toDate.getFullYear();
      const autoNoSertifikat = `STF / LPKS -  SH / ${certMonthRoman} / ${certYear}`;

      const placeAndDob = s.tempat_lahir
        ? `${s.tempat_lahir}, ${formatIndoDate(s.tgl_lahir)}`
        : formatIndoDate(s.tgl_lahir);

      let cleanProgram = s.program?.nama || "Umum";
      if (
        cleanProgram.toLowerCase().includes("kombinasi") ||
        cleanProgram.toLowerCase().includes("gtaw + smaw")
      ) {
        cleanProgram = "Kombinasi";
      }

      return {
        id: item.id,
        siswa_id: item.siswa_id,
        status: item.status as "antrean" | "dicetak",
        no_sertifikat: item.no_sertifikat || autoNoSertifikat,
        tgl_antrean: item.tgl_antrean,
        tgl_cetak: item.tgl_cetak,
        urutan_cetak: item.urutan_cetak,
        siswa: {
          id: s.id,
          nomor_induk: s.nomor_induk,
          nama_lengkap: s.nama_lengkap,
          nik: s.nik,
          tempat_lahir: s.tempat_lahir,
          tgl_lahir: s.tgl_lahir,
          alamat_lengkap: s.alamat_lengkap,
          no_hp: s.no_hp,
          tgl_masuk: s.tgl_masuk,
          tgl_keluar: s.tgl_keluar,
          program: s.program,
        },
        ujian: ujianMap.get(item.siswa_id) || null,
        formatted: {
          place_and_dob: placeAndDob,
          program_name: cleanProgram,
          starting_from: formatDDMMYYYY(s.tgl_masuk),
          to: formatDDMMYYYY(toDateStr),
          date_of_issue: `Cilacap, ${formatIndoDate(toDateStr)}`,
        },
      };
    };

    const queueData: QueueItem[] = allQueueList
      .filter((q) => q.status === "antrean")
      .map(formatQueueItem)
      .filter((item): item is QueueItem => item !== null)
      .sort((a, b) => {
        const timeA = a.siswa.tgl_masuk ? new Date(a.siswa.tgl_masuk).getTime() : 0;
        const timeB = b.siswa.tgl_masuk ? new Date(b.siswa.tgl_masuk).getTime() : 0;
        return timeB - timeA;
      });

    const historyData: QueueItem[] = allQueueList
      .filter((q) => q.status === "dicetak")
      .map(formatQueueItem)
      .filter((item): item is QueueItem => item !== null)
      .sort((a, b) => {
        const timeA = a.siswa.tgl_masuk ? new Date(a.siswa.tgl_masuk).getTime() : 0;
        const timeB = b.siswa.tgl_masuk ? new Date(b.siswa.tgl_masuk).getTime() : 0;
        return timeB - timeA;
      });

    return { data, queueData, historyData };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: string }).digest === "string" &&
      (error as { digest: string }).digest.startsWith("DYNAMIC_SERVER_USAGE")
    ) {
      throw error;
    }
    console.error("Gagal memuat data ujian di Server Component:", error);
    return { data: [], queueData: [], historyData: [] };
  }
}

async function UjianContent() {
  const { data, queueData, historyData } = await getInitialUjianData();
  return (
    <UjianClient
      initialData={data}
      initialQueueData={queueData}
      initialHistoryData={historyData}
    />
  );
}

export default function UjianPage() {
  return (
    <Suspense fallback={<CardSkeleton count={6} />}>
      <UjianContent />
    </Suspense>
  );
}
