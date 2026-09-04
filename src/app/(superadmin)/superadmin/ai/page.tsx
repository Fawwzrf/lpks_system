"use client";

import React, { useState, useRef } from "react";
import { Bot, Send, Sparkles, Loader2, FileText } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STARTER_PROMPTS = [
  "Siapa siswa dengan performa terbaik bulan ini?",
  "Berapa rata-rata kehadiran seluruh kelas?",
  "Siswa mana yang nilainya menurun minggu ini?",
  "Buatkan ringkasan mingguan untuk seluruh kelas.",
];

export default function AiPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;
    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/ai/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pertanyaan: text.trim(), query: text.trim() }),
      });
      const data = await res.json();
      const reply =
        data.data?.jawaban || data.data?.answer || data.answer || "Maaf, respon AI tidak valid.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Tidak dapat menghubungi server AI." }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function generateSummary() {
    setSummaryLoading(true);
    setSummary(null);
    try {
      const res = await fetch("/api/v1/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "weekly" }),
      });
      const data = await res.json();
      const summaryText =
        data.data?.summary || data.summary || "Gagal menghasilkan ringkasan mingguan.";
      setSummary(summaryText);
    } catch {
      setSummary("Tidak dapat menghubungi server AI.");
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 h-full">
      <div>
        <h1 className="text-base font-bold text-[#F9FAFB]">AI Showcase</h1>
        <p className="text-xs text-[#6B7280] mt-0.5">Chatbot analitik RAG &amp; generator ringkasan kelas berbasis Gemini Flash.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Chatbot — span 3 */}
        <section className="lg:col-span-3 flex flex-col gap-3" aria-label="Chatbot analitik">
          <div className="rounded-xl border border-[#1F2937] bg-[#111827] flex flex-col overflow-hidden" style={{ height: "480px" }}>
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                  <div className="h-12 w-12 rounded-2xl bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-[#DC2626]" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-[#D1D5DB]">LPKS AI Assistant</p>
                    <p className="text-[11px] text-[#6B7280] mt-1">Tanyakan apa saja tentang data siswa, nilai, atau kehadiran.</p>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {STARTER_PROMPTS.map((p) => (
                      <button
                        key={p}
                        onClick={() => sendMessage(p)}
                        className="text-[11px] text-[#9CA3AF] bg-[#0B0F17] border border-[#1F2937] hover:border-[#DC2626]/40 hover:text-[#F9FAFB] rounded-lg px-3 py-1.5 transition-all duration-150"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                  <div className={`h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold ${m.role === "assistant" ? "bg-[#DC2626]/15 border border-[#DC2626]/30 text-[#DC2626]" : "bg-[#1F2937] text-[#F9FAFB]"}`}>
                    {m.role === "assistant" ? "AI" : "A"}
                  </div>
                  <div className={`max-w-[75%] rounded-xl px-3 py-2 text-xs leading-relaxed ${m.role === "assistant" ? "bg-[#1F2937] text-[#D1D5DB]" : "bg-[#DC2626] text-white"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="h-6 w-6 rounded-full bg-[#DC2626]/15 border border-[#DC2626]/30 flex items-center justify-center text-[10px] font-bold text-[#DC2626] shrink-0">AI</div>
                  <div className="rounded-xl bg-[#1F2937] px-3 py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-[#DC2626]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-[#1F2937] p-3 flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                placeholder="Tanyakan sesuatu tentang data kelas..."
                className="flex-1 h-9 rounded-lg border border-[#374151] bg-[#0B0F17] px-3 text-xs text-[#F9FAFB] placeholder:text-[#4B5563] focus:outline-none focus:border-[#DC2626] transition-colors"
                aria-label="Pesan ke AI Assistant"
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || loading}
                className="h-9 w-9 rounded-lg bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-50 flex items-center justify-center text-white transition-colors"
                aria-label="Kirim pesan"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>

        {/* Weekly Summary Generator — span 2 */}
        <section className="lg:col-span-2 flex flex-col gap-3" aria-label="Generator ringkasan mingguan">
          <div className="rounded-xl border border-[#1F2937] bg-[#111827] p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 flex items-center justify-center">
                <FileText className="h-4 w-4 text-[#F59E0B]" aria-hidden="true" />
              </div>
              <div>
                <p className="text-xs font-semibold text-[#F9FAFB]">Ringkasan Mingguan</p>
                <p className="text-[11px] text-[#6B7280]">Dihasilkan oleh Gemini Flash</p>
              </div>
            </div>

            <button
              onClick={generateSummary}
              disabled={summaryLoading}
              className="flex items-center justify-center gap-2 h-9 w-full rounded-lg border border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B] hover:bg-[#F59E0B]/20 disabled:opacity-50 text-xs font-medium transition-all"
            >
              {summaryLoading
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Menghasilkan...</>
                : <><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> Generate Ringkasan Seluruh Kelas</>}
            </button>

            {summary && (
              <div className="rounded-lg bg-[#0B0F17] border border-[#1F2937] p-3 text-[11px] text-[#D1D5DB] leading-relaxed max-h-72 overflow-y-auto whitespace-pre-wrap">
                {summary}
              </div>
            )}

            {!summary && !summaryLoading && (
              <div className="rounded-lg border border-dashed border-[#374151] p-4 text-center text-[11px] text-[#6B7280]">
                Klik tombol di atas untuk menghasilkan ringkasan performa kelas minggu ini.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
