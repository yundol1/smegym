"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  Flame,
  Trophy,
  Heart,
  Images,
  Wallet,
  Loader2,
  TrendingUp,
  TrendingDown,
  Zap,
  PenLine,
  Bot,
  ShieldCheck,
  ArrowLeft,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface ReportData {
  mon_count: number;
  tue_count: number;
  wed_count: number;
  thu_count: number;
  fri_count: number;
  sat_count: number;
  sun_count: number;
  current_streak: number;
  max_streak: number;
  current_miss_streak: number;
  max_miss_streak: number;
  total_exemptions: number;
  reactions_received: number;
  reactions_sent: number;
  gallery_shares: number;
  total_fines_paid: number;
  posts_written: number;
  ai_coach_uses: number;
}

const dayLabels = ["월", "화", "수", "목", "금", "토", "일"];

export default function ReportPage() {
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [periodLabel, setPeriodLabel] = useState("");
  const [totalWorkouts, setTotalWorkouts] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReport() {
      try {
        const res = await fetch("/api/report");
        if (!res.ok) throw new Error("Failed to fetch report");
        const data = await res.json();
        setReport(data.report);
        setPeriodLabel(data.periodLabel);

        const r = data.report;
        const total =
          data.totalWorkouts ??
          r.mon_count +
            r.tue_count +
            r.wed_count +
            r.thu_count +
            r.fri_count +
            r.sat_count +
            r.sun_count;
        setTotalWorkouts(total);
      } catch {
        setError("데이터를 불러오는데 실패했습니다.");
      } finally {
        setIsLoading(false);
      }
    }
    fetchReport();
  }, []);

  if (isLoading) {
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

  if (error || !report) {
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
        <p style={{ color: "#FF5252" }}>{error || "리포트를 찾을 수 없습니다."}</p>
      </main>
    );
  }

  const dayCounts = [
    report.mon_count,
    report.tue_count,
    report.wed_count,
    report.thu_count,
    report.fri_count,
    report.sat_count,
    report.sun_count,
  ];
  const maxDayCount = Math.max(...dayCounts, 1);

  const cardStyle: React.CSSProperties = {
    background: "#1A1A1A",
    borderRadius: "20px",
    padding: "1.25rem",
    border: "1px solid #222222",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.8125rem",
    fontWeight: 600,
    color: "#666666",
    marginBottom: "0.5rem",
  };

  const bigNumberStyle: React.CSSProperties = {
    fontSize: "2.5rem",
    fontWeight: 900,
    fontFamily: "var(--font-heading)",
    lineHeight: 1.1,
  };

  const statCards = [
    {
      label: "현재 스트릭",
      value: report.current_streak,
      suffix: "주",
      icon: <Flame size={18} style={{ color: "#00E676" }} />,
      color: "#00E676",
    },
    {
      label: "최대 스트릭",
      value: report.max_streak,
      suffix: "주",
      icon: <Trophy size={18} style={{ color: "#FFD600" }} />,
      color: "#FFD600",
    },
    {
      label: "받은 리액션",
      value: report.reactions_received,
      suffix: "",
      icon: <Heart size={18} style={{ color: "#FF4081" }} />,
      color: "#FF4081",
    },
    {
      label: "보낸 리액션",
      value: report.reactions_sent,
      suffix: "",
      icon: <Heart size={18} style={{ color: "#00B0FF" }} />,
      color: "#00B0FF",
    },
    {
      label: "갤러리 공유",
      value: report.gallery_shares,
      suffix: "회",
      icon: <Images size={18} style={{ color: "#CE93D8" }} />,
      color: "#CE93D8",
    },
    {
      label: "납부 벌금",
      value: report.total_fines_paid.toLocaleString(),
      suffix: "원",
      icon: <Wallet size={18} style={{ color: "#FF9800" }} />,
      color: "#FF9800",
    },
    {
      label: "작성 글",
      value: report.posts_written,
      suffix: "개",
      icon: <PenLine size={18} style={{ color: "#4FC3F7" }} />,
      color: "#4FC3F7",
    },
    {
      label: "AI 코치 사용",
      value: report.ai_coach_uses,
      suffix: "회",
      icon: <Bot size={18} style={{ color: "#00E676" }} />,
      color: "#00E676",
    },
    {
      label: "면제 승인",
      value: report.total_exemptions,
      suffix: "건",
      icon: <ShieldCheck size={18} style={{ color: "#80CBC4" }} />,
      color: "#80CBC4",
    },
    {
      label: "현재 미스 스트릭",
      value: report.current_miss_streak,
      suffix: "주",
      icon: <TrendingDown size={18} style={{ color: "#FF5252" }} />,
      color: "#FF5252",
    },
    {
      label: "최대 미스 스트릭",
      value: report.max_miss_streak,
      suffix: "주",
      icon: <TrendingDown size={18} style={{ color: "#FF8A80" }} />,
      color: "#FF8A80",
    },
  ];

  return (
    <main
      style={{
        padding: "1.5rem 0",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
      }}
    >
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            padding: "0.25rem",
            display: "flex",
            alignItems: "center",
          }}
        >
          <ArrowLeft size={24} style={{ color: "#FFFFFF" }} />
        </motion.button>
        <BarChart3 size={28} style={{ color: "#00E676" }} />
        <div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 900,
              fontFamily: "var(--font-heading)",
              color: "#FFFFFF",
              letterSpacing: "-0.03em",
            }}
          >
            반기 결산
          </h1>
          <p style={{ fontSize: "0.8125rem", color: "#666666", marginTop: "0.125rem" }}>
            {periodLabel}
          </p>
        </div>
      </header>

      {/* Total Workouts - Hero Card */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          ...cardStyle,
          background: "linear-gradient(135deg, #1A1A1A 0%, #0D2818 100%)",
          border: "1px solid rgba(0, 230, 118, 0.2)",
          textAlign: "center",
          padding: "2rem 1.25rem",
        }}
      >
        <div style={labelStyle}>
          <Zap
            size={14}
            style={{ color: "#00E676", verticalAlign: "middle", marginRight: "0.25rem" }}
          />
          총 운동 횟수
        </div>
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          style={{
            ...bigNumberStyle,
            color: "#00E676",
            textShadow: "0 0 30px rgba(0, 230, 118, 0.3)",
          }}
        >
          {totalWorkouts}
          <span
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              color: "#666666",
              marginLeft: "0.25rem",
            }}
          >
            회
          </span>
        </motion.div>
      </motion.section>

      {/* Day-of-Week Bar Chart */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={cardStyle}
      >
        <div
          style={{
            ...labelStyle,
            display: "flex",
            alignItems: "center",
            gap: "0.375rem",
          }}
        >
          <TrendingUp size={14} style={{ color: "#00B0FF" }} />
          요일별 운동 횟수
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.625rem",
            marginTop: "0.75rem",
          }}
        >
          {dayCounts.map((count, i) => (
            <div
              key={dayLabels[i]}
              style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}
            >
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: i < 5 ? "#FFFFFF" : "#00B0FF",
                  width: "1.5rem",
                  textAlign: "center",
                  flexShrink: 0,
                }}
              >
                {dayLabels[i]}
              </span>
              <div
                style={{
                  flex: 1,
                  height: "1.5rem",
                  background: "#0A0A0A",
                  borderRadius: "10px",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                <motion.div
                  initial={{ width: 0 }}
                  animate={{
                    width: `${(count / maxDayCount) * 100}%`,
                  }}
                  transition={{ delay: 0.2 + i * 0.05, duration: 0.6, ease: "easeOut" }}
                  style={{
                    height: "100%",
                    background:
                      i < 5
                        ? "linear-gradient(90deg, #00E676, #00C853)"
                        : "linear-gradient(90deg, #00B0FF, #0091EA)",
                    borderRadius: "10px",
                    minWidth: count > 0 ? "1.5rem" : 0,
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "0.8125rem",
                  fontWeight: 700,
                  color: "#FFFFFF",
                  width: "2rem",
                  textAlign: "right",
                  flexShrink: 0,
                }}
              >
                {count}
              </span>
            </div>
          ))}
        </div>
      </motion.section>

      {/* Stats Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "0.75rem",
        }}
      >
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.04 }}
            style={{
              ...cardStyle,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                ...labelStyle,
                marginBottom: 0,
              }}
            >
              {card.icon}
              <span>{card.label}</span>
            </div>
            <div
              style={{
                fontSize: "1.75rem",
                fontWeight: 900,
                fontFamily: "var(--font-heading)",
                color: card.color,
                lineHeight: 1.1,
              }}
            >
              {card.value}
              {card.suffix && (
                <span
                  style={{
                    fontSize: "0.875rem",
                    fontWeight: 600,
                    color: "#666666",
                    marginLeft: "0.125rem",
                  }}
                >
                  {card.suffix}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </main>
  );
}
