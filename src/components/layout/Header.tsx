"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface UserProfile {
  nickname: string;
  profile_image_url: string | null;
  role: string;
}

const pageTitles: Record<string, string> = {
  "/dashboard": "대시보드",
  "/workout": "운동인증",
  "/gallery": "갤러리",
  "/ranking": "랭킹",
  "/fines": "벌금",
  "/exemptions": "면제신청",
  "/challenges": "챌린지",
  "/ai-coach": "AI코치",
  "/notices": "공지사항",
  "/settings": "설정",
  "/photo-review": "사진검토",
  "/exemption-manage": "면제관리",
  "/fine-manage": "벌금관리",
  "/member-manage": "멤버관리",
  "/weekly-aggregate": "주간집계",
};

function getPageTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];

  // Check prefix matches for nested routes
  for (const [path, title] of Object.entries(pageTitles)) {
    if (pathname.startsWith(path + "/")) return title;
  }

  return "SME GYM";
}

export default function Header() {
  const pathname = usePathname();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [hasNotifications, setHasNotifications] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("users")
        .select("nickname, profile_image_url, role")
        .eq("id", user.id)
        .single();

      if (data) {
        setProfile(data);
      }

      // Check for exemption approval notifications (not yet notified)
      const { count } = await supabase
        .from("exemptions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .in("status", ["approved", "rejected"])
        .eq("notified", false);

      if (count && count > 0) {
        setHasNotifications(true);
      }
    }

    loadProfile();
  }, []);

  const pageTitle = getPageTitle(pathname);

  return (
    <header className="header">
      <h1 className="header__title">{pageTitle}</h1>

      <div className="header__actions">
        <Link href="/notices" className="header__notification-btn" aria-label="알림">
          <Bell size={20} />
          {hasNotifications && <span className="header__notification-dot" />}
        </Link>

        <Link href="/settings" className="header__profile">
          <div className="header__avatar">
            {profile?.profile_image_url ? (
              <img
                src={profile.profile_image_url}
                alt={profile.nickname}
                className="header__avatar-img"
              />
            ) : (
              <User size={18} />
            )}
          </div>
          <span className="header__nickname">{profile?.nickname ?? ""}</span>
        </Link>
      </div>
    </header>
  );
}
