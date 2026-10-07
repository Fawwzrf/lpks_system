import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvLocal();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ ERROR: NEXT_PUBLIC_SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY belum disetel.");
  process.exit(1);
}

const targetFile = process.argv[2];
if (!targetFile) {
  console.error("❌ ERROR: Harap sertakan path file backup yang ingin di-restore.");
  console.error("Contoh penggunaan: node scripts/restore-db.mjs backups/lpks-db-backup-xxxx.json");
  process.exit(1);
}

const fullPath = path.resolve(process.cwd(), targetFile);
if (!fs.existsSync(fullPath)) {
  console.error(`❌ ERROR: File tidak ditemukan di ${fullPath}`);
  process.exit(1);
}

const backupContent = JSON.parse(fs.readFileSync(fullPath, "utf-8"));
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Urutan restore berjenjang berdasarkan foreign key constraint:
// 1. Master tables dulu
// 2. Siswa
// 3. Transaksi / Presensi / Nilai / Ujian / Sertifikat / Audit Log
const RESTORE_ORDER = [
  "master_program",
  "master_kriteria",
  "master_lokasi",
  "master_syarat_berkas",
  "siswa",
  "presensi",
  "transaksi_keuangan",
  "penilaian",
  "ujian",
  "sertifikat",
  "audit_log",
];

async function runRestore() {
  console.log("=================================================");
  console.log("   LPKS Sumbu Hidup — Database Restore Tool      ");
  console.log("=================================================");
  console.log(`📡 URL Target    : ${supabaseUrl}`);
  console.log(`📁 File Backup   : ${targetFile}`);
  console.log(`🕒 Waktu Backup  : ${backupContent.metadata?.created_at || "N/A"}`);
  console.log("=================================================");

  for (const table of RESTORE_ORDER) {
    const rows = backupContent.tables?.[table] || [];
    if (rows.length === 0) {
      console.log(`ℹ️ [${table}]: 0 baris data (dilewati).`);
      continue;
    }

    process.stdout.write(`⏳ Merestore tabel [${table}] (${rows.length} record)... `);
    try {
      const { error } = await supabase.from(table).upsert(rows);
      if (error) {
        console.log(`❌ GAGAL (${error.message})`);
      } else {
        console.log(`✅ BERHASIL`);
      }
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
    }
  }

  console.log("=================================================");
  console.log("🎉 Proses Restore Selesai.");
  console.log("=================================================");
}

runRestore().catch((err) => {
  console.error("Fatal error during restore:", err);
  process.exit(1);
});
