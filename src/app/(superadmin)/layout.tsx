"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Flame, LayoutDashboard, UserPlus, Users, MapPin,
  Wallet, ClipboardList, Award, Settings, Bot,
  Menu, X, LogOut, Bell, ChevronRight, KeyRound,
  CheckCircle2, AlertTriangle, FileSpreadsheet, Loader2,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MAIN_NAV_ITEMS = [
  { href: "/superadmin/dashboard",   icon: LayoutDashboard, label: "Dashboard" },
  { href: "/superadmin/pendaftaran", icon: UserPlus,         label: "Pendaftaran" },
  { href: "/superadmin/siswa",       icon: Users,            label: "Data Siswa" },
  { href: "/superadmin/presensi",    icon: MapPin,           label: "Presensi GPS" },
  { href: "/superadmin/keuangan",    icon: Wallet,           label: "Keuangan" },
  { href: "/superadmin/penilaian",   icon: ClipboardList,    label: "Penilaian Harian" },
  { href: "/superadmin/ujian",       icon: Award,            label: "Ujian & Sertifikat" },
] as const;

const BOTTOM_NAV_ITEMS = [
  { href: "/superadmin/master",      icon: Settings,         label: "Master Data" },
  { href: "/superadmin/ai",          icon: Bot,              label: "AI Showcase" },
] as const;

type NavItemType = (typeof MAIN_NAV_ITEMS)[number] | (typeof BOTTOM_NAV_ITEMS)[number];

function NavItem({
  item,
  active,
  collapsed,
  onClick,
}: {
  item: NavItemType;
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
  adminUser,
  onLogout,
}: {
  collapsed?: boolean;
  onClose?: () => void;
  isMobile?: boolean;
  adminUser: { nama?: string; email?: string } | null;
  onLogout: () => void;
}) {
  const pathname = usePathname();

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
            <span className="text-xs font-bold text-[#F9FAFB] block truncate leading-tight">
              {adminUser?.nama || "LPKS Sumbu Hidup"}
            </span>
            <span className="text-[10px] text-[#6B7280] block truncate leading-tight">
              {adminUser?.email || "Superadmin"}
            </span>
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

      {/* Nav Utama (Operasional Harian) */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 flex flex-col gap-1" aria-label="Menu utama">
        {MAIN_NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={pathname.startsWith(item.href)}
            collapsed={collapsed && !isMobile}
            onClick={isMobile ? onClose : undefined}
          />
        ))}
      </nav>

      {/* Nav Bawah: Master Data & AI Showcase Menempel ke Tombol Keluar */}
      <div className="px-3 py-3 border-t border-[#1F2937] flex flex-col gap-1">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            active={pathname.startsWith(item.href)}
            collapsed={collapsed && !isMobile}
            onClick={isMobile ? onClose : undefined}
          />
        ))}
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full rounded-xl px-3 py-2.5 text-xs font-medium text-[#9CA3AF] hover:text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-all duration-150 mt-1"
        >
          <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
          {(!collapsed || isMobile) && <span>Keluar</span>}
        </button>
      </div>
    </aside>
  );
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "default";
  link: string;
  count: number;
  created_at: string;
}

export default function SuperadminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Admin user data
  const [adminUser, setAdminUser] = useState<{ nama?: string; email?: string } | null>(null);

  // Interactive Header State
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Change Password Modal State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Click outside ref
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Load admin profile info
  const loadAdmin = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      if (res.ok) {
        const json = await res.json();
        setAdminUser(json.data?.user || null);
      }
    } catch (e) {
      console.error("Gagal memuat info admin:", e);
    }
  }, []);

  // Load system notifications
  const loadNotifications = useCallback(async () => {
    setLoadingNotifs(true);
    try {
      const res = await fetch("/api/v1/notifications");
      if (res.ok) {
        const json = await res.json();
        setNotifications(json.data || []);
        setUnreadAlerts(json.meta?.total_unread || 0);
      }
    } catch (e) {
      console.error("Gagal memuat notifikasi:", e);
    } finally {
      setLoadingNotifs(false);
    }
  }, []);

  useEffect(() => {
    loadAdmin();
    loadNotifications();
  }, [loadAdmin, loadNotifications]);

  // Click outside handler for dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
    } catch (e) {
      console.error("Logout error:", e);
    }
    router.push("/superadmin/login");
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMsg(null);

    if (!newPassword || newPassword.length < 6) {
      setPasswordMsg({ type: "error", text: "Kata sandi baru minimal 6 karakter." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Konfirmasi kata sandi tidak cocok." });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch("/api/v1/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password_baru: newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Gagal mengubah kata sandi.");
      }
      setPasswordMsg({ type: "success", text: "Kata sandi admin berhasil diperbarui." });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setPasswordModalOpen(false);
        setPasswordMsg(null);
      }, 1500);
    } catch (err) {
      setPasswordMsg({
        type: "error",
        text: err instanceof Error ? err.message : "Terjadi kesalahan saat mengubah sandi.",
      });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="flex h-screen bg-[#0B0F17] overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-col h-full">
        <Sidebar
          collapsed={sidebarCollapsed}
          adminUser={adminUser}
          onLogout={handleLogout}
        />
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
        <Sidebar
          isMobile
          onClose={() => setDrawerOpen(false)}
          adminUser={adminUser}
          onLogout={handleLogout}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-14 bg-[#111827] border-b border-[#1F2937] flex items-center px-4 gap-3 shrink-0 relative z-30">
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

          {/* ========================================================================= */}
          {/* INTERACTIVE NOTIFICATION DROPDOWN */}
          {/* ========================================================================= */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => {
                setNotifOpen((prev) => !prev);
                setProfileOpen(false);
                if (!notifOpen) loadNotifications();
              }}
              className="relative p-2 rounded-lg text-[#9CA3AF] hover:text-[#F9FAFB] hover:bg-[#1F2937] transition-all"
              aria-label="Pemberitahuan Sistem"
              title="Pemberitahuan Sistem"
            >
              <Bell className="h-4 w-4" />
              {unreadAlerts > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#DC2626] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#DC2626]" />
                </span>
              )}
            </button>

            {/* Popover Notifikasi */}
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl border border-[#1F2937] bg-[#111827] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1F2937] bg-[#0B0F17]">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-[#DC2626]" />
                    <h3 className="text-xs font-bold text-[#F9FAFB]">Pemberitahuan Sistem</h3>
                  </div>
                  {unreadAlerts > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/30">
                      {unreadAlerts} Perlu Tindakan
                    </span>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-[#1F2937]/60">
                  {loadingNotifs ? (
                    <div className="flex items-center justify-center py-8 text-[#9CA3AF] text-xs gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Memuat notifikasi...
                    </div>
                  ) : notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#6B7280]">
                      Tidak ada pemberitahuan saat ini.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <Link
                        key={n.id}
                        href={n.link}
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 p-3.5 hover:bg-[#1F2937]/50 transition-colors group text-left"
                      >
                        <div
                          className={`p-2 rounded-lg shrink-0 mt-0.5 ${
                            n.type === "success"
                              ? "bg-[#10B981]/15 text-[#10B981]"
                              : n.type === "info"
                              ? "bg-[#38BDF8]/15 text-[#38BDF8]"
                              : n.type === "warning"
                              ? "bg-[#F59E0B]/15 text-[#F59E0B]"
                              : "bg-[#1F2937] text-[#9CA3AF]"
                          }`}
                        >
                          {n.type === "success" ? (
                            <FileSpreadsheet className="h-4 w-4" />
                          ) : n.type === "info" ? (
                            <Award className="h-4 w-4" />
                          ) : n.type === "warning" ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <p className="text-xs font-semibold text-[#F9FAFB] group-hover:text-[#DC2626] transition-colors truncate">
                              {n.title}
                            </p>
                            <span className="text-[10px] text-[#6B7280] shrink-0">{n.created_at}</span>
                          </div>
                          <p className="text-[11px] text-[#9CA3AF] mt-0.5 line-clamp-2 leading-relaxed">
                            {n.message}
                          </p>
                        </div>
                        <ChevronRight className="h-3.5 w-3.5 text-[#6B7280] group-hover:text-white shrink-0 mt-1" />
                      </Link>
                    ))
                  )}
                </div>

                <div className="p-2 border-t border-[#1F2937] bg-[#0B0F17] flex justify-between items-center text-[11px]">
                  <button
                    onClick={() => loadNotifications()}
                    className="text-[#9CA3AF] hover:text-white px-2 py-1"
                  >
                    Segarkan
                  </button>
                  <Link
                    href="/superadmin/dashboard"
                    onClick={() => setNotifOpen(false)}
                    className="text-[#DC2626] hover:underline px-2 py-1 font-medium"
                  >
                    Buka Dashboard
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* ========================================================================= */}
          {/* INTERACTIVE PROFILE AVATAR DROPDOWN */}
          {/* ========================================================================= */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => {
                setProfileOpen((prev) => !prev);
                setNotifOpen(false);
              }}
              className="flex items-center gap-2 p-1 rounded-full hover:ring-2 hover:ring-[#DC2626]/40 transition-all"
              aria-label="Menu Akun Superadmin"
              title="Menu Akun Superadmin"
            >
              <div className="h-8 w-8 rounded-full bg-[#1F2937] border border-[#374151] flex items-center justify-center text-xs font-bold text-[#DC2626] shadow-sm">
                A
              </div>
            </button>

            {/* Popover Profil */}
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-xl border border-[#1F2937] bg-[#111827] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 z-50">
                {/* Header User Info */}
                <div className="p-4 border-b border-[#1F2937] bg-[#0B0F17]">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center font-bold text-[#DC2626] text-sm">
                      A
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#F9FAFB] truncate leading-tight">
                        {adminUser?.nama || "Superadmin LPKS"}
                      </p>
                      <p className="text-[11px] text-[#9CA3AF] truncate leading-tight mt-0.5">
                        {adminUser?.email || "admin@lpks.id"}
                      </p>
                      <span className="inline-block mt-1.5 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#DC2626]/20 text-[#DC2626] border border-[#DC2626]/30">
                        Superadmin
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="p-2 flex flex-col gap-1 text-xs">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      setPasswordModalOpen(true);
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#D1D5DB] hover:text-white hover:bg-[#1F2937] transition-colors w-full text-left"
                  >
                    <KeyRound className="h-4 w-4 text-[#38BDF8]" />
                    <span>Ubah Kata Sandi Admin</span>
                  </button>

                  <Link
                    href="/superadmin/master"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#D1D5DB] hover:text-white hover:bg-[#1F2937] transition-colors"
                  >
                    <Settings className="h-4 w-4 text-[#10B981]" />
                    <span>Pengaturan Master Data</span>
                  </Link>

                  <Link
                    href="/superadmin/siswa"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-[#D1D5DB] hover:text-white hover:bg-[#1F2937] transition-colors"
                  >
                    <Users className="h-4 w-4 text-[#F59E0B]" />
                    <span>Kelola Data Siswa</span>
                  </Link>
                </div>

                {/* Logout Action */}
                <div className="p-2 border-t border-[#1F2937] bg-[#0B0F17]">
                  <button
                    onClick={() => {
                      setProfileOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2.5 w-full px-3 py-2 rounded-lg text-xs font-semibold text-[#F43F5E] hover:bg-[#F43F5E]/10 transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Keluar dari Akun</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODAL UBAH KATA SANDI ADMIN */}
      {/* ========================================================================= */}
      <Modal
        open={passwordModalOpen}
        onClose={() => !passwordLoading && setPasswordModalOpen(false)}
        title="Ubah Kata Sandi Superadmin"
        description="Perbarui kata sandi login untuk keamanan akun administrator LPKS Sumbu Hidup."
      >
        <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
          {passwordMsg && (
            <div
              className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                passwordMsg.type === "success"
                  ? "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981]"
                  : "bg-[#F43F5E]/10 border-[#F43F5E]/30 text-[#F43F5E]"
              }`}
            >
              {passwordMsg.type === "success" ? (
                <CheckCircle2 className="h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 shrink-0" />
              )}
              <span>{passwordMsg.text}</span>
            </div>
          )}

          <div>
            <Input
              label="Kata Sandi Baru"
              type="password"
              placeholder="Minimal 6 karakter..."
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <div>
            <Input
              label="Konfirmasi Kata Sandi Baru"
              type="password"
              placeholder="Ulangi kata sandi baru..."
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-[#1F2937]">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={passwordLoading}
              onClick={() => setPasswordModalOpen(false)}
            >
              Batal
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={passwordLoading}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white gap-1.5"
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan...
                </>
              ) : (
                <>
                  <KeyRound className="h-4 w-4" /> Simpan Kata Sandi
                </>
              )}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
