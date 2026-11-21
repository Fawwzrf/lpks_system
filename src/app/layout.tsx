import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LPKS Sumbu Hidup — Sistem Manajemen Pelatihan Pengelasan",
  description: "Platform Manajemen Pelatihan Kerja Swasta Pengelasan Industri Berbasis Web",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="id"
      className="dark h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}





