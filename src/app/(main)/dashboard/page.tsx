"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Dumbbell,
  Flame,
  Trophy,
  Banknote,
  ChevronRight,
  Megaphone,
  CalendarCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User, Week, CheckIn, Notice } from "@/types/database";

type CheckStatus = "O" | "△" | "X" | "☆" | null;

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

function getStatusDisplay(status: CheckStatus) {
  switch (status) {
    case "O":
      return { label: "O", color: "#22c55e", bg: "rgba(34,197,94,0.15)" };
    case "△":
      return { label: "△", color: "#eab308", bg: "rgba(234,179,8,0.15)" };
    case "X":
      return { label: "X", color: "#ef4444", bg: "rgba(239,68,68,0.15)" };
    case "☆":
      return { label: "☆", color: "#a855f7", bg: "rgba(168,85,247,0.15)" };
    default:
      return { label: "", color: "#64748b", bg: "rgba(100,116,139,0.1)" };
  }
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [streak, setStreak] = useState(0);
  const [rank, setRank] = useState<number | null>(null);

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

        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (userData) setUser(userData);

        const { data: noticeData } = await supabase
          .from("notices")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (noticeData) setNotice(noticeData);

        const { data: weekData } = (await supabase
          .from("weeks")
          .select("*")
          .eq("is_current" as string, true)
          .maybeSingle()) as unknown as { data: Week | null };

        if (weekData) {
          setCurrentWeek(weekData);

          const { data: weekCheckIns } = await supabase
            .from("check_ins")
            .select("*")
            .eq("user_id", authUser.id)
            .eq("week_id", weekData.id)
            .order("day_of_week", { ascending: true });

          if (weekCheckIns) setCheckIns(weekCheckIns);

          // Calculate streak: count consecutive approved check-ins backwards
          const { data: allCheckIns } = (await supabase
            .from("check_ins")
            .select("*")
            .eq("user_id", authUser.id)
            .eq("status" as string, "O")
            .order("created_at", { ascending: false })
            .limit(100)) as unknown as { data: CheckIn[] | null };

          if (allCheckIns) {
            let s = 0;
            for (const ci of allCheckIns) {
              if (ci.status === "O") s++;
              else break;
            }
            setStreak(s);
          }

          // Calculate rank for current week
          const { data: allWeekCheckIns } = (await supabase
            .from("check_ins")
            .select("user_id, status")
            .eq("week_id", weekData.id)
            .eq("status" as string, "O")) as unknown as { data: Pick<CheckIn, "user_id" | "status">[] | null };

          if (allWeekCheckIns) {
            const countMap: Record<string, number> = {};
            for (const ci of allWeekCheckIns) {
              countMap[ci.user_id] = (countMap[ci.user_id] || 0) + 1;
            }
            const sorted = Object.entries(countMap).sort(
              ([, a], [, b]) => b - a
            );
            const myIdx = sorted.findIndex(([uid]) => uid === authUser.id);
            setRank(myIdx >= 0 ? myIdx + 1 : null);
          }
        }
      } catch (err) {
        console.error("Dashboard load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, supabase]);

  const approvedCount = checkIns.filter((c) => c.status === "O").length;
  const exemptCount = checkIns.filter((c) => c.status === "☆").length;
  const effectiveCount = approvedCount + exemptCount;
  const fine = effectiveCount < 3 ? (3 - effectiveCount) * 2000 : 0;

  const dayStatusMap: Record<number, CheckStatus> = {};
  for (const ci of checkIns) {
    dayStatusMap[ci.day_of_week] = ci.status;
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
      {/* Welcome Header */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h2
            style={{ fontSize: "0.875rem", opacity: 0.6, fontWeight: 400 }}
          >
            안녕하세요,
          </h2>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>
            {user?.nickname ?? "회원"}님
          </h1>
        </div>
        {user?.profile_image_url ? (
          <img
            src={user.profile_image_url}
            alt="프로필"
            style={{
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid var(--glass-border)",
            }}
          />
        ) : (
          <div
            className="glass"
            style={{
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.25rem",
              fontWeight: 700,
              color: "var(--primary)",
            }}
          >
            {user?.nickname?.charAt(0) ?? "?"}
          </div>
        )}
      </header>

      {/* Notice Banner */}
      {notice && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass"
          style={{
            padding: "0.875rem 1rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
          }}
        >
          <Megaphone
            size={18}
            style={{
              color: "var(--warning)",
              flexShrink: 0,
              marginTop: "0.125rem",
            }}
          />
          <p
            style={{
              fontSize: "0.8125rem",
              lineHeight: 1.5,
              opacity: 0.85,
            }}
          >
            {notice.content}
          </p>
        </motion.div>
      )}

      {/* Stats Cards */}
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "0.75rem",
        }}
      >
        {[
          {
            icon: <CalendarCheck size={18} />,
            label: "금주 운동횟수",
            value: `${approvedCount}회`,
            color: "var(--primary)",
          },
          {
            icon: <Banknote size={18} />,
            label: "예상 벌금",
            value: fine > 0 ? `${fine.toLocaleString()}원` : "없음",
            color: fine > 0 ? "var(--error)" : "var(--success)",
          },
          {
            icon: <Flame size={18} />,
            label: "현재 스트릭",
            value: `${streak}일`,
            color: "var(--warning)",
          },
          {
            icon: <Trophy size={18} />,
            label: "내 랭킹",
            value: rank ? `${rank}위` : "-",
            color: "var(--accent)",
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="card"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              padding: "1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: stat.color,
              }}
            >
              {stat.icon}
              <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>
                {stat.label}
              </span>
            </div>
            <span style={{ fontSize: "1.375rem", fontWeight: 700 }}>
              {stat.value}
            </span>
          </motion.div>
        ))}
      </section>

      {/* Weekly Calendar Grid */}
      <section
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        <h3 style={{ fontSize: "1rem", fontWeight: 600 }}>
          {currentWeek?.title ?? "이번 주"} 출석 현황
        </h3>
        <div
          className="card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "1rem",
          }}
        >
          {DAY_LABELS.map((dayLabel, i) => {
            const dayNum = i + 1;
            const status = dayStatusMap[dayNum] ?? null;
            const display = getStatusDisplay(status);

            return (
              <motion.div
                key={i}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "0.375rem",
                }}
              >
                <span
                  style={{
                    fontSize: "0.6875rem",
                    opacity: 0.5,
                    fontWeight: 600,
                  }}
                >
                  {dayLabel}
                </span>
                <div
                  style={{
                    width: "2.25rem",
                    height: "2.25rem",
                    borderRadius: "0.625rem",
                    background: display.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.9375rem",
                    fontWeight: 700,
                    color: display.color,
                  }}
                >
                  {display.label}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Quick Action */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="btn-primary"
        onClick={() => router.push("/workout")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "1rem",
          fontSize: "1rem",
          width: "100%",
        }}
      >
        <Dumbbell size={20} />
        운동 인증하기
        <ChevronRight size={18} />
      </motion.button>
    </main>
  );
}
