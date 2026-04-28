import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";

export async function requireUser() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  }
  return { user, error: null };
}

export async function requireAdmin() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { user: null, error: NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 }) };
  }
  const { data: profile } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (!profile || (profile as never as { role: string }).role !== "admin") {
    return { user: null, error: NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 }) };
  }
  return { user, error: null };
}

export function getAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key);
}

export function jsonOk(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}
