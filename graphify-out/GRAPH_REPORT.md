# Graph Report - LPKS System  (2026-09-11)

## Corpus Check
- 95 files · ~84,119 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 491 nodes · 966 edges · 39 communities (25 shown, 14 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d8e597e4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- errorResponse
- master/page.tsx
- compilerOptions
- superadmin/keuangan/page.tsx
- dependencies
- devDependencies
- cn
- gate-checks.ts
- pendaftaran/page.tsx
- siswa/presensi/page.tsx
- database.ts
- Buku Panduan Pengguna (User Manual) — LPKS Sumbu Hidup
- penilaian/page.tsx
- badge.tsx
- transkrip/page.tsx
- ai/page.tsx
- app/layout.tsx
- button.tsx
- src/middleware.ts
- MasterPage
- SiswaPage
- UjianPage
- auth-rbac.test.ts
- client.ts
- 1. Test Plan
- dashboard/page.tsx
- Gemini AI RAG & Context Generator
- Sistem Manajemen LPKS Sumbu Hidup
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- Modul Penerbitan Sertifikat Kelulusan
- UI Design System & Tokens
- Memulai Instalasi Lokal
- EditSiswaPage
- AkunForm
- NilaiPage

## God Nodes (most connected - your core abstractions)
1. `errorResponse()` - 78 edges
2. `createClient()` - 75 edges
3. `successResponse()` - 69 edges
4. `requireSuperadmin()` - 45 edges
5. `cn()` - 28 edges
6. `requireAuth()` - 23 edges
7. `compilerOptions` - 17 edges
8. `Button` - 14 edges
9. `requireStudentOwnerOrAdmin()` - 14 edges
10. `handleEnterToNextField()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `validatePresensiSubmission()` --calls--> `isWithinGeofence()`  [EXTRACTED]
  tests/integration/flow-presensi.test.ts → src/lib/geo.ts
- `BerandaPage()` --calls--> `formatRupiah()`  [EXTRACTED]
  src/app/(siswa)/siswa/beranda/page.tsx → src/lib/utils.ts
- `NavItem()` --calls--> `cn()`  [EXTRACTED]
  src/app/(superadmin)/layout.tsx → src/lib/utils.ts
- `SuperadminLayout()` --calls--> `cn()`  [EXTRACTED]
  src/app/(superadmin)/layout.tsx → src/lib/utils.ts
- `DashboardPage()` --calls--> `formatRupiah()`  [EXTRACTED]
  src/app/(superadmin)/superadmin/dashboard/page.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **LPKS System Core Operational Modules** — docs_analysis_prd_modul_pendaftaran, docs_analysis_prd_modul_siswa, docs_analysis_prd_modul_presensi, docs_analysis_prd_modul_keuangan, docs_analysis_prd_modul_penilaian, docs_analysis_prd_modul_ujian, docs_analysis_prd_modul_sertifikat [EXTRACTED 1.00]

## Communities (39 total, 14 thin omitted)

### Community 0 - "errorResponse"
Cohesion: 0.09
Nodes (61): POST(), POST(), GET(), Params, POST(), POST(), POST(), GET() (+53 more)

### Community 1 - "master/page.tsx"
Cohesion: 0.11
Nodes (18): Modul Ujian Internal & Kelulusan, SiswaLoginPage(), AdminLoginPage(), BerkasItem, KriteriaItem, LokasiItem, ProgramItem, Tab (+10 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 3 - "superadmin/keuangan/page.tsx"
Cohesion: 0.16
Nodes (10): Modul Catatan Keuangan & Pembayaran, KeuanganData, KeuanganSiswaPage(), TransaksiItem, KeuanganPage(), SiswaOption, TransaksiRow, PenilaianPage() (+2 more)

### Community 4 - "dependencies"
Cohesion: 0.07
Nodes (27): clsx, @google/genai, jspdf, jspdf-autotable, lucide-react, next, dependencies, clsx (+19 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (26): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+18 more)

### Community 6 - "cn"
Cohesion: 0.16
Nodes (14): ActiveTab, NAV_ITEMS, SiswaLayout(), NAV_ITEMS, NavItem(), Sidebar(), SuperadminLayout(), Card (+6 more)

### Community 7 - "gate-checks.ts"
Cohesion: 0.18
Nodes (15): PUT(), GET(), POST(), generateStudentPassword(), generateStudentUsername(), isKeuanganLunas(), isSertifikatEligible(), isSiapUjian() (+7 more)

### Community 8 - "pendaftaran/page.tsx"
Cohesion: 0.13
Nodes (10): Modul Pendaftaran Siswa & Verifikasi Berkas, BERKAS_LIST, FieldErrors, PendaftaranPage(), handleFieldBlur(), handleSubmit(), ProgramItem, RegistrationSuccessData (+2 more)

### Community 9 - "siswa/presensi/page.tsx"
Cohesion: 0.22
Nodes (10): Modul Presensi Geofencing GPS, Geofencing Verification Engine (Haversine), PresensiItem, PresensiSiswaPage(), STATUS_COLOR, STATUS_ICON, formatDistance(), haversineDistance() (+2 more)

### Community 10 - "database.ts"
Cohesion: 0.14
Nodes (13): AiRingkasan, AuditLog, MasterKriteria, MasterLokasi, MasterProgram, MasterSyaratBerkas, PenilaianHarian, Presensi (+5 more)

### Community 11 - "Buku Panduan Pengguna (User Manual) — LPKS Sumbu Hidup"
Cohesion: 0.18
Nodes (10): 1. Pendaftaran Siswa (Superadmin), 2. Presensi Harian Mandiri (Siswa), 3. Penilaian Kriteria Las (Superadmin), 4. Konsultan SOP Las & RAG (Superadmin), Buku Panduan Pengguna (User Manual) — LPKS Sumbu Hidup, Kontak Dukungan, Memulai (Getting Started), Panduan Fitur Utama (+2 more)

### Community 12 - "penilaian/page.tsx"
Cohesion: 0.14
Nodes (14): Modul Penilaian 5 Kriteria Fluktuasi, Modul Direktori Data Siswa, KriteriaItem, PenilaianRow, SiswaOption, WARNA_PALETTE, FilterStatus, ProgramItem (+6 more)

### Community 13 - "badge.tsx"
Cohesion: 0.15
Nodes (10): Portal Mandiri Siswa Mobile-Responsive, BerandaPage(), StudentDashboardData, PresensiAdminPage(), PresensiRow, STATUS_CONFIG, STATUS_OPTIONS, StatusPresensi (+2 more)

### Community 14 - "transkrip/page.tsx"
Cohesion: 0.33
Nodes (3): KriteriaStatus, TranskripPage(), WARNA_PALETTE

### Community 15 - "ai/page.tsx"
Cohesion: 0.33
Nodes (3): AiPage(), Message, STARTER_PROMPTS

### Community 16 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 17 - "button.tsx"
Cohesion: 0.27
Nodes (4): KriteriaItem, RiwayatGrouped, Button, ButtonProps

### Community 18 - "src/middleware.ts"
Cohesion: 0.60
Nodes (3): updateSession(), config, middleware()

### Community 24 - "1. Test Plan"
Cohesion: 0.06
Nodes (33): 1. Test Plan, 2.1. Hasil Regression Testing (Automated Test Suite), 2.2. Hasil Eksekusi Test Case Fungsional (Playwright MCP), 2.3. Kesimpulan Exit Criteria Tahap 2, 2. Laporan Pengujian Fungsional (Tahap 2), 3.1. Security & Penetration Testing, 3.2. Performance / Load Testing, 3.3. Compatibility / Cross-Browser Testing (+25 more)

### Community 25 - "dashboard/page.tsx"
Cohesion: 0.25
Nodes (6): Portal Superadmin Web Dashboard, DashboardPage(), DashboardStats, QUICK_ACCESS, StatCard(), StatCardProps

### Community 35 - "Memulai Instalasi Lokal"
Cohesion: 0.22
Nodes (8): 1. Prasyarat, 2. Setup Environment, 3. Setup Database, 4. Menjalankan Server Development, LPKS System — Sistem Manajemen Pelatihan Pengelasan "Sumbu Hidup", Memulai Instalasi Lokal, Modul Utama, Tech Stack

### Community 36 - "EditSiswaPage"
Cohesion: 0.40
Nodes (5): EditSiswaPage(), handleFieldBlur(), handleSubmit(), validateField(), validateForm()

## Knowledge Gaps
- **189 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+184 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **14 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `master/page.tsx`, `superadmin/keuangan/page.tsx`, `penilaian/page.tsx`, `badge.tsx`, `button.tsx`, `dashboard/page.tsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `errorResponse()` connect `errorResponse` to `gate-checks.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `createClient()` connect `errorResponse` to `gate-checks.ts`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _189 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `errorResponse` be split into smaller, more focused modules?**
  _Cohesion score 0.09412326803631152 - nodes in this community are weakly interconnected._
- **Should `master/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10591133004926108 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._