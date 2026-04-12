"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck,
  CalendarPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Send,
  Bell,
  ChevronLeft,
  Dumbbell,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Exemption } from "@/types/database";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

export default function ExemptionsPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [exemptions, setExemptions] = useState<Exemption[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  // Form state
  const [dates, setDates] = useState("");
  const [reason, setReason] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data: exemptionList } = (await supabase
        .from("exemptions")
        .select("*")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })) as unknown as {
        data: Exemption[] | null;
      };

      if (exemptionList) {
        setExemptions(exemptionList);

        // Count unread notifications (processed but not notified)
        const unread = exemptionList.filter(
          (e) => !e.notified && e.status !== "pending"
        ).length;
        setUnreadCount(unread);

        // Mark as notified
        if (unread > 0) {
          const unreadIds = exemptionList
            .filter((e) => !e.notified && e.status !== "pending")
            .map((e) => e.id);

          await supabase
            .from("exemptions")
            .update({ notified: true } as never)
            .in("id", unreadIds);
        }
      }
    } catch (err) {
      console.error("Exemptions load error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!dates.trim() || !reason.trim()) return;

    setSubmitting(true);
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { error } = await supabase.from("exemptions").insert({
        user_id: authUser.id,
        dates: dates.trim(),
        reason: reason.trim(),
      } as never);

      if (error) throw error;

      setDates("");
      setReason("");
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);

      // Reload
      await loadData();
    } catch (err) {
      console.error("Exemption submit error:", err);
      alert("면제 신청 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  function getStatusBadge(status: Exemption["status"], notified: boolean) {
    switch (status) {
      case "pending":
        return {
          icon: <Clock size={14} />,
          label: "검토중",
          color: "#00B0FF",
          bg: "rgba(0,176,255,0.15)",
        };
      case "approved":
        return {
          icon: <CheckCircle2 size={14} />,
          label: "승인됨",
          color: "#00E676",
          bg: "rgba(0,230,118,0.15)",
          isNew: !notified,
        };
      case "rejected":
        return {
          icon: <XCircle size={14} />,
          label: "거절됨",
          color: "#FF9100",
          bg: "rgba(255,145,0,0.15)",
          isNew: !notified,
        };
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
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={() => router.push("/dashboard")}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#FFFFFF",
              opacity: 0.7,
            }}
          >
            <ChevronLeft size={24} />
          </button>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              fontFamily: "var(--font-heading)",
              color: "#FFFFFF",
            }}
          >
            면제 신청
          </h1>
        </div>
        {unreadCount > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.625rem",
              borderRadius: "2rem",
              background: "rgba(0,176,255,0.15)",
              color: "#00B0FF",
              fontSize: "0.6875rem",
              fontWeight: 700,
            }}
          >
            <Bell size={12} />
            {unreadCount}건 알림
          </div>
        )}
      </header>

      {/* Application Form */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          background: "#1A1A1A",
          borderRadius: "var(--radius)",
          border: "1px solid #222222",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "#00E676",
          }}
        >
          <CalendarPlus size={18} />
          <span style={{ fontSize: "0.875rem", fontWeight: 700, fontFamily: "var(--font-heading)" }}>
            면제 신청하기
          </span>
        </div>

        <form
          data-testid="exemption-form"
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.375rem",
            }}
          >
            <label
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "#666666",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <CalendarPlus size={14} />
              면제 날짜
            </label>
            <input
              data-testid="exemption-dates"
              type="text"
              value={dates}
              onChange={(e) => setDates(e.target.value)}
              placeholder="예: 3/25(월), 3/26(화)"
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "#222222",
                border: "1px solid #333333",
                borderRadius: "12px",
                color: "#FFFFFF",
                fontFamily: "inherit",
                fontSize: "0.875rem",
                outline: "none",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#00E676";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#333333";
              }}
            />
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.375rem",
            }}
          >
            <label
              style={{
                fontSize: "0.8125rem",
                fontWeight: 600,
                color: "#666666",
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <FileText size={14} />
              사유
            </label>
            <textarea
              data-testid="exemption-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="면제 사유를 입력해주세요"
              required
              maxLength={300}
              style={{
                width: "100%",
                minHeight: "5rem",
                padding: "0.75rem",
                background: "#222222",
                border: "1px solid #333333",
                borderRadius: "12px",
                color: "#FFFFFF",
                fontFamily: "inherit",
                fontSize: "0.875rem",
                resize: "vertical",
                outline: "none",
                transition: "border-color 0.2s ease",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "#00E676";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "#333333";
              }}
            />
          </div>

          <motion.button
            data-testid="exemption-submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting || !dates.trim() || !reason.trim()}
            style={{
              padding: "0.875rem",
              fontSize: "0.9375rem",
              fontWeight: 700,
              fontFamily: "var(--font-heading)",
              width: "100%",
              opacity:
                submitting || !dates.trim() || !reason.trim() ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              background: "#00E676",
              color: "#0A0A0A",
              borderRadius: "var(--radius)",
              border: "none",
              cursor: submitting || !dates.trim() || !reason.trim() ? "not-allowed" : "pointer",
              boxShadow: "0 0 30px rgba(0, 230, 118, 0.3)",
            }}
          >
            {submitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1,
                    ease: "linear",
                  }}
                >
                  <Dumbbell size={16} />
                </motion.div>
                신청 중...
              </>
            ) : (
              <>
                <Send size={16} />
                면제 신청
              </>
            )}
          </motion.button>
        </form>

        {/* Success Message */}
        <AnimatePresence>
          {showSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                padding: "0.75rem 1rem",
                borderRadius: "12px",
                background: "rgba(0,230,118,0.15)",
                color: "#00E676",
                fontSize: "0.8125rem",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <CheckCircle2 size={16} />
              면제 신청이 완료되었습니다
            </motion.div>
          )}
        </AnimatePresence>
      </motion.section>

      {/* Application History */}
      <section
        data-testid="exemption-history"
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <ShieldCheck size={18} style={{ color: "#00B0FF" }} />
          <h3
            style={{
              fontSize: "1rem",
              fontWeight: 700,
              fontFamily: "var(--font-heading)",
              color: "#FFFFFF",
            }}
          >
            신청 이력
          </h3>
        </div>

        {exemptions.length === 0 ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#666666",
              fontSize: "0.875rem",
              background: "#1A1A1A",
              borderRadius: "var(--radius)",
              border: "1px solid #222222",
            }}
          >
            면제 신청 이력이 없습니다
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.625rem",
            }}
          >
            {exemptions.map((exemption, i) => {
              const badge = getStatusBadge(
                exemption.status,
                exemption.notified
              );

              return (
                <motion.div
                  key={exemption.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    padding: "1rem 1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.625rem",
                    borderLeft: `3px solid ${badge.color}`,
                    position: "relative",
                    background: "#1A1A1A",
                    borderRadius: "0 var(--radius) var(--radius) 0",
                    border: "1px solid #222222",
                    borderLeftColor: badge.color,
                    borderLeftWidth: "3px",
                  }}
                >
                  {/* New badge */}
                  {"isNew" in badge && badge.isNew && (
                    <div
                      style={{
                        position: "absolute",
                        top: "0.625rem",
                        right: "0.625rem",
                        width: "0.5rem",
                        height: "0.5rem",
                        borderRadius: "50%",
                        background: "#00E676",
                        boxShadow: "0 0 8px rgba(0,230,118,0.5)",
                      }}
                    />
                  )}

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0.25rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.9375rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-heading)",
                          color: "#FFFFFF",
                        }}
                      >
                        {exemption.dates}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "#444444",
                        }}
                      >
                        {format(
                          parseISO(exemption.created_at),
                          "yyyy.MM.dd HH:mm",
                          { locale: ko }
                        )}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        padding: "0.25rem 0.625rem",
                        borderRadius: "2rem",
                        background: badge.bg,
                        color: badge.color,
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                      }}
                    >
                      {badge.icon}
                      {badge.label}
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: "0.8125rem",
                      color: "#666666",
                      lineHeight: 1.5,
                    }}
                  >
                    {exemption.reason}
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
