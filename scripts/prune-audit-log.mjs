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

const retentionDays = parseInt(process.argv[2] || "365", 10);
const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString();

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

async function runPrune() {
  console.log("=================================================");
  console.log("   LPKS Sumbu Hidup — Audit Log Retention Tool   ");
  console.log("=================================================");
  console.log(`📡 URL Target     : ${supabaseUrl}`);
  console.log(`⏱️ Retensi        : ${retentionDays} hari`);
  console.log(`🗑️ Batas Cutoff   : < ${cutoffDate}`);

  const { error, count } = await supabase
    .from("audit_log")
    .delete({ count: "exact" })
    .lt("created_at", cutoffDate);

  if (error) {
    console.error(`❌ Gagal membersihkan log audit: ${error.message}`);
    process.exit(1);
  }

  console.log(`✅ Pembersihan berhasil. Total ${count || 0} baris log lama dihapus.`);
  console.log("=================================================");
}

runPrune().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
