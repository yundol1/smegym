import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import type { Database, User } from "@/types/database";

export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "서버 설정 오류: SUPABASE_SERVICE_ROLE_KEY 누락" },
      { status: 500 },
    );
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } },
  );

  try {
    const { data: users, error: usersError } = (await supabase
      .from("users")
      .select("id, nickname, role, profile_image_url, joined_at, created_at")
      .order("created_at", { ascending: false })) as unknown as { data: Pick<User, "id" | "nickname" | "role" | "profile_image_url" | "joined_at" | "created_at">[] | null; error: typeof Error | null };

    if (usersError) throw usersError;

    const result = (users || []).map((u) => ({
      id: u.id,
      nickname: u.nickname,
      role: u.role,
      profileImageUrl: u.profile_image_url,
      joinedAt: u.joined_at,
      createdAt: u.created_at,
    }));

    return NextResponse.json({ members: result });
  } catch (error) {
    console.error("Admin members GET error:", error);
    return NextResponse.json(
      { error: "멤버 목록을 불러오는데 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "서버 설정 오류: SUPABASE_SERVICE_ROLE_KEY 누락" },
      { status: 500 },
    );
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } },
  );

  try {
    const body = await request.json();
    const { userId, action } = body as {
      userId: string;
      action: "approve" | "reject" | "withdraw" | "restore";
    };

    if (!userId || !action) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 },
      );
    }

    let newRole: string;
    switch (action) {
      case "approve":
        newRole = "member";
        break;
      case "reject":
        // Reject a pending user - remove them or mark as withdrawn
        newRole = "withdrawn";
        break;
      case "withdraw":
        newRole = "withdrawn";
        break;
      case "restore":
        newRole = "member";
        break;
      default:
        return NextResponse.json(
          { error: "유효하지 않은 액션입니다." },
          { status: 400 },
        );
    }

    const updateData: Record<string, unknown> = { role: newRole };

    // If approving, set joined_at to now
    if (action === "approve") {
      updateData.joined_at = new Date().toISOString();
    }

    const { error: updateError } = await (supabase
      .from("users") as any)
      .update(updateData)
      .eq("id", userId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, role: newRole });
  } catch (error) {
    console.error("Admin members PATCH error:", error);
    return NextResponse.json(
      { error: "멤버 상태 변경에 실패했습니다." },
      { status: 500 },
    );
  }
}
