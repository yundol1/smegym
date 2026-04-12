"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Dumbbell,
  Inbox,
  Shield,
  Crown,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

interface Member {
  id: string;
  nickname: string;
  role: "member" | "admin" | "test" | "pending" | "withdrawn";
  profileImageUrl: string | null;
  joinedAt: string;
  createdAt: string;
}

type TabType = "pending" | "active" | "withdrawn";

export default function MemberManagePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("pending");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const res = await fetch("/api/admin/members");
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setMembers(data.members || []);
    } catch (err) {
      console.error("Members fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(
    userId: string,
    action: "approve" | "reject" | "withdraw" | "restore",
  ) {
    if (!user) return;
    setProcessingId(userId);

    try {
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, action }),
      });

      if (!res.ok) throw new Error("patch failed");
      const data = await res.json();

      // Update local state
      setMembers((prev) =>
        prev.map((m) =>
          m.id === userId ? { ...m, role: data.role } : m,
        ),
      );
    } catch (err) {
      console.error("Member action error:", err);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setProcessingId(null);
    }
  }

  const pendingMembers = members.filter((m) => m.role === "pending");
  const activeMembers = members.filter(
    (m) => m.role === "member" || m.role === "admin" || m.role === "test",
  );
  const withdrawnMembers = members.filter((m) => m.role === "withdrawn");

  const tabs: { key: TabType; label: string; count: number; icon: React.ReactNode }[] = [
    { key: "pending", label: "가입 대기", count: pendingMembers.length, icon: <UserPlus size={16} /> },
    { key: "active", label: "현재 멤버", count: activeMembers.length, icon: <Users size={16} /> },
    { key: "withdrawn", label: "탈퇴 멤버", count: withdrawnMembers.length, icon: <UserMinus size={16} /> },
  ];

  function getCurrentList(): Member[] {
    switch (activeTab) {
      case "pending":
        return pendingMembers;
      case "active":
        return activeMembers;
      case "withdrawn":
        return withdrawnMembers;
    }
  }

  function getRoleBadge(role: Member["role"]) {
    switch (role) {
      case "admin":
        return { label: "관리자", color: "#FFD600", bg: "rgba(255,214,0,0.15)", icon: <Crown size={12} /> };
      case "member":
        return { label: "멤버", color: "#00E676", bg: "rgba(0,230,118,0.15)", icon: <UserCheck size={12} /> };
      case "test":
        return { label: "테스트", color: "#00B0FF", bg: "rgba(0,176,255,0.15)", icon: <Shield size={12} /> };
      case "pending":
        return { label: "대기", color: "#FF9100", bg: "rgba(255,145,0,0.15)", icon: <UserPlus size={12} /> };
      case "withdrawn":
        return { label: "탈퇴", color: "#666666", bg: "rgba(102,102,102,0.15)", icon: <UserMinus size={12} /> };
    }
  }

  function getEmptyMessage(): string {
    switch (activeTab) {
      case "pending":
        return "가입 대기 중인 멤버가 없습니다";
      case "active":
        return "현재 활동 중인 멤버가 없습니다";
      case "withdrawn":
        return "탈퇴한 멤버가 없습니다";
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

  const currentList = getCurrentList();

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
        <Users size={24} style={{ color: "#00E676" }} />
        <h1
          style={{
            fontSize: "1.25rem",
            fontWeight: 800,
            fontFamily: "var(--font-heading)",
            color: "#FFFFFF",
          }}
        >
          멤버 관리
        </h1>
        <span
          style={{
            marginLeft: "auto",
            fontSize: "0.8125rem",
            color: "#666666",
          }}
        >
          총 {members.length}명
        </span>
      </header>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "0.375rem",
          padding: "0.25rem",
          background: "#1A1A1A",
          borderRadius: "16px",
          border: "1px solid #222222",
        }}
      >
        {tabs.map((tab) => (
          <motion.button
            key={tab.key}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveTab(tab.key)}
            style={{
              flex: 1,
              padding: "0.625rem 0.5rem",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.375rem",
              borderRadius: "12px",
              border: "none",
              fontSize: "0.8125rem",
              fontWeight: activeTab === tab.key ? 700 : 500,
              fontFamily: "var(--font-heading)",
              cursor: "pointer",
              transition: "all 0.2s ease",
              background: activeTab === tab.key ? "#00E676" : "transparent",
              color: activeTab === tab.key ? "#0A0A0A" : "#666666",
            }}
          >
            {tab.icon}
            {tab.label}
            {tab.count > 0 && (
              <span
                style={{
                  padding: "0.0625rem 0.375rem",
                  borderRadius: "1rem",
                  fontSize: "0.6875rem",
                  fontWeight: 800,
                  background:
                    activeTab === tab.key
                      ? "rgba(10,10,10,0.2)"
                      : "rgba(255,255,255,0.1)",
                  color: activeTab === tab.key ? "#0A0A0A" : "#666666",
                }}
              >
                {tab.count}
              </span>
            )}
          </motion.button>
        ))}
      </div>

      {/* Member List */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          {currentList.length === 0 ? (
            <div
              style={{
                padding: "3rem 2rem",
                textAlign: "center",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1rem",
                background: "#1A1A1A",
                borderRadius: "20px",
                border: "1px solid #222222",
              }}
            >
              <Inbox size={48} style={{ color: "#333333" }} />
              <p
                style={{
                  color: "#666666",
                  fontSize: "0.9375rem",
                  fontWeight: 600,
                }}
              >
                {getEmptyMessage()}
              </p>
            </div>
          ) : (
            currentList.map((member, i) => {
              const badge = getRoleBadge(member.role);
              const isCurrentUser = member.id === user?.id;

              return (
                <motion.div
                  key={member.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  style={{
                    padding: "1rem 1.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.875rem",
                    background: "#1A1A1A",
                    borderRadius: "20px",
                    border: "1px solid #222222",
                  }}
                >
                  {/* Avatar */}
                  <div
                    style={{
                      width: "2.5rem",
                      height: "2.5rem",
                      borderRadius: "50%",
                      background:
                        member.role === "admin"
                          ? "linear-gradient(135deg, #FFD600, #FF9100)"
                          : member.role === "withdrawn"
                            ? "#333333"
                            : "linear-gradient(135deg, #00E676, #00B0FF)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: member.role === "withdrawn" ? "#666666" : "#0A0A0A",
                      fontWeight: 800,
                      fontSize: "1rem",
                      fontFamily: "var(--font-heading)",
                      flexShrink: 0,
                    }}
                  >
                    {member.nickname.charAt(0)}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.9375rem",
                          fontWeight: 700,
                          color: "#FFFFFF",
                          fontFamily: "var(--font-heading)",
                        }}
                      >
                        {member.nickname}
                      </span>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.1875rem",
                          padding: "0.125rem 0.5rem",
                          borderRadius: "1rem",
                          background: badge.bg,
                          color: badge.color,
                          fontSize: "0.625rem",
                          fontWeight: 700,
                        }}
                      >
                        {badge.icon}
                        {badge.label}
                      </span>
                    </div>
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        color: "#444444",
                        display: "block",
                        marginTop: "0.125rem",
                      }}
                    >
                      {activeTab === "pending"
                        ? `신청: ${format(parseISO(member.createdAt), "yyyy.MM.dd", { locale: ko })}`
                        : `가입: ${format(parseISO(member.joinedAt), "yyyy.MM.dd", { locale: ko })}`}
                    </span>
                  </div>

                  {/* Actions */}
                  {activeTab === "pending" && (
                    <div style={{ display: "flex", gap: "0.375rem" }}>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAction(member.id, "approve")}
                        disabled={processingId === member.id}
                        style={{
                          padding: "0.5rem 0.875rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          background: "rgba(0,230,118,0.15)",
                          color: "#00E676",
                          border: "1px solid rgba(0,230,118,0.3)",
                          borderRadius: "10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-heading)",
                          cursor:
                            processingId === member.id ? "not-allowed" : "pointer",
                          opacity: processingId === member.id ? 0.5 : 1,
                        }}
                      >
                        <CheckCircle2 size={14} />
                        승인
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleAction(member.id, "reject")}
                        disabled={processingId === member.id}
                        style={{
                          padding: "0.5rem 0.875rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          background: "rgba(255,82,82,0.15)",
                          color: "#FF5252",
                          border: "1px solid rgba(255,82,82,0.3)",
                          borderRadius: "10px",
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          fontFamily: "var(--font-heading)",
                          cursor:
                            processingId === member.id ? "not-allowed" : "pointer",
                          opacity: processingId === member.id ? 0.5 : 1,
                        }}
                      >
                        <XCircle size={14} />
                        거절
                      </motion.button>
                    </div>
                  )}

                  {activeTab === "active" && member.role !== "admin" && !isCurrentUser && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        if (confirm(`${member.nickname}님을 추방하시겠습니까?`)) {
                          handleAction(member.id, "withdraw");
                        }
                      }}
                      disabled={processingId === member.id}
                      style={{
                        padding: "0.5rem 0.875rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        background: "rgba(255,82,82,0.15)",
                        color: "#FF5252",
                        border: "1px solid rgba(255,82,82,0.3)",
                        borderRadius: "10px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        fontFamily: "var(--font-heading)",
                        cursor:
                          processingId === member.id ? "not-allowed" : "pointer",
                        opacity: processingId === member.id ? 0.5 : 1,
                      }}
                    >
                      <UserMinus size={14} />
                      추방
                    </motion.button>
                  )}

                  {activeTab === "withdrawn" && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleAction(member.id, "restore")}
                      disabled={processingId === member.id}
                      style={{
                        padding: "0.5rem 0.875rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "0.25rem",
                        background: "rgba(0,176,255,0.15)",
                        color: "#00B0FF",
                        border: "1px solid rgba(0,176,255,0.3)",
                        borderRadius: "10px",
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        fontFamily: "var(--font-heading)",
                        cursor:
                          processingId === member.id ? "not-allowed" : "pointer",
                        opacity: processingId === member.id ? 0.5 : 1,
                      }}
                    >
                      <RotateCcw size={14} />
                      복구
                    </motion.button>
                  )}
                </motion.div>
              );
            })
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
