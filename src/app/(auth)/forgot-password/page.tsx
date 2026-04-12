"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { nicknameToEmail } from "@/lib/utils/nickname";

type Step = "nickname" | "security" | "reset";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.875rem 1rem",
  background: "#1A1A1A",
  border: "1px solid #222222",
  borderRadius: "14px",
  color: "#FFFFFF",
  fontSize: "0.9375rem",
  outline: "none",
  transition: "border-color 0.2s, box-shadow 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.8125rem",
  color: "#666666",
  marginBottom: "0.375rem",
  fontWeight: 600,
  letterSpacing: "0.02em",
  textTransform: "uppercase" as const,
};

const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = "#00E676";
  e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 230, 118, 0.15)";
};

const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
  e.currentTarget.style.borderColor = "#222222";
  e.currentTarget.style.boxShadow = "none";
};

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [step, setStep] = useState<Step>("nickname");
  const [nickname, setNickname] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState("");
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userId, setUserId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleNicknameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 서버 API를 통해 유저 조회 (RLS 우회, security_answer 미반환)
      const res = await fetch("/api/auth/lookup-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "사용자를 찾을 수 없습니다.");
        setIsLoading(false);
        return;
      }

      if (!data.securityQuestion) {
        setError("보안 질문이 설정되지 않은 계정입니다. 관리자에게 문의해주세요.");
        setIsLoading(false);
        return;
      }

      setUserId(data.userId);
      setSecurityQuestion(data.securityQuestion);
      setStep("security");
    } catch {
      setError("사용자 조회 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSecuritySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // 서버 사이드에서 보안 답변 검증
      const res = await fetch("/api/auth/verify-security-answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, securityAnswer: securityAnswer.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "보안 답변이 일치하지 않습니다.");
        setIsLoading(false);
        return;
      }

      setStep("reset");
    } catch {
      setError("검증 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (newPassword.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setIsLoading(false);
      return;
    }

    try {
      const email = nicknameToEmail(nickname);

      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email,
          newPassword,
          securityAnswer: securityAnswer.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "비밀번호 변경에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch {
      setError("비밀번호 변경 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div
        style={{
          width: "100%",
          maxWidth: "400px",
          background: "#1A1A1A",
          border: "1px solid #222222",
          borderRadius: "var(--radius, 20px)",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "4rem",
            height: "4rem",
            borderRadius: "50%",
            background: "rgba(0, 230, 118, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
            fontSize: "1.5rem",
            color: "#00E676",
          }}
        >
          ✓
        </div>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            fontFamily: "var(--font-heading)",
            color: "#FFFFFF",
            marginBottom: "0.75rem",
            textTransform: "uppercase",
          }}
        >
          비밀번호 변경 완료
        </h2>
        <p
          style={{
            color: "#666666",
            fontSize: "0.9375rem",
            marginBottom: "1.5rem",
          }}
        >
          새 비밀번호로 로그인해주세요.
        </p>
        <Link
          href="/login"
          className="btn-primary"
          style={{
            display: "inline-block",
            padding: "0.75rem 2rem",
            fontSize: "0.9375rem",
          }}
        >
          로그인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div
      style={{
        width: "100%",
        maxWidth: "400px",
        background: "#1A1A1A",
        border: "1px solid #222222",
        borderRadius: "var(--radius, 20px)",
        padding: "2rem",
      }}
    >
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: 800,
          fontFamily: "var(--font-heading)",
          color: "#FFFFFF",
          marginBottom: "0.5rem",
          textAlign: "center",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        비밀번호 찾기
      </h2>

      {/* Step indicator */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: "0.5rem",
          marginBottom: "1.5rem",
        }}
      >
        {(["nickname", "security", "reset"] as Step[]).map((s, i) => (
          <div
            key={s}
            style={{
              width: "2rem",
              height: "0.25rem",
              borderRadius: "0.125rem",
              background:
                (["nickname", "security", "reset"] as Step[]).indexOf(step) >= i
                  ? "#00E676"
                  : "#222222",
              transition: "background 0.3s",
              boxShadow:
                (["nickname", "security", "reset"] as Step[]).indexOf(step) >= i
                  ? "0 0 8px rgba(0, 230, 118, 0.3)"
                  : "none",
            }}
          />
        ))}
      </div>

      {step === "nickname" && (
        <form
          onSubmit={handleNicknameSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              color: "#666666",
              textAlign: "center",
              marginBottom: "0.5rem",
            }}
          >
            가입할 때 사용한 닉네임을 입력하세요.
          </p>
          <div>
            <label htmlFor="nickname" style={labelStyle}>
              닉네임
            </label>
            <input
              id="nickname"
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              placeholder="닉네임을 입력하세요"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {error && (
            <p
              style={{
                color: "#FF5252",
                fontSize: "0.875rem",
                textAlign: "center",
                padding: "0.625rem",
                background: "rgba(255, 82, 82, 0.08)",
                borderRadius: "12px",
                border: "1px solid rgba(255, 82, 82, 0.15)",
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-primary"
            style={{
              width: "100%",
              padding: "0.875rem",
              fontSize: "1rem",
              opacity: isLoading ? 0.7 : 1,
              cursor: isLoading ? "not-allowed" : "pointer",
            }}
          >
            {isLoading ? "확인 중..." : "다음"}
          </button>
        </form>
      )}

      {step === "security" && (
        <form
          onSubmit={handleSecuritySubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <div
            style={{
              padding: "0.75rem 1rem",
              background: "rgba(0, 176, 255, 0.06)",
              borderRadius: "14px",
              border: "1px solid rgba(0, 176, 255, 0.12)",
            }}
          >
            <p
              style={{
                fontSize: "0.8125rem",
                color: "#666666",
                marginBottom: "0.25rem",
              }}
            >
              보안 질문
            </p>
            <p
              style={{
                fontSize: "0.9375rem",
                color: "#FFFFFF",
                fontWeight: 600,
              }}
            >
              {securityQuestion}
            </p>
          </div>

          <div>
            <label htmlFor="securityAnswer" style={labelStyle}>
              답변
            </label>
            <input
              id="securityAnswer"
              type="text"
              value={securityAnswer}
              onChange={(e) => setSecurityAnswer(e.target.value)}
              required
              placeholder="답변을 입력하세요"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {error && (
            <p
              style={{
                color: "#FF5252",
                fontSize: "0.875rem",
                textAlign: "center",
                padding: "0.625rem",
                background: "rgba(255, 82, 82, 0.08)",
                borderRadius: "12px",
                border: "1px solid rgba(255, 82, 82, 0.15)",
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => {
                setStep("nickname");
                setError("");
              }}
              style={{
                flex: 1,
                padding: "0.875rem",
                fontSize: "1rem",
                background: "#222222",
                border: "1px solid #333333",
                borderRadius: "var(--radius, 20px)",
                color: "#FFFFFF",
                fontWeight: 600,
              }}
            >
              이전
            </button>
            <button
              type="submit"
              className="btn-primary"
              style={{
                flex: 1,
                padding: "0.875rem",
                fontSize: "1rem",
              }}
            >
              확인
            </button>
          </div>
        </form>
      )}

      {step === "reset" && (
        <form
          onSubmit={handleResetSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
        >
          <p
            style={{
              fontSize: "0.875rem",
              color: "#666666",
              textAlign: "center",
              marginBottom: "0.5rem",
            }}
          >
            새 비밀번호를 설정하세요.
          </p>

          <div>
            <label htmlFor="newPassword" style={labelStyle}>
              새 비밀번호
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              placeholder="최소 6자 이상"
              autoComplete="new-password"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          <div>
            <label htmlFor="confirmNewPassword" style={labelStyle}>
              새 비밀번호 확인
            </label>
            <input
              id="confirmNewPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="비밀번호를 다시 입력"
              autoComplete="new-password"
              style={inputStyle}
              onFocus={handleFocus}
              onBlur={handleBlur}
            />
          </div>

          {error && (
            <p
              style={{
                color: "#FF5252",
                fontSize: "0.875rem",
                textAlign: "center",
                padding: "0.625rem",
                background: "rgba(255, 82, 82, 0.08)",
                borderRadius: "12px",
                border: "1px solid rgba(255, 82, 82, 0.15)",
              }}
            >
              {error}
            </p>
          )}

          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button
              type="button"
              onClick={() => {
                setStep("security");
                setError("");
              }}
              style={{
                flex: 1,
                padding: "0.875rem",
                fontSize: "1rem",
                background: "#222222",
                border: "1px solid #333333",
                borderRadius: "var(--radius, 20px)",
                color: "#FFFFFF",
                fontWeight: 600,
              }}
            >
              이전
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{
                flex: 1,
                padding: "0.875rem",
                fontSize: "1rem",
                opacity: isLoading ? 0.7 : 1,
                cursor: isLoading ? "not-allowed" : "pointer",
              }}
            >
              {isLoading ? "변경 중..." : "비밀번호 변경"}
            </button>
          </div>
        </form>
      )}

      <div
        style={{
          textAlign: "center",
          marginTop: "1.25rem",
          fontSize: "0.875rem",
        }}
      >
        <Link href="/login" style={{ color: "#00E676", fontWeight: 600 }}>
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
