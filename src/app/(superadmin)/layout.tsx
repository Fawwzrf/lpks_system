"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Flame, LayoutDashboard, UserPlus, Users, MapPin,
  Wallet, ClipboardList, Award, Settings, Bot,
  Menu, X, LogOut, Bell, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/superadmin/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
  { href: "/superadmin/pendaftaran", icon: UserPlus,         label: "Pendaftaran" },
  { href: "/superadmin/siswa",       icon: Users,            label: "Data Siswa" },
  { href: "/superadmin/presensi",    icon: MapPin,           label: "Presensi GPS" },
  { href: "/superadmin/keuangan",    icon: Wallet,           label: "Keuangan" },
  { href: "/superadmin/penilaian",   icon: ClipboardList,    label: "Penilaian Harian" },
  { href: "/superadmin/ujian",       icon: Award,            label: "Ujian & Sertifikat" },
  { href: "/superadmin/master",      icon: Settings,         label: "Master Data" },
  { href: "/superadmin/ai",          icon: Bot,              label: "AI Showcase" },
] as const;

function NavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: (typeof NAV_ITEMS)[number];
  active: boolean;
  collapsed?: boolean;
  onClick?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={item.label}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-medium transition-all duration-150 group relative",
        active
          ? "bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/20"
          : "text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1F2937]"
      )}
    >
      <Icon className={cn("h-4 w-4 shrink-0", active && "text-[#DC2626]")} aria-hidden="true" />
      {!collapsed && <span className="truncate">{item.label}</span>}
      {active && !collapsed && (
        <ChevronRight className="h-3 w-3 text-[#DC2626] ml-auto shrink-0" aria-hidden="true" />
      )}
    </Link>
  );
}

function Sidebar({
  collapsed,
  onClose,
  isMobile = false,
}: {
  collapsed?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <aside
      className={cn(
        "flex flex-col bg-[#111827] border-r border-[#1F2937] h-full transition-all duration-200",
        isMobile ? "w-64" : collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#1F2937]">
        <div className="h-8 w-8 rounded-xl bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center shrink-0">
          <Flame className="h-4 w-4 text-[#DC2626]" aria-hidden="true" />
        </div>
        {(!collapsed || isMobile) && (
          <div className="overflow-hidden">
            <span className="text-xs font-bold text-[#F9FAFB] block truncate leading-tight">LPKS Sumbu Hidup</span>
            <span className="text-[10px] text-[#6B7280] block truncate leading-tight">Superadmin</span>
          </div>
        )}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            className="ml-auto text-[#6B7280] hover:text-[#F9FAFB]"
            aria-label="Tutup menu"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1" aria-label="Menu utama">
        {NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={pathname.startsWith(item.href)}
            collapsed={collapsed && !isMobile}
            onClick={isMobile ? onClose : undefined}
          />
        ))}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-[#1F2937]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-xs font-medium text-[#9CA3AF] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-all duration-150"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {(!collapsed || isMobile) && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  );
}

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-[#0B0F17] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col h-full">
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Mobile Drawer Overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden bg-black/60 backdrop-blur-sm"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      {/* Mobile Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 md:hidden transform transition-transform duration-200",
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Menu navigasi"
      >
        <Sidebar isMobile onClose={() => setDrawerOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-[#111827] border-b border-[#1F2937] flex items-center px-4 gap-3 shrink-0">
          {/* Mobile menu button */}
          <button
            className="md:hidden text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          {/* Desktop collapse toggle */}
          <button
            className="hidden md:flex text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors"
            onClick={() => setSidebarCollapsed((v) => !v)}
            aria-label={sidebarCollapsed ? "Perluas sidebar" : "Ciutkan sidebar"}
          >
            <Menu className="h-4 w-4" />
          </button>

          <div className="flex-1" />

          {/* Notif + avatar */}
          <button
            className="relative text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors"
            aria-label="Notifikasi"
          >
            <Bell className="h-4 w-4" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#DC2626] border border-[#111827]" aria-hidden="true" />
          </button>
          <div className="h-7 w-7 rounded-full bg-[#1F2937] border border-[#374151] flex items-center justify-center">
            <span className="text-[10px] font-bold text-[#DC2626]" aria-label="Avatar admin">A</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
