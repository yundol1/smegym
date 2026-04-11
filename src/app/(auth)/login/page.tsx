"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

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

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [autoLogin, setAutoLogin] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const email = `${nickname}@smegym.noreply.com`;

      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        if (authError.message.includes("Invalid login credentials")) {
          setError("닉네임 또는 비밀번호가 올바르지 않습니다.");
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError("로그인에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      // Check user profile status
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("role")
        .eq("id", authData.user.id)
        .single<Pick<User, "role">>();

      if (profileError || !profile) {
        setError("사용자 정보를 찾을 수 없습니다.");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (profile.role === "pending") {
        setError("관리자 승인 대기 중입니다. 승인 후 로그인해주세요.");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      if (profile.role === "withdrawn") {
        setError("탈퇴한 계정입니다. 관리자에게 문의해주세요.");
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Update last_login_at
      await supabase
        .from("users")
        .update({ last_login_at: new Date().toISOString() } as never)
        .eq("id", authData.user.id);

      // Handle auto-login preference
      // 자동 로그인 해제 시: 브라우저/탭 종료 시 세션 삭제
      if (!autoLogin) {
        sessionStorage.setItem("smegym_session_only", "true");
        // beforeunload에서 signOut 호출하여 세션 정리
        window.addEventListener("beforeunload", () => {
          navigator.sendBeacon("/api/auth/signout");
        });
      } else {
        sessionStorage.removeItem("smegym_session_only");
      }

      router.push("/dashboard");
    } catch {
      setError("로그인 중 오류가 발생했습니다.");
      setIsLoading(false);
    }
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
          marginBottom: "1.5rem",
          textAlign: "center",
          letterSpacing: "0.02em",
          textTransform: "uppercase",
        }}
      >
        로그인
      </h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label htmlFor="nickname" style={labelStyle}>
            닉네임
          </label>
          <input
            id="nickname"
            data-testid="nickname-input"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            autoComplete="username"
            placeholder="닉네임을 입력하세요"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#00E676";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 230, 118, 0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#222222";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        <div>
          <label htmlFor="password" style={labelStyle}>
            비밀번호
          </label>
          <input
            id="password"
            data-testid="password-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="비밀번호를 입력하세요"
            style={inputStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = "#00E676";
              e.currentTarget.style.boxShadow = "0 0 0 3px rgba(0, 230, 118, 0.15)";
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = "#222222";
              e.currentTarget.style.boxShadow = "none";
            }}
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.875rem",
            color: "#666666",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            data-testid="auto-login-checkbox"
            checked={autoLogin}
            onChange={(e) => setAutoLogin(e.target.checked)}
            style={{
              width: "1rem",
              height: "1rem",
              accentColor: "#00E676",
            }}
          />
          자동 로그인
        </label>

        {error && (
          <p
            data-testid="error-message"
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
          data-testid="login-button"
          className="btn-primary"
          style={{
            width: "100%",
            padding: "0.875rem",
            fontSize: "1rem",
            opacity: isLoading ? 0.7 : 1,
            cursor: isLoading ? "not-allowed" : "pointer",
          }}
        >
          {isLoading ? "로그인 중..." : "로그인"}
        </button>
      </form>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "1.25rem",
          fontSize: "0.875rem",
        }}
      >
        <Link
          href="/register"
          style={{
            color: "#00E676",
            fontWeight: 600,
            transition: "opacity 0.2s",
          }}
        >
          회원가입
        </Link>
        <Link
          href="/forgot-password"
          style={{
            color: "#666666",
            transition: "opacity 0.2s",
          }}
        >
          비밀번호 찾기
        </Link>
      </div>
    </div>
  );
}
