"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Bell, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from "@/lib/supabase/client";
import type { Notice } from "@/types/database";

export default function NoticesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from("notices")
          .select("id, content, created_at")
          .order("created_at", { ascending: false })
          .limit(30);

        if (data) setNotices(data);
      } catch (err) {
        console.error("Failed to load notices:", err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [supabase]);

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
        <Bell size={28} style={{ color: "#00E676" }} />
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            fontFamily: "var(--font-heading)",
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
          }}
        >
          공지사항
        </h1>
      </header>

      {/* Notice List */}
      {notices.length === 0 ? (
        <div
          style={{
            padding: "3rem 1rem",
            textAlign: "center",
            color: "#444444",
            fontSize: "0.875rem",
          }}
        >
          등록된 공지사항이 없습니다.
        </div>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
          }}
        >
          {notices.map((notice, index) => (
            <motion.article
              key={notice.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.04 }}
              style={{
                background: "#1A1A1A",
                borderRadius: "20px",
                padding: "1.25rem",
                border: "1px solid #222222",
                borderLeft: "3px solid #00E676",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {/* Author + Time */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    color: "#00E676",
                  }}
                >
                  <span
                    style={{
                      width: "6px",
                      height: "6px",
                      borderRadius: "50%",
                      background: "#00E676",
                      display: "inline-block",
                      boxShadow: "0 0 6px #00E676",
                    }}
                  />
                  관리자
                </span>
                <span
                  style={{
                    fontSize: "0.6875rem",
                    color: "#444444",
                  }}
                >
                  {formatDistanceToNow(new Date(notice.created_at), {
                    addSuffix: true,
                    locale: ko,
                  })}
                </span>
              </div>

              {/* Content */}
              <p
                style={{
                  fontSize: "0.875rem",
                  lineHeight: 1.7,
                  color: "#FFFFFF",
                  opacity: 0.9,
                  whiteSpace: "pre-wrap",
                }}
              >
                {notice.content}
              </p>
            </motion.article>
          ))}
        </div>
      )}
    </main>
  );
}
