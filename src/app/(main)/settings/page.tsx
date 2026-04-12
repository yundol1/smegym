"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Settings,
  User as UserIcon,
  KeyRound,
  LogOut,
  ChevronRight,
  Loader2,
  Calendar,
  HardDrive,
  Menu,
  Info,
} from "lucide-react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";

export default function SettingsPage() {
  const router = useRouter();
  const { profile, isLoading, signOut } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      router.push("/login");
    } catch (err) {
      console.error("Sign out error:", err);
      setSigningOut(false);
    }
  };

  if (isLoading) {
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

  const menuItems = [
    {
      label: "프로필 수정",
      icon: <UserIcon size={20} style={{ color: "#00E676" }} />,
      href: "/settings/profile",
    },
    {
      label: "비밀번호 변경",
      icon: <KeyRound size={20} style={{ color: "#00B0FF" }} />,
      href: "/settings/password",
    },
  ];

  return (
    <main
      style={{
        padding: "1.5rem 0",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      {/* Header */}
      <header style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <Settings size={28} style={{ color: "#00E676" }} />
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 900,
            fontFamily: "var(--font-heading)",
            color: "#FFFFFF",
            letterSpacing: "-0.03em",
          }}
        >
          설정
        </h1>
      </header>

      {/* Profile Card */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#1A1A1A",
          borderRadius: "20px",
          padding: "1.5rem",
          border: "1px solid #222222",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
        }}
      >
        {profile?.profile_image_url ? (
          <img
            src={profile.profile_image_url}
            alt="프로필"
            style={{
              width: "4rem",
              height: "4rem",
              borderRadius: "50%",
              objectFit: "cover",
              border: "2px solid #222222",
            }}
          />
        ) : (
          <div
            style={{
              width: "4rem",
              height: "4rem",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#222222",
              border: "2px solid #333333",
              flexShrink: 0,
            }}
          >
            <UserIcon size={28} style={{ color: "#666666" }} />
          </div>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.375rem",
            minWidth: 0,
          }}
        >
          <span
            style={{
              fontSize: "1.125rem",
              fontWeight: 800,
              fontFamily: "var(--font-heading)",
              color: "#FFFFFF",
            }}
          >
            {profile?.nickname ?? "사용자"}
          </span>
          {profile?.joined_at && (
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                fontSize: "0.75rem",
                color: "#666666",
              }}
            >
              <Calendar size={12} />
              {format(new Date(profile.joined_at), "yyyy.M.d", {
                locale: ko,
              })}{" "}
              가입
            </span>
          )}
        </div>
      </motion.section>

      {/* Menu Items */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{
          background: "#1A1A1A",
          borderRadius: "20px",
          border: "1px solid #222222",
          overflow: "hidden",
        }}
      >
        {menuItems.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.875rem",
              width: "100%",
              padding: "1rem 1.25rem",
              background: "transparent",
              borderBottom:
                i < menuItems.length - 1 ? "1px solid #222222" : "none",
              cursor: "pointer",
              textDecoration: "none",
            }}
          >
            {item.icon}
            <span
              style={{
                flex: 1,
                fontSize: "0.9375rem",
                fontWeight: 600,
                color: "#FFFFFF",
              }}
            >
              {item.label}
            </span>
            <ChevronRight size={18} style={{ color: "#444444" }} />
          </Link>
        ))}
      </motion.section>

      {/* Storage Info */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{
          background: "#1A1A1A",
          borderRadius: "20px",
          padding: "1.25rem",
          border: "1px solid #222222",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          <HardDrive size={18} style={{ color: "#00B0FF" }} />
          <span
            style={{
              fontSize: "0.9375rem",
              fontWeight: 700,
              color: "#FFFFFF",
            }}
          >
            저장소 사용량
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            padding: "0.75rem",
            background: "#0A0A0A",
            borderRadius: "12px",
          }}
        >
          <Info size={14} style={{ color: "#666666", marginTop: "0.125rem", flexShrink: 0 }} />
          <p
            style={{
              fontSize: "0.8125rem",
              color: "#666666",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            운동 인증 사진은 자동 압축되어 저장됩니다. (최대 10MB/장)
          </p>
        </div>
      </motion.section>

      {/* Menu Customization Note */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.18 }}
        style={{
          background: "#1A1A1A",
          borderRadius: "20px",
          padding: "1.25rem",
          border: "1px solid #222222",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "0.75rem",
          }}
        >
          <Menu size={18} style={{ color: "#CE93D8" }} />
          <span
            style={{
              fontSize: "0.9375rem",
              fontWeight: 700,
              color: "#FFFFFF",
            }}
          >
            메뉴 설정
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.5rem",
            padding: "0.75rem",
            background: "#0A0A0A",
            borderRadius: "12px",
          }}
        >
          <Info size={14} style={{ color: "#666666", marginTop: "0.125rem", flexShrink: 0 }} />
          <p
            style={{
              fontSize: "0.8125rem",
              color: "#666666",
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            메뉴 커스터마이징은 향후 업데이트 예정입니다
          </p>
        </div>
      </motion.section>

      {/* Sign Out */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        whileTap={{ scale: 0.97 }}
        onClick={handleSignOut}
        disabled={signingOut}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.625rem",
          width: "100%",
          padding: "1rem",
          background: "#1A1A1A",
          borderRadius: "20px",
          border: "1px solid #222222",
          cursor: signingOut ? "not-allowed" : "pointer",
          opacity: signingOut ? 0.5 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {signingOut ? (
          <Loader2 size={18} style={{ color: "#FF5252" }} />
        ) : (
          <LogOut size={18} style={{ color: "#FF5252" }} />
        )}
        <span
          style={{
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: "#FF5252",
          }}
        >
          {signingOut ? "로그아웃 중..." : "로그아웃"}
        </span>
      </motion.button>
    </main>
  );
}
