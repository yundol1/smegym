"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Banknote,
  CheckCircle2,
  Dumbbell,
  Inbox,
  Calendar,
  User,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface UnpaidFine {
  id: string;
  userId: string;
  nickname: string;
  weekId: string;
  weekTitle: string;
  workoutCount: number;
  fineAmount: number;
  isPaid: boolean;
  createdAt: string;
}

export default function FineManagePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [fines, setFines] = useState<UnpaidFine[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchFines();
  }, []);

  async function fetchFines() {
    try {
      const res = await fetch("/api/admin/fines");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setFines(data.fines || []);
    } catch (err) {
      console.error("Fine fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmPaid(fineId: string) {
    if (!user) return;
    setProcessingId(fineId);

    try {
      const res = await fetch("/api/admin/fines", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fineId,
          adminId: user.id,
        }),
      });

      if (!res.ok) throw new Error("patch failed");

      // Remove from list
      setFines((prev) => prev.filter((f) => f.id !== fineId));
    } catch (err) {
      console.error("Fine confirm error:", err);
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
        <Banknote size={24} style={{ color: "#00E676" }} />
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            fontFamily: "var(--font-heading)",
            color: "#FFFFFF",
          }}
        >
          벌금 관리
        </h1>
        {fines.length > 0 && (
          <span
            style={{
              marginLeft: "auto",
              padding: "0.25rem 0.75rem",
              borderRadius: "2rem",
              background: "rgba(255,82,82,0.15)",
              color: "#FF5252",
              fontSize: "0.75rem",
              fontWeight: 700,
            }}
          >
            {fines.length}건 미납
          </span>
        )}
      </header>

      {/* Summary */}
      {fines.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "1rem 1.25rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#1A1A1A",
            borderRadius: "20px",
            border: "1px solid #222222",
          }}
        >
          <div>
            <span style={{ fontSize: "0.75rem", color: "#666666", display: "block" }}>
              총 미납 금액
            </span>
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: 900,
                fontFamily: "var(--font-heading)",
                color: "#FF5252",
              }}
            >
              {fines
                .reduce((sum, f) => sum + f.fineAmount, 0)
                .toLocaleString()}
              원
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "0.75rem", color: "#666666", display: "block" }}>
              미납 인원
            </span>
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: 900,
                fontFamily: "var(--font-heading)",
                color: "#FFFFFF",
              }}
            >
              {new Set(fines.map((f) => f.userId)).size}명
            </span>
          </div>
        </motion.div>
      )}

      {/* Fine List */}
      {fines.length === 0 ? (
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
            미납 벌금이 없습니다
          </p>
        </motion.div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {fines.map((fine, i) => (
              <motion.div
                key={fine.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -100, transition: { duration: 0.3 } }}
                transition={{ delay: i * 0.05 }}
                style={{
                  padding: "1.25rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.875rem",
                  background: "#1A1A1A",
                  borderRadius: "20px",
                  border: "1px solid #222222",
                }}
              >
                {/* Top row: nickname + week */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
                    <div
                      style={{
                        width: "2.25rem",
                        height: "2.25rem",
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #FF5252, #FF9100)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#FFFFFF",
                        fontWeight: 800,
                        fontSize: "0.875rem",
                        fontFamily: "var(--font-heading)",
                      }}
                    >
                      {fine.nickname.charAt(0)}
                    </div>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span
                        style={{
                          fontSize: "0.9375rem",
                          fontWeight: 700,
                          color: "#FFFFFF",
                          fontFamily: "var(--font-heading)",
                        }}
                      >
                        {fine.nickname}
                      </span>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          color: "#444444",
                          fontSize: "0.6875rem",
                        }}
                      >
                        <Calendar size={10} />
                        {fine.weekTitle}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 900,
                        fontFamily: "var(--font-heading)",
                        color: "#FF5252",
                      }}
                    >
                      {fine.fineAmount.toLocaleString()}원
                    </span>
                  </div>
                </div>

                {/* Info row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    padding: "0.5rem 0.875rem",
                    background: "#222222",
                    borderRadius: "12px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      fontSize: "0.8125rem",
                      color: "#666666",
                    }}
                  >
                    <Dumbbell size={14} style={{ color: "#00B0FF" }} />
                    <span>운동 {fine.workoutCount}회</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      fontSize: "0.8125rem",
                      color: "#666666",
                    }}
                  >
                    <User size={14} style={{ color: "#00B0FF" }} />
                    <span>부족 {3 - fine.workoutCount}회</span>
                  </div>
                </div>

                {/* Confirm button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleConfirmPaid(fine.id)}
                  disabled={processingId === fine.id}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.5rem",
                    background: "#00E676",
                    color: "#0A0A0A",
                    border: "none",
                    borderRadius: "14px",
                    fontSize: "0.875rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-heading)",
                    cursor: processingId === fine.id ? "not-allowed" : "pointer",
                    opacity: processingId === fine.id ? 0.5 : 1,
                    boxShadow: "0 0 20px rgba(0,230,118,0.2)",
                  }}
                >
                  {processingId === fine.id ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      >
                        <Dumbbell size={16} />
                      </motion.div>
                      처리 중...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      납부 확인
                    </>
                  )}
                </motion.button>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </main>
  );
}
