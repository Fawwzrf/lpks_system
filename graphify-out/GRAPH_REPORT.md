# Graph Report - LPKS System  (2026-09-12)

## Corpus Check
- 99 files · ~94,659 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 520 nodes · 1040 edges · 42 communities (31 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0e070c7d`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- errorResponse
- form-utils.ts
- compilerOptions
- utils.ts
- dependencies
- devDependencies
- cn
- gate-checks.ts
- PendaftaranPage
- siswa/presensi/page.tsx
- database.ts
- Buku Panduan Pengguna (User Manual) — LPKS Sumbu Hidup
- superadmin/keuangan/page.tsx
- superadmin/presensi/page.tsx
- transkrip/page.tsx
- ai/page.tsx
- app/layout.tsx
- skeleton.tsx
- src/middleware.ts
- master/page.tsx
- SiswaPage
- ujian/page.tsx
- auth-rbac.test.ts
- client.ts
- 1. Test Plan
- PresensiAdminPage
- Gemini AI RAG & Context Generator
- Sistem Manajemen LPKS Sumbu Hidup
- eslint.config.mjs
- next.config.ts
- postcss.config.mjs
- Modul Penerbitan Sertifikat Kelulusan
- UI Design System & Tokens
- Memulai Instalasi Lokal
- [id]/page.tsx
- button.tsx
- formatRupiah
- pendaftaran/page.tsx
- penilaian/page.tsx
- modal.tsx

## God Nodes (most connected - your core abstractions)
1. `errorResponse()` - 78 edges
2. `createClient()` - 75 edges
3. `successResponse()` - 67 edges
4. `requireSuperadmin()` - 45 edges
5. `cn()` - 32 edges
6. `requireAuth()` - 23 edges
7. `compilerOptions` - 17 edges
8. `Button` - 14 edges
9. `requireStudentOwnerOrAdmin()` - 14 edges
10. `Skeleton()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `validatePresensiSubmission()` --calls--> `isWithinGeofence()`  [EXTRACTED]
  tests/integration/flow-presensi.test.ts → src/lib/geo.ts
- `SiswaLayout()` --calls--> `cn()`  [EXTRACTED]
  src/app/(siswa)/layout.tsx → src/lib/utils.ts
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

## Communities (42 total, 11 thin omitted)

### Community 0 - "errorResponse"
Cohesion: 0.09
Nodes (63): POST(), POST(), GET(), Params, POST(), POST(), POST(), GET() (+55 more)

### Community 1 - "form-utils.ts"
Cohesion: 0.22
Nodes (5): AdminLoginPage(), KriteriaItem, NilaiPage(), RiwayatGrouped, handleEnterToNextField()

### Community 2 - "compilerOptions"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 3 - "utils.ts"
Cohesion: 0.16
Nodes (8): Portal Superadmin Web Dashboard, NAV_ITEMS, SiswaLayout(), DashboardPage(), DashboardStats, QUICK_ACCESS, StatCard(), StatCardProps

### Community 4 - "dependencies"
Cohesion: 0.07
Nodes (27): clsx, @google/genai, jspdf, jspdf-autotable, lucide-react, next, dependencies, clsx (+19 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (26): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+18 more)

### Community 6 - "cn"
Cohesion: 0.20
Nodes (12): ActiveTab, NAV_ITEMS, NavItem(), Sidebar(), SuperadminLayout(), Card, CardContent, CardDescription (+4 more)

### Community 7 - "gate-checks.ts"
Cohesion: 0.20
Nodes (13): POST(), generateStudentPassword(), generateStudentUsername(), isKeuanganLunas(), isSertifikatEligible(), isSiapUjian(), isUjianLulus(), isValidNIK() (+5 more)

### Community 8 - "PendaftaranPage"
Cohesion: 0.18
Nodes (5): PendaftaranPage(), handleFieldBlur(), handleSubmit(), validateField(), validateForm()

### Community 9 - "siswa/presensi/page.tsx"
Cohesion: 0.20
Nodes (10): Modul Presensi Geofencing GPS, Geofencing Verification Engine (Haversine), PresensiItem, PresensiSiswaPage(), STATUS_COLOR, STATUS_ICON, formatDistance(), haversineDistance() (+2 more)

### Community 10 - "database.ts"
Cohesion: 0.14
Nodes (13): AiRingkasan, AuditLog, MasterKriteria, MasterLokasi, MasterProgram, MasterSyaratBerkas, PenilaianHarian, Presensi (+5 more)

### Community 11 - "Buku Panduan Pengguna (User Manual) — LPKS Sumbu Hidup"
Cohesion: 0.18
Nodes (10): 1. Pendaftaran Siswa (Superadmin), 2. Presensi Harian Mandiri (Siswa), 3. Penilaian Kriteria Las (Superadmin), 4. Konsultan SOP Las & RAG (Superadmin), Buku Panduan Pengguna (User Manual) — LPKS Sumbu Hidup, Kontak Dukungan, Memulai (Getting Started), Panduan Fitur Utama (+2 more)

### Community 12 - "superadmin/keuangan/page.tsx"
Cohesion: 0.13
Nodes (16): Modul Catatan Keuangan & Pembayaran, Modul Direktori Data Siswa, ProgramItem, SiswaKeuanganItem, SkemaBayar, TabFilter, TransaksiItem, FilterStatus (+8 more)

### Community 13 - "superadmin/presensi/page.tsx"
Cohesion: 0.22
Nodes (8): PresensiAllItem, PresensiRecord, ProgramItem, SiswaData, STATUS_CONFIG, STATUS_OPTIONS, StatusPresensi, TabFilter

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
Cohesion: 0.18
Nodes (10): Portal Mandiri Siswa Mobile-Responsive, StudentDashboardData, KeuanganData, TransaksiItem, Badge(), BadgeProps, CardSkeleton(), PageSkeleton() (+2 more)

### Community 18 - "src/middleware.ts"
Cohesion: 0.60
Nodes (3): updateSession(), config, middleware()

### Community 19 - "master/page.tsx"
Cohesion: 0.18
Nodes (7): BerkasItem, KriteriaItem, LokasiItem, MasterPage(), ProgramItem, Tab, TABS

### Community 21 - "ujian/page.tsx"
Cohesion: 0.22
Nodes (4): Modul Ujian Internal & Kelulusan, KRITERIA_LIST, SiswaUjianItem, UjianPage()

### Community 24 - "1. Test Plan"
Cohesion: 0.06
Nodes (33): 1. Test Plan, 2.1. Hasil Regression Testing (Automated Test Suite), 2.2. Hasil Eksekusi Test Case Fungsional (Playwright MCP), 2.3. Kesimpulan Exit Criteria Tahap 2, 2. Laporan Pengujian Fungsional (Tahap 2), 3.1. Security & Penetration Testing, 3.2. Performance / Load Testing, 3.3. Compatibility / Cross-Browser Testing (+25 more)

### Community 35 - "Memulai Instalasi Lokal"
Cohesion: 0.22
Nodes (8): 1. Prasyarat, 2. Setup Environment, 3. Setup Database, 4. Menjalankan Server Development, LPKS System — Sistem Manajemen Pelatihan Pengelasan "Sumbu Hidup", Memulai Instalasi Lokal, Modul Utama, Tech Stack

### Community 36 - "[id]/page.tsx"
Cohesion: 0.31
Nodes (7): EditSiswaPage(), handleFieldBlur(), handleSubmit(), FieldErrors, PageProps, validateField(), validateForm()

### Community 37 - "button.tsx"
Cohesion: 0.22
Nodes (3): AkunForm(), Button, ButtonProps

### Community 38 - "formatRupiah"
Cohesion: 0.17
Nodes (5): BerandaPage(), KeuanganSiswaPage(), KeuanganSuperadminPage(), formatDateIndo(), formatRupiah()

### Community 39 - "pendaftaran/page.tsx"
Cohesion: 0.25
Nodes (7): Modul Pendaftaran Siswa & Verifikasi Berkas, BERKAS_LIST, FieldErrors, ProgramItem, RegistrationSuccessData, Input, InputProps

### Community 40 - "penilaian/page.tsx"
Cohesion: 0.22
Nodes (6): Modul Penilaian 5 Kriteria Fluktuasi, KriteriaItem, PenilaianPage(), PenilaianRow, SiswaOption, WARNA_PALETTE

### Community 41 - "modal.tsx"
Cohesion: 0.40
Nodes (3): SiswaLoginPage(), Modal(), ModalProps

## Knowledge Gaps
- **197 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+192 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `cn` to `utils.ts`, `button.tsx`, `pendaftaran/page.tsx`, `modal.tsx`, `superadmin/keuangan/page.tsx`, `skeleton.tsx`?**
  _High betweenness centrality (0.026) - this node is a cross-community bridge._
- **Why does `errorResponse()` connect `errorResponse` to `gate-checks.ts`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **Why does `Button` connect `button.tsx` to `form-utils.ts`, `[id]/page.tsx`, `cn`, `pendaftaran/page.tsx`, `penilaian/page.tsx`, `modal.tsx`, `superadmin/keuangan/page.tsx`, `master/page.tsx`, `ujian/page.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _197 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `errorResponse` be split into smaller, more focused modules?**
  _Cohesion score 0.09174102036147334 - nodes in this community are weakly interconnected._
- **Should `compilerOptions` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._