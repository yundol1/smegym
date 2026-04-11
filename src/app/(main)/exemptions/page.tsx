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

          await (supabase
            .from("exemptions") as any)
            .update({ notified: true })
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
      } as any);

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
          color: "#eab308",
          bg: "rgba(234,179,8,0.15)",
        };
      case "approved":
        return {
          icon: <CheckCircle2 size={14} />,
          label: "승인됨",
          color: "#22c55e",
          bg: "rgba(34,197,94,0.15)",
          isNew: !notified,
        };
      case "rejected":
        return {
          icon: <XCircle size={14} />,
          label: "거절됨",
          color: "#ef4444",
          bg: "rgba(239,68,68,0.15)",
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
          <Dumbbell size={32} style={{ color: "var(--primary)" }} />
        </motion.div>
        <p style={{ marginTop: "1rem", opacity: 0.6 }}>로딩 중...</p>
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
              color: "var(--foreground)",
              opacity: 0.7,
            }}
          >
            <ChevronLeft size={24} />
          </button>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>면제 신청</h1>
        </div>
        {unreadCount > 0 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.375rem",
              padding: "0.25rem 0.625rem",
              borderRadius: "2rem",
              background: "rgba(56,189,248,0.15)",
              color: "var(--primary)",
              fontSize: "0.6875rem",
              fontWeight: 600,
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
        className="card"
        style={{
          padding: "1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--primary)",
          }}
        >
          <CalendarPlus size={18} />
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            면제 신청하기
          </span>
        </div>

        <form
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
                fontWeight: 500,
                opacity: 0.7,
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <CalendarPlus size={14} />
              면제 날짜
            </label>
            <input
              type="text"
              value={dates}
              onChange={(e) => setDates(e.target.value)}
              placeholder="예: 3/25(월), 3/26(화)"
              required
              style={{
                width: "100%",
                padding: "0.75rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--glass-border)",
                borderRadius: "0.75rem",
                color: "var(--foreground)",
                fontFamily: "inherit",
                fontSize: "0.875rem",
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
                fontWeight: 500,
                opacity: 0.7,
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              <FileText size={14} />
              사유
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="면제 사유를 입력해주세요"
              required
              maxLength={300}
              style={{
                width: "100%",
                minHeight: "5rem",
                padding: "0.75rem",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--glass-border)",
                borderRadius: "0.75rem",
                color: "var(--foreground)",
                fontFamily: "inherit",
                fontSize: "0.875rem",
                resize: "vertical",
              }}
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={submitting || !dates.trim() || !reason.trim()}
            className="btn-primary"
            style={{
              padding: "0.875rem",
              fontSize: "0.9375rem",
              width: "100%",
              opacity:
                submitting || !dates.trim() || !reason.trim() ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
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
                borderRadius: "0.75rem",
                background: "rgba(34,197,94,0.15)",
                color: "#22c55e",
                fontSize: "0.8125rem",
                fontWeight: 500,
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
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <ShieldCheck size={18} style={{ color: "var(--accent)" }} />
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>신청 이력</h3>
        </div>

        {exemptions.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "2rem",
              textAlign: "center",
              opacity: 0.5,
              fontSize: "0.875rem",
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
                  className="card"
                  style={{
                    padding: "1rem 1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.625rem",
                    borderLeft: `3px solid ${badge.color}`,
                    position: "relative",
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
                        background: "var(--primary)",
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
                          fontWeight: 600,
                        }}
                      >
                        {exemption.dates}
                      </span>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          opacity: 0.4,
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
                        fontWeight: 600,
                      }}
                    >
                      {badge.icon}
                      {badge.label}
                    </div>
                  </div>

                  <p
                    style={{
                      fontSize: "0.8125rem",
                      opacity: 0.65,
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
