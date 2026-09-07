# Graph Report - LPKS System  (2026-09-07)

## Corpus Check
- 91 files · ~79,836 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 458 nodes · 912 edges · 36 communities (23 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a01476ca`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- errorResponse
- button.tsx
- compilerOptions
- utils.ts
- dependencies
- devDependencies
- cn
- gate-checks.ts
- pendaftaran/page.tsx
- siswa/presensi/page.tsx
- database.ts
- penilaian/page.tsx
- superadmin/keuangan/page.tsx
- superadmin/presensi/page.tsx
- transkrip/page.tsx
- ai/page.tsx
- app/layout.tsx
- PendaftaranPage
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

## God Nodes (most connected - your core abstractions)
1. `errorResponse()` - 76 edges
2. `createClient()` - 73 edges
3. `successResponse()` - 67 edges
4. `requireSuperadmin()` - 43 edges
5. `cn()` - 28 edges
6. `requireAuth()` - 23 edges
7. `compilerOptions` - 17 edges
8. `requireStudentOwnerOrAdmin()` - 14 edges
9. `Button` - 13 edges
10. `handleEnterToNextField()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `validatePresensiSubmission()` --calls--> `isWithinGeofence()`  [EXTRACTED]
  tests/integration/flow-presensi.test.ts → src/lib/geo.ts
- `NavItem()` --calls--> `cn()`  [EXTRACTED]
  src/app/(superadmin)/layout.tsx → src/lib/utils.ts
- `SuperadminLayout()` --calls--> `cn()`  [EXTRACTED]
  src/app/(superadmin)/layout.tsx → src/lib/utils.ts
- `DashboardPage()` --calls--> `formatRupiah()`  [EXTRACTED]
  src/app/(superadmin)/superadmin/dashboard/page.tsx → src/lib/utils.ts
- `PenilaianPage()` --calls--> `formatDateIndo()`  [EXTRACTED]
  src/app/(superadmin)/superadmin/penilaian/page.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **LPKS System Core Operational Modules** — docs_analysis_prd_modul_pendaftaran, docs_analysis_prd_modul_siswa, docs_analysis_prd_modul_presensi, docs_analysis_prd_modul_keuangan, docs_analysis_prd_modul_penilaian, docs_analysis_prd_modul_ujian, docs_analysis_prd_modul_sertifikat [EXTRACTED 1.00]

## Communities (36 total, 13 thin omitted)

### Community 0 - "errorResponse"
Cohesion: 0.10
Nodes (60): POST(), POST(), GET(), Params, POST(), POST(), POST(), GET() (+52 more)

### Community 1 - "button.tsx"
Cohesion: 0.10
Nodes (12): Modul Ujian Internal & Kelulusan, SiswaLoginPage(), AdminLoginPage(), AkunForm(), KriteriaItem, NilaiPage(), RiwayatGrouped, KRITERIA_LIST (+4 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 3 - "utils.ts"
Cohesion: 0.15
Nodes (11): Portal Mandiri Siswa Mobile-Responsive, BerandaPage(), StudentDashboardData, KeuanganData, KeuanganSiswaPage(), TransaksiItem, KeuanganPage(), Badge() (+3 more)

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
Cohesion: 0.29
Nodes (6): Modul Pendaftaran Siswa & Verifikasi Berkas, BERKAS_LIST, ProgramItem, RegistrationSuccessData, Select, SelectProps

### Community 9 - "siswa/presensi/page.tsx"
Cohesion: 0.22
Nodes (10): Modul Presensi Geofencing GPS, Geofencing Verification Engine (Haversine), PresensiItem, PresensiSiswaPage(), STATUS_COLOR, STATUS_ICON, formatDistance(), haversineDistance() (+2 more)

### Community 10 - "database.ts"
Cohesion: 0.14
Nodes (13): AiRingkasan, AuditLog, MasterKriteria, MasterLokasi, MasterProgram, MasterSyaratBerkas, PenilaianHarian, Presensi (+5 more)

### Community 11 - "penilaian/page.tsx"
Cohesion: 0.12
Nodes (14): Modul Penilaian 5 Kriteria Fluktuasi, BerkasItem, KriteriaItem, LokasiItem, ProgramItem, Tab, TABS, KriteriaItem (+6 more)

### Community 12 - "superadmin/keuangan/page.tsx"
Cohesion: 0.18
Nodes (11): Modul Catatan Keuangan & Pembayaran, Modul Direktori Data Siswa, SiswaOption, TransaksiRow, FilterStatus, SiswaItem, Modal(), ModalProps (+3 more)

### Community 13 - "superadmin/presensi/page.tsx"
Cohesion: 0.29
Nodes (5): PresensiAdminPage(), PresensiRow, STATUS_CONFIG, STATUS_OPTIONS, StatusPresensi

### Community 14 - "transkrip/page.tsx"
Cohesion: 0.33
Nodes (3): KriteriaStatus, TranskripPage(), WARNA_PALETTE

### Community 15 - "ai/page.tsx"
Cohesion: 0.33
Nodes (3): AiPage(), Message, STARTER_PROMPTS

### Community 16 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

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

## Knowledge Gaps
- **177 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+172 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `button.tsx`, `utils.ts`, `pendaftaran/page.tsx`, `penilaian/page.tsx`, `superadmin/keuangan/page.tsx`, `dashboard/page.tsx`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `errorResponse()` connect `errorResponse` to `gate-checks.ts`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Why does `createClient()` connect `errorResponse` to `gate-checks.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _177 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `errorResponse` be split into smaller, more focused modules?**
  _Cohesion score 0.09563046192259675 - nodes in this community are weakly interconnected._
- **Should `button.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10256410256410256 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._