"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

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
      if (!autoLogin) {
        // If auto-login is off, the session will expire when the browser closes.
        // Supabase doesn't natively support session-only cookies in browser client,
        // so we store a flag to sign out on next load if needed.
        sessionStorage.setItem("smegym_session_only", "true");
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
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        로그인
      </h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <label
            htmlFor="nickname"
            style={{
              display: "block",
              fontSize: "0.875rem",
              color: "rgba(248, 250, 252, 0.7)",
              marginBottom: "0.375rem",
            }}
          >
            닉네임
          </label>
          <input
            id="nickname"
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            required
            autoComplete="username"
            placeholder="닉네임을 입력하세요"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid var(--glass-border)",
              borderRadius: "0.75rem",
              color: "var(--foreground)",
              fontSize: "0.9375rem",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            style={{
              display: "block",
              fontSize: "0.875rem",
              color: "rgba(248, 250, 252, 0.7)",
              marginBottom: "0.375rem",
            }}
          >
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            placeholder="비밀번호를 입력하세요"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "rgba(15, 23, 42, 0.8)",
              border: "1px solid var(--glass-border)",
              borderRadius: "0.75rem",
              color: "var(--foreground)",
              fontSize: "0.9375rem",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
          />
        </div>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            fontSize: "0.875rem",
            color: "rgba(248, 250, 252, 0.7)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={autoLogin}
            onChange={(e) => setAutoLogin(e.target.checked)}
            style={{
              width: "1rem",
              height: "1rem",
              accentColor: "var(--primary)",
            }}
          />
          자동 로그인
        </label>

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
            color: "var(--primary)",
            transition: "opacity 0.2s",
          }}
        >
          회원가입
        </Link>
        <Link
          href="/forgot-password"
          style={{
            color: "rgba(248, 250, 252, 0.5)",
            transition: "opacity 0.2s",
          }}
        >
          비밀번호 찾기
        </Link>
      </div>
    </div>
  );
}
