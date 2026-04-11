"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Banknote,
  CalendarCheck,
  TrendingDown,
  CheckCircle2,
  XCircle,
  Dumbbell,
  ChevronLeft,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Fine, Week, CheckIn } from "@/types/database";

interface FineWithWeek extends Fine {
  weeks?: { title: string } | null;
}

export default function FinesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentWeekFine, setCurrentWeekFine] = useState<{
    workoutCount: number;
    fineAmount: number;
  }>({ workoutCount: 0, fineAmount: 0 });
  const [lastWeekFine, setLastWeekFine] = useState<FineWithWeek | null>(null);
  const [fineHistory, setFineHistory] = useState<FineWithWeek[]>([]);
  const [totalFines, setTotalFines] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (!authUser) {
          router.push("/login");
          return;
        }

        // Get current week
        const { data: currentWeek } = (await supabase
          .from("weeks")
          .select("*")
          .eq("is_current" as string, true)
          .single()) as unknown as { data: Week | null };

        if (currentWeek) {
          // Current week check-ins
          const { data: checkIns } = (await supabase
            .from("check_ins")
            .select("*")
            .eq("user_id", authUser.id)
            .eq("week_id", currentWeek.id)) as unknown as {
            data: CheckIn[] | null;
          };

          const approvedCount =
            checkIns?.filter(
              (ci) => ci.status === "O" || ci.status === "☆"
            ).length ?? 0;
          const fine = approvedCount < 3 ? (3 - approvedCount) * 2000 : 0;
          setCurrentWeekFine({
            workoutCount: approvedCount,
            fineAmount: fine,
          });
        }

        // Get fine history with week titles
        const { data: fines } = (await supabase
          .from("fines")
          .select("*, weeks(title)")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(12)) as unknown as { data: FineWithWeek[] | null };

        if (fines) {
          setFineHistory(fines);

          // Last week fine (most recent)
          if (fines.length > 0) {
            setLastWeekFine(fines[0]);
          }

          // Totals
          let total = 0;
          let paid = 0;
          for (const f of fines) {
            total += f.fine_amount;
            if (f.is_paid) paid += f.fine_amount;
          }
          setTotalFines(total);
          setTotalPaid(paid);
        }
      } catch (err) {
        console.error("Fines load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, supabase]);

  const maxFine = Math.max(
    ...fineHistory.map((f) => f.fine_amount),
    1
  );

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
        style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}
      >
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
        <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>벌금 현황</h1>
      </header>

      {/* Current Week Status */}
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
          <CalendarCheck size={18} />
          <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
            금주 운동 현황
          </span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <span
              style={{ fontSize: "0.75rem", opacity: 0.5, display: "block" }}
            >
              인정 횟수
            </span>
            <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>
              {currentWeekFine.workoutCount}회
            </span>
          </div>
          <div style={{ textAlign: "right" }}>
            <span
              style={{ fontSize: "0.75rem", opacity: 0.5, display: "block" }}
            >
              예상 벌금
            </span>
            <span
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color:
                  currentWeekFine.fineAmount > 0
                    ? "var(--error)"
                    : "var(--success)",
              }}
            >
              {currentWeekFine.fineAmount > 0
                ? `${currentWeekFine.fineAmount.toLocaleString()}원`
                : "없음"}
            </span>
          </div>
        </div>
        {/* Progress bar */}
        <div
          style={{
            height: "0.375rem",
            borderRadius: "1rem",
            background: "rgba(255,255,255,0.05)",
            overflow: "hidden",
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{
              width: `${Math.min((currentWeekFine.workoutCount / 3) * 100, 100)}%`,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            style={{
              height: "100%",
              borderRadius: "1rem",
              background:
                currentWeekFine.workoutCount >= 3
                  ? "var(--success)"
                  : "var(--warning)",
            }}
          />
        </div>
        <span style={{ fontSize: "0.6875rem", opacity: 0.4 }}>
          주 3회 이상 운동 시 벌금 면제
        </span>
      </motion.section>

      {/* Last Week Fine */}
      {lastWeekFine && (
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
          style={{
            padding: "1.25rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--accent)",
            }}
          >
            <Banknote size={18} />
            <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
              지난주 벌금
            </span>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <span
                style={{
                  fontSize: "0.75rem",
                  opacity: 0.5,
                  display: "block",
                }}
              >
                {(lastWeekFine.weeks as { title: string } | null)?.title ?? "지난주"}
              </span>
              <span style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                {lastWeekFine.fine_amount > 0
                  ? `${lastWeekFine.fine_amount.toLocaleString()}원`
                  : "벌금 없음"}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.375rem 0.75rem",
                borderRadius: "2rem",
                background: lastWeekFine.is_paid
                  ? "rgba(34,197,94,0.15)"
                  : "rgba(239,68,68,0.15)",
                color: lastWeekFine.is_paid ? "#22c55e" : "#ef4444",
                fontSize: "0.75rem",
                fontWeight: 600,
              }}
            >
              {lastWeekFine.is_paid ? (
                <>
                  <CheckCircle2 size={14} />
                  납부 완료
                </>
              ) : lastWeekFine.fine_amount > 0 ? (
                <>
                  <XCircle size={14} />
                  미납
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} />
                  해당 없음
                </>
              )}
            </div>
          </div>
        </motion.section>
      )}

      {/* Cumulative Stats */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: "0.75rem",
        }}
      >
        {[
          {
            label: "누적 벌금",
            value: `${totalFines.toLocaleString()}원`,
            color: "var(--error)",
          },
          {
            label: "납부 완료",
            value: `${totalPaid.toLocaleString()}원`,
            color: "var(--success)",
          },
          {
            label: "미납 잔액",
            value: `${(totalFines - totalPaid).toLocaleString()}원`,
            color: "var(--warning)",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="card"
            style={{
              padding: "0.875rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.375rem",
              textAlign: "center",
            }}
          >
            <span
              style={{ fontSize: "0.6875rem", opacity: 0.5, fontWeight: 500 }}
            >
              {stat.label}
            </span>
            <span
              style={{
                fontSize: "1rem",
                fontWeight: 700,
                color: stat.color,
              }}
            >
              {stat.value}
            </span>
          </div>
        ))}
      </motion.section>

      {/* Fine Trend Chart */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <TrendingDown size={18} style={{ color: "var(--primary)" }} />
          <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
            최근 벌금 이력
          </h3>
        </div>

        {fineHistory.length === 0 ? (
          <div
            className="card"
            style={{
              padding: "2rem",
              textAlign: "center",
              opacity: 0.5,
              fontSize: "0.875rem",
            }}
          >
            벌금 이력이 없습니다
          </div>
        ) : (
          <div
            className="card"
            style={{
              padding: "1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
            }}
          >
            {/* Bar Chart */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: "0.375rem",
                height: "8rem",
              }}
            >
              {[...fineHistory].reverse().map((fine, i) => {
                const height =
                  fine.fine_amount > 0
                    ? Math.max((fine.fine_amount / maxFine) * 100, 8)
                    : 4;
                const barColor =
                  fine.fine_amount === 0
                    ? "var(--success)"
                    : fine.is_paid
                      ? "var(--primary)"
                      : "var(--error)";

                return (
                  <motion.div
                    key={fine.id}
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: i * 0.05, duration: 0.5 }}
                    style={{
                      flex: 1,
                      borderRadius: "0.25rem 0.25rem 0 0",
                      background: barColor,
                      minWidth: 0,
                      position: "relative",
                    }}
                    title={`${(fine.weeks as { title: string } | null)?.title ?? ""}: ${fine.fine_amount.toLocaleString()}원`}
                  />
                );
              })}
            </div>

            {/* Legend */}
            <div
              style={{
                display: "flex",
                gap: "1rem",
                justifyContent: "center",
                flexWrap: "wrap",
              }}
            >
              {[
                { label: "벌금 없음", color: "var(--success)" },
                { label: "납부 완료", color: "var(--primary)" },
                { label: "미납", color: "var(--error)" },
              ].map((item, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    fontSize: "0.6875rem",
                    opacity: 0.6,
                  }}
                >
                  <div
                    style={{
                      width: "0.5rem",
                      height: "0.5rem",
                      borderRadius: "50%",
                      background: item.color,
                    }}
                  />
                  {item.label}
                </div>
              ))}
            </div>

            {/* History List */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.5rem",
                marginTop: "0.5rem",
              }}
            >
              {fineHistory.map((fine) => (
                <div
                  key={fine.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.625rem 0",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    fontSize: "0.8125rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span style={{ opacity: 0.5 }}>
                      {(fine.weeks as { title: string } | null)?.title ?? "-"}
                    </span>
                    <span style={{ opacity: 0.4, fontSize: "0.6875rem" }}>
                      {fine.workout_count}회 운동
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color:
                          fine.fine_amount > 0
                            ? "var(--error)"
                            : "var(--success)",
                      }}
                    >
                      {fine.fine_amount > 0
                        ? `${fine.fine_amount.toLocaleString()}원`
                        : "면제"}
                    </span>
                    {fine.fine_amount > 0 && (
                      <span
                        style={{
                          fontSize: "0.625rem",
                          padding: "0.125rem 0.375rem",
                          borderRadius: "0.25rem",
                          background: fine.is_paid
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(239,68,68,0.15)",
                          color: fine.is_paid ? "#22c55e" : "#ef4444",
                          fontWeight: 600,
                        }}
                      >
                        {fine.is_paid ? "납부" : "미납"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.section>
    </main>
  );
}
