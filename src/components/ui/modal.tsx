"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      if (dialog.open) dialog.close();
    }
  }, [open]);

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const rect = dialogRef.current?.getBoundingClientRect();
    if (!rect) return;
    const { clientX, clientY } = e;
    if (
      clientX < rect.left || clientX > rect.right ||
      clientY < rect.top || clientY > rect.bottom
    ) {
      onClose();
    }
  };

  const sizeClasses = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
  };

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      onClose={onClose}
      className={cn(
        "w-full rounded-2xl border border-[#1F2937] bg-[#111827] text-[#F9FAFB] shadow-2xl p-0 m-auto",
        "backdrop:bg-black/70 backdrop:backdrop-blur-sm",
        "open:animate-in open:fade-in open:zoom-in-95",
        sizeClasses[size]
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4 p-5 border-b border-[#1F2937]">
        <div>
          <h2 className="text-sm font-bold text-[#F9FAFB] leading-tight">{title}</h2>
          {description && (
            <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">{description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          aria-label="Tutup modal"
          className="shrink-0 -mt-1 -mr-1"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="p-5">{children}</div>
    </dialog>
  );
}
