"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function MainLayoutShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  // 자동 로그인 해제 시: 브라우저 재시작 후 세션 정리
  useEffect(() => {
    const noAutoLogin = localStorage.getItem("smegym_no_auto_login");
    const sessionFlag = sessionStorage.getItem("smegym_session_only");

    // localStorage에 no_auto_login이 있지만 sessionStorage에 플래그가 없으면
    // → 브라우저가 종료되었다가 다시 열린 것 → 세션 정리
    if (noAutoLogin && !sessionFlag) {
      const supabase = createClient();
      supabase.auth.signOut().then(() => {
        localStorage.removeItem("smegym_no_auto_login");
        router.push("/login");
      });
    }
  }, [router]);

  return (
    <div className={`app-layout ${collapsed ? "app-layout--collapsed" : ""}`}>
      <Sidebar collapsed={collapsed} onToggleCollapse={() => setCollapsed(!collapsed)} />
      <div className="app-layout__main">
        <Header />
        <main className="app-layout__content">
          <div className="app-layout__container">{children}</div>
        </main>
      </div>
    </div>
  );
}
