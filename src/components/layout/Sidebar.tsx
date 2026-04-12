"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Camera,
  Images,
  Trophy,
  Wallet,
  ShieldCheck,
  Target,
  Bot,
  Bell,
  Settings,
  CheckSquare,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Megaphone,
  ListChecks,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  href: string;
}

const mainMenuItems: MenuItem[] = [
  { label: "대시보드", icon: <LayoutDashboard size={20} />, href: "/dashboard" },
  { label: "운동인증", icon: <Camera size={20} />, href: "/workout" },
  { label: "갤러리", icon: <Images size={20} />, href: "/gallery" },
  { label: "랭킹", icon: <Trophy size={20} />, href: "/ranking" },
  { label: "벌금", icon: <Wallet size={20} />, href: "/fines" },
  { label: "면제신청", icon: <ShieldCheck size={20} />, href: "/exemptions" },
  { label: "챌린지", icon: <Target size={20} />, href: "/challenges" },
  { label: "AI코치", icon: <Bot size={20} />, href: "/ai-coach" },
  { label: "공지사항", icon: <Bell size={20} />, href: "/notices" },
  { label: "반기 결산", icon: <BarChart3 size={20} />, href: "/report" },
  { label: "설정", icon: <Settings size={20} />, href: "/settings" },
];

const mobileTabItems: MenuItem[] = [
  { label: "대시보드", icon: <LayoutDashboard size={20} />, href: "/dashboard" },
  { label: "운동인증", icon: <Camera size={20} />, href: "/workout" },
  { label: "갤러리", icon: <Images size={20} />, href: "/gallery" },
  { label: "랭킹", icon: <Trophy size={20} />, href: "/ranking" },
];

const moreMenuItems: MenuItem[] = [
  { label: "벌금", icon: <Wallet size={20} />, href: "/fines" },
  { label: "면제신청", icon: <ShieldCheck size={20} />, href: "/exemptions" },
  { label: "챌린지", icon: <Target size={20} />, href: "/challenges" },
  { label: "AI코치", icon: <Bot size={20} />, href: "/ai-coach" },
  { label: "공지사항", icon: <Bell size={20} />, href: "/notices" },
  { label: "반기 결산", icon: <BarChart3 size={20} />, href: "/report" },
  { label: "설정", icon: <Settings size={20} />, href: "/settings" },
];

const moreMenuAdminItems: MenuItem[] = [
  { label: "사진검토", icon: <CheckSquare size={20} />, href: "/photo-review" },
  { label: "면제관리", icon: <ShieldCheck size={20} />, href: "/exemption-manage" },
  { label: "벌금관리", icon: <Wallet size={20} />, href: "/fine-manage" },
  { label: "멤버관리", icon: <Users size={20} />, href: "/member-manage" },
  { label: "주간집계", icon: <BarChart3 size={20} />, href: "/weekly-aggregate" },
  { label: "공지작성", icon: <Megaphone size={20} />, href: "/notice-create" },
  { label: "챌린지관리", icon: <ListChecks size={20} />, href: "/challenge-manage" },
];

const adminMenuItems: MenuItem[] = [
  { label: "사진검토", icon: <CheckSquare size={20} />, href: "/photo-review" },
  { label: "면제관리", icon: <ShieldCheck size={20} />, href: "/exemption-manage" },
  { label: "벌금관리", icon: <Wallet size={20} />, href: "/fine-manage" },
  { label: "멤버관리", icon: <Users size={20} />, href: "/member-manage" },
  { label: "주간집계", icon: <BarChart3 size={20} />, href: "/weekly-aggregate" },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export default function Sidebar({ collapsed, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function checkRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single() as { data: { role: string } | null };

      if (data?.role === "admin") {
        setIsAdmin(true);
      }
    }

    checkRole();
  }, []);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`sidebar ${collapsed ? "sidebar--collapsed" : ""}`}>
        <div className="sidebar__logo">
          {!collapsed && (
            <Link
              href="/dashboard"
              className="sidebar__logo-link"
              style={{
                color: "#00E676",
                textShadow: "0 0 20px rgba(0, 230, 118, 0.3)",
              }}
            >
              SME
            </Link>
          )}
          <button
            className="sidebar__toggle"
            onClick={onToggleCollapse}
            aria-label={collapsed ? "사이드바 펼치기" : "사이드바 접기"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="sidebar__nav">
          <ul className="sidebar__menu">
            {mainMenuItems.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`sidebar__item ${isActive(item.href) ? "sidebar__item--active" : ""}`}
                  title={collapsed ? item.label : undefined}
                >
                  <span className="sidebar__item-icon">{item.icon}</span>
                  {!collapsed && (
                    <span className="sidebar__item-label">{item.label}</span>
                  )}
                </Link>
              </li>
            ))}
          </ul>

          {isAdmin && (
            <>
              <div className="sidebar__divider">
                {!collapsed && <span className="sidebar__section-title">관리자</span>}
              </div>
              <ul className="sidebar__menu">
                {adminMenuItems.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`sidebar__item ${isActive(item.href) ? "sidebar__item--active" : ""}`}
                      title={collapsed ? item.label : undefined}
                    >
                      <span className="sidebar__item-icon">{item.icon}</span>
                      {!collapsed && (
                        <span className="sidebar__item-label">{item.label}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </nav>
      </aside>

      {/* Mobile Floating Pill Nav Bar */}
      <nav className="mobile-tab-bar">
        {mobileTabItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-tab-bar__item ${isActive(item.href) ? "mobile-tab-bar__item--active" : ""}`}
          >
            <span className="mobile-tab-bar__icon">{item.icon}</span>
            <span className="mobile-tab-bar__label">{item.label}</span>
          </Link>
        ))}
        <button
          className={`mobile-tab-bar__item ${showMoreMenu ? "mobile-tab-bar__item--active" : ""}`}
          onClick={() => setShowMoreMenu((v) => !v)}
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <span className="mobile-tab-bar__icon">
            <MoreHorizontal size={20} />
          </span>
          <span className="mobile-tab-bar__label">더보기</span>
        </button>
      </nav>

      {/* More Menu Overlay */}
      <AnimatePresence>
        {showMoreMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowMoreMenu(false)}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(10, 10, 10, 0.95)",
              zIndex: 9998,
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                maxWidth: "480px",
                maxHeight: "80vh",
                overflowY: "auto",
                padding: "1.5rem",
                paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px) + 5rem)",
                borderRadius: "1.25rem 1.25rem 0 0",
                background: "#1A1A1A",
                border: "1px solid #222222",
                borderBottom: "none",
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.25rem",
                }}
              >
                <h3
                  style={{
                    fontSize: "1.125rem",
                    fontWeight: 800,
                    color: "#FFFFFF",
                  }}
                >
                  메뉴
                </h3>
                <button
                  onClick={() => setShowMoreMenu(false)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#666666",
                    cursor: "pointer",
                    padding: "0.25rem",
                  }}
                >
                  ✕
                </button>
              </div>

              {/* Menu Grid */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: "0.5rem",
                }}
              >
                {moreMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setShowMoreMenu(false)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "1rem 0.5rem",
                      borderRadius: "0.75rem",
                      background: isActive(item.href)
                        ? "rgba(0, 230, 118, 0.1)"
                        : "#222222",
                      border: isActive(item.href)
                        ? "1px solid rgba(0, 230, 118, 0.3)"
                        : "1px solid transparent",
                      color: isActive(item.href) ? "#00E676" : "#AAAAAA",
                      textDecoration: "none",
                      transition: "background 0.15s ease",
                    }}
                  >
                    {item.icon}
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </span>
                  </Link>
                ))}
              </div>

              {/* Admin Section */}
              {isAdmin && (
                <>
                  <div
                    style={{
                      marginTop: "1.25rem",
                      marginBottom: "0.75rem",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      color: "#666666",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    관리자
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: "0.5rem",
                    }}
                  >
                    {moreMenuAdminItems.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setShowMoreMenu(false)}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          gap: "0.5rem",
                          padding: "1rem 0.5rem",
                          borderRadius: "0.75rem",
                          background: isActive(item.href)
                            ? "rgba(0, 230, 118, 0.1)"
                            : "#222222",
                          border: isActive(item.href)
                            ? "1px solid rgba(0, 230, 118, 0.3)"
                            : "1px solid transparent",
                          color: isActive(item.href) ? "#00E676" : "#AAAAAA",
                          textDecoration: "none",
                          transition: "background 0.15s ease",
                        }}
                      >
                        {item.icon}
                        <span
                          style={{
                            fontSize: "0.6875rem",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {item.label}
                        </span>
                      </Link>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
