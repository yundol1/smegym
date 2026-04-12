import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import type { Database, Fine, Week, User } from "@/types/database";

export async function GET() {
  const serverSupabase = await createServerSupabase();
  const { data: { user: authUser } } = await serverSupabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { data: profile } = await serverSupabase.from("users").select("role").eq("id", authUser.id).single();
  if (!profile || (profile as any).role !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

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
    // Find the previous week (most recent non-current week)
    const { data: prevWeek } = (await supabase
      .from("weeks")
      .select("id, title")
      .eq("is_current" as string, false)
      .order("end_date", { ascending: false })
      .limit(1)
      .maybeSingle()) as unknown as { data: Pick<Week, "id" | "title"> | null };

    // Also get current week fines (in case aggregation already happened)
    const { data: currentWeek } = (await supabase
      .from("weeks")
      .select("id, title")
      .eq("is_current" as string, true)
      .maybeSingle()) as unknown as { data: Pick<Week, "id" | "title"> | null };

    // Fetch all unpaid fines
    const { data: fines, error: finesError } = (await supabase
      .from("fines")
      .select("*")
      .eq("is_paid" as string, false)
      .gt("fine_amount" as string, 0)
      .order("created_at", { ascending: false })) as unknown as { data: Fine[] | null; error: typeof Error | null };

    if (finesError) throw finesError;
    if (!fines || fines.length === 0) {
      return NextResponse.json({ fines: [] });
    }

    // Build week title map
    const weekMap: Record<string, string> = {};
    if (prevWeek) weekMap[prevWeek.id] = prevWeek.title;
    if (currentWeek) weekMap[currentWeek.id] = currentWeek.title;

    // Fetch any other week titles we might need
    const missingWeekIds = fines
      .map((f) => f.week_id)
      .filter((wid) => !weekMap[wid]);
    if (missingWeekIds.length > 0) {
      const { data: otherWeeks } = (await supabase
        .from("weeks")
        .select("id, title")
        .in("id", [...new Set(missingWeekIds)])) as unknown as { data: Pick<Week, "id" | "title">[] | null };
      if (otherWeeks) {
        for (const w of otherWeeks) {
          weekMap[w.id] = w.title;
        }
      }
    }

    // Fetch user nicknames
    const userIds = [...new Set(fines.map((f) => f.user_id))];
    const { data: users } = (await supabase
      .from("users")
      .select("id, nickname")
      .in("id", userIds)) as unknown as { data: Pick<User, "id" | "nickname">[] | null };

    const userMap: Record<string, string> = {};
    if (users) {
      for (const u of users) {
        userMap[u.id] = u.nickname;
      }
    }

    const result = fines.map((f) => ({
      id: f.id,
      userId: f.user_id,
      nickname: userMap[f.user_id] || "알 수 없음",
      weekId: f.week_id,
      weekTitle: weekMap[f.week_id] || "-",
      workoutCount: f.workout_count,
      fineAmount: f.fine_amount,
      isPaid: f.is_paid,
      createdAt: f.created_at,
    }));

    return NextResponse.json({ fines: result });
  } catch (error) {
    console.error("Admin fines GET error:", error);
    return NextResponse.json(
      { error: "벌금 목록을 불러오는데 실패했습니다." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const serverSupabase = await createServerSupabase();
  const { data: { user: authUser } } = await serverSupabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }
  const { data: profile } = await serverSupabase.from("users").select("role").eq("id", authUser.id).single();
  if (!profile || (profile as any).role !== "admin") {
    return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
  }

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
    const { fineId, adminId } = body as {
      fineId: string;
      adminId: string;
    };

    if (!fineId || !adminId) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 },
      );
    }

    const { error: updateError } = await (supabase
      .from("fines") as any)
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        confirmed_by: adminId,
      })
      .eq("id", fineId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin fines PATCH error:", error);
    return NextResponse.json(
      { error: "납부 확인 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
