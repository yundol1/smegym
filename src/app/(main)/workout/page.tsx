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

  const [user, setUser] = useState<User | null>(null);
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

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

          if (weekCheckIns) setCheckIns(weekCheckIns);
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
      const filePath = `workout-photos/${user.id}/${currentWeek.id}_${selectedDay.dayOfWeek}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("workout-photos")
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("workout-photos").getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("check_ins").insert({
        user_id: user.id,
        week_id: currentWeek.id,
        day_of_week: selectedDay.dayOfWeek,
        status: "△",
        image_url: publicUrl,
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

      if (updatedCheckIns) setCheckIns(updatedCheckIns);

      setShowModal(false);
    } catch (err) {
      console.error("Upload error:", err);
      alert("업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  function getStatusIcon(status: CheckStatus) {
    switch (status) {
      case "O":
        return <CheckCircle2 size={20} style={{ color: "#22c55e" }} />;
      case "△":
        return <Clock size={20} style={{ color: "#eab308" }} />;
      case "X":
        return <XCircle size={20} style={{ color: "#ef4444" }} />;
      case "☆":
        return <Star size={20} style={{ color: "#a855f7" }} />;
      default:
        return null;
    }
  }

  function getStatusLabel(status: CheckStatus) {
    switch (status) {
      case "O":
        return "승인됨";
      case "△":
        return "검토 대기중";
      case "X":
        return "반려됨";
      case "☆":
        return "면제";
      default:
        return "미인증";
    }
  }

  function getStatusColor(status: CheckStatus) {
    switch (status) {
      case "O":
        return "#22c55e";
      case "△":
        return "#eab308";
      case "X":
        return "#ef4444";
      case "☆":
        return "#a855f7";
      default:
        return "#64748b";
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
            color: "var(--foreground)",
            opacity: 0.7,
          }}
        >
          <ChevronLeft size={24} />
        </button>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>운동 인증</h1>
          <p style={{ fontSize: "0.75rem", opacity: 0.5 }}>
            {currentWeek?.title ?? "이번 주"}
          </p>
        </div>
      </header>

      {/* Day Cards */}
      <section
        style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
      >
        {days.map((day, i) => {
          const status = day.checkIn?.status ?? null;
          const statusColor = getStatusColor(status);
          const isClickable = !day.checkIn;

          return (
            <motion.div
              key={day.dayOfWeek}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="card"
              onClick={() => isClickable && handleDayClick(day)}
              style={{
                padding: "1rem 1.25rem",
                cursor: isClickable ? "pointer" : "default",
                borderLeft: `3px solid ${statusColor}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    minWidth: "2.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.6875rem",
                      opacity: 0.5,
                      fontWeight: 600,
                    }}
                  >
                    {day.label}
                  </span>
                  <span style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                    {format(day.date, "d")}
                  </span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
                  <span
                    style={{
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      color: statusColor,
                    }}
                  >
                    {getStatusLabel(status)}
                  </span>
                  {status === "X" && day.checkIn?.reject_reason && (
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        color: "#ef4444",
                        opacity: 0.8,
                      }}
                    >
                      사유: {day.checkIn.reject_reason}
                    </span>
                  )}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                }}
              >
                {status === "O" && day.checkIn?.image_url && (
                  <img
                    src={day.checkIn.image_url}
                    alt="인증 사진"
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "0.5rem",
                      objectFit: "cover",
                    }}
                  />
                )}
                {getStatusIcon(status)}
                {!day.checkIn && (
                  <Camera
                    size={20}
                    style={{ color: "var(--primary)", opacity: 0.7 }}
                  />
                )}
              </div>
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
              background: "rgba(0,0,0,0.75)",
              zIndex: 50,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
            onClick={() => !uploading && setShowModal(false)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="glass"
              style={{
                width: "100%",
                maxWidth: "480px",
                maxHeight: "85vh",
                overflowY: "auto",
                padding: "1.5rem",
                borderRadius: "1.5rem 1.5rem 0 0",
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
                <h2 style={{ fontSize: "1.125rem", fontWeight: 700 }}>
                  {format(selectedDay.date, "M월 d일", { locale: ko })}{" "}
                  ({selectedDay.label}) 인증
                </h2>
                <button
                  onClick={() => !uploading && setShowModal(false)}
                  style={{ color: "var(--foreground)", opacity: 0.5 }}
                >
                  <X size={22} />
                </button>
              </div>

              {/* Photo Upload Area */}
              <input
                ref={fileInputRef}
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
                      borderRadius: "1rem",
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
                    border: "2px dashed var(--glass-border)",
                    borderRadius: "1rem",
                    padding: "2.5rem",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "0.75rem",
                    color: "var(--foreground)",
                    opacity: 0.5,
                  }}
                >
                  <Upload size={32} />
                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
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
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "0.75rem",
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
                    <Eye size={18} style={{ color: "var(--primary)" }} />
                  ) : (
                    <EyeOff size={18} style={{ opacity: 0.5 }} />
                  )}
                  <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>
                    갤러리 공유
                  </span>
                </div>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  style={{
                    width: "3rem",
                    height: "1.625rem",
                    borderRadius: "1rem",
                    background: isPublic
                      ? "var(--primary)"
                      : "rgba(255,255,255,0.1)",
                    position: "relative",
                    transition: "background 0.2s ease",
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
                    opacity: 0.7,
                  }}
                >
                  <FileText size={16} />
                  <span style={{ fontSize: "0.8125rem", fontWeight: 500 }}>
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
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--glass-border)",
                    borderRadius: "0.75rem",
                    color: "var(--foreground)",
                    fontFamily: "inherit",
                    fontSize: "0.875rem",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!selectedFile || uploading}
                className="btn-primary"
                style={{
                  padding: "0.875rem",
                  fontSize: "1rem",
                  width: "100%",
                  opacity: !selectedFile || uploading ? 0.5 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem",
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
