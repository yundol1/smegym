"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  CalendarDays,
  FileText,
  Dumbbell,
  Inbox,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

interface PendingExemption {
  id: string;
  userId: string;
  nickname: string;
  dates: string;
  reason: string;
  status: string;
  createdAt: string;
}

export default function ExemptionManagePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [exemptions, setExemptions] = useState<PendingExemption[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchExemptions();
  }, []);

  async function fetchExemptions() {
    try {
      const res = await fetch("/api/admin/exemptions");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setExemptions(data.exemptions || []);
    } catch (err) {
      console.error("Exemption fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(exemptionId: string, action: "approve" | "reject") {
    if (!user) return;
    setProcessingId(exemptionId);

    try {
      const res = await fetch("/api/admin/exemptions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exemptionId,
          action,
          adminId: user.id,
        }),
      });

      if (!res.ok) throw new Error("patch failed");

      // Remove from list
      setExemptions((prev) => prev.filter((e) => e.id !== exemptionId));
    } catch (err) {
      console.error("Exemption action error:", err);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <main
        style={{
          padding: "2rem 0",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Dumbbell size={32} style={{ color: "#00E676" }} />
        </motion.div>
        <p style={{ marginTop: "1rem", color: "#666666" }}>로딩 중...</p>
      </main>
    );
  }

  return (
    <main
      style={{
        padding: "1.5rem 0",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <ShieldCheck size={24} style={{ color: "#00E676" }} />
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            fontFamily: "var(--font-heading)",
            color: "#FFFFFF",
          }}
        >
          면제 관리
        </h1>
        {exemptions.length > 0 && (
          <span
            style={{
              marginLeft: "auto",
              padding: "0.25rem 0.75rem",
              borderRadius: "2rem",
              background: "rgba(0,176,255,0.15)",
              color: "#00B0FF",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            {exemptions.length}건 대기
          </span>
        )}
      </header>

      {/* Exemption List */}
      {exemptions.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "3rem 2rem",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1rem",
            background: "#1A1A1A",
            borderRadius: "20px",
            border: "1px solid #222222",
          }}
        >
          <Inbox size={48} style={{ color: "#333333" }} />
          <p style={{ color: "#666666", fontSize: "0.9375rem", fontWeight: 600 }}>
            대기 중인 면제 신청이 없습니다
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {exemptions.map((exemption, i) => (
              <motion.div
                key={exemption.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                transition={{ delay: i * 0.05 }}
                style={{
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  background: "#1A1A1A",
                  borderRadius: "20px",
                  border: "1px solid #222222",
                }}
              >
                {/* Top row: nickname + time */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <div
                      style={{
                        width: "2.25rem",
                        height: "2.25rem",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #00E676, #00B0FF)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#0A0A0A",
                        fontWeight: 800,
                        fontSize: "0.875rem",
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      {exemption.nickname.charAt(0)}
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: "0.9375rem",
                          fontWeight: 700,
                          color: "#FFFFFF",
                          fontFamily: "var(--font-heading)",
                        }}
                      >
                        {exemption.nickname}
                      </span>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.25rem",
                      color: "#444444",
                      fontSize: "0.6875rem",
                    }}
                  >
                    <Clock size={12} />
                    {format(parseISO(exemption.createdAt), "MM/dd HH:mm", {
                      locale: ko,
                    })}
                  </div>
                </div>

                {/* Dates */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    padding: "0.625rem 0.875rem",
                    background: "#222222",
                    borderRadius: "12px",
                  }}
                >
                  <CalendarDays size={16} style={{ color: "#00B0FF", flexShrink: 0 }} />
                  <span
                    style={{
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#FFFFFF",
                    }}
                  >
                    {exemption.dates}
                  </span>
                </div>

                {/* Reason */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.5rem",
                    padding: "0.625rem 0.875rem",
                    background: "#222222",
                    borderRadius: "12px",
                  }}
                >
                  <FileText
                    size={16}
                    style={{ color: "#666666", flexShrink: 0, marginTop: "0.125rem" }}
                  />
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      color: "#999999",
                      lineHeight: 1.5,
                    }}
                  >
                    {exemption.reason}
                  </span>
                </div>

                {/* Action buttons */}
                <div style={{ display: "flex", gap: "0.625rem" }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAction(exemption.id, "approve")}
                    disabled={processingId === exemption.id}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      background: "rgba(0,230,118,0.15)",
                      color: "#00E676",
                      border: "1px solid rgba(0,230,118,0.3)",
                      borderRadius: "14px",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-heading)",
                      cursor: processingId === exemption.id ? "not-allowed" : "pointer",
                      opacity: processingId === exemption.id ? 0.5 : 1,
                    }}
                  >
                    <CheckCircle2 size={16} />
                    승인
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAction(exemption.id, "reject")}
                    disabled={processingId === exemption.id}
                    style={{
                      flex: 1,
                      padding: "0.75rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "0.5rem",
                      background: "rgba(255,145,0,0.15)",
                      color: "#FF9100",
                      border: "1px solid rgba(255,145,0,0.3)",
                      borderRadius: "14px",
                      fontSize: "0.875rem",
                      fontWeight: 700,
                      fontFamily: "var(--font-heading)",
                      cursor: processingId === exemption.id ? "not-allowed" : "pointer",
                      opacity: processingId === exemption.id ? 0.5 : 1,
                    }}
                  >
                    <XCircle size={16} />
                    거절
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </main>
  );
}
