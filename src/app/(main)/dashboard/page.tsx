"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Dumbbell,
  Flame,
  Trophy,
  Banknote,
  Megaphone,
  User as UserIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User, Week, CheckIn, Notice } from "@/types/database";
import { parseISO, addDays, format, differenceInCalendarDays } from "date-fns";

type CheckStatus = "O" | "△" | "X" | "☆" | null;

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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

        // 병렬로 독립적인 쿼리 실행 (waterfall → parallel)
        const [userRes, noticeRes, weekRes, rankRes] = await Promise.all([
          supabase.from("users").select("id, nickname, role, profile_image_url, joined_at, last_login_at, menu_order").eq("id", authUser.id).single() as unknown as Promise<{ data: User | null }>,
          supabase.from("notices").select("id, content, created_at").order("created_at", { ascending: false }).limit(1).maybeSingle() as unknown as Promise<{ data: Notice | null }>,
          supabase.from("weeks").select("id, title, start_date, end_date, is_current").eq("is_current" as string, true).maybeSingle() as unknown as Promise<{ data: Week | null }>,
          fetch("/api/ranking").then(r => r.ok ? r.json() : null).catch(() => null) as Promise<unknown>,
        ]);

        if (userRes.data) setUser(userRes.data);
        if (noticeRes.data) setNotice(noticeRes.data);

        // 랭킹 데이터 처리
        if (rankRes) {
          const rankObj = rankRes as Record<string, unknown>;
          const rankings = (rankObj.rankings ?? rankObj) as Array<{ userId: string; rank: number }>;
          const myEntry = Array.isArray(rankings)
            ? rankings.find((r) => r.userId === authUser.id)
            : null;
          setRank(myEntry ? myEntry.rank : null);
        }

        const weekData = weekRes.data;
        if (weekData) {
          setCurrentWeek(weekData);

          // 체크인 데이터 + 스트릭 계산용 데이터 병렬 fetch
          const [weekCheckInsRes, allCheckInsRes] = await Promise.all([
            supabase
              .from("check_ins")
              .select("id, user_id, week_id, day_of_week, status, image_url, is_public, post_content, created_at")
              .eq("user_id", authUser.id)
              .eq("week_id", weekData.id)
              .order("day_of_week", { ascending: true }),
            (supabase
              .from("check_ins")
              .select("id, day_of_week, status, weeks!inner(start_date)")
              .eq("user_id", authUser.id)) as unknown as Promise<{
              data: (CheckIn & { weeks: { start_date: string } })[] | null;
            }>,
          ]);

          if (weekCheckInsRes.data) setCheckIns(weekCheckInsRes.data);

          // 스트릭 계산
          if (allCheckInsRes.data) {
            const workoutDates = new Set<string>();
            for (const ci of allCheckInsRes.data) {
              if (ci.status === "O" || ci.status === "☆") {
                const weekStart = parseISO(ci.weeks.start_date);
                const actualDate = addDays(weekStart, ci.day_of_week - 1);
                workoutDates.add(format(actualDate, "yyyy-MM-dd"));
              }
            }

            const today = new Date();
            let s = 0;
            let checkDate = today;
            // eslint-disable-next-line no-constant-condition
            while (true) {
              const dateStr = format(checkDate, "yyyy-MM-dd");
              if (workoutDates.has(dateStr)) {
                s++;
                checkDate = addDays(checkDate, -1);
              } else {
                if (differenceInCalendarDays(today, checkDate) === 0 && s === 0) {
                  checkDate = addDays(checkDate, -1);
                  continue;
                }
                break;
              }
            }
            setStreak(s);
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
  const todayDow = new Date().getDay(); // 0=Sun
  const todayIdx = todayDow === 0 ? 6 : todayDow - 1; // 0=Mon

  const dayStatusMap: Record<number, CheckStatus> = {};
  for (const ci of checkIns) {
    dayStatusMap[ci.day_of_week] = ci.status;
  }

  // Count completed days
  const completedDays = checkIns.filter((c) => c.status === "O" || c.status === "☆").length;
  const totalDays = 7;

  // SVG circular progress ring
  const ringSize = 220;
  const strokeWidth = 14;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = completedDays / totalDays;
  const strokeDashoffset = circumference * (1 - progress);

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
      data-testid="dashboard"
      style={{
        padding: "1.5rem 0",
        display: "flex",
        flexDirection: "column",
        gap: "1.75rem",
      }}
    >
      {/* Header: SME logo + profile */}
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 900,
            fontFamily: "var(--font-heading)",
            color: "#00E676",
            letterSpacing: "-0.03em",
          }}
        >
          SME
        </h1>
        {user?.profile_image_url ? (
          <img
            src={user.profile_image_url}
            alt="프로필"
            style={{
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #222222",
            }}
          />
        ) : (
          <div
            style={{
              width: "2.75rem",
              height: "2.75rem",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#1A1A1A",
              border: "2px solid #222222",
            }}
          >
            <UserIcon size={20} style={{ color: "#666666" }} />
          </div>
        )}
      </header>

      {/* Notice Banner */}
      {notice && (
        <motion.div
          data-testid="notice-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "0.875rem 1rem",
            display: "flex",
            alignItems: "flex-start",
            gap: "0.75rem",
            background: "#1A1A1A",
            borderRadius: "var(--radius)",
            border: "1px solid #222222",
          }}
        >
          <Megaphone
            size={18}
            style={{
              color: "#FFD600",
              flexShrink: 0,
              marginTop: "0.125rem",
            }}
          />
          <p
            style={{
              fontSize: "0.8125rem",
              lineHeight: 1.5,
              color: "#FFFFFF",
              opacity: 0.85,
            }}
          >
            {notice.content}
          </p>
        </motion.div>
      )}

      {/* Large Circular Progress Ring */}
      <motion.section
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        <div data-testid="progress-ring" style={{ position: "relative", width: ringSize, height: ringSize }}>
          <svg
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
            style={{ transform: "rotate(-90deg)" }}
          >
            <defs>
              <linearGradient id="ringGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00E676" />
                <stop offset="100%" stopColor="#00B0FF" />
              </linearGradient>
            </defs>
            {/* Background ring */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="#222222"
              strokeWidth={strokeWidth}
            />
            {/* Progress ring */}
            <motion.circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke="url(#ringGradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          {/* Center text */}
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "3rem",
                fontWeight: 900,
                fontFamily: "var(--font-heading)",
                color: "#FFFFFF",
                lineHeight: 1,
              }}
            >
              {completedDays}
              <span style={{ color: "#444444", fontSize: "1.5rem" }}>/</span>
              <span style={{ color: "#444444", fontSize: "1.5rem" }}>{totalDays}</span>
            </span>
            <span
              style={{
                fontSize: "0.75rem",
                color: "#666666",
                fontWeight: 500,
                marginTop: "0.25rem",
              }}
            >
              {currentWeek?.title ?? "이번 주"}
            </span>
          </div>
        </div>
      </motion.section>

      {/* Day Pills Row */}
      <section
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "0.5rem",
        }}
      >
        {DAY_LABELS.map((dayLabel, i) => {
          const dayNum = i + 1;
          const status = dayStatusMap[dayNum] ?? null;
          const isCompleted = status === "O" || status === "☆";
          const isToday = i === todayIdx;

          let bg = "#1A1A1A";
          let border = "2px solid transparent";
          let textColor = "#444444";

          if (isCompleted) {
            bg = "#00E676";
            textColor = "#0A0A0A";
          } else if (isToday) {
            bg = "transparent";
            border = "2px solid #00E676";
            textColor = "#00E676";
          }

          return (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              style={{
                width: "2.5rem",
                height: "2.5rem",
                borderRadius: "50%",
                background: bg,
                border,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700,
                color: textColor,
                fontFamily: "var(--font-heading)",
              }}
            >
              {dayLabel}
            </motion.div>
          );
        })}
      </section>

      {/* Stats Row - 3 inline stats */}
      <motion.section
        data-testid="stats-row"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        style={{
          background: "#1A1A1A",
          borderRadius: "var(--radius)",
          padding: "1.25rem 1rem",
          display: "flex",
          justifyContent: "space-around",
          alignItems: "center",
          border: "1px solid #222222",
        }}
      >
        {[
          {
            emoji: "🔥",
            label: "연속",
            value: `${streak}일`,
          },
          {
            emoji: "💰",
            label: "벌금",
            value: fine > 0 ? `${fine.toLocaleString()}원` : "없음",
          },
          {
            emoji: "🏆",
            label: "랭킹",
            value: rank ? `${rank}위` : "-",
          },
        ].map((stat, i, arr) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.375rem",
              flex: 1,
              borderRight: i < arr.length - 1 ? "1px solid #222222" : "none",
            }}
          >
            <span style={{ fontSize: "1.25rem" }}>{stat.emoji}</span>
            <span
              style={{
                fontSize: "1.25rem",
                fontWeight: 800,
                fontFamily: "var(--font-heading)",
                color: "#FFFFFF",
              }}
            >
              {stat.value}
            </span>
            <span
              style={{
                fontSize: "0.6875rem",
                color: "#666666",
                fontWeight: 500,
              }}
            >
              {stat.label}
            </span>
          </div>
        ))}
      </motion.section>

      {/* FAB Button */}
      <motion.button
        data-testid="cta-button"
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        onClick={() => router.push("/workout")}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          padding: "1.125rem",
          fontSize: "1.0625rem",
          fontWeight: 700,
          fontFamily: "var(--font-heading)",
          width: "100%",
          background: "#00E676",
          color: "#0A0A0A",
          borderRadius: "var(--radius)",
          border: "none",
          cursor: "pointer",
          boxShadow: "0 0 30px rgba(0, 230, 118, 0.3)",
          letterSpacing: "-0.01em",
        }}
      >
        <span style={{ fontSize: "1.25rem" }}>{"📷"}</span>
        인증하기
      </motion.button>
    </main>
  );
}
