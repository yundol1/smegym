import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MainLayoutShell from "@/components/layout/MainLayoutShell";

export default async function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // 계정 상태 확인 (탈퇴/대기 상태면 로그아웃 처리)
  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single<{ role: string }>();

  if (!profile || profile.role === "withdrawn" || profile.role === "pending") {
    await supabase.auth.signOut();
    redirect("/login");
  }

  return <MainLayoutShell>{children}</MainLayoutShell>;
}
