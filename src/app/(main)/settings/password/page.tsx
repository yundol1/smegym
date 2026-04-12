"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function PasswordChangePage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const validate = (): string | null => {
    if (!currentPassword) return "현재 비밀번호를 입력해주세요.";
    if (newPassword.length < 6) return "새 비밀번호는 6자 이상이어야 합니다.";
    if (newPassword !== confirmPassword) return "새 비밀번호가 일치하지 않습니다.";
    if (currentPassword === newPassword) return "현재 비밀번호와 다른 비밀번호를 사용해주세요.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const validationError = validate();
    if (validationError) {
      setToast({ message: validationError, type: "error" });
      return;
    }

    setSaving(true);

    try {
      // Verify current password by re-authenticating
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user?.email) {
        setToast({ message: "사용자 정보를 찾을 수 없습니다.", type: "error" });
        setSaving(false);
        return;
      }

      // Try signing in with current password to verify
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        setToast({ message: "현재 비밀번호가 올바르지 않습니다.", type: "error" });
        setSaving(false);
        return;
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("Password update error:", updateError);
        setToast({ message: "비밀번호 변경에 실패했습니다.", type: "error" });
        setSaving(false);
        return;
      }

      setToast({ message: "비밀번호가 변경되었습니다.", type: "success" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Redirect after success
      setTimeout(() => {
        router.push("/settings");
      }, 1500);
    } catch (err) {
      console.error("Password change error:", err);
      setToast({ message: "오류가 발생했습니다.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.875rem 3rem 0.875rem 1rem",
    background: "#0A0A0A",
    border: "1px solid #333333",
    borderRadius: "12px",
    fontSize: "0.9375rem",
    color: "#FFFFFF",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const inputWrapperStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
  };

  const eyeButtonStyle: React.CSSProperties = {
    position: "absolute",
    right: "0.875rem",
    top: "50%",
    transform: "translateY(-50%)",
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: "0.25rem",
    display: "flex",
    alignItems: "center",
  };

  const canSubmit = currentPassword && newPassword.length >= 6 && newPassword === confirmPassword;

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
        <KeyRound size={28} style={{ color: "#00B0FF" }} />
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            fontFamily: "var(--font-heading)",
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
          }}
        >
          비밀번호 변경
        </h1>
      </header>

      {/* Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onSubmit={handleSubmit}
        style={{
          background: "#1A1A1A",
          borderRadius: "20px",
          padding: "1.5rem",
          border: "1px solid #222222",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
        }}
      >
        {/* Current Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#666666",
            }}
          >
            현재 비밀번호
          </label>
          <div style={inputWrapperStyle}>
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="현재 비밀번호 입력"
              style={inputStyle}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              style={eyeButtonStyle}
            >
              {showCurrent ? (
                <EyeOff size={18} style={{ color: "#666666" }} />
              ) : (
                <Eye size={18} style={{ color: "#666666" }} />
              )}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#666666",
            }}
          >
            새 비밀번호
          </label>
          <div style={inputWrapperStyle}>
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="6자 이상 입력"
              style={inputStyle}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              style={eyeButtonStyle}
            >
              {showNew ? (
                <EyeOff size={18} style={{ color: "#666666" }} />
              ) : (
                <Eye size={18} style={{ color: "#666666" }} />
              )}
            </button>
          </div>
          {newPassword && newPassword.length < 6 && (
            <p style={{ fontSize: "0.75rem", color: "#FF5252" }}>
              6자 이상 입력해주세요.
            </p>
          )}
        </div>

        {/* Confirm Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <label
            style={{
              fontSize: "0.8125rem",
              fontWeight: 600,
              color: "#666666",
            }}
          >
            새 비밀번호 확인
          </label>
          <div style={inputWrapperStyle}>
            <input
              type={showConfirm ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="새 비밀번호 다시 입력"
              style={inputStyle}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={eyeButtonStyle}
            >
              {showConfirm ? (
                <EyeOff size={18} style={{ color: "#666666" }} />
              ) : (
                <Eye size={18} style={{ color: "#666666" }} />
              )}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p style={{ fontSize: "0.75rem", color: "#FF5252" }}>
              비밀번호가 일치하지 않습니다.
            </p>
          )}
        </div>

        {/* Submit Button */}
        <motion.button
          type="submit"
          whileTap={{ scale: 0.97 }}
          disabled={saving || !canSubmit}
          style={{
            width: "100%",
            padding: "1rem",
            background:
              saving || !canSubmit
                ? "#222222"
                : "linear-gradient(135deg, #00B0FF, #0091EA)",
            borderRadius: "20px",
            border: "none",
            cursor: saving || !canSubmit ? "not-allowed" : "pointer",
            fontSize: "1rem",
            fontWeight: 800,
            fontFamily: "var(--font-heading)",
            color: saving || !canSubmit ? "#666666" : "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
            marginTop: "0.5rem",
            transition: "background 0.2s, color 0.2s",
          }}
        >
          {saving ? (
            <>
              <Loader2 size={18} />
              변경 중...
            </>
          ) : (
            "비밀번호 변경"
          )}
        </motion.button>
      </motion.form>

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
            border: `1px solid ${toast.type === "success" ? "#00E676" : "#FF5252"}`,
            borderRadius: "20px",
            padding: "0.875rem 1.5rem",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            zIndex: 1000,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4)",
          }}
        >
          {toast.type === "success" ? (
            <CheckCircle2 size={18} style={{ color: "#00E676" }} />
          ) : (
            <AlertCircle size={18} style={{ color: "#FF5252" }} />
          )}
          <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#FFFFFF" }}>
            {toast.message}
          </span>
        </motion.div>
      )}
    </main>
  );
}
