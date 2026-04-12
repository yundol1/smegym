"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, CheckCircle, XCircle, Clock, ImageOff, Loader2, X } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

/* ── Design C (Sporty Dark) ── */
const C = {
  bg: "#0A0A0A",
  surface: "#1A1A1A",
  surfaceLight: "#222222",
  primary: "#00E676",
  secondary: "#00B0FF",
  text: "#FFFFFF",
  textSub: "#666666",
  radius: "20px",
} as const;

interface PendingCheckIn {
  id: string;
  userId: string;
  nickname: string;
  dayOfWeek: string;
  imageUrl: string | null;
  postContent: string | null;
  createdAt: string;
  weekTitle: string;
}

export default function PhotoReviewPage() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const [checkIns, setCheckIns] = useState<PendingCheckIn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const fetchPending = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/photo-review");
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "불러오기 실패");
      }
      const data = await res.json();
      setCheckIns(data.checkIns ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) {
      fetchPending();
    }
  }, [authLoading, fetchPending]);

  const handleApprove = async (checkInId: string) => {
    if (!user) return;
    setProcessingIds((prev) => new Set(prev).add(checkInId));
    try {
      const res = await fetch("/api/admin/photo-review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkInId,
          decision: "approve",
          adminId: user.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "승인 실패");
      }
      setCheckIns((prev) => prev.filter((ci) => ci.id !== checkInId));
    } catch (err) {
      alert(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(checkInId);
        return next;
      });
    }
  };

  const handleRejectSubmit = async () => {
    if (!user || !rejectTarget) return;
    setProcessingIds((prev) => new Set(prev).add(rejectTarget));
    try {
      const res = await fetch("/api/admin/photo-review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          checkInId: rejectTarget,
          decision: "reject",
          reason: rejectReason.trim() || undefined,
          adminId: user.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "반려 실패");
      }
      setCheckIns((prev) => prev.filter((ci) => ci.id !== rejectTarget));
      setRejectTarget(null);
      setRejectReason("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        if (rejectTarget) next.delete(rejectTarget);
        return next;
      });
    }
  };

  /* ── Auth guard ── */
  if (authLoading) {
    return (
      <main style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 size={32} color={C.primary} style={{ animation: "spin 1s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={{ background: C.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: C.textSub, fontSize: "1rem" }}>관리자 권한이 필요합니다.</p>
      </main>
    );
  }

  return (
    <main style={{ background: C.bg, minHeight: "100vh", padding: "1.5rem 1rem 6rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem" }}>
        <Camera size={24} color={C.primary} />
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: C.text, margin: 0 }}>
          사진 검토
        </h1>
        {!isLoading && (
          <span
            style={{
              background: checkIns.length > 0 ? C.primary : C.surfaceLight,
              color: checkIns.length > 0 ? "#000" : C.textSub,
              fontSize: "0.75rem",
              fontWeight: 700,
              padding: "0.25rem 0.75rem",
              borderRadius: "999px",
            }}
          >
            검토 대기 {checkIns.length}건
          </span>
        )}
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                background: C.surface,
                borderRadius: C.radius,
                padding: "1.25rem",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.surfaceLight }} />
                <div>
                  <div style={{ width: 80, height: 14, borderRadius: 4, background: C.surfaceLight, marginBottom: 6 }} />
                  <div style={{ width: 120, height: 10, borderRadius: 4, background: C.surfaceLight }} />
                </div>
              </div>
              <div style={{ width: "100%", height: 200, borderRadius: 12, background: C.surfaceLight }} />
              <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                <div style={{ flex: 1, height: 44, borderRadius: 12, background: C.surfaceLight }} />
                <div style={{ flex: 1, height: 44, borderRadius: 12, background: C.surfaceLight }} />
              </div>
            </div>
          ))}
          <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          style={{
            background: C.surface,
            borderRadius: C.radius,
            padding: "2rem",
            textAlign: "center",
          }}
        >
          <p style={{ color: "#FF5252", fontSize: "0.9rem", margin: 0 }}>{error}</p>
          <button
            onClick={() => { setIsLoading(true); fetchPending(); }}
            style={{
              marginTop: "1rem",
              padding: "0.5rem 1.5rem",
              background: C.surfaceLight,
              color: C.text,
              border: "none",
              borderRadius: 12,
              fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && checkIns.length === 0 && (
        <div
          style={{
            background: C.surface,
            borderRadius: C.radius,
            padding: "3rem 1.5rem",
            textAlign: "center",
          }}
        >
          <CheckCircle size={48} color={C.primary} style={{ marginBottom: "1rem", opacity: 0.5 }} />
          <p style={{ color: C.textSub, fontSize: "1rem", margin: 0 }}>
            검토 대기 중인 인증이 없습니다
          </p>
        </div>
      )}

      {/* Check-in cards */}
      {!isLoading && !error && checkIns.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {checkIns.map((ci) => {
              const isProcessing = processingIds.has(ci.id);
              return (
                <motion.div
                  key={ci.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -300, transition: { duration: 0.3 } }}
                  style={{
                    background: C.surface,
                    borderRadius: C.radius,
                    padding: "1.25rem",
                    overflow: "hidden",
                  }}
                >
                  {/* User info row */}
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem" }}>
                    {/* Avatar initial */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: `linear-gradient(135deg, ${C.primary}33, ${C.secondary}33)`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "1rem",
                        fontWeight: 700,
                        color: C.primary,
                        flexShrink: 0,
                      }}
                    >
                      {ci.nickname.charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ color: C.text, fontWeight: 700, fontSize: "0.95rem" }}>
                          {ci.nickname}
                        </span>
                        <span
                          style={{
                            background: C.surfaceLight,
                            color: C.secondary,
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            padding: "0.15rem 0.5rem",
                            borderRadius: 6,
                          }}
                        >
                          {ci.dayOfWeek}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.15rem" }}>
                        {ci.weekTitle && (
                          <span style={{ color: C.textSub, fontSize: "0.75rem" }}>
                            {ci.weekTitle}
                          </span>
                        )}
                        <span style={{ color: C.textSub, fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "0.2rem" }}>
                          <Clock size={10} />
                          {formatDistanceToNow(new Date(ci.createdAt), { addSuffix: true, locale: ko })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Photo */}
                  {ci.imageUrl ? (
                    <div
                      style={{
                        width: "100%",
                        borderRadius: 12,
                        overflow: "hidden",
                        marginBottom: ci.postContent ? "0.75rem" : "1rem",
                        background: C.surfaceLight,
                      }}
                    >
                      <img
                        src={ci.imageUrl}
                        alt={`${ci.nickname} 인증 사진`}
                        style={{
                          width: "100%",
                          maxHeight: 400,
                          objectFit: "cover",
                          display: "block",
                        }}
                      />
                    </div>
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: 160,
                        borderRadius: 12,
                        background: C.surfaceLight,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        marginBottom: ci.postContent ? "0.75rem" : "1rem",
                      }}
                    >
                      <ImageOff size={32} color={C.textSub} />
                      <span style={{ color: C.textSub, fontSize: "0.8rem" }}>사진 없음</span>
                    </div>
                  )}

                  {/* Post content */}
                  {ci.postContent && (
                    <p
                      style={{
                        color: C.text,
                        fontSize: "0.85rem",
                        lineHeight: 1.5,
                        margin: "0 0 1rem 0",
                        padding: "0.75rem",
                        background: C.surfaceLight,
                        borderRadius: 10,
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {ci.postContent}
                    </p>
                  )}

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => handleApprove(ci.id)}
                      disabled={isProcessing}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                        padding: "0.75rem",
                        background: isProcessing ? C.surfaceLight : C.primary,
                        color: isProcessing ? C.textSub : "#000",
                        border: "none",
                        borderRadius: 12,
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        cursor: isProcessing ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      {isProcessing ? (
                        <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        <CheckCircle size={16} />
                      )}
                      승인
                    </button>
                    <button
                      onClick={() => setRejectTarget(ci.id)}
                      disabled={isProcessing}
                      style={{
                        flex: 1,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.4rem",
                        padding: "0.75rem",
                        background: isProcessing ? C.surfaceLight : "#FF525222",
                        color: isProcessing ? C.textSub : "#FF5252",
                        border: `1px solid ${isProcessing ? "transparent" : "#FF525244"}`,
                        borderRadius: 12,
                        fontSize: "0.9rem",
                        fontWeight: 700,
                        cursor: isProcessing ? "not-allowed" : "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <XCircle size={16} />
                      반려
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Reject reason modal */}
      <AnimatePresence>
        {rejectTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
              zIndex: 1000,
              padding: "1rem",
            }}
            onClick={() => { setRejectTarget(null); setRejectReason(""); }}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: C.surface,
                borderRadius: `${C.radius} ${C.radius} 0 0`,
                padding: "1.5rem",
                width: "100%",
                maxWidth: 480,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                <h3 style={{ color: C.text, fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                  반려 사유
                </h3>
                <button
                  onClick={() => { setRejectTarget(null); setRejectReason(""); }}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}
                >
                  <X size={20} color={C.textSub} />
                </button>
              </div>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="반려 사유를 입력하세요 (선택)"
                rows={3}
                style={{
                  width: "100%",
                  background: C.surfaceLight,
                  color: C.text,
                  border: "none",
                  borderRadius: 12,
                  padding: "0.75rem",
                  fontSize: "0.9rem",
                  resize: "none",
                  outline: "none",
                  fontFamily: "inherit",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={handleRejectSubmit}
                disabled={processingIds.has(rejectTarget)}
                style={{
                  width: "100%",
                  marginTop: "0.75rem",
                  padding: "0.85rem",
                  background: "#FF5252",
                  color: "#fff",
                  border: "none",
                  borderRadius: 12,
                  fontSize: "0.95rem",
                  fontWeight: 700,
                  cursor: processingIds.has(rejectTarget) ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                }}
              >
                {processingIds.has(rejectTarget) ? (
                  <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <XCircle size={16} />
                )}
                반려 확인
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </main>
  );
}
