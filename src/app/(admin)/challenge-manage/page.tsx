"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Plus,
  Trash2,
  Calendar,
  Target,
  Gift,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { Challenge } from "@/types/database";

const C = {
  bg: "#0A0A0A",
  surface: "#1A1A1A",
  primary: "#00E676",
  secondary: "#00B0FF",
  text: "#FFFFFF",
  textSub: "#666666",
  radius: "20px",
} as const;

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  background: C.bg,
  color: C.text,
  border: `1px solid ${C.textSub}33`,
  borderRadius: "12px",
  fontSize: 14,
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  color: C.textSub,
  fontSize: 13,
  fontWeight: 600,
  marginBottom: 6,
  display: "flex",
  alignItems: "center",
  gap: 6,
};

export default function ChallengeManagePage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Challenge | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [targetCount, setTargetCount] = useState("");
  const [reward, setReward] = useState("");
  const [description, setDescription] = useState("");

  const fetchChallenges = useCallback(async () => {
    setIsFetching(true);
    const { data } = await supabase
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false });

    setChallenges(data ?? []);
    setIsFetching(false);
  }, [supabase]);

  useEffect(() => {
    fetchChallenges();
  }, [fetchChallenges]);

  const resetForm = () => {
    setTitle("");
    setStartDate("");
    setEndDate("");
    setTargetCount("");
    setReward("");
    setDescription("");
  };

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 2500);
  };

  const handleCreate = async () => {
    if (!title.trim() || !startDate || !endDate || !targetCount) {
      setError("제목, 시작일, 종료일, 목표 횟수는 필수입니다");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          start_date: startDate,
          end_date: endDate,
          target_count: parseInt(targetCount, 10),
          reward: reward.trim() || null,
          description: description.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "챌린지 생성 실패");
      } else {
        resetForm();
        showSuccess("챌린지가 등록되었습니다");
        await fetchChallenges();
      }
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/admin/challenges?id=${deleteTarget.id}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "삭제 실패");
      } else {
        showSuccess("챌린지가 삭제되었습니다");
        await fetchChallenges();
      }
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
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
        <Trophy size={28} color={C.primary} />
        챌린지 관리
      </motion.h1>

      {/* Create form */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: C.surface,
          borderRadius: C.radius,
          padding: 24,
          marginBottom: 24,
        }}
      >
        <div
          style={{
            color: C.primary,
            fontSize: 16,
            fontWeight: 700,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Plus size={20} />
          새 챌린지 등록
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {/* Title */}
          <div>
            <div style={labelStyle}>
              <Trophy size={14} />
              제목 *
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="챌린지 제목"
              style={inputStyle}
            />
          </div>

          {/* Dates */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={labelStyle}>
                <Calendar size={14} />
                시작일 *
              </div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  ...inputStyle,
                  colorScheme: "dark",
                }}
              />
            </div>
            <div>
              <div style={labelStyle}>
                <Calendar size={14} />
                종료일 *
              </div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                style={{
                  ...inputStyle,
                  colorScheme: "dark",
                }}
              />
            </div>
          </div>

          {/* Target count & reward */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={labelStyle}>
                <Target size={14} />
                목표 횟수 *
              </div>
              <input
                type="number"
                value={targetCount}
                onChange={(e) => setTargetCount(e.target.value)}
                placeholder="예: 20"
                min={1}
                style={inputStyle}
              />
            </div>
            <div>
              <div style={labelStyle}>
                <Gift size={14} />
                보상
              </div>
              <input
                type="text"
                value={reward}
                onChange={(e) => setReward(e.target.value)}
                placeholder="예: 벌금 면제"
                style={inputStyle}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <div style={labelStyle}>
              <FileText size={14} />
              설명
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="챌린지에 대한 상세 설명..."
              rows={3}
              style={{
                ...inputStyle,
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
          </div>

          {/* Submit */}
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreate}
            disabled={isCreating}
            style={{
              width: "100%",
              padding: "14px 24px",
              background: `linear-gradient(135deg, ${C.primary}, ${C.secondary})`,
              color: "#000",
              border: "none",
              borderRadius: "14px",
              fontSize: 16,
              fontWeight: 700,
              cursor: isCreating ? "not-allowed" : "pointer",
              opacity: isCreating ? 0.6 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {isCreating ? (
              <>
                <Loader2
                  size={18}
                  style={{ animation: "spin 1s linear infinite" }}
                />
                등록 중...
              </>
            ) : (
              <>
                <Plus size={18} />
                챌린지 등록
              </>
            )}
          </motion.button>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              marginBottom: 16,
              padding: 14,
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

      {/* Success */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{
              marginBottom: 16,
              padding: 14,
              background: `${C.primary}20`,
              border: `1px solid ${C.primary}44`,
              borderRadius: "12px",
              color: C.primary,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontWeight: 600,
            }}
          >
            <CheckCircle size={18} />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Existing challenges */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h2
          style={{
            color: C.text,
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 16,
          }}
        >
          등록된 챌린지
        </h2>

        {isFetching ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              padding: 30,
            }}
          >
            <Loader2
              size={24}
              color={C.primary}
              style={{ animation: "spin 1s linear infinite" }}
            />
          </div>
        ) : challenges.length === 0 ? (
          <div
            style={{
              color: C.textSub,
              textAlign: "center",
              padding: 30,
              fontSize: 14,
            }}
          >
            등록된 챌린지가 없습니다
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {challenges.map((challenge, i) => (
              <motion.div
                key={challenge.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                style={{
                  background: C.surface,
                  borderRadius: "14px",
                  padding: 18,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 10,
                  }}
                >
                  <div
                    style={{
                      color: C.text,
                      fontSize: 16,
                      fontWeight: 700,
                    }}
                  >
                    {challenge.title}
                  </div>
                  <button
                    onClick={() => setDeleteTarget(challenge)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "#FF5252",
                      cursor: "pointer",
                      padding: 4,
                      borderRadius: 8,
                      display: "flex",
                      alignItems: "center",
                    }}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 12,
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      color: C.textSub,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Calendar size={13} />
                    {challenge.start_date} ~ {challenge.end_date}
                  </div>
                  <div
                    style={{
                      color: C.secondary,
                      fontSize: 13,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Target size={13} />
                    {challenge.target_count}회
                  </div>
                  {challenge.reward && (
                    <div
                      style={{
                        color: "#FF9800",
                        fontSize: 13,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <Gift size={13} />
                      {challenge.reward}
                    </div>
                  )}
                </div>

                {challenge.description && (
                  <div
                    style={{
                      color: C.textSub,
                      fontSize: 13,
                      lineHeight: 1.5,
                    }}
                  >
                    {challenge.description}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Delete confirmation dialog */}
      <AnimatePresence>
        {deleteTarget && (
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
            onClick={() => !isDeleting && setDeleteTarget(null)}
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
                <AlertTriangle size={24} color="#FF5252" />
                <h2
                  style={{
                    color: C.text,
                    fontSize: 18,
                    fontWeight: 700,
                    margin: 0,
                  }}
                >
                  챌린지를 삭제하시겠습니까?
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
                &ldquo;{deleteTarget.title}&rdquo; 챌린지가 영구적으로
                삭제됩니다.
              </p>
              <div style={{ display: "flex", gap: 12 }}>
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={isDeleting}
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
                  onClick={handleDelete}
                  disabled={isDeleting}
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    background: "#FF5252",
                    color: "#FFF",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: isDeleting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  {isDeleting ? (
                    <Loader2
                      size={18}
                      style={{ animation: "spin 1s linear infinite" }}
                    />
                  ) : (
                    "삭제"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
