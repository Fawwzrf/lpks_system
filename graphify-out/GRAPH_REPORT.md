# Graph Report - LPKS System  (2026-09-15)

## Corpus Check
- 103 files · ~106,346 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 546 nodes · 1086 edges · 40 communities (27 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `08e3e5d1`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- errorResponse
- master/page.tsx
- compilerOptions
- SiswaPage
- dependencies
- devDependencies
- cn
- gate-checks.ts
- pendaftaran/page.tsx
- siswa/presensi/page.tsx
- database.ts
- Buku Panduan Pengguna (User Manual) — LPKS Sumbu Hidup
- superadmin/presensi/page.tsx
- sertifikat_queue.test.ts
- transkrip/page.tsx
- ai/page.tsx
- app/layout.tsx
- skeleton.tsx
- src/middleware.ts
- MasterPage
- EditSiswaPage
- UjianPage
- auth-rbac.test.ts
- client.ts
- 1. Test Plan
- PresensiAdminPage
- Sistem Manajemen LPKS Sumbu Hidup
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- Modul Penerbitan Sertifikat Kelulusan
- UI Design System & Tokens
- Memulai Instalasi Lokal
- button.tsx
- KeuanganSuperadminPage
- penilaian/page.tsx
- (superadmin)/layout.tsx

## God Nodes (most connected - your core abstractions)
1. `errorResponse()` - 82 edges
2. `createClient()` - 79 edges
3. `successResponse()` - 71 edges
4. `requireSuperadmin()` - 49 edges
5. `cn()` - 32 edges
6. `requireAuth()` - 23 edges
7. `compilerOptions` - 17 edges
8. `Button` - 14 edges
9. `requireStudentOwnerOrAdmin()` - 14 edges
10. `Skeleton()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `validatePresensiSubmission()` --calls--> `isWithinGeofence()`  [EXTRACTED]
  tests/integration/flow-presensi.test.ts → src/lib/geo.ts
- `NavItem()` --calls--> `cn()`  [EXTRACTED]
  src/app/(superadmin)/layout.tsx → src/lib/utils.ts
- `SuperadminLayout()` --calls--> `cn()`  [EXTRACTED]
  src/app/(superadmin)/layout.tsx → src/lib/utils.ts
- `Sidebar()` --calls--> `cn()`  [EXTRACTED]
  src/app/(superadmin)/layout.tsx → src/lib/utils.ts
- `KeuanganSuperadminPage()` --calls--> `formatDateIndo()`  [EXTRACTED]
  src/app/(superadmin)/superadmin/keuangan/page.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **LPKS System Core Operational Modules** — docs_analysis_prd_modul_pendaftaran, docs_analysis_prd_modul_siswa, docs_analysis_prd_modul_presensi, docs_analysis_prd_modul_keuangan, docs_analysis_prd_modul_penilaian, docs_analysis_prd_modul_ujian, docs_analysis_prd_modul_sertifikat [EXTRACTED 1.00]

## Communities (40 total, 13 thin omitted)

### Community 0 - "errorResponse"
Cohesion: 0.08
Nodes (69): Modul AI RAG & Weekly Summary, Gemini AI RAG & Context Generator, POST(), POST(), GET(), Params, POST(), POST() (+61 more)

### Community 1 - "master/page.tsx"
Cohesion: 0.10
Nodes (19): Modul Ujian Internal & Kelulusan, SiswaLoginPage(), AdminLoginPage(), BerkasItem, KriteriaItem, LokasiItem, ProgramItem, Tab (+11 more)

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 4 - "dependencies"
Cohesion: 0.07
Nodes (27): clsx, @google/genai, jspdf, jspdf-autotable, lucide-react, next, dependencies, clsx (+19 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (26): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+18 more)

### Community 6 - "cn"
Cohesion: 0.25
Nodes (10): ActiveTab, NAV_ITEMS, SiswaLayout(), Card, CardContent, CardDescription, CardFooter, CardHeader (+2 more)

### Community 7 - "gate-checks.ts"
Cohesion: 0.16
Nodes (16): POST(), PUT(), GET(), POST(), generateStudentPassword(), generateStudentUsername(), isKeuanganLunas(), isSertifikatEligible() (+8 more)

### Community 8 - "pendaftaran/page.tsx"
Cohesion: 0.13
Nodes (10): Modul Pendaftaran Siswa & Verifikasi Berkas, BERKAS_LIST, FieldErrors, PendaftaranPage(), handleFieldBlur(), handleSubmit(), ProgramItem, RegistrationSuccessData (+2 more)

### Community 9 - "siswa/presensi/page.tsx"
Cohesion: 0.20
Nodes (10): Modul Presensi Geofencing GPS, Geofencing Verification Engine (Haversine), PresensiItem, PresensiSiswaPage(), STATUS_COLOR, STATUS_ICON, formatDistance(), haversineDistance() (+2 more)

### Community 10 - "database.ts"
Cohesion: 0.13
Nodes (14): AiRingkasan, AuditLog, MasterKriteria, MasterLokasi, MasterProgram, MasterSyaratBerkas, PenilaianHarian, Presensi (+6 more)

### Community 11 - "Buku Panduan Pengguna (User Manual) — LPKS Sumbu Hidup"
Cohesion: 0.18
Nodes (10): 1. Pendaftaran Siswa (Superadmin), 2. Presensi Harian Mandiri (Siswa), 3. Penilaian Kriteria Las (Superadmin), 4. Konsultan SOP Las & RAG (Superadmin), Buku Panduan Pengguna (User Manual) — LPKS Sumbu Hidup, Kontak Dukungan, Memulai (Getting Started), Panduan Fitur Utama (+2 more)

### Community 12 - "superadmin/presensi/page.tsx"
Cohesion: 0.16
Nodes (10): PresensiAllItem, PresensiRecord, ProgramItem, SiswaData, STATUS_CONFIG, STATUS_OPTIONS, StatusPresensi, TabFilter (+2 more)

### Community 13 - "sertifikat_queue.test.ts"
Cohesion: 0.50
Nodes (3): formatCertificateNumber(), MockStudent, toRomanMonth()

### Community 14 - "transkrip/page.tsx"
Cohesion: 0.33
Nodes (3): KriteriaStatus, TranskripPage(), WARNA_PALETTE

### Community 15 - "ai/page.tsx"
Cohesion: 0.33
Nodes (3): AiPage(), Message, STARTER_PROMPTS

### Community 16 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 17 - "skeleton.tsx"
Cohesion: 0.11
Nodes (18): Portal Mandiri Siswa Mobile-Responsive, Portal Superadmin Web Dashboard, BerandaPage(), StudentDashboardData, KeuanganData, KeuanganSiswaPage(), TransaksiItem, DashboardPage() (+10 more)

### Community 18 - "src/middleware.ts"
Cohesion: 0.60
Nodes (3): updateSession(), config, middleware()

### Community 20 - "EditSiswaPage"
Cohesion: 0.40
Nodes (5): EditSiswaPage(), handleFieldBlur(), handleSubmit(), validateField(), validateForm()

### Community 24 - "1. Test Plan"
Cohesion: 0.06
Nodes (33): 1. Test Plan, 2.1. Hasil Regression Testing (Automated Test Suite), 2.2. Hasil Eksekusi Test Case Fungsional (Playwright MCP), 2.3. Kesimpulan Exit Criteria Tahap 2, 2. Laporan Pengujian Fungsional (Tahap 2), 3.1. Security & Penetration Testing, 3.2. Performance / Load Testing, 3.3. Compatibility / Cross-Browser Testing (+25 more)

### Community 35 - "Memulai Instalasi Lokal"
Cohesion: 0.22
Nodes (8): 1. Prasyarat, 2. Setup Environment, 3. Setup Database, 4. Menjalankan Server Development, LPKS System — Sistem Manajemen Pelatihan Pengelasan "Sumbu Hidup", Memulai Instalasi Lokal, Modul Utama, Tech Stack

### Community 36 - "button.tsx"
Cohesion: 0.15
Nodes (6): AkunForm(), KriteriaItem, NilaiPage(), RiwayatGrouped, Button, ButtonProps

### Community 38 - "penilaian/page.tsx"
Cohesion: 0.09
Nodes (24): Modul Catatan Keuangan & Pembayaran, Modul Penilaian 5 Kriteria Fluktuasi, Modul Direktori Data Siswa, ProgramItem, SiswaKeuanganItem, SkemaBayar, TabFilter, TransaksiItem (+16 more)

### Community 40 - "(superadmin)/layout.tsx"
Cohesion: 0.16
Nodes (5): NAV_ITEMS, NavItem(), Sidebar(), SuperadminLayout(), PenilaianSuperadminPage()

## Knowledge Gaps
- **204 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+199 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `master/page.tsx`, `button.tsx`, `penilaian/page.tsx`, `(superadmin)/layout.tsx`, `superadmin/presensi/page.tsx`, `skeleton.tsx`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `errorResponse()` connect `errorResponse` to `gate-checks.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `Button` connect `button.tsx` to `master/page.tsx`, `penilaian/page.tsx`, `cn`, `pendaftaran/page.tsx`, `superadmin/presensi/page.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _204 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `errorResponse` be split into smaller, more focused modules?**
  _Cohesion score 0.08343434343434343 - nodes in this community are weakly interconnected._
- **Should `master/page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.10114942528735632 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._