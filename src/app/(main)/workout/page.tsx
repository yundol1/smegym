"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  XCircle,
  Clock,
  Star,
  Upload,
  X,
  Eye,
  EyeOff,
  Dumbbell,
  ChevronLeft,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User, Week, CheckIn } from "@/types/database";
import { format, addDays, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

type CheckStatus = "O" | "△" | "X" | "☆" | null;

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

interface DayCard {
  dayOfWeek: number;
  label: string;
  date: Date;
  checkIn: CheckIn | null;
}

export default function WorkoutPage() {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [signedUrls, setSignedUrls] = useState<Record<number, string>>({});

  // Upload modal state
  const [selectedDay, setSelectedDay] = useState<DayCard | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [postContent, setPostContent] = useState("");
  const [showModal, setShowModal] = useState(false);

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

        const { data: weekData } = (await supabase
          .from("weeks")
          .select("*")
          .eq("is_current" as string, true)
          .single()) as unknown as { data: Week | null };

        if (weekData) {
          setCurrentWeek(weekData);

          const { data: weekCheckIns } = (await supabase
            .from("check_ins")
            .select("*")
            .eq("user_id", authUser.id)
            .eq("week_id", weekData.id)
            .order("day_of_week", { ascending: true })) as unknown as {
            data: CheckIn[] | null;
          };

          if (weekCheckIns) {
            setCheckIns(weekCheckIns);
            // Generate signed URLs for check-ins with images
            const urls: Record<number, string> = {};
            for (const ci of weekCheckIns) {
              if (ci.image_url) {
                const { data } = await supabase.storage
                  .from("workout-photos")
                  .createSignedUrl(ci.image_url, 3600);
                if (data?.signedUrl) {
                  urls[ci.day_of_week] = data.signedUrl;
                }
              }
            }
            setSignedUrls(urls);
          }
        }
      } catch (err) {
        console.error("Workout load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router, supabase]);

  const checkInMap: Record<number, CheckIn> = {};
  for (const ci of checkIns) {
    checkInMap[ci.day_of_week] = ci;
  }

  const days: DayCard[] = DAY_LABELS.map((label, i) => {
    const dayOfWeek = i + 1;
    const date = currentWeek
      ? addDays(parseISO(currentWeek.start_date), i)
      : new Date();
    return {
      dayOfWeek,
      label,
      date,
      checkIn: checkInMap[dayOfWeek] ?? null,
    };
  });

  function handleDayClick(day: DayCard) {
    if (day.checkIn) return;
    setSelectedDay(day);
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsPublic(true);
    setPostContent("");
    setShowModal(true);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  }

  async function handleSubmit() {
    if (!selectedFile || !selectedDay || !user || !currentWeek) return;

    setUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/${currentWeek.id}_${selectedDay.dayOfWeek}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("workout-photos")
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase.from("check_ins").insert({
        user_id: user.id,
        week_id: currentWeek.id,
        day_of_week: selectedDay.dayOfWeek,
        status: "△",
        image_url: filePath,
        is_public: isPublic,
        post_content: postContent.trim() || null,
      } as any);

      if (insertError) throw insertError;

      // Reload check-ins
      const { data: updatedCheckIns } = (await supabase
        .from("check_ins")
        .select("*")
        .eq("user_id", user.id)
        .eq("week_id", currentWeek.id)
        .order("day_of_week", { ascending: true })) as unknown as {
        data: CheckIn[] | null;
      };

      if (updatedCheckIns) {
        setCheckIns(updatedCheckIns);
        // Generate signed URLs for updated check-ins
        const urls: Record<number, string> = {};
        for (const ci of updatedCheckIns) {
          if (ci.image_url) {
            const { data } = await supabase.storage
              .from("workout-photos")
              .createSignedUrl(ci.image_url, 3600);
            if (data?.signedUrl) {
              urls[ci.day_of_week] = data.signedUrl;
            }
          }
        }
        setSignedUrls(urls);
      }

      setShowModal(false);
    } catch (err) {
      console.error("Upload error:", err);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function getStatusBadge(status: CheckStatus): { label: string; bg: string; color: string } {
    switch (status) {
      case "O":
        return { label: "승인됨", bg: "rgba(0,230,118,0.2)", color: "#00E676" };
      case "△":
        return { label: "대기중", bg: "rgba(0,176,255,0.2)", color: "#00B0FF" };
      case "X":
        return { label: "반려", bg: "rgba(255,82,82,0.2)", color: "#FF5252" };
      case "☆":
        return { label: "면제", bg: "rgba(0,230,118,0.15)", color: "#00E676" };
      default:
        return { label: "휴식", bg: "rgba(68,68,68,0.3)", color: "#444444" };
    }
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
          <Dumbbell size={32} style={{ color: "#00E676" }} />
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
        gap: "1.25rem",
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
            color: "#FFFFFF",
            opacity: 0.7,
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1
            style={{
              fontSize: "1.25rem",
              fontWeight: 800,
              fontFamily: "var(--font-heading)",
              color: "#FFFFFF",
            }}
          >
            운동 인증
          </h1>
          <p style={{ fontSize: "0.75rem", color: "#666666" }}>
            {currentWeek?.title ?? "이번 주"}
          </p>
        </div>
      </header>

      {/* Day Cards - Vertical List */}
      <section
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {days.map((day, i) => {
          const status = day.checkIn?.status ?? null;
          const badge = getStatusBadge(status);
          const isClickable = !day.checkIn;
          const todayDow = new Date().getDay();
          const todayIdx = todayDow === 0 ? 7 : todayDow;
          const isToday = day.dayOfWeek === todayIdx;

          return (
            <motion.div
              key={day.dayOfWeek}
              data-testid={`day-card-${day.dayOfWeek}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              style={{
                background: "#1A1A1A",
                borderRadius: "var(--radius)",
                border: `1px solid ${isToday ? "rgba(0,230,118,0.4)" : status === "O" ? "rgba(0,230,118,0.2)" : "#222222"}`,
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {/* Day badge */}
              <div
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "0.875rem",
                  background: isToday ? "rgba(0,230,118,0.15)" : "#222222",
                  border: isToday ? "1px solid rgba(0,230,118,0.3)" : "none",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: "1.125rem", fontWeight: 900, fontFamily: "var(--font-heading)", color: "#FFFFFF", lineHeight: 1 }}>
                  {format(day.date, "d")}
                </span>
                <span style={{ fontSize: "0.625rem", color: "#666666", fontWeight: 600 }}>
                  {day.label}
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.875rem", fontWeight: 600, color: "#FFFFFF" }}>
                  {day.label}요일{isToday && <span style={{ color: "#00E676", marginLeft: "0.5rem", fontSize: "0.75rem" }}>오늘</span>}
                </div>
                <div style={{ fontSize: "0.75rem", color: "#666666", marginTop: "0.125rem" }}>
                  {status === "O" && "관리자 승인 완료"}
                  {status === "△" && "검토를 기다리는 중..."}
                  {status === "X" && `반려: ${day.checkIn?.reject_reason || ""}`}
                  {status === "☆" && "면제 승인됨"}
                  {!status && "사진을 업로드해주세요"}
                </div>
              </div>

              {/* Status badge or Upload button */}
              {day.checkIn ? (
                <div
                  style={{
                    padding: "0.375rem 0.75rem",
                    borderRadius: "2rem",
                    background: badge.bg,
                    color: badge.color,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    whiteSpace: "nowrap",
                  }}
                >
                  {badge.label}
                </div>
              ) : (
                <button
                  onClick={() => handleDayClick(day)}
                  style={{
                    padding: "0.5rem 1rem",
                    borderRadius: "2rem",
                    background: "#00E676",
                    color: "#0A0A0A",
                    fontSize: "0.75rem",
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    whiteSpace: "nowrap",
                    boxShadow: "0 0 15px rgba(0,230,118,0.2)",
                  }}
                >
                  <Camera size={14} />
                  업로드
                </button>
              )}
            </motion.div>
          );
        })}
      </section>

      {/* Upload Modal */}
      <AnimatePresence>
        {showModal && selectedDay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.85)",
              zIndex: 200,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
            onClick={() => !uploading && setShowModal(false)}
          >
            <motion.div
              data-testid="upload-modal"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "480px",
                maxHeight: "85vh",
                overflowY: "auto",
                padding: "1.5rem 1.5rem 6rem 1.5rem",
                borderRadius: "var(--radius) var(--radius) 0 0",
                background: "#1A1A1A",
                border: "1px solid #222222",
                borderBottom: "none",
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {/* Modal Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <h2
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 800,
                    fontFamily: "var(--font-heading)",
                    color: "#FFFFFF",
                  }}
                >
                  {format(selectedDay.date, "M월 d일", { locale: ko })}{" "}
                  ({selectedDay.label}) 인증
                </h2>
                <button
                  onClick={() => !uploading && setShowModal(false)}
                  style={{ color: "#666666" }}
                >
                  <X size={22} />
                </button>
              </div>

              {/* Photo Upload Area */}
              <input
                ref={fileInputRef}
                data-testid="file-input"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              {previewUrl ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={previewUrl}
                    alt="미리보기"
                    style={{
                      width: "100%",
                      maxHeight: "300px",
                      objectFit: "cover",
                      borderRadius: "16px",
                    }}
                  />
                  <button
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    style={{
                      position: "absolute",
                      top: "0.5rem",
                      right: "0.5rem",
                      background: "rgba(0,0,0,0.6)",
                      borderRadius: "50%",
                      width: "2rem",
                      height: "2rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "white",
                    }}
                  >
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed #444444",
                    borderRadius: "16px",
                    padding: "2.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.75rem",
                    color: "#666666",
                    background: "transparent",
                  }}
                >
                  <Upload size={32} />
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                    사진을 선택하세요
                  </span>
                </button>
              )}

              {/* Gallery Share Toggle */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1rem",
                  background: "#222222",
                  borderRadius: "12px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                  }}
                >
                  {isPublic ? (
                    <Eye size={18} style={{ color: "#00E676" }} />
                  ) : (
                    <EyeOff size={18} style={{ color: "#666666" }} />
                  )}
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#FFFFFF" }}>
                    갤러리 공유
                  </span>
                </div>
                <button
                  data-testid="gallery-toggle"
                  onClick={() => setIsPublic(!isPublic)}
                  style={{
                    width: "3rem",
                    height: "1.625rem",
                    borderRadius: "1rem",
                    background: isPublic ? "#00E676" : "#444444",
                    position: "relative",
                    transition: "background 0.2s ease",
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: "1.25rem",
                      height: "1.25rem",
                      borderRadius: "50%",
                      background: "white",
                      position: "absolute",
                      top: "0.1875rem",
                      left: isPublic ? "1.5625rem" : "0.1875rem",
                      transition: "left 0.2s ease",
                    }}
                  />
                </button>
              </div>

              {/* Post Content */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "#666666",
                  }}
                >
                  <FileText size={16} />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                    인증 글 (선택)
                  </span>
                </div>
                <textarea
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder="오늘 운동은 어떠셨나요?"
                  maxLength={200}
                  style={{
                    width: "100%",
                    minHeight: "5rem",
                    padding: "0.75rem",
                    background: "#222222",
                    border: "1px solid #333333",
                    borderRadius: "12px",
                    color: "#FFFFFF",
                    fontFamily: "inherit",
                    fontSize: "0.875rem",
                    resize: "vertical",
                    outline: "none",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#00E676";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#333333";
                  }}
                />
              </div>

              {/* Submit Button */}
              <motion.button
                data-testid="upload-submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!selectedFile || uploading}
                style={{
                  padding: "1rem",
                  fontSize: "1rem",
                  fontWeight: 700,
                  fontFamily: "var(--font-heading)",
                  width: "100%",
                  opacity: !selectedFile || uploading ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
                  background: "#00E676",
                  color: "#0A0A0A",
                  borderRadius: "var(--radius)",
                  border: "none",
                  cursor: !selectedFile || uploading ? "not-allowed" : "pointer",
                  boxShadow: "0 0 30px rgba(0, 230, 118, 0.3)",
                }}
              >
                {uploading ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        repeat: Infinity,
                        duration: 1,
                        ease: "linear",
                      }}
                    >
                      <Dumbbell size={18} />
                    </motion.div>
                    업로드 중...
                  </>
                ) : (
                  <>
                    <Camera size={18} />
                    인증하기
                  </>
                )}
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
