export type UserRole = "superadmin" | "siswa";

export interface MasterProgram {
  id: string;
  kode_program: string;
  nama: string;
  biaya: number;
  estimasi_durasi_hari: number;
  created_at?: string;
  updated_at?: string;
}

export interface MasterKriteria {
  id: string;
  nama_kriteria: string;
  batas_lulus: number;
  urutan: number;
  created_at?: string;
}

export interface MasterSyaratBerkas {
  id: string;
  kode_berkas: string;
  nama_berkas: string;
  wajib: boolean;
  created_at?: string;
}

export interface MasterLokasi {
  id: string;
  nama_titik: string;
  lat: number;
  lng: number;
  radius_meter: number;
  is_active: boolean;
  updated_at?: string;
}

export interface Siswa {
  id: string;
  auth_id?: string | null;
  nomor_induk: string;
  program_id: string;
  nama_lengkap: string;
  nik: string;
  tempat_lahir?: string | null;
  tgl_lahir?: string | null;
  alamat_lengkap?: string | null;
  nama_ayah?: string | null;
  nama_ibu?: string | null;
  no_hp?: string | null;
  email: string;
  pendidikan_terakhir?: string | null;
  nisn?: string | null;
  tgl_masuk: string;
  tgl_keluar?: string | null;
  checklist_berkas?: Record<string, boolean>;
  created_at?: string;
  updated_at?: string;
  program?: MasterProgram;
}

export type StatusPresensi = "Hadir" | "Izin" | "Sakit" | "Alpa";

export interface Presensi {
  id: string;
  siswa_id: string;
  tanggal: string;
  jam: string;
  lat?: number | null;
  lng?: number | null;
  jarak_meter?: number | null;
  status: StatusPresensi;
  keterangan?: string | null;
  created_by: "siswa" | "superadmin";
  created_at?: string;
  siswa?: Pick<Siswa, "nama_lengkap" | "nomor_induk">;
}

export interface PenilaianHarian {
  id: string;
  siswa_id: string;
  kriteria_id: string;
  tanggal: string;
  nilai: number;
  created_by: "siswa" | "superadmin";
  catatan?: string | null;
  created_at?: string;
  kriteria?: Pick<MasterKriteria, "nama_kriteria" | "batas_lulus">;
}

export interface TransaksiKeuangan {
  id: string;
  siswa_id: string;
  tgl_bayar: string;
  nominal: number;
  metode: string;
  keterangan?: string | null;
  penerima: string;
  created_at?: string;
}

export interface Ujian {
  id: string;
  siswa_id: string;
  tgl_ujian: string;
  teori: number;
  root: number;
  hotpass: number;
  filler: number;
  capping: number;
  gerinda: number;
  is_lulus: boolean;
  catatan_penguji?: string | null;
  updated_at?: string;
}

export interface AiRingkasan {
  id: string;
  siswa_id: string;
  tgl_generate: string;
  ringkasan: string;
  created_at?: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  actor_role: string;
  action: string;
  target_table?: string | null;
  target_id?: string | null;
  details?: Record<string, unknown>;
  ip_address?: string | null;
  created_at: string;
}
