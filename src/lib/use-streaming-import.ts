"use client";

import { useState } from "react";

export interface ImportResult {
  success: boolean;
  message: string;
  total_rows?: number;
  imported_count?: number;
  updated_count?: number;
  failed_count?: number;
  warning_count?: number;
  errors?: { row: number; reason: string; type?: "warning" | "error" }[];
}

const ERR_RESULT = (message: string): ImportResult => ({
  success: false,
  message,
  total_rows: 0,
  imported_count: 0,
  updated_count: 0,
  failed_count: 1,
  warning_count: 0,
  errors: [{ row: 0, reason: message, type: "error" }],
});

export function useStreamingImport(onDone?: () => Promise<void> | void) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);

  async function run(e: React.FormEvent, url: string) {
    e.preventDefault();
    if (!file) return;
    setImporting(true);
    setProgress(0);
    setStatus("Mempersiapkan data...");
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(url, { method: "POST", body: formData });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        setResult(ERR_RESULT(json.error?.message || "Gagal mengimpor file."));
        setImporting(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setResult(ERR_RESULT("Respon server tidak mendukung streaming pembacaan data."));
        setImporting(false);
        return;
      }

      const decoder = new TextDecoder();
      let finalResult: Omit<ImportResult, "success"> | null = null;
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        let bail = false;
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            const data = JSON.parse(trimmed);
            if (data.type === "progress") {
              setProgress(data.progress);
              setStatus(data.status);
            } else if (data.type === "done") {
              finalResult = data.result;
            } else if (data.type === "error") {
              setResult(ERR_RESULT(data.message));
              setImporting(false);
              bail = true;
              break;
            }
          } catch {
            // partial chunk
          }
        }
        if (bail) return;
      }

      // flush remaining buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.trim());
          if (data.type === "done") finalResult = data.result;
          else if (data.type === "error") {
            setResult(ERR_RESULT(data.message));
            setImporting(false);
            return;
          }
        } catch {}
      }

      setImporting(false);
      await onDone?.();

      if (finalResult) {
        const errs = finalResult.errors || [];
        const failCount = finalResult.failed_count ?? errs.filter((e) => e.type !== "warning").length;
        const warnCount = finalResult.warning_count ?? errs.filter((e) => e.type === "warning").length;
        setResult({
          success: true,
          message: finalResult.message || "Proses impor selesai.",
          total_rows: finalResult.total_rows ?? ((finalResult.imported_count || 0) + (finalResult.updated_count || 0) + errs.length),
          imported_count: finalResult.imported_count || 0,
          updated_count: finalResult.updated_count || 0,
          failed_count: failCount,
          warning_count: warnCount,
          errors: errs,
        });
      } else {
        setResult({
          success: true,
          message: "Proses impor file telah selesai.",
          total_rows: 0,
          imported_count: 0,
          updated_count: 0,
          failed_count: 0,
          warning_count: 0,
          errors: [],
        });
      }
    } catch {
      setResult(ERR_RESULT("Gagal mengunggah file atau koneksi terputus."));
      setImporting(false);
    }
  }

  function reset() {
    setFile(null);
    setResult(null);
    setProgress(0);
    setStatus("");
  }

  return { file, setFile, importing, progress, status, result, run, reset };
}
