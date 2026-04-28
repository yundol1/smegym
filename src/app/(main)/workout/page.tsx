"use client";

import { useEffect, useState, useRef, useMemo } from "react";
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
  ChevronRight,
  FileText,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { User, Week, CheckIn } from "@/types/database";
import { format, addDays, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

type CheckStatus = "O" | "△" | "X" | "☆" | null;

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const COMPRESS_THRESHOLD = 2 * 1024 * 1024; // 2MB
const MAX_IMAGE_WIDTH = 1920;
const THUMB_MAX_DIMENSION = 480; // 썸네일 최대 가로 또는 세로

function createThumbnail(file: File | Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;

      // 원본 비율 유지하면서 최대 480px로 축소
      if (width > THUMB_MAX_DIMENSION || height > THUMB_MAX_DIMENSION) {
        if (width > height) {
          height = Math.round(height * (THUMB_MAX_DIMENSION / width));
          width = THUMB_MAX_DIMENSION;
        } else {
          width = Math.round(width * (THUMB_MAX_DIMENSION / height));
          height = THUMB_MAX_DIMENSION;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => resolve(blob || file),
        "image/jpeg",
        0.75
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("썸네일 생성 실패")); };
    img.src = url;
  });
}

function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width <= MAX_IMAGE_WIDTH) {
        resolve(file);
        return;
      }
      const ratio = MAX_IMAGE_WIDTH / width;
      width = MAX_IMAGE_WIDTH;
      height = Math.round(height * ratio);

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressed = new File([blob], file.name, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });
          resolve(compressed);
        },
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };
    img.src = url;
  });
}

function addTimestamp(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      // Draw original image
      ctx.drawImage(img, 0, 0, width, height);

      // Semi-transparent bar at the bottom
      const barHeight = 40;
      ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
      ctx.fillRect(0, height - barHeight, width, barHeight);

      // Timestamp text
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const hh = String(now.getHours()).padStart(2, "0");
      const mi = String(now.getMinutes()).padStart(2, "0");
      const timestamp = `SME GYM \u00b7 ${yyyy}.${mm}.${dd} ${hh}:${mi}`;

      ctx.font = "bold 14px sans-serif";
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(timestamp, width / 2, height - barHeight / 2);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.92
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 불러올 수 없습니다."));
    };
    img.src = url;
  });
}

interface DayCard {
  dayOfWeek: number;
  label: string;
  date: Date;
  checkIn: CheckIn | null;
}

export default function WorkoutPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<User | null>(null);
  const [weeks, setWeeks] = useState<Week[]>([]);
  const [selectedWeekIdx, setSelectedWeekIdx] = useState(0);
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [signedUrls, setSignedUrls] = useState<Record<number, string>>({});

  const isCurrentWeek = selectedWeekIdx === 0;

  // Upload modal state
  const [selectedDay, setSelectedDay] = useState<DayCard | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [postContent, setPostContent] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // Load user and weeks list on mount
  useEffect(() => {
    async function loadInitial() {
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

        // Fetch last 4 weeks ordered by start_date DESC (index 0 = most recent / current)
        const { data: weeksData } = (await supabase
          .from("weeks")
          .select("*")
          .order("start_date", { ascending: false })
          .limit(4)) as unknown as { data: Week[] | null };

        if (weeksData && weeksData.length > 0) {
          setWeeks(weeksData);
          setSelectedWeekIdx(0);
          setCurrentWeek(weeksData[0]);
        }
      } catch (err) {
        console.error("Workout load error:", err);
      }
    }

    loadInitial();
  }, [router, supabase]);

  // Load check-ins whenever the selected week changes
  useEffect(() => {
    async function loadWeekData() {
      if (!user || weeks.length === 0) return;

      const week = weeks[selectedWeekIdx];
      if (!week) return;

      setLoading(true);
      setCurrentWeek(week);

      try {
        const { data: weekCheckIns } = (await supabase
          .from("check_ins")
          .select("*")
          .eq("user_id", user.id)
          .eq("week_id", week.id)
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
        } else {
          setCheckIns([]);
          setSignedUrls({});
        }
      } catch (err) {
        console.error("Week data load error:", err);
      } finally {
        setLoading(false);
      }
    }

    loadWeekData();
  }, [user, weeks, selectedWeekIdx, supabase]);

  function goToPrevWeek() {
    if (selectedWeekIdx < weeks.length - 1) {
      setSelectedWeekIdx(selectedWeekIdx + 1);
    }
  }

  function goToNextWeek() {
    if (selectedWeekIdx > 0) {
      setSelectedWeekIdx(selectedWeekIdx - 1);
    }
  }

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
    if (!isCurrentWeek) return; // Read-only for past weeks
    if (day.checkIn && day.checkIn.status !== "X") return;
    setSelectedDay(day);
    setSelectedFile(null);
    setPreviewUrl(null);
    setIsPublic(true);
    setPostContent("");
    setFileError(null);
    setShowModal(true);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileError(null);

    // Type validation
    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError("지원하지 않는 파일 형식입니다. (JPEG, PNG, WebP, HEIC만 가능)");
      e.target.value = "";
      return;
    }

    // Size validation
    if (file.size > MAX_FILE_SIZE) {
      setFileError("파일 크기가 10MB를 초과합니다.");
      e.target.value = "";
      return;
    }

    // Compress if > 2MB
    let processedFile = file;
    if (file.size > COMPRESS_THRESHOLD && file.type !== "image/heic") {
      try {
        processedFile = await compressImage(file);
      } catch {
        // Use original if compression fails
      }
    }

    setSelectedFile(processedFile);
    const url = URL.createObjectURL(processedFile);
    setPreviewUrl(url);
  }

  async function handleSubmit() {
    if (!selectedFile || !selectedDay || !user || !currentWeek) return;

    setUploading(true);
    try {
      // Add SME GYM timestamp watermark
      const timestampedBlob = await addTimestamp(selectedFile);
      const timestampedFile = new File([timestampedBlob], selectedFile.name, {
        type: "image/jpeg",
        lastModified: Date.now(),
      });

      const ext = selectedFile.name.split(".").pop() || "jpg";
      const filePath = `${user.id}/${currentWeek.id}_${selectedDay.dayOfWeek}.${ext}`;
      const thumbPath = `${user.id}/${currentWeek.id}_${selectedDay.dayOfWeek}_thumb.jpg`;

      // 원본 + 썸네일 병렬 업로드
      const thumbnailBlob = await createThumbnail(timestampedBlob);

      const [uploadResult, thumbResult] = await Promise.all([
        supabase.storage.from("workout-photos").upload(filePath, timestampedFile, { upsert: true }),
        supabase.storage.from("workout-photos").upload(thumbPath, thumbnailBlob, { upsert: true }),
      ]);

      if (uploadResult.error) throw uploadResult.error;
      if (thumbResult.error) console.warn("썸네일 업로드 실패:", thumbResult.error);

      // If re-uploading after rejection, update existing record; otherwise insert new
      if (selectedDay.checkIn && selectedDay.checkIn.status === "X") {
        const { error: updateError } = await supabase
          .from("check_ins")
          .update({
            status: "△",
            image_url: filePath,
            is_public: isPublic,
            post_content: postContent.trim() || null,
            reject_reason: null,
            reviewed_by: null,
            reviewed_at: null,
          } as never)
          .eq("id", selectedDay.checkIn.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("check_ins").insert({
          user_id: user.id,
          week_id: currentWeek.id,
          day_of_week: selectedDay.dayOfWeek,
          status: "△",
          image_url: filePath,
          is_public: isPublic,
          post_content: postContent.trim() || null,
        } as never);

        if (insertError) throw insertError;
      }

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
        <div style={{ flex: 1 }}>
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
            {!isCurrentWeek && (
              <span style={{ marginLeft: "0.5rem", color: "#FFD600", fontWeight: 700 }}>
                지난주 기록
              </span>
            )}
          </p>
        </div>
        {/* Week navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.25rem" }}>
          <button
            onClick={goToPrevWeek}
            disabled={selectedWeekIdx >= weeks.length - 1}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              background: "#1A1A1A",
              border: "1px solid #333333",
              color: selectedWeekIdx >= weeks.length - 1 ? "#333333" : "#FFFFFF",
              cursor: selectedWeekIdx >= weeks.length - 1 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={goToNextWeek}
            disabled={selectedWeekIdx <= 0}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "2rem",
              height: "2rem",
              borderRadius: "50%",
              background: "#1A1A1A",
              border: "1px solid #333333",
              color: selectedWeekIdx <= 0 ? "#333333" : "#FFFFFF",
              cursor: selectedWeekIdx <= 0 ? "not-allowed" : "pointer",
            }}
          >
            <ChevronRight size={16} />
          </button>
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
          const isClickable = !day.checkIn || status === "X";
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
              {day.checkIn && status !== "X" ? (
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
              ) : status === "X" ? (
                isCurrentWeek ? (
                  <button
                    onClick={() => handleDayClick(day)}
                    style={{
                      padding: "0.5rem 1rem",
                      borderRadius: "2rem",
                      background: "#FF5252",
                      color: "#FFFFFF",
                      fontSize: "0.75rem",
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.375rem",
                      whiteSpace: "nowrap",
                      boxShadow: "0 0 15px rgba(255,82,82,0.2)",
                    }}
                  >
                    <Camera size={14} />
                    재업로드
                  </button>
                ) : (
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
                )
              ) : (
                isCurrentWeek ? (
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
                ) : (
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
                )
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
              background: "rgba(0,0,0,0.95)",
              zIndex: 9999,
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
                padding: "1.5rem",
                paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px) + 5rem)",
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
                accept="image/jpeg,image/png,image/webp,image/heic"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />

              {fileError && (
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderRadius: "0.75rem",
                    background: "rgba(255, 82, 82, 0.1)",
                    border: "1px solid rgba(255, 82, 82, 0.3)",
                    color: "#FF5252",
                    fontSize: "0.8125rem",
                    fontWeight: 600,
                  }}
                >
                  {fileError}
                </div>
              )}

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
