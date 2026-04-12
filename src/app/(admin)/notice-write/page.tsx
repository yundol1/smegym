"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Megaphone,
  Send,
  Eye,
  Loader2,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import type { Notice } from "@/types/database";

const C = {
  bg: "#0A0A0A",
  surface: "#1A1A1A",
  primary: "#00E676",
  secondary: "#00B0FF",
  text: "#FFFFFF",
  textSub: "#666666",
  radius: "20px",
} as const;

export default function NoticeWritePage() {
  const { user } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [content, setContent] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isPosting, setIsPosting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notices, setNotices] = useState<
    (Notice & { author_nickname?: string })[]
  >([]);
  const [isFetching, setIsFetching] = useState(true);

  const fetchNotices = useCallback(async () => {
    setIsFetching(true);
    const { data } = await supabase
      .from("notices")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    if (data) {
      const noticeData = data as Notice[];
      // Fetch author nicknames
      const authorIds = [...new Set(noticeData.map((n) => n.author_id))];
      const { data: authors } = await supabase
        .from("users")
        .select("id, nickname")
        .in("id", authorIds) as { data: { id: string; nickname: string }[] | null };

      const authorMap = new Map(
        (authors ?? []).map((a) => [a.id, a.nickname])
      );

      setNotices(
        noticeData.map((n) => ({
          ...n,
          author_nickname: authorMap.get(n.author_id),
        }))
      );
    }
    setIsFetching(false);
  }, [supabase]);

  useEffect(() => {
    fetchNotices();
  }, [fetchNotices]);

  const handlePost = async () => {
    if (!user || !content.trim()) return;
    setIsPosting(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/notices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author_id: user.id,
          content: content.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "공지 등록 실패");
      } else {
        setContent("");
        setShowPreview(false);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2500);
        await fetchNotices();
      }
    } catch {
      setError("네트워크 오류가 발생했습니다");
    } finally {
      setIsPosting(false);
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
        <Megaphone size={28} color={C.primary} />
        공지 작성
      </motion.h1>

      {/* Textarea */}
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
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="공지 내용을 입력하세요..."
          style={{
            width: "100%",
            minHeight: 160,
            background: C.bg,
            color: C.text,
            border: `1px solid ${C.textSub}33`,
            borderRadius: "12px",
            padding: 16,
            fontSize: 15,
            lineHeight: 1.6,
            resize: "vertical",
            outline: "none",
            fontFamily: "inherit",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = `${C.primary}66`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = `${C.textSub}33`;
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 12,
          }}
        >
          <button
            onClick={() => setShowPreview(!showPreview)}
            style={{
              background: "transparent",
              color: C.secondary,
              border: `1px solid ${C.secondary}44`,
              borderRadius: "10px",
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Eye size={16} />
            {showPreview ? "미리보기 닫기" : "미리보기"}
          </button>

          <div style={{ color: C.textSub, fontSize: 13 }}>
            {content.length}자
          </div>
        </div>
      </motion.div>

      {/* Preview */}
      <AnimatePresence>
        {showPreview && content.trim() && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden", marginBottom: 16 }}
          >
            <div
              style={{
                background: C.surface,
                borderRadius: C.radius,
                padding: 20,
                border: `1px solid ${C.secondary}33`,
              }}
            >
              <div
                style={{
                  color: C.secondary,
                  fontSize: 13,
                  fontWeight: 600,
                  marginBottom: 12,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                미리보기
              </div>
              <div
                style={{
                  color: C.text,
                  fontSize: 15,
                  lineHeight: 1.7,
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {content}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Post button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handlePost}
        disabled={isPosting || !content.trim()}
        style={{
          width: "100%",
          padding: "16px 24px",
          background: content.trim()
            ? `linear-gradient(135deg, ${C.primary}, ${C.secondary})`
            : C.textSub + "33",
          color: content.trim() ? "#000" : C.textSub,
          border: "none",
          borderRadius: C.radius,
          fontSize: 16,
          fontWeight: 700,
          cursor: isPosting || !content.trim() ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        {isPosting ? (
          <>
            <Loader2
              size={20}
              style={{ animation: "spin 1s linear infinite" }}
            />
            등록 중...
          </>
        ) : (
          <>
            <Send size={20} />
            공지 등록
          </>
        )}
      </motion.button>
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

      {/* Success animation */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.6)",
              zIndex: 1000,
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ duration: 0.5 }}
              style={{
                background: C.surface,
                borderRadius: C.radius,
                padding: 40,
                textAlign: "center",
              }}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ delay: 0.3, duration: 0.4 }}
              >
                <CheckCircle size={56} color={C.primary} />
              </motion.div>
              <div
                style={{
                  color: C.text,
                  fontSize: 18,
                  fontWeight: 700,
                  marginTop: 16,
                }}
              >
                공지가 등록되었습니다
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recent notices */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2
          style={{
            color: C.text,
            fontSize: 18,
            fontWeight: 700,
            marginBottom: 16,
            marginTop: 32,
          }}
        >
          최근 공지
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
        ) : notices.length === 0 ? (
          <div
            style={{
              color: C.textSub,
              textAlign: "center",
              padding: 30,
              fontSize: 14,
            }}
          >
            등록된 공지가 없습니다
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {notices.map((notice, i) => (
              <motion.div
                key={notice.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i }}
                style={{
                  background: C.surface,
                  borderRadius: "14px",
                  padding: 16,
                }}
              >
                <div
                  style={{
                    color: C.text,
                    fontSize: 14,
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    marginBottom: 10,
                  }}
                >
                  {notice.content}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div style={{ color: C.textSub, fontSize: 12 }}>
                    {notice.author_nickname ?? "관리자"} |{" "}
                    {format(
                      new Date(notice.created_at),
                      "yyyy.MM.dd HH:mm",
                      { locale: ko }
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
