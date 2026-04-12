"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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
  // { label: "AI코치", icon: <Bot size={20} />, href: "/ai-coach" }, // Phase 5에서 구현 예정
  { label: "공지사항", icon: <Bell size={20} />, href: "/notices" },
  { label: "설정", icon: <Settings size={20} />, href: "/settings" },
];

const mobileTabItems: MenuItem[] = [
  { label: "대시보드", icon: <LayoutDashboard size={20} />, href: "/dashboard" },
  { label: "운동인증", icon: <Camera size={20} />, href: "/workout" },
  { label: "갤러리", icon: <Images size={20} />, href: "/gallery" },
  { label: "랭킹", icon: <Trophy size={20} />, href: "/ranking" },
  { label: "설정", icon: <Settings size={20} />, href: "/settings" },
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
      </nav>
    </>
  );
}
