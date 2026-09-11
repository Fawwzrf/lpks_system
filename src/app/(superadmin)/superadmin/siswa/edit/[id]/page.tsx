"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, ChevronLeft, AlertTriangle, Loader2, Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { handleEnterToNextField } from "@/lib/form-utils";

type FieldErrors = Record<string, string>;

function validateField(name: string, value: string): string {
  switch (name) {
    case "nama":
      if (!value.trim()) return "Nama lengkap wajib diisi.";
      if (value.trim().length < 3) return "Nama lengkap minimal 3 karakter.";
      return "";
    case "nik": {
      const v = value.trim();
      if (!v) return "NIK wajib diisi.";
      if (!/^\d+$/.test(v)) return "NIK hanya boleh berisi angka.";
      if (v.length < 16) return `NIK kurang dari 16 digit (sekarang ${v.length} digit).`;
      if (v.length > 16) return `NIK lebih dari 16 digit (sekarang ${v.length} digit).`;
      return "";
    }
    case "email": {
      const v = value.trim();
      if (!v) return "Email wajib diisi.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Format email tidak valid (cth: nama@gmail.com).";
      return "";
    }
    case "telepon": {
      const v = value.trim().replace(/[\s-]/g, "");
      if (v && !/^(\+62|62|0)\d{8,13}$/.test(v)) return "Format nomor tidak valid (cth: 08123456789 atau +628123456789).";
      return "";
    }
    case "tgl_masuk":
      if (!value) return "Tanggal masuk wajib diisi.";
      return "";
    default:
      return "";
  }
}

function validateForm(data: Record<string, string>): FieldErrors {
  const errors: FieldErrors = {};
  for (const name of ["nama", "nik", "email", "telepon", "tgl_masuk"]) {
    const msg = validateField(name, data[name] ?? "");
    if (msg) errors[name] = msg;
  }
  return errors;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EditSiswaPage({ params }: PageProps) {
  const router = useRouter();
  const resolvedParams = use(params);
  const siswaId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [successMsg, setSuccessMsg] = useState("");

  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [tanggalMasuk, setTanggalMasuk] = useState("");
  const [tanggalKeluar, setTanggalKeluar] = useState("");
  const [programInfo, setProgramInfo] = useState<{ id: string; nama: string; kode: string; } | null>(null);

  const loadSiswa = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/siswa/${siswaId}`);
      if (!res.ok) throw new Error("Data siswa tidak ditemukan.");
      const json = await res.json();
      const siswa = json.data;

      // Pecah alamat
      const addr = siswa.alamat_lengkap || "";
      const isFormatBaru = addr.includes("Prov.");
      let jalan = addr, rt = "", rw = "", kelurahan = "", kecamatan = "", kabupaten = "", provinsi = "";

      if (isFormatBaru) {
        const parts = addr.split(",");
        jalan = parts[0]?.trim() || "";
        const rtrw = parts[1]?.trim() || "";
        if (rtrw.includes("RT")) {
          const rtrwMatch = rtrw.match(/RT\s*(\w+)\s*\/\s*RW\s*(\w+)/);
          if (rtrwMatch) { rt = rtrwMatch[1]; rw = rtrwMatch[2]; }
        }
        kelurahan = parts[2]?.trim() || "";
        kecamatan = parts[3]?.replace("Kec.", "")?.trim() || "";
        kabupaten = parts[4]?.trim() || "";
        provinsi = parts[5]?.replace("Prov.", "")?.trim() || "";
      }

      setFormValues({
        nama: siswa.nama_lengkap || "",
        nik: siswa.nik || "",
        tempat_lahir: siswa.tempat_lahir || "",
        tanggal_lahir: siswa.tgl_lahir || "",
        jalan, rt, rw, kelurahan, kecamatan, kabupaten, provinsi,
        nama_ayah: siswa.nama_ayah || "",
        nama_ibu: siswa.nama_ibu || "",
        telepon: siswa.no_hp || "",
        email: siswa.email || "",
        pendidikan_terakhir: siswa.pendidikan_terakhir || "",
        nisn: siswa.nisn || "",
        nomor_induk: siswa.nomor_induk || ""
      });

      setTanggalMasuk(siswa.tgl_masuk || "");
      setTanggalKeluar(siswa.tgl_keluar || "");
      
      if (siswa.program) {
        setProgramInfo({
          id: siswa.program.id,
          nama: siswa.program.nama,
          kode: siswa.program.kode_program,
        });
      }
    } catch (e) {
      console.error(e);
      setFieldErrors({ _global: "Gagal memuat data siswa." });
    } finally {
      setLoading(false);
    }
  }, [siswaId]);

  useEffect(() => {
    loadSiswa();
  }, [loadSiswa]);

  function handleFieldChange(name: string, value: string) {
    setFormValues((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n[name]; return n; });
    }
  }

  function handleFieldBlur(name: string, value: string) {
    const msg = validateField(name, value);
    setFieldErrors((prev) => {
      if (!msg) { const n = { ...prev }; delete n[name]; return n; }
      return { ...prev, [name]: msg };
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSuccessMsg("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    const rawData: Record<string, string> = {};
    formData.forEach((val, key) => { rawData[key] = val as string; });
    rawData.tgl_masuk = tanggalMasuk;

    const errors = validateForm(rawData);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstKey = Object.keys(errors)[0];
      document.querySelector(`[name="${firstKey}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    setFieldErrors({});
    setSaving(true);

    const alamatStr = `${rawData.jalan}, RT ${rawData.rt}/RW ${rawData.rw}, ${rawData.kelurahan}, Kec. ${rawData.kecamatan}, ${rawData.kabupaten}, Prov. ${rawData.provinsi}`;

    const payload = {
      nama_lengkap: rawData.nama,
      nik: rawData.nik,
      email: rawData.email,
      no_hp: rawData.telepon || null,
      tempat_lahir: rawData.tempat_lahir || null,
      tgl_lahir: rawData.tanggal_lahir || null,
      alamat_lengkap: alamatStr,
      nama_ayah: rawData.nama_ayah || null,
      nama_ibu: rawData.nama_ibu || null,
      pendidikan_terakhir: rawData.pendidikan_terakhir || null,
      nisn: rawData.nisn || null,
      tgl_masuk: tanggalMasuk || null,
      tgl_keluar: tanggalKeluar || null
    };

    try {
      const res = await fetch(`/api/v1/siswa/${siswaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        const msg = data?.error?.message || "Terjadi kesalahan.";
        setFieldErrors({ _global: msg });
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      setSuccessMsg("Data siswa berhasil diperbarui.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setFieldErrors({ _global: "Tidak dapat terhubung ke server." });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-xs text-[#6B7280]">
        <Loader2 className="h-6 w-6 animate-spin text-[#DC2626]" />
        <span>Memuat data siswa...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl pb-10">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={() => router.push("/superadmin/siswa")} className="gap-1 px-2.5 h-8">
          <ChevronLeft className="h-4 w-4" /> Kembali
        </Button>
        <div>
          <h1 className="text-base font-bold text-[#F9FAFB]">Edit Data Siswa</h1>
          <p className="text-xs text-[#6B7280] mt-0.5">Memperbarui biodata siswa.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} data-form-container onKeyDown={handleEnterToNextField} className="flex flex-col gap-5" noValidate>
        {fieldErrors._global && (
          <div className="rounded-xl border border-[#F43F5E]/30 bg-[#F43F5E]/10 p-3 text-xs text-[#F43F5E] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{fieldErrors._global}</span>
          </div>
        )}

        {successMsg && (
          <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 p-3 text-xs text-[#10B981] flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-1">
          {/* IDENTITAS AKUN (Read-Only) */}
          <div className="flex items-center gap-4 mt-2 mb-4">
            <span className="text-[10px] font-bold tracking-widest text-[#DC2626] uppercase">Identitas Sistem</span>
            <div className="flex-1 h-px bg-[#1F2937]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nomor Induk" value={formValues.nomor_induk || ""} readOnly className="bg-[#1F2937]/30 text-[#9CA3AF]" />
            <Input label="Program Pelatihan" value={programInfo ? `${programInfo.kode} - ${programInfo.nama}` : ""} readOnly className="bg-[#1F2937]/30 text-[#9CA3AF]" />
          </div>
          <p className="text-[10px] text-[#6B7280] mt-1.5">Program Pelatihan dan Nomor Induk terikat secara permanen dan tidak dapat diubah.</p>

          {/* DATA PRIBADI */}
          <div className="flex items-center gap-4 mt-6 mb-4">
            <span className="text-[10px] font-bold tracking-widest text-[#DC2626] uppercase">Data Pribadi</span>
            <div className="flex-1 h-px bg-[#1F2937]" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Nama Lengkap *"
              name="nama"
              required
              placeholder="Nama lengkap sesuai KTP"
              data-next="nik"
              value={formValues.nama ?? ""}
              onChange={(e) => handleFieldChange("nama", e.target.value)}
              onBlur={(e) => handleFieldBlur("nama", e.target.value)}
              error={fieldErrors.nama}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="NIK * (16 digit)"
                name="nik"
                required
                placeholder="3201XXXXXXXXXXXX"
                maxLength={16}
                data-next="tempat_lahir"
                value={formValues.nik ?? ""}
                onChange={(e) => handleFieldChange("nik", e.target.value.replace(/\D/g, ""))}
                onBlur={(e) => handleFieldBlur("nik", e.target.value)}
                error={fieldErrors.nik}
                hint={formValues.nik ? `${formValues.nik.length}/16 digit` : undefined}
              />
              <Input
                label="Tempat Lahir"
                name="tempat_lahir"
                placeholder="Kota/Kab. tempat lahir"
                data-next="tanggal_lahir"
                value={formValues.tempat_lahir ?? ""}
                onChange={(e) => handleFieldChange("tempat_lahir", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Tanggal Lahir"
                name="tanggal_lahir"
                type="date"
                data-next="jalan"
                value={formValues.tanggal_lahir ?? ""}
                onChange={(e) => handleFieldChange("tanggal_lahir", e.target.value)}
              />
            </div>
          </div>

          {/* ALAMAT */}
          <div className="flex items-center gap-4 mt-6 mb-4">
            <span className="text-[10px] font-bold tracking-widest text-[#DC2626] uppercase">Alamat</span>
            <div className="flex-1 h-px bg-[#1F2937]" />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Input
              label="Jalan / Dusun / Daerah (incl. No. Rumah)"
              name="jalan"
              placeholder="cth: Jl. Ir.H Juanda No. 12  /  Dusun II Surumana"
              data-next="rt"
              value={formValues.jalan ?? ""}
              onChange={(e) => handleFieldChange("jalan", e.target.value)}
            />
            <div className="grid grid-cols-4 gap-4">
              <Input label="RT" name="rt" placeholder="001" data-next="rw" value={formValues.rt ?? ""} onChange={(e) => handleFieldChange("rt", e.target.value)} />
              <Input label="RW" name="rw" placeholder="001" data-next="kelurahan" value={formValues.rw ?? ""} onChange={(e) => handleFieldChange("rw", e.target.value)} />
              <Input label="Kelurahan / Desa" name="kelurahan" placeholder="Nama kelurahan" data-next="kecamatan" value={formValues.kelurahan ?? ""} onChange={(e) => handleFieldChange("kelurahan", e.target.value)} />
              <Input label="Kecamatan" name="kecamatan" placeholder="Nama kecamatan" data-next="kabupaten" value={formValues.kecamatan ?? ""} onChange={(e) => handleFieldChange("kecamatan", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Kabupaten / Kota" name="kabupaten" placeholder="cth: Kab. Cilacap  /  Kota Palu" data-next="provinsi" value={formValues.kabupaten ?? ""} onChange={(e) => handleFieldChange("kabupaten", e.target.value)} />
              <Input label="Provinsi" name="provinsi" placeholder="cth: Jawa Tengah" data-next="nama_ayah" value={formValues.provinsi ?? ""} onChange={(e) => handleFieldChange("provinsi", e.target.value)} />
            </div>
          </div>

          {/* ORANG TUA */}
          <div className="flex items-center gap-4 mt-6 mb-4">
            <span className="text-[10px] font-bold tracking-widest text-[#DC2626] uppercase">Orang Tua</span>
            <div className="flex-1 h-px bg-[#1F2937]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nama Ayah" name="nama_ayah" placeholder="Nama ayah (opsional)" data-next="nama_ibu" value={formValues.nama_ayah ?? ""} onChange={(e) => handleFieldChange("nama_ayah", e.target.value)} />
            <Input label="Nama Ibu" name="nama_ibu" placeholder="Nama ibu (opsional)" data-next="telepon" value={formValues.nama_ibu ?? ""} onChange={(e) => handleFieldChange("nama_ibu", e.target.value)} />
          </div>

          {/* KONTAK */}
          <div className="flex items-center gap-4 mt-6 mb-4">
            <span className="text-[10px] font-bold tracking-widest text-[#DC2626] uppercase">Kontak</span>
            <div className="flex-1 h-px bg-[#1F2937]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="No. HP / WhatsApp"
              name="telepon"
              type="tel"
              placeholder="08xxxxxxxxxx"
              data-next="email"
              value={formValues.telepon ?? ""}
              onChange={(e) => handleFieldChange("telepon", e.target.value.replace(/\D/g, ""))}
              onBlur={(e) => handleFieldBlur("telepon", e.target.value)}
              error={fieldErrors.telepon}
            />
            <Input
              label="Email Aktif *"
              name="email"
              type="email"
              required
              placeholder="nama@email.com"
              data-next="pendidikan_terakhir"
              value={formValues.email ?? ""}
              onChange={(e) => handleFieldChange("email", e.target.value)}
              onBlur={(e) => handleFieldBlur("email", e.target.value)}
              error={fieldErrors.email}
            />
          </div>

          {/* PENDIDIKAN */}
          <div className="flex items-center gap-4 mt-6 mb-4">
            <span className="text-[10px] font-bold tracking-widest text-[#DC2626] uppercase">Pendidikan</span>
            <div className="flex-1 h-px bg-[#1F2937]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Pendidikan Terakhir" name="pendidikan_terakhir" placeholder="cth: SMA/SMK" data-next="nisn" value={formValues.pendidikan_terakhir ?? ""} onChange={(e) => handleFieldChange("pendidikan_terakhir", e.target.value)} />
            <Input label="NISN (Opsional)" name="nisn" placeholder="Nomor Induk Siswa Nasional" data-next="tgl_masuk" value={formValues.nisn ?? ""} onChange={(e) => handleFieldChange("nisn", e.target.value)} />
          </div>

          {/* PERIODE */}
          <div className="flex items-center gap-4 mt-6 mb-4">
            <span className="text-[10px] font-bold tracking-widest text-[#DC2626] uppercase">Periode Aktif</span>
            <div className="flex-1 h-px bg-[#1F2937]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Tanggal Masuk *"
              name="tgl_masuk"
              type="date"
              required
              data-next="tgl_keluar"
              value={tanggalMasuk}
              onChange={(e) => {
                setTanggalMasuk(e.target.value);
                if (fieldErrors.tgl_masuk) {
                  setFieldErrors((prev) => { const n = { ...prev }; delete n.tgl_masuk; return n; });
                }
              }}
              onBlur={(e) => handleFieldBlur("tgl_masuk", e.target.value)}
              error={fieldErrors.tgl_masuk}
            />
            <Input
              label="Tanggal Keluar (Kosongkan jika aktif)"
              name="tgl_keluar"
              type="date"
              value={tanggalKeluar}
              onChange={(e) => setTanggalKeluar(e.target.value)}
              hint="Diisi otomatis saat kelulusan/dropout"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <Button type="submit" disabled={saving} className="gap-2 px-6">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </div>
      </form>
    </div>
  );
}
