import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

function getAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return null;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey
  );
}

export async function POST(request: Request) {
  const serverSupabase = await createServerSupabase();
  const { data: { user: authUser } } = await serverSupabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { data: profile } = await serverSupabase.from("users").select("role").eq("id", authUser.id).single();
  if (!profile || (profile as never as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return Response.json(
      { error: "서버 설정 오류입니다. (SERVICE_ROLE_KEY 누락)" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { title, start_date, end_date, target_count, reward, description, banner_image_url } =
      body;

    if (!title || !start_date || !end_date || !target_count) {
      return Response.json(
        { error: "필수 필드가 누락되었습니다" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("challenges")
      .insert({
        title,
        start_date,
        end_date,
        target_count,
        reward: reward || null,
        description: description || null,
        banner_image_url: banner_image_url || null,
      })
      .select()
      .single();

    if (error) {
      return Response.json(
        { error: "챌린지 생성 실패: " + error.message },
        { status: 500 }
      );
    }

    return Response.json({ challenge: data });
  } catch {
    return Response.json(
      { error: "챌린지 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const serverSupabase = await createServerSupabase();
  const { data: { user: authUser } } = await serverSupabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { data: profile } = await serverSupabase.from("users").select("role").eq("id", authUser.id).single();
  if (!profile || (profile as never as { role: string }).role !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

  const supabase = getAdminClient();
  if (!supabase) {
    return Response.json(
      { error: "서버 설정 오류입니다. (SERVICE_ROLE_KEY 누락)" },
      { status: 500 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return Response.json(
        { error: "챌린지 ID가 필요합니다" },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from("challenges")
      .delete()
      .eq("id", id);

    if (error) {
      return Response.json(
        { error: "챌린지 삭제 실패: " + error.message },
        { status: 500 }
      );
    }

    return Response.json({ success: true });
  } catch {
    return Response.json(
      { error: "챌린지 삭제 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
