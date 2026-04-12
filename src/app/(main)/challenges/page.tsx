"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Target, Calendar, Trophy, Loader2, Users, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { Challenge } from "@/types/database";

type StatusFilter = "전체" | "진행 중" | "예정" | "종료";

interface ChallengeStats {
  participants: { nickname: string; count: number }[];
  myCount: number;
  target: number;
}

function getChallengeStatus(
  challenge: Challenge,
  today: string,
): "진행 중" | "예정" | "종료" {
  if (challenge.start_date > today) return "예정";
  if (challenge.end_date < today) return "종료";
  return "진행 중";
}

function getStatusColor(status: "진행 중" | "예정" | "종료") {
  switch (status) {
    case "진행 중":
      return "#00E676";
    case "예정":
      return "#00B0FF";
    case "종료":
      return "#444444";
  }
}

function getProgressPercent(challenge: Challenge, today: string): number {
  const start = new Date(challenge.start_date).getTime();
  const end = new Date(challenge.end_date).getTime();
  const now = new Date(today).getTime();
  if (now <= start) return 0;
  if (now >= end) return 100;
  return Math.round(((now - start) / (end - start)) * 100);
}

export default function ChallengesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("전체");
  const [statsMap, setStatsMap] = useState<Record<string, ChallengeStats>>({});

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchStats = useCallback(async (activeChallenges: Challenge[]) => {
    const results: Record<string, ChallengeStats> = {};
    await Promise.all(
      activeChallenges.map(async (c) => {
        try {
          const res = await fetch(`/api/challenges/stats?challengeId=${c.id}`);
          if (res.ok) {
            results[c.id] = await res.json();
          }
        } catch {
          // ignore individual failures
        }
      }),
    );
    setStatsMap(results);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("challenges")
          .select("*")
          .order("start_date", { ascending: false });

        if (data) {
          setChallenges(data);
          const active = data.filter((c) => getChallengeStatus(c, today) === "진행 중");
          if (active.length > 0) {
            fetchStats(active);
          }
        }
      } catch (err) {
        console.error("Failed to load challenges:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase, today, fetchStats]);

  const filters: StatusFilter[] = ["전체", "진행 중", "예정", "종료"];

  const filtered =
    activeFilter === "전체"
      ? challenges
      : challenges.filter((c) => getChallengeStatus(c, today) === activeFilter);

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
          <Loader2 size={32} style={{ color: "#00E676" }} />
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
        <Target size={28} style={{ color: "#00E676" }} />
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            fontFamily: "var(--font-heading)",
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
          }}
        >
          챌린지
        </h1>
      </header>

      {/* Filter Pills */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
        {filters.map((f) => {
          const isActive = activeFilter === f;
          return (
            <motion.button
              key={f}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveFilter(f)}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "9999px",
                border: "none",
                cursor: "pointer",
                fontSize: "0.8125rem",
                fontWeight: 700,
                fontFamily: "var(--font-heading)",
                background: isActive ? "#00E676" : "#1A1A1A",
                color: isActive ? "#0A0A0A" : "#666666",
                transition: "all 0.2s",
              }}
            >
              {f}
            </motion.button>
          );
        })}
      </div>

      {/* Challenge Cards */}
      <AnimatePresence mode="popLayout">
        {filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              padding: "3rem 1rem",
              textAlign: "center",
              color: "#444444",
              fontSize: "0.875rem",
            }}
          >
            해당하는 챌린지가 없습니다.
          </motion.div>
        ) : (
          filtered.map((challenge, index) => {
            const status = getChallengeStatus(challenge, today);
            const statusColor = getStatusColor(status);
            const progress = getProgressPercent(challenge, today);

            return (
              <motion.article
                key={challenge.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                layout
                style={{
                  background: "#1A1A1A",
                  borderRadius: "20px",
                  overflow: "hidden",
                  border: "1px solid #222222",
                  borderTop: `3px solid ${statusColor}`,
                }}
              >
                {/* Banner */}
                {challenge.banner_image_url ? (
                  <div
                    style={{
                      width: "100%",
                      height: "160px",
                      overflow: "hidden",
                    }}
                  >
                    <img
                      src={challenge.banner_image_url}
                      alt={challenge.title}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  </div>
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "120px",
                      background: `linear-gradient(135deg, ${statusColor}22 0%, ${statusColor}08 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Target
                      size={48}
                      style={{ color: statusColor, opacity: 0.3 }}
                    />
                  </div>
                )}

                {/* Content */}
                <div
                  style={{
                    padding: "1.25rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.75rem",
                  }}
                >
                  {/* Title + Status Badge */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                    }}
                  >
                    <h2
                      style={{
                        fontSize: "1.125rem",
                        fontWeight: 800,
                        fontFamily: "var(--font-heading)",
                        color: "#FFFFFF",
                        lineHeight: 1.3,
                        flex: 1,
                      }}
                    >
                      {challenge.title}
                    </h2>
                    <span
                      style={{
                        padding: "0.25rem 0.625rem",
                        borderRadius: "9999px",
                        fontSize: "0.6875rem",
                        fontWeight: 700,
                        background: `${statusColor}20`,
                        color: statusColor,
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        ...(status === "진행 중"
                          ? {
                              boxShadow: `0 0 8px ${statusColor}40`,
                            }
                          : {}),
                      }}
                    >
                      {status}
                    </span>
                  </div>

                  {/* Period */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      color: "#666666",
                      fontSize: "0.8125rem",
                    }}
                  >
                    <Calendar size={14} />
                    <span>
                      {format(new Date(challenge.start_date), "M.d(EEE)", {
                        locale: ko,
                      })}{" "}
                      ~{" "}
                      {format(new Date(challenge.end_date), "M.d(EEE)", {
                        locale: ko,
                      })}
                    </span>
                  </div>

                  {/* Target + Reward */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.375rem",
                        fontSize: "0.8125rem",
                        fontWeight: 600,
                        color: "#FFFFFF",
                      }}
                    >
                      <Target size={14} style={{ color: "#00E676" }} />
                      목표 {challenge.target_count}회
                    </span>
                    {challenge.reward && (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.375rem",
                          padding: "0.25rem 0.625rem",
                          borderRadius: "9999px",
                          background: "#FFD60020",
                          color: "#FFD600",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                        }}
                      >
                        <Trophy size={12} />
                        {challenge.reward}
                      </span>
                    )}
                  </div>

                  {/* Description */}
                  {challenge.description && (
                    <p
                      style={{
                        fontSize: "0.8125rem",
                        lineHeight: 1.6,
                        color: "#666666",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {challenge.description}
                    </p>
                  )}

                  {/* Progress bar for active challenges */}
                  {status === "진행 중" && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: "0.6875rem",
                          color: "#666666",
                        }}
                      >
                        <span>진행률</span>
                        <span style={{ color: "#00E676", fontWeight: 700 }}>
                          {progress}%
                        </span>
                      </div>
                      <div
                        style={{
                          width: "100%",
                          height: "6px",
                          borderRadius: "3px",
                          background: "#222222",
                          overflow: "hidden",
                        }}
                      >
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          style={{
                            height: "100%",
                            borderRadius: "3px",
                            background:
                              "linear-gradient(90deg, #00E676, #00B0FF)",
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Participation stats for active challenges */}
                  {status === "진행 중" && statsMap[challenge.id] && (() => {
                    const stats = statsMap[challenge.id];
                    const topParticipants = stats.participants.slice(0, 5);
                    const achieved = stats.myCount >= stats.target;

                    return (
                      <div
                        style={{
                          background: "#111111",
                          borderRadius: "12px",
                          padding: "0.875rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "0.625rem",
                        }}
                      >
                        {/* My progress */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.375rem",
                              fontSize: "0.8125rem",
                              fontWeight: 600,
                              color: "#FFFFFF",
                            }}
                          >
                            <Target size={14} style={{ color: "#00E676" }} />
                            내 진행: {stats.myCount} / {stats.target}회
                          </div>
                          {achieved && (
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                padding: "0.2rem 0.5rem",
                                borderRadius: "9999px",
                                background: "#00E67630",
                                color: "#00E676",
                                fontSize: "0.6875rem",
                                fontWeight: 700,
                              }}
                            >
                              <CheckCircle size={12} />
                              목표 달성
                            </span>
                          )}
                        </div>

                        {/* Top participants */}
                        {topParticipants.length > 0 && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.375rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.375rem",
                                fontSize: "0.6875rem",
                                fontWeight: 600,
                                color: "#666666",
                              }}
                            >
                              <Users size={12} />
                              참여 현황
                            </div>
                            {topParticipants.map((p, i) => (
                              <div
                                key={i}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  fontSize: "0.75rem",
                                  color: "#CCCCCC",
                                  padding: "0.125rem 0",
                                }}
                              >
                                <span>
                                  <span style={{ color: "#666666", marginRight: "0.375rem" }}>
                                    {i + 1}.
                                  </span>
                                  {p.nickname}
                                </span>
                                <span
                                  style={{
                                    fontWeight: 700,
                                    color: p.count >= stats.target ? "#00E676" : "#FFFFFF",
                                  }}
                                >
                                  {p.count}회
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </motion.article>
            );
          })
        )}
      </AnimatePresence>
    </main>
  );
}
