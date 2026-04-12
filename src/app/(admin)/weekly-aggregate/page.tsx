"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CalendarCheck,
  AlertTriangle,
  CheckCircle,
  Users,
  Banknote,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { Week } from "@/types/database";

const C = {
  bg: "#0A0A0A",
  surface: "#1A1A1A",
  primary: "#00E676",
  secondary: "#00B0FF",
  text: "#FFFFFF",
  textSub: "#666666",
  radius: "20px",
} as const;

interface AggregationSummary {
  usersProcessed: number;
  totalFines: number;
  newWeekTitle: string;
}

export default function WeeklyAggregatePage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [lastAggregatedWeek, setLastAggregatedWeek] = useState<
    (Week & { admin_nickname?: string }) | null
  >(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [summary, setSummary] = useState<AggregationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchWeekData = useCallback(async () => {
    setIsFetching(true);

    // Current week
    const { data: current } = await supabase
      .from("weeks")
      .select("*")
      .eq("is_current", true)
      .single();

    setCurrentWeek(current);

    // Last aggregated week
    const { data: lastWeeks } = await supabase
      .from("weeks")
      .select("*")
      .not("aggregated_at", "is", null)
      .order("aggregated_at", { ascending: false })
      .limit(1);

    if (lastWeeks && lastWeeks.length > 0) {
      const week = lastWeeks[0] as Week;
      let adminNickname: string | undefined;
      if (week.aggregated_by) {
        const { data: adminUser } = await supabase
          .from("users")
          .select("nickname")
          .eq("id", week.aggregated_by)
          .single() as { data: { nickname: string } | null };
        adminNickname = adminUser?.nickname ?? undefined;
      }
      setLastAggregatedWeek({ ...week, admin_nickname: adminNickname });
    }

    setIsFetching(false);
  }, [supabase]);

  useEffect(() => {
    fetchWeekData();
  }, [fetchWeekData]);

  const handleAggregate = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    setSummary(null);

    try {
      const res = await fetch("/api/admin/aggregate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ admin_id: user.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "집계 실패");
      } else {
        setSummary(data);
        await fetchWeekData();
      }
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setIsLoading(false);
      setShowConfirm(false);
    }
  };

  return (
    <div style={{ padding: "24px", maxWidth: 640, margin: "0 auto" }}>
      <motion.h1
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          color: C.text,
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <CalendarCheck size={28} color={C.primary} />
        주간 집계
      </motion.h1>

      {isFetching ? (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: 40,
          }}
        >
          <Loader2
            size={32}
            color={C.primary}
            style={{ animation: "spin 1s linear infinite" }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      ) : (
        <>
          {/* Last aggregation info */}
          {lastAggregatedWeek && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              style={{
                background: C.surface,
                borderRadius: C.radius,
                padding: 20,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  color: C.textSub,
                  fontSize: 13,
                  marginBottom: 8,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                마지막 집계
              </div>
              <div style={{ color: C.text, fontSize: 16, marginBottom: 4 }}>
                {lastAggregatedWeek.title}
              </div>
              <div style={{ color: C.textSub, fontSize: 14 }}>
                {lastAggregatedWeek.aggregated_at &&
                  format(
                    new Date(lastAggregatedWeek.aggregated_at),
                    "yyyy.MM.dd (EEE) HH:mm",
                    { locale: ko }
                  )}
                {lastAggregatedWeek.admin_nickname &&
                  ` | ${lastAggregatedWeek.admin_nickname}`}
              </div>
            </motion.div>
          )}

          {/* Current week info */}
          {currentWeek && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                background: C.surface,
                borderRadius: C.radius,
                padding: 20,
                marginBottom: 24,
                border: `1px solid ${C.primary}33`,
              }}
            >
              <div
                style={{
                  color: C.primary,
                  fontSize: 13,
                  marginBottom: 8,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                현재 주차
              </div>
              <div
                style={{
                  color: C.text,
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {currentWeek.title}
              </div>
              <div style={{ color: C.textSub, fontSize: 14, marginTop: 4 }}>
                {currentWeek.start_date} ~ {currentWeek.end_date}
              </div>
            </motion.div>
          )}

          {/* Aggregation button */}
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowConfirm(true)}
            disabled={isLoading || !currentWeek}
            style={{
              width: "100%",
              padding: "18px 24px",
              background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
              color: "#000",
              border: "none",
              borderRadius: C.radius,
              fontSize: 18,
              fontWeight: 700,
              cursor: isLoading || !currentWeek ? "not-allowed" : "pointer",
              opacity: isLoading || !currentWeek ? 0.5 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 16,
            }}
          >
            {isLoading ? (
              <>
                <Loader2
                  size={22}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                집계 중...
              </>
            ) : (
              <>
                <CalendarCheck size={22} />
                주간 집계 실행
              </>
            )}
          </motion.button>

          <div
            style={{
              color: C.textSub,
              fontSize: 13,
              textAlign: "center",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <AlertTriangle size={14} />
            이 작업은 되돌릴 수 없습니다
          </div>

          {/* Confirmation dialog */}
          <AnimatePresence>
            {showConfirm && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(0,0,0,0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 1000,
                  padding: 24,
                }}
                onClick={() => !isLoading && setShowConfirm(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: C.surface,
                    borderRadius: C.radius,
                    padding: 28,
                    maxWidth: 400,
                    width: "100%",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 16,
                    }}
                  >
                    <AlertTriangle size={24} color="#FF9800" />
                    <h2
                      style={{
                        color: C.text,
                        fontSize: 18,
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      집계를 실행하시겠습니까?
                    </h2>
                  </div>
                  <p
                    style={{
                      color: C.textSub,
                      fontSize: 14,
                      lineHeight: 1.6,
                      marginBottom: 24,
                    }}
                  >
                    현재 주차({currentWeek?.title})의 출석을 집계하고 벌금을
                    산정합니다. 새로운 주차가 생성되며 이 작업은 되돌릴 수
                    없습니다.
                  </p>
                  <div style={{ display: "flex", gap: 12 }}>
                    <button
                      onClick={() => setShowConfirm(false)}
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        background: "transparent",
                        color: C.textSub,
                        border: `1px solid ${C.textSub}44`,
                        borderRadius: "12px",
                        fontSize: 15,
                        fontWeight: 600,
                        cursor: "pointer",
                      }}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAggregate}
                      disabled={isLoading}
                      style={{
                        flex: 1,
                        padding: "12px 16px",
                        background: C.primary,
                        color: "#000",
                        border: "none",
                        borderRadius: "12px",
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: isLoading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                      }}
                    >
                      {isLoading ? (
                        <Loader2
                          size={18}
                          style={{ animation: "spin 1s linear infinite" }}
                        />
                      ) : (
                        "실행"
                      )}
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  marginTop: 20,
                  padding: 16,
                  background: "#FF525220",
                  border: "1px solid #FF525244",
                  borderRadius: "12px",
                  color: "#FF5252",
                  fontSize: 14,
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary */}
          <AnimatePresence>
            {summary && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                style={{
                  marginTop: 24,
                  background: C.surface,
                  borderRadius: C.radius,
                  padding: 24,
                  border: `1px solid ${C.primary}44`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 20,
                    color: C.primary,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  <CheckCircle size={22} />
                  집계 완료
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      background: `${C.bg}`,
                      borderRadius: "12px",
                      padding: 16,
                      textAlign: "center",
                    }}
                  >
                    <Users
                      size={20}
                      color={C.secondary}
                      style={{ marginBottom: 6 }}
                    />
                    <div
                      style={{
                        color: C.text,
                        fontSize: 22,
                        fontWeight: 700,
                      }}
                    >
                      {summary.usersProcessed}
                    </div>
                    <div style={{ color: C.textSub, fontSize: 12 }}>
                      처리된 사용자
                    </div>
                  </div>
                  <div
                    style={{
                      background: `${C.bg}`,
                      borderRadius: "12px",
                      padding: 16,
                      textAlign: "center",
                    }}
                  >
                    <Banknote
                      size={20}
                      color="#FF9800"
                      style={{ marginBottom: 6 }}
                    />
                    <div
                      style={{
                        color: C.text,
                        fontSize: 22,
                        fontWeight: 700,
                      }}
                    >
                      {summary.totalFines.toLocaleString()}
                    </div>
                    <div style={{ color: C.textSub, fontSize: 12 }}>
                      총 벌금 (원)
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 16,
                    padding: 14,
                    background: `${C.primary}11`,
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    color: C.primary,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <ArrowRight size={16} />
                  새 주차: {summary.newWeekTitle}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
