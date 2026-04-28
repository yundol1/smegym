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
  if (!profile || (profile as never as { role: string }).role !== "admin") {
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

    // Fetch user nicknames and roles (탈퇴 유저 제외)
    const userIds = [...new Set(fines.map((f) => f.user_id))];
    const { data: users } = (await supabase
      .from("users")
      .select("id, nickname, role")
      .in("id", userIds)) as unknown as { data: Pick<User, "id" | "nickname" | "role">[] | null };

    const userMap: Record<string, string> = {};
    const withdrawnIds = new Set<string>();
    if (users) {
      for (const u of users) {
        userMap[u.id] = u.nickname;
        if (u.role === "withdrawn") withdrawnIds.add(u.id);
      }
    }

    // 탈퇴 유저 벌금 제외
    const activeFines = fines.filter((f) => !withdrawnIds.has(f.user_id));

    const result = activeFines.map((f) => ({
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
  if (!profile || (profile as never as { role: string }).role !== "admin") {
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
    const { fineId } = body as {
      fineId: string;
    };

    if (!fineId) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 },
      );
    }

    // Fetch fine details before marking as paid
    const { data: fineRecord } = (await supabase
      .from("fines")
      .select("fine_amount, user_id, week_id")
      .eq("id", fineId)
      .single()) as unknown as { data: { fine_amount: number; user_id: string; week_id: string } | null };

    const { error: updateError } = await supabase
      .from("fines")
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        confirmed_by: authUser.id,
      } as never)
      .eq("id", fineId);

    if (updateError) throw updateError;

    // Record the fine payment as a transaction
    if (fineRecord) {
      // Look up nickname, week title, and latest transaction balance
      const [userResult, weekResult, latestTxResult] = await Promise.all([
        supabase.from("users").select("nickname").eq("id", fineRecord.user_id).single() as unknown as Promise<{ data: { nickname: string } | null }>,
        supabase.from("weeks").select("title").eq("id", fineRecord.week_id).single() as unknown as Promise<{ data: { title: string } | null }>,
        supabase.from("transactions").select("balance").order("created_at", { ascending: false }).limit(1).maybeSingle() as unknown as Promise<{ data: { balance: number } | null }>,
      ]);

      const targetNickname = userResult.data?.nickname ?? "알 수 없음";
      const weekTitle = weekResult.data?.title ?? "";
      const previousBalance = latestTxResult.data?.balance ?? 0;
      const newBalance = previousBalance + fineRecord.fine_amount;

      await supabase.from("transactions").insert({
        description: `벌금 납부 - ${targetNickname}`,
        income: fineRecord.fine_amount,
        expense: 0,
        balance: newBalance,
        transacted_by: targetNickname,
        note: weekTitle,
      } as never);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin fines PATCH error:", error);
    return NextResponse.json(
      { error: "납부 확인 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
