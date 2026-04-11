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

  return <MainLayoutShell>{children}</MainLayoutShell>;
}
