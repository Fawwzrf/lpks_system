# Graph Report - LPKS System  (2026-09-07)

## Corpus Check
- Corpus is ~47,312 words - fits in a single context window. You may not need a graph.

## Summary
- 414 nodes · 869 edges · 35 communities (20 shown, 15 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- API Route Handlers
- Auth & Login Flow
- TypeScript Compiler Options
- Navigation & Portal Layouts
- Dependencies & NPM Libraries
- DevDependencies & Linting
- Mockup & UI Layout Shell
- Gate Checks & Student Security
- Enrollment & Finance Management
- Student Presensi & Geofencing
- Database Schema & Interfaces
- Assessment & Criteria Scoring
- Student Directory & Data Table
- Admin Presensi Management
- Student Academic Transcript
- AI Analytics & Chat Assistant
- Root Layout & Typography
- Registration & Document Verification
- Session Auth Middleware
- Master Data & Location Settings
- Student Management & Import
- Exam Assessment & Certification
- RBAC & Authorization Tests
- Supabase Client & Auth
- Student Profile & Credentials
- Student Score Viewer
- Gemini RAG & AI Models
- System Architecture & PRD
- ESLint Configuration
- Next.js Build Configuration
- PostCSS Style Pipeline
- Certificate Issuance Module
- Design System & Tokens

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
- `SiswaLayout()` --calls--> `cn()`  [EXTRACTED]
  src/app/(siswa)/layout.tsx → src/lib/utils.ts
- `NavItem()` --calls--> `cn()`  [EXTRACTED]
  src/app/(superadmin)/layout.tsx → src/lib/utils.ts
- `SuperadminLayout()` --calls--> `cn()`  [EXTRACTED]
  src/app/(superadmin)/layout.tsx → src/lib/utils.ts
- `PenilaianPage()` --calls--> `formatDateIndo()`  [EXTRACTED]
  src/app/(superadmin)/superadmin/penilaian/page.tsx → src/lib/utils.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **LPKS System Core Operational Modules** — docs_analysis_prd_modul_pendaftaran, docs_analysis_prd_modul_siswa, docs_analysis_prd_modul_presensi, docs_analysis_prd_modul_keuangan, docs_analysis_prd_modul_penilaian, docs_analysis_prd_modul_ujian, docs_analysis_prd_modul_sertifikat [EXTRACTED 1.00]

## Communities (35 total, 15 thin omitted)

### Community 0 - "API Route Handlers"
Cohesion: 0.09
Nodes (61): POST(), POST(), GET(), Params, POST(), POST(), POST(), GET() (+53 more)

### Community 1 - "Auth & Login Flow"
Cohesion: 0.10
Nodes (18): Modul Ujian Internal & Kelulusan, SiswaLoginPage(), AdminLoginPage(), KriteriaItem, RiwayatGrouped, BerkasItem, KriteriaItem, LokasiItem (+10 more)

### Community 2 - "TypeScript Compiler Options"
Cohesion: 0.07
Nodes (29): dom, dom.iterable, esnext, **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules (+21 more)

### Community 3 - "Navigation & Portal Layouts"
Cohesion: 0.10
Nodes (17): Portal Mandiri Siswa Mobile-Responsive, Portal Superadmin Web Dashboard, NAV_ITEMS, SiswaLayout(), BerandaPage(), StudentDashboardData, KeuanganData, KeuanganSiswaPage() (+9 more)

### Community 4 - "Dependencies & NPM Libraries"
Cohesion: 0.07
Nodes (27): clsx, @google/genai, jspdf, jspdf-autotable, lucide-react, next, dependencies, clsx (+19 more)

### Community 5 - "DevDependencies & Linting"
Cohesion: 0.07
Nodes (26): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+18 more)

### Community 6 - "Mockup & UI Layout Shell"
Cohesion: 0.18
Nodes (14): ActiveTab, NAV_ITEMS, NavItem(), Sidebar(), SuperadminLayout(), Badge(), BadgeProps, Card (+6 more)

### Community 7 - "Gate Checks & Student Security"
Cohesion: 0.18
Nodes (14): PUT(), POST(), generateStudentPassword(), generateStudentUsername(), isKeuanganLunas(), isSertifikatEligible(), isSiapUjian(), isUjianLulus() (+6 more)

### Community 8 - "Enrollment & Finance Management"
Cohesion: 0.18
Nodes (11): Modul Catatan Keuangan & Pembayaran, Modul Pendaftaran Siswa & Verifikasi Berkas, SiswaOption, TransaksiRow, BERKAS_LIST, ProgramItem, RegistrationSuccessData, Input (+3 more)

### Community 9 - "Student Presensi & Geofencing"
Cohesion: 0.22
Nodes (10): Modul Presensi Geofencing GPS, Geofencing Verification Engine (Haversine), PresensiItem, PresensiSiswaPage(), STATUS_COLOR, STATUS_ICON, formatDistance(), haversineDistance() (+2 more)

### Community 10 - "Database Schema & Interfaces"
Cohesion: 0.14
Nodes (13): AiRingkasan, AuditLog, MasterKriteria, MasterLokasi, MasterProgram, MasterSyaratBerkas, PenilaianHarian, Presensi (+5 more)

### Community 11 - "Assessment & Criteria Scoring"
Cohesion: 0.22
Nodes (6): Modul Penilaian 5 Kriteria Fluktuasi, KriteriaItem, PenilaianPage(), PenilaianRow, SiswaOption, WARNA_PALETTE

### Community 12 - "Student Directory & Data Table"
Cohesion: 0.29
Nodes (6): Modul Direktori Data Siswa, FilterStatus, SiswaItem, Column, Table(), TableProps

### Community 13 - "Admin Presensi Management"
Cohesion: 0.29
Nodes (5): PresensiAdminPage(), PresensiRow, STATUS_CONFIG, STATUS_OPTIONS, StatusPresensi

### Community 14 - "Student Academic Transcript"
Cohesion: 0.33
Nodes (3): KriteriaStatus, TranskripPage(), WARNA_PALETTE

### Community 15 - "AI Analytics & Chat Assistant"
Cohesion: 0.33
Nodes (3): AiPage(), Message, STARTER_PROMPTS

### Community 16 - "Root Layout & Typography"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 18 - "Session Auth Middleware"
Cohesion: 0.60
Nodes (3): updateSession(), config, middleware()

## Knowledge Gaps
- **146 isolated node(s):** `eslintConfig`, `nextConfig`, `name`, `version`, `private` (+141 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **15 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Mockup & UI Layout Shell` to `Enrollment & Finance Management`, `Auth & Login Flow`, `Navigation & Portal Layouts`, `Student Directory & Data Table`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **Why does `errorResponse()` connect `API Route Handlers` to `Gate Checks & Student Security`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `createClient()` connect `API Route Handlers` to `Gate Checks & Student Security`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `eslintConfig`, `nextConfig`, `name` to the rest of the system?**
  _146 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `API Route Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.0945054945054945 - nodes in this community are weakly interconnected._
- **Should `Auth & Login Flow` be split into smaller, more focused modules?**
  _Cohesion score 0.10483870967741936 - nodes in this community are weakly interconnected._
- **Should `TypeScript Compiler Options` be split into smaller, more focused modules?**
  _Cohesion score 0.06666666666666667 - nodes in this community are weakly interconnected._