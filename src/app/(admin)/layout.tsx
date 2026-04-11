import { createClient } from "@/lib/supabase/server";
import AdminLayoutShell from "@/components/layout/AdminLayoutShell";

export default async function AdminLayout({
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

  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null };

  if (data?.role !== "admin") {
    return (
      <div className="access-denied">
        <div className="access-denied__card card">
          <h2 className="access-denied__title">접근 권한이 없습니다</h2>
          <p className="access-denied__message">
            이 페이지는 관리자만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    );
  }

  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
