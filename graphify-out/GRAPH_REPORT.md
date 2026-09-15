# Graph Report - LPKS System  (2026-09-15)

## Corpus Check
- 104 files · ~108,019 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 552 nodes · 1107 edges · 45 communities (32 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.94)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c2f0ce83`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- errorResponse
- pendaftaran/page.tsx
- compilerOptions
- SiswaPage
- dependencies
- devDependencies
- cn
- gate-checks.ts
- PendaftaranPage
- siswa/presensi/page.tsx
- database.ts
- Buku Panduan Pengguna (User Manual) — LPKS Sumbu Hidup
- superadmin/presensi/page.tsx
- sertifikat_queue.test.ts
- skeleton.tsx
- ai/page.tsx
- app/layout.tsx
- utils.ts
- src/middleware.ts
- master/page.tsx
- [id]/page.tsx
- UjianPage
- auth-rbac.test.ts
- client.ts
- 1. Test Plan
- PresensiAdminPage
- form-utils.ts
- Sistem Manajemen LPKS Sumbu Hidup
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- Modul Penerbitan Sertifikat Kelulusan
- UI Design System & Tokens
- Memulai Instalasi Lokal
- button.tsx
- KeuanganSuperadminPage
- superadmin/keuangan/page.tsx
- siswa/keuangan/page.tsx
- (superadmin)/layout.tsx
- penilaian/page.tsx
- badge.tsx
- Gemini AI RAG & Context Generator

## God Nodes (most connected - your core abstractions)
1. `errorResponse()` - 84 edges
2. `createClient()` - 81 edges
3. `successResponse()` - 73 edges
4. `requireSuperadmin()` - 51 edges
5. `cn()` - 32 edges
6. `requireAuth()` - 23 edges
7. `compilerOptions` - 17 edges
8. `Button` - 15 edges
9. `requireStudentOwnerOrAdmin()` - 14 edges
10. `Skeleton()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `validatePresensiSubmission()` --calls--> `isWithinGeofence()`  [EXTRACTED]
  tests/integration/flow-presensi.test.ts → src/lib/geo.ts
- `NavItem()` --calls--> `cn()`  [EXTRACTED]
  src/app/(superadmin)/layout.tsx → src/lib/utils.ts
- `Sidebar()` --calls--> `cn()`  [EXTRACTED]
  src/app/(superadmin)/layout.tsx → src/lib/utils.ts
- `BerandaPage()` --calls--> `formatRupiah()`  [EXTRACTED]
  src/app/(siswa)/siswa/beranda/page.tsx → src/lib/utils.ts
- `KeuanganSiswaPage()` --calls--> `formatRupiah()`  [EXTRACTED]
  src/app/(siswa)/siswa/keuangan/page.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **LPKS System Core Operational Modules** — docs_analysis_prd_modul_pendaftaran, docs_analysis_prd_modul_siswa, docs_analysis_prd_modul_presensi, docs_analysis_prd_modul_keuangan, docs_analysis_prd_modul_penilaian, docs_analysis_prd_modul_ujian, docs_analysis_prd_modul_sertifikat [EXTRACTED 1.00]

## Communities (45 total, 13 thin omitted)

### Community 0 - "errorResponse"
Cohesion: 0.09
Nodes (68): POST(), POST(), GET(), Params, POST(), POST(), POST(), GET() (+60 more)

### Community 1 - "pendaftaran/page.tsx"
Cohesion: 0.15
Nodes (11): Modul Pendaftaran Siswa & Verifikasi Berkas, Modul Ujian Internal & Kelulusan, BERKAS_LIST, FieldErrors, ProgramItem, RegistrationSuccessData, KRITERIA_LIST, QueueItem (+3 more)

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

### Community 8 - "PendaftaranPage"
Cohesion: 0.18
Nodes (5): PendaftaranPage(), handleFieldBlur(), handleSubmit(), validateField(), validateForm()

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
Cohesion: 0.17
Nodes (11): PresensiAllItem, PresensiRecord, ProgramItem, SiswaData, STATUS_CONFIG, STATUS_OPTIONS, StatusPresensi, TabFilter (+3 more)

### Community 13 - "sertifikat_queue.test.ts"
Cohesion: 0.50
Nodes (3): formatCertificateNumber(), MockStudent, toRomanMonth()

### Community 14 - "skeleton.tsx"
Cohesion: 0.17
Nodes (7): KriteriaStatus, TranskripPage(), WARNA_PALETTE, CardSkeleton(), PageSkeleton(), Skeleton(), SkeletonProps

### Community 15 - "ai/page.tsx"
Cohesion: 0.33
Nodes (3): AiPage(), Message, STARTER_PROMPTS

### Community 16 - "app/layout.tsx"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 17 - "utils.ts"
Cohesion: 0.25
Nodes (7): Portal Superadmin Web Dashboard, DashboardPage(), DashboardStats, QUICK_ACCESS, StatCard(), StatCardProps, formatRupiah()

### Community 18 - "src/middleware.ts"
Cohesion: 0.60
Nodes (3): updateSession(), config, middleware()

### Community 19 - "master/page.tsx"
Cohesion: 0.18
Nodes (7): BerkasItem, KriteriaItem, LokasiItem, MasterPage(), ProgramItem, Tab, TABS

### Community 20 - "[id]/page.tsx"
Cohesion: 0.31
Nodes (7): EditSiswaPage(), handleFieldBlur(), handleSubmit(), FieldErrors, PageProps, validateField(), validateForm()

### Community 24 - "1. Test Plan"
Cohesion: 0.06
Nodes (33): 1. Test Plan, 2.1. Hasil Regression Testing (Automated Test Suite), 2.2. Hasil Eksekusi Test Case Fungsional (Playwright MCP), 2.3. Kesimpulan Exit Criteria Tahap 2, 2. Laporan Pengujian Fungsional (Tahap 2), 3.1. Security & Penetration Testing, 3.2. Performance / Load Testing, 3.3. Compatibility / Cross-Browser Testing (+25 more)

### Community 27 - "form-utils.ts"
Cohesion: 0.18
Nodes (4): SiswaLoginPage(), AdminLoginPage(), AkunForm(), handleEnterToNextField()

### Community 35 - "Memulai Instalasi Lokal"
Cohesion: 0.22
Nodes (8): 1. Prasyarat, 2. Setup Environment, 3. Setup Database, 4. Menjalankan Server Development, LPKS System — Sistem Manajemen Pelatihan Pengelasan "Sumbu Hidup", Memulai Instalasi Lokal, Modul Utama, Tech Stack

### Community 36 - "button.tsx"
Cohesion: 0.22
Nodes (5): KriteriaItem, NilaiPage(), RiwayatGrouped, Button, ButtonProps

### Community 38 - "superadmin/keuangan/page.tsx"
Cohesion: 0.14
Nodes (15): Modul Catatan Keuangan & Pembayaran, Modul Direktori Data Siswa, ProgramItem, SiswaKeuanganItem, SkemaBayar, TabFilter, TransaksiItem, FilterStatus (+7 more)

### Community 40 - "siswa/keuangan/page.tsx"
Cohesion: 0.20
Nodes (5): KeuanganData, KeuanganSiswaPage(), TransaksiItem, PenilaianSuperadminPage(), formatDateIndo()

### Community 41 - "(superadmin)/layout.tsx"
Cohesion: 0.18
Nodes (7): BOTTOM_NAV_ITEMS, MAIN_NAV_ITEMS, NavItem(), NavItemType, NotificationItem, Sidebar(), SuperadminLayout()

### Community 42 - "penilaian/page.tsx"
Cohesion: 0.22
Nodes (8): Modul Penilaian 5 Kriteria Fluktuasi, KriteriaItem, KriteriaStatus, PenilaianRow, ProgramItem, SiswaPenilaianItem, TabFilter, WARNA_PALETTE

### Community 43 - "badge.tsx"
Cohesion: 0.29
Nodes (5): Portal Mandiri Siswa Mobile-Responsive, BerandaPage(), StudentDashboardData, Badge(), BadgeProps

## Knowledge Gaps
- **207 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+202 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `pendaftaran/page.tsx`, `button.tsx`, `superadmin/keuangan/page.tsx`, `(superadmin)/layout.tsx`, `badge.tsx`, `superadmin/presensi/page.tsx`, `skeleton.tsx`, `utils.ts`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `errorResponse()` connect `errorResponse` to `gate-checks.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `Button` connect `button.tsx` to `pendaftaran/page.tsx`, `superadmin/keuangan/page.tsx`, `cn`, `(superadmin)/layout.tsx`, `penilaian/page.tsx`, `master/page.tsx`, `[id]/page.tsx`, `form-utils.ts`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _207 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `errorResponse` be split into smaller, more focused modules?**
  _Cohesion score 0.08525252525252525 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._