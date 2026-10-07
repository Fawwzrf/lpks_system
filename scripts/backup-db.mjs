import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

// ── 1. Helper Membaca .env.local Sederhana (Zero-dependency) ──────────────────
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

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

// Daftar tabel operasional yang akan di-backup
const TABLES_TO_BACKUP = [
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

async function runBackup() {
  console.log("=================================================");
  console.log("   LPKS Sumbu Hidup — Database Backup Tool       ");
  console.log("=================================================");
  console.log(`📡 URL Target    : ${supabaseUrl}`);
  console.log(`🕒 Waktu Eksekusi: ${new Date().toISOString()}`);

  const backupData = {
    metadata: {
      system: "LPKS Sumbu Hidup System",
      version: "1.0",
      created_at: new Date().toISOString(),
      counts: {},
    },
    tables: {},
  };

  let totalRecords = 0;

  for (const table of TABLES_TO_BACKUP) {
    process.stdout.write(`⏳ Mengekstrak tabel [${table}]... `);
    try {
      const { data, error } = await supabase.from(table).select("*");
      if (error) {
        console.log(`❌ GAGAL (${error.message})`);
        backupData.tables[table] = [];
        backupData.metadata.counts[table] = 0;
      } else {
        const count = data?.length || 0;
        backupData.tables[table] = data || [];
        backupData.metadata.counts[table] = count;
        totalRecords += count;
        console.log(`✅ ${count} record`);
      }
    } catch (err) {
      console.log(`❌ ERROR: ${err.message}`);
      backupData.tables[table] = [];
      backupData.metadata.counts[table] = 0;
    }
  }

  // Siapkan direktori output
  const outputDir = path.resolve(process.cwd(), "backups");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const dateSlug = new Date().toISOString().replace(/[:.]/g, "-");
  const fileName = `lpks-db-backup-${dateSlug}.json`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");

  console.log("=================================================");
  console.log(`🎉 Backup Berhasil Disimpan!`);
  console.log(`📁 File      : ${filePath}`);
  console.log(`📊 Total Data: ${totalRecords} baris data dari ${TABLES_TO_BACKUP.length} tabel`);
  console.log("=================================================");
}

runBackup().catch((err) => {
  console.error("Fatal error during backup:", err);
  process.exit(1);
});
