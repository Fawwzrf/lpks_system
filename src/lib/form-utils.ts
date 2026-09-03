import React from "react";

/**
 * Helper navigasi keyboard efisien:
 * Menekan 'Enter' pada input/select akan otomatis memindahkan kursor fokus
 * ke input berikutnya (dan menyeleksi teksnya agar cepat diedit),
 * tanpa men-submit form secara tidak sengaja.
 */
export function handleEnterToNextField(e: React.KeyboardEvent<HTMLElement>) {
  if (e.key !== "Enter") return;

  // Jangan interupsi jika pengguna sedang di textarea (butuh new line) kecuali jika ditekan Ctrl+Enter
  const target = e.target as HTMLElement;
  if (target.tagName.toLowerCase() === "textarea" && !e.ctrlKey) {
    return;
  }

  // Cari form atau kontainer form terdekat
  const container = target.closest("form") || target.closest("[data-form-container]");
  if (!container) return;

  e.preventDefault();

  // Ambil semua elemen input interaktif yang tidak disabled
  const focusableSelector =
    'input:not([disabled]):not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), select:not([disabled]), textarea:not([disabled]), button[type="submit"]:not([disabled]), button[data-submit-btn]:not([disabled])';
  
  const focusables = Array.from(
    container.querySelectorAll<HTMLElement>(focusableSelector)
  );

  const currentIndex = focusables.indexOf(target);
  if (currentIndex !== -1 && currentIndex < focusables.length - 1) {
    const nextElement = focusables[currentIndex + 1];
    nextElement.focus();
    // Jika elemen input bertipe text/number, otomatis blok teks agar langsung tertimpa bila diketik
    if (nextElement instanceof HTMLInputElement && (nextElement.type === "text" || nextElement.type === "number" || nextElement.type === "email")) {
      nextElement.select();
    }
  }
}
