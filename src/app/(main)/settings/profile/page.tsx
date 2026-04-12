"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Loader2,
  User as UserIcon,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";

export default function ProfileEditPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading } = useAuth();
  const supabase = createClient();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.profile_image_url) {
      setPreviewUrl(profile.profile_image_url);
    }
  }, [profile]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setToast("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setToast("파일 크기는 5MB 이하여야 합니다.");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      let newProfileImageUrl = profile?.profile_image_url || null;

      if (selectedFile) {
        const ext = selectedFile.name.split(".").pop() || "jpg";
        const filePath = `${user.id}/profile.${ext}`;

        // Upload to Supabase Storage
        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(filePath, selectedFile, {
            upsert: true,
            contentType: selectedFile.type,
          });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          setToast("이미지 업로드에 실패했습니다.");
          setSaving(false);
          return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("profile-photos")
          .getPublicUrl(filePath);

        if (urlData?.publicUrl) {
          // Append cache buster
          newProfileImageUrl = `${urlData.publicUrl}?t=${Date.now()}`;
        }
      }

      // Update users table
      const { error: updateError } = await (supabase
        .from("users") as any)
        .update({
          profile_image_url: newProfileImageUrl,
        })
        .eq("id", user.id);

      if (updateError) {
        console.error("Update error:", updateError);
        setToast("프로필 업데이트에 실패했습니다.");
        setSaving(false);
        return;
      }

      setToast("프로필이 저장되었습니다.");
      setSelectedFile(null);
    } catch (err) {
      console.error("Save error:", err);
      setToast("오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
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
        maxWidth: "480px",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.push("/settings")}
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
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            fontFamily: "var(--font-heading)",
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
          }}
        >
          프로필 수정
        </h1>
      </header>

      {/* Profile Photo Section */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#1A1A1A",
          borderRadius: "20px",
          padding: "2rem 1.5rem",
          border: "1px solid #222222",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1.25rem",
        }}
      >
        <p
          style={{
            fontSize: "0.875rem",
            fontWeight: 600,
            color: "#666666",
            alignSelf: "flex-start",
          }}
        >
          프로필 사진
        </p>

        {/* Photo Preview */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "8rem",
            height: "8rem",
            borderRadius: "50%",
            overflow: "hidden",
            cursor: "pointer",
            position: "relative",
            border: "3px solid #222222",
            background: "#0A0A0A",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {previewUrl ? (
            <img
              src={previewUrl}
              alt="프로필 미리보기"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <UserIcon size={48} style={{ color: "#444444" }} />
          )}

          {/* Camera overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "2.5rem",
              background: "rgba(0, 0, 0, 0.6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Camera size={18} style={{ color: "#FFFFFF" }} />
          </div>
        </motion.div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          style={{ display: "none" }}
        />

        <p style={{ fontSize: "0.75rem", color: "#666666", textAlign: "center" }}>
          사진을 탭하여 변경 (최대 5MB)
        </p>
      </motion.section>

      {/* User Info Display */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: "#1A1A1A",
          borderRadius: "20px",
          padding: "1.25rem 1.5rem",
          border: "1px solid #222222",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <div>
          <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "#666666", marginBottom: "0.375rem" }}>
            닉네임
          </p>
          <p style={{ fontSize: "1rem", fontWeight: 700, color: "#FFFFFF" }}>
            {profile?.nickname ?? "-"}
          </p>
        </div>
      </motion.section>

      {/* Save Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSave}
        disabled={saving || !selectedFile}
        style={{
          width: "100%",
          padding: "1rem",
          background:
            saving || !selectedFile
              ? "#222222"
              : "linear-gradient(135deg, #00E676, #00C853)",
          borderRadius: "20px",
          border: "none",
          cursor: saving || !selectedFile ? "not-allowed" : "pointer",
          fontSize: "1rem",
          fontWeight: 800,
          fontFamily: "var(--font-heading)",
          color: saving || !selectedFile ? "#666666" : "#0A0A0A",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.5rem",
          transition: "background 0.2s, color 0.2s",
        }}
      >
        {saving ? (
          <>
            <Loader2 size={18} />
            저장 중...
          </>
        ) : (
          "저장"
        )}
      </motion.button>

      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          style={{
            position: "fixed",
            bottom: "6rem",
            left: "50%",
            transform: "translateX(-50%)",
            background: "#1A1A1A",
            border: "1px solid #00E676",
            borderRadius: "20px",
            padding: "0.875rem 1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            zIndex: 1000,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          }}
        >
          <CheckCircle2 size={18} style={{ color: "#00E676" }} />
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#FFFFFF" }}>
            {toast}
          </span>
        </motion.div>
      )}
    </main>
  );
}
