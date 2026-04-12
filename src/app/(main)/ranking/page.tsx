"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Trophy, Flame, Dumbbell, Crown, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

// Design C palette
const C = {
  bg: "#0A0A0A",
  surface: "#1A1A1A",
  surfaceLight: "#222222",
  primary: "#00E676",
  secondary: "#00B0FF",
  text: "#FFFFFF",
  textSub: "#666666",
  textDim: "#444444",
  radius: "20px",
} as const;

interface RankingEntry {
  rank: number;
  userId: string;
  nickname: string;
  initial: string;
  totalWorkouts: number;
  currentStreak: number;
  maxStreak: number;
}

interface WeeklyStats {
  weekTitle: string;
  count: number;
}

export default function RankingPage() {
  const supabase = useMemo(() => createClient(), []);
  const [rankings, setRankings] = useState<RankingEntry[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myPercentile, setMyPercentile] = useState<number | null>(null);
  const [myStats, setMyStats] = useState({
    totalWorkouts: 0,
    currentStreak: 0,
    maxStreak: 0,
  });
  const [weeklyChart, setWeeklyChart] = useState<WeeklyStats[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) setCurrentUserId(user.id);

        // Fetch ranking from API
        const res = await fetch("/api/ranking");
        if (res.ok) {
          const json = await res.json();
          const data: RankingEntry[] = json.rankings ?? json;
          setRankings(data);
          if (json.myPercentile !== undefined && json.myPercentile !== null) {
            setMyPercentile(json.myPercentile);
          }

          // Set my stats from ranking data
          if (user) {
            const me = data.find((r) => r.userId === user.id);
            if (me) {
              setMyStats({
                totalWorkouts: me.totalWorkouts,
                currentStreak: me.currentStreak,
                maxStreak: me.maxStreak,
              });
            }
          }
        }

        // Fetch weekly chart data (last 12 weeks)
        if (user) {
          const { data: weeks } = await supabase
            .from("weeks")
            .select("id, title, start_date")
            .order("start_date", { ascending: false })
            .limit(12);

          if (weeks && weeks.length > 0) {
            const weekIds = weeks.map((w: { id: string }) => w.id);
            const { data: checkIns } = await supabase
              .from("check_ins")
              .select("week_id, status")
              .eq("user_id", user.id)
              .in("week_id", weekIds) as { data: { week_id: string; status: string | null }[] | null };

            const filtered = (checkIns ?? []).filter(
              (ci) => ci.status === "O" || ci.status === "☆"
            );

            const countMap: Record<string, number> = {};
            for (const ci of filtered) {
              countMap[ci.week_id] = (countMap[ci.week_id] ?? 0) + 1;
            }

            const chartData = [...weeks]
              .reverse()
              .map((w: { id: string; title: string }) => ({
                weekTitle: w.title.replace(/^Week\s*/i, "W"),
                count: countMap[w.id] ?? 0,
              }));

            setWeeklyChart(chartData);
          }
        }
      } catch (e) {
        console.error("Failed to load ranking:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const top3 = rankings.slice(0, 3);
  const rest = rankings.slice(3);
  const maxChart = Math.max(...weeklyChart.map((w) => w.count), 7);

  // Reorder for podium display: [2nd, 1st, 3rd]
  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
      ? [top3[1], top3[0]]
      : top3;

  const podiumColors = ["#00B0FF", "#00E676", "#FF9100"];
  const podiumHeights = [100, 140, 76];
  const podiumLabels = [2, 1, 3];

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: C.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Trophy size={32} color={C.primary} />
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, paddingBottom: 100 }}>
      {/* Header */}
      <div
        style={{
          padding: "20px 20px 0",
          textAlign: "center",
        }}
      >
        <motion.h1
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            color: C.text,
            fontSize: 24,
            fontWeight: 700,
            margin: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Trophy size={24} color={C.primary} />
          랭킹
        </motion.h1>
        <p style={{ color: C.textSub, fontSize: 13, marginTop: 4 }}>
          2026년 상반기 운동 랭킹
        </p>
      </div>

      {/* Podium Section */}
      {top3.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-end",
            gap: 12,
            padding: "28px 20px 20px",
          }}
        >
          {podiumOrder.map((entry, idx) => {
            if (!entry) return null;
            const podiumIdx = top3.length >= 3 ? idx : idx;
            const color = podiumColors[podiumIdx];
            const height = podiumHeights[podiumIdx];
            const label = top3.length >= 3 ? podiumLabels[podiumIdx] : entry.rank;
            const isFirst = label === 1;

            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.1 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  width: isFirst ? 110 : 90,
                }}
              >
                {/* Crown for 1st */}
                {isFirst && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    style={{ marginBottom: 4 }}
                  >
                    <Crown size={24} color="#FFD700" fill="#FFD700" />
                  </motion.div>
                )}

                {/* Avatar */}
                <div
                  style={{
                    width: isFirst ? 60 : 48,
                    height: isFirst ? 60 : 48,
                    borderRadius: "50%",
                    background: `linear-gradient(135deg, ${color}44, ${color})`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isFirst ? 22 : 18,
                    fontWeight: 700,
                    color: C.text,
                    border: `3px solid ${color}`,
                    marginBottom: 6,
                  }}
                >
                  {entry.initial}
                </div>

                {/* Name */}
                <span
                  style={{
                    color: C.text,
                    fontSize: 13,
                    fontWeight: 600,
                    marginBottom: 4,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: "100%",
                    textAlign: "center",
                  }}
                >
                  {entry.nickname}
                </span>

                {/* Percentile badge for current user in podium */}
                {entry.userId === currentUserId && myPercentile !== null && (
                  <span
                    style={{
                      padding: "1px 6px",
                      borderRadius: "9999px",
                      fontSize: 10,
                      fontWeight: 700,
                      marginBottom: 4,
                      background:
                        myPercentile >= 70
                          ? "#00E67630"
                          : myPercentile >= 30
                            ? "#FFD60030"
                            : "#44444430",
                      color:
                        myPercentile >= 70
                          ? "#00E676"
                          : myPercentile >= 30
                            ? "#FFD600"
                            : "#666666",
                    }}
                  >
                    상위 {100 - myPercentile}%
                  </span>
                )}

                {/* Score */}
                <span
                  style={{
                    color: color,
                    fontSize: 12,
                    fontWeight: 600,
                    marginBottom: 6,
                  }}
                >
                  {entry.totalWorkouts}회
                </span>

                {/* Bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height }}
                  transition={{ delay: 0.3 + idx * 0.1, duration: 0.5, ease: "easeOut" }}
                  style={{
                    width: "100%",
                    borderRadius: "12px 12px 4px 4px",
                    background: `linear-gradient(180deg, ${color}, ${color}44)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      color: C.text,
                      fontSize: isFirst ? 28 : 22,
                      fontWeight: 800,
                      opacity: 0.9,
                    }}
                  >
                    {label}
                  </span>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Ranking List (4th+) */}
      {rest.length > 0 && (
        <div style={{ padding: "0 16px" }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: C.textSub,
              marginBottom: 10,
              paddingLeft: 4,
            }}
          >
            전체 순위
          </div>
          {rest.map((entry, idx) => {
            const isMe = entry.userId === currentUserId;
            return (
              <motion.div
                key={entry.userId}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.05 }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: C.surface,
                  borderRadius: C.radius,
                  padding: "14px 16px",
                  marginBottom: 10,
                  border: isMe ? `2px solid ${C.primary}` : `1px solid ${C.surfaceLight}`,
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {isMe && (
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: `${C.primary}08`,
                      pointerEvents: "none",
                    }}
                  />
                )}

                {/* Rank Number */}
                <div
                  style={{
                    width: 32,
                    fontSize: 16,
                    fontWeight: 700,
                    color: isMe ? C.primary : C.textSub,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {entry.rank}
                </div>

                {/* Avatar */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: "50%",
                    background: isMe
                      ? `linear-gradient(135deg, ${C.primary}44, ${C.primary})`
                      : C.surfaceLight,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    fontWeight: 700,
                    color: C.text,
                    marginRight: 12,
                    flexShrink: 0,
                  }}
                >
                  {entry.initial}
                </div>

                {/* Name & Streak */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: C.text,
                      fontSize: 14,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {entry.nickname}
                    {isMe && (
                      <span
                        style={{
                          color: C.primary,
                          fontSize: 11,
                          marginLeft: 6,
                          fontWeight: 500,
                        }}
                      >
                        (나)
                      </span>
                    )}
                    {isMe && myPercentile !== null && (
                      <span
                        style={{
                          marginLeft: 6,
                          padding: "1px 6px",
                          borderRadius: "9999px",
                          fontSize: 10,
                          fontWeight: 700,
                          background:
                            myPercentile >= 70
                              ? "#00E67630"
                              : myPercentile >= 30
                                ? "#FFD60030"
                                : "#44444430",
                          color:
                            myPercentile >= 70
                              ? "#00E676"
                              : myPercentile >= 30
                                ? "#FFD600"
                                : "#666666",
                        }}
                      >
                        상위 {100 - myPercentile}%
                      </span>
                    )}
                  </div>
                  {entry.currentStreak > 0 && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                        marginTop: 2,
                      }}
                    >
                      <Flame size={12} color="#FF6D00" />
                      <span style={{ color: C.textSub, fontSize: 11 }}>
                        {entry.currentStreak}주 연속
                      </span>
                    </div>
                  )}
                </div>

                {/* Workout Count */}
                <div
                  style={{
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      color: isMe ? C.primary : C.text,
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {entry.totalWorkouts}
                  </span>
                  <span
                    style={{
                      color: C.textSub,
                      fontSize: 11,
                      marginLeft: 2,
                    }}
                  >
                    회
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* My Stats Section */}
      {currentUserId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          style={{ padding: "20px 16px 0" }}
        >
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              color: C.text,
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <TrendingUp size={18} color={C.primary} />
            내 기록
          </div>

          {/* Stats Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 10,
              marginBottom: 20,
            }}
          >
            {[
              {
                label: "총 운동 횟수",
                value: myStats.totalWorkouts,
                unit: "회",
                icon: <Dumbbell size={18} color={C.primary} />,
                color: C.primary,
              },
              {
                label: "현재 스트릭",
                value: myStats.currentStreak,
                unit: "주",
                icon: <Flame size={18} color="#FF6D00" />,
                color: "#FF6D00",
              },
              {
                label: "최대 스트릭",
                value: myStats.maxStreak,
                unit: "주",
                icon: <Trophy size={18} color={C.secondary} />,
                color: C.secondary,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                style={{
                  background: C.surface,
                  borderRadius: C.radius,
                  padding: "16px 12px",
                  textAlign: "center",
                  border: `1px solid ${C.surfaceLight}`,
                }}
              >
                <div style={{ marginBottom: 8 }}>{stat.icon}</div>
                <div
                  style={{
                    fontSize: 22,
                    fontWeight: 800,
                    color: stat.color,
                  }}
                >
                  {stat.value}
                  <span style={{ fontSize: 12, fontWeight: 500, color: C.textSub }}>
                    {stat.unit}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: C.textSub,
                    marginTop: 4,
                  }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </div>

          {/* Weekly Bar Chart */}
          {weeklyChart.length > 0 && (
            <div
              style={{
                background: C.surface,
                borderRadius: C.radius,
                padding: "20px 16px",
                border: `1px solid ${C.surfaceLight}`,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.text,
                  marginBottom: 16,
                }}
              >
                주간 운동 기록
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 6,
                  height: 120,
                }}
              >
                {weeklyChart.map((week, idx) => {
                  const barHeight = maxChart > 0 ? (week.count / maxChart) * 100 : 0;
                  return (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        height: "100%",
                        justifyContent: "flex-end",
                      }}
                    >
                      {/* Count label */}
                      <span
                        style={{
                          fontSize: 9,
                          color: week.count > 0 ? C.primary : C.textDim,
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        {week.count > 0 ? week.count : ""}
                      </span>
                      {/* Bar */}
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: Math.max(barHeight, 4) }}
                        transition={{
                          delay: 0.7 + idx * 0.05,
                          duration: 0.4,
                          ease: "easeOut",
                        }}
                        style={{
                          width: "100%",
                          borderRadius: 6,
                          background:
                            week.count > 0
                              ? `linear-gradient(180deg, ${C.primary}, ${C.primary}66)`
                              : C.surfaceLight,
                          minHeight: 4,
                        }}
                      />
                      {/* Week label */}
                      <span
                        style={{
                          fontSize: 8,
                          color: C.textDim,
                          marginTop: 6,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {week.weekTitle}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
