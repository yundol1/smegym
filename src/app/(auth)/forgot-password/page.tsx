"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

type Step = "nickname" | "security" | "reset";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  background: "rgba(15, 23, 42, 0.8)",
  border: "1px solid var(--glass-border)",
  borderRadius: "0.75rem",
  color: "var(--foreground)",
  fontSize: "0.9375rem",
  outline: "none",
  transition: "border-color 0.2s",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  color: "rgba(248, 250, 252, 0.7)",
  marginBottom: "0.375rem",
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
  const [storedAnswer, setStoredAnswer] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  async function handleNicknameSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const { data: user, error: fetchError } = await supabase
        .from("users")
        .select("id, security_question, security_answer")
        .eq("nickname", nickname)
        .single<Pick<User, "id" | "security_question" | "security_answer">>();

      if (fetchError || !user) {
        setError("해당 닉네임의 사용자를 찾을 수 없습니다.");
        setIsLoading(false);
        return;
      }

      if (!user.security_question || !user.security_answer) {
        setError("보안 질문이 설정되지 않은 계정입니다. 관리자에게 문의해주세요.");
        setIsLoading(false);
        return;
      }

      setUserId(user.id);
      setSecurityQuestion(user.security_question);
      setStoredAnswer(user.security_answer);
      setStep("security");
    } catch {
      setError("사용자 조회 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleSecuritySubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (securityAnswer.trim().toLowerCase() !== storedAnswer.trim().toLowerCase()) {
      setError("보안 답변이 일치하지 않습니다.");
      return;
    }

    setStep("reset");
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
      // Sign in as the user first to get a valid session for password update.
      // We use the admin API approach: sign in with the stored email pattern,
      // then update the password via Supabase auth.
      // Since we verified the security question, we use a server-side approach
      // via Supabase's admin API. However, since this is client-side,
      // we'll call a custom RPC or use the updateUser method.
      //
      // For the client-side flow, we need a valid session.
      // We'll use Supabase's password reset via signInWithPassword won't work
      // without the old password. Instead, we rely on an edge function or RPC.
      //
      // Practical approach: use Supabase admin client on server side.
      // For now, we call a Supabase RPC function that handles password reset.

      const email = `${nickname}@smegym.noreply.com`;

      // Attempt to use Supabase's built-in password update
      // This requires the user to be authenticated, so we use a workaround:
      // We call a database function that returns a password reset token,
      // or we use the Supabase Admin API via an API route.

      // Fallback approach: call an API endpoint that uses the service role key
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
          background: "var(--glass-bg)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid var(--glass-border)",
          borderRadius: "1.5rem",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "4rem",
            height: "4rem",
            borderRadius: "50%",
            background: "rgba(34, 197, 94, 0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1rem",
            fontSize: "1.5rem",
          }}
        >
          ✓
        </div>
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 700,
            color: "var(--foreground)",
            marginBottom: "0.75rem",
          }}
        >
          비밀번호 변경 완료
        </h2>
        <p
          style={{
            color: "rgba(248, 250, 252, 0.7)",
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
        background: "var(--glass-bg)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid var(--glass-border)",
        borderRadius: "1.5rem",
        padding: "2rem",
      }}
    >
      <h2
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--foreground)",
          marginBottom: "0.5rem",
          textAlign: "center",
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
                  ? "var(--primary)"
                  : "rgba(255, 255, 255, 0.1)",
              transition: "background 0.3s",
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
              color: "rgba(248, 250, 252, 0.6)",
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
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
            />
          </div>

          {error && (
            <p
              style={{
                color: "var(--error)",
                fontSize: "0.875rem",
                textAlign: "center",
                padding: "0.5rem",
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: "0.5rem",
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
              background: "rgba(56, 189, 248, 0.08)",
              borderRadius: "0.75rem",
              border: "1px solid rgba(56, 189, 248, 0.15)",
            }}
          >
            <p
              style={{
                fontSize: "0.8125rem",
                color: "rgba(248, 250, 252, 0.5)",
                marginBottom: "0.25rem",
              }}
            >
              보안 질문
            </p>
            <p
              style={{
                fontSize: "0.9375rem",
                color: "var(--foreground)",
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
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
            />
          </div>

          {error && (
            <p
              style={{
                color: "var(--error)",
                fontSize: "0.875rem",
                textAlign: "center",
                padding: "0.5rem",
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: "0.5rem",
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
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--glass-border)",
                borderRadius: "0.75rem",
                color: "var(--foreground)",
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
              color: "rgba(248, 250, 252, 0.6)",
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
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
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
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
            />
          </div>

          {error && (
            <p
              style={{
                color: "var(--error)",
                fontSize: "0.875rem",
                textAlign: "center",
                padding: "0.5rem",
                background: "rgba(239, 68, 68, 0.1)",
                borderRadius: "0.5rem",
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
                background: "rgba(255, 255, 255, 0.05)",
                border: "1px solid var(--glass-border)",
                borderRadius: "0.75rem",
                color: "var(--foreground)",
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
        <Link href="/login" style={{ color: "var(--primary)" }}>
          로그인으로 돌아가기
        </Link>
      </div>
    </div>
  );
}
