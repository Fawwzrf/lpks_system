import React from "react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center p-4">
      {children}
    </div>
  );
}
