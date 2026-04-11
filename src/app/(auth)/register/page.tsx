"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/types/database";

const SECURITY_QUESTIONS = [
  "어릴 때 키우던 반려동물의 이름은?",
  "졸업한 초등학교 이름은?",
  "가장 좋아하는 음식은?",
  "태어난 도시는?",
  "가장 친한 친구의 이름은?",
];

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

export default function RegisterPage() {
  const supabase = createClient();

  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityQuestion, setSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [securityAnswer, setSecurityAnswer] = useState("");
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setProfilePhoto(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    if (password !== confirmPassword) {
      setError("비밀번호가 일치하지 않습니다.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("비밀번호는 최소 6자 이상이어야 합니다.");
      setIsLoading(false);
      return;
    }

    if (!securityAnswer.trim()) {
      setError("보안 질문 답변을 입력해주세요.");
      setIsLoading(false);
      return;
    }

    try {
      const email = `${nickname}@smegym.noreply.com`;

      // Check if nickname already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("nickname", nickname)
        .single<Pick<User, "id">>();

      if (existingUser) {
        setError("이미 사용 중인 닉네임입니다.");
        setIsLoading(false);
        return;
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        if (authError.message.includes("already registered")) {
          setError("이미 사용 중인 닉네임입니다.");
        } else {
          setError(authError.message);
        }
        setIsLoading(false);
        return;
      }

      if (!authData.user) {
        setError("회원가입에 실패했습니다.");
        setIsLoading(false);
        return;
      }

      const userId = authData.user.id;
      let profileImageUrl: string | null = null;

      // Upload profile photo if provided
      if (profilePhoto) {
        const fileExt = profilePhoto.name.split(".").pop();
        const filePath = `${userId}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(filePath, profilePhoto, { upsert: true });

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("profile-photos")
            .getPublicUrl(filePath);
          profileImageUrl = urlData.publicUrl;
        }
      }

      // Insert into public.users
      const { error: insertError } = await supabase.from("users").insert({
        id: userId,
        nickname,
        role: "pending",
        profile_image_url: profileImageUrl,
        security_question: securityQuestion,
        security_answer: securityAnswer.trim(),
      } as never);

      if (insertError) {
        setError("프로필 생성에 실패했습니다. 관리자에게 문의해주세요.");
        setIsLoading(false);
        return;
      }

      // Sign out since user is pending approval
      await supabase.auth.signOut();
      setSuccess(true);
    } catch {
      setError("회원가입 중 오류가 발생했습니다.");
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
          가입 신청 완료
        </h2>
        <p
          style={{
            color: "rgba(248, 250, 252, 0.7)",
            fontSize: "0.9375rem",
            lineHeight: 1.6,
            marginBottom: "1.5rem",
          }}
        >
          가입 신청이 완료되었습니다.
          <br />
          관리자 승인을 기다려주세요.
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
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        회원가입
      </h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
            placeholder="사용할 닉네임"
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
          />
        </div>

        <div>
          <label htmlFor="password" style={labelStyle}>
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="최소 6자 이상"
            autoComplete="new-password"
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--glass-border)")}
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" style={labelStyle}>
            비밀번호 확인
          </label>
          <input
            id="confirmPassword"
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

        <div>
          <label htmlFor="securityQuestion" style={labelStyle}>
            보안 질문
          </label>
          <select
            id="securityQuestion"
            value={securityQuestion}
            onChange={(e) => setSecurityQuestion(e.target.value)}
            style={{
              ...inputStyle,
              appearance: "none",
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2394a3b8' d='M6 8L1 3h10z'/%3E%3C/svg%3E\")",
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 1rem center",
              paddingRight: "2.5rem",
            }}
          >
            {SECURITY_QUESTIONS.map((q) => (
              <option key={q} value={q}>
                {q}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="securityAnswer" style={labelStyle}>
            보안 답변
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

        <div>
          <label htmlFor="profilePhoto" style={labelStyle}>
            프로필 사진 (선택)
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            {previewUrl && (
              <img
                src={previewUrl}
                alt="미리보기"
                style={{
                  width: "3.5rem",
                  height: "3.5rem",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid var(--glass-border)",
                }}
              />
            )}
            <label
              style={{
                flex: 1,
                padding: "0.625rem 1rem",
                background: "rgba(15, 23, 42, 0.8)",
                border: "1px dashed var(--glass-border)",
                borderRadius: "0.75rem",
                color: "rgba(248, 250, 252, 0.5)",
                fontSize: "0.875rem",
                textAlign: "center",
                cursor: "pointer",
                transition: "border-color 0.2s",
              }}
            >
              {profilePhoto ? profilePhoto.name : "사진 선택"}
              <input
                id="profilePhoto"
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                style={{ display: "none" }}
              />
            </label>
          </div>
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
          {isLoading ? "가입 처리 중..." : "가입 신청"}
        </button>
      </form>

      <div
        style={{
          textAlign: "center",
          marginTop: "1.25rem",
          fontSize: "0.875rem",
        }}
      >
        <span style={{ color: "rgba(248, 250, 252, 0.5)" }}>이미 계정이 있으신가요? </span>
        <Link href="/login" style={{ color: "var(--primary)" }}>
          로그인
        </Link>
      </div>
    </div>
  );
}
