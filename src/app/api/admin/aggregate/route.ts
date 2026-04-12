import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import { addDays, format } from "date-fns";

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
  if (!profile || (profile as any).role !== "admin") {
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
    const adminId: string | undefined = body.admin_id;

    // 1. Get current week
    const { data: currentWeek, error: weekError } = await supabase
      .from("weeks")
      .select("*")
      .eq("is_current", true)
      .single();

    if (weekError || !currentWeek) {
      return Response.json(
        { error: "현재 주차를 찾을 수 없습니다" },
        { status: 404 }
      );
    }

    // 2. Get all active users (member + admin)
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, nickname")
      .in("role", ["member", "admin"]);

    if (usersError || !users) {
      return Response.json(
        { error: "사용자 목록을 가져올 수 없습니다" },
        { status: 500 }
      );
    }

    // 3. For each user, count check_ins with status O or ☆
    let totalFines = 0;
    let usersProcessed = 0;

    for (const user of users) {
      const { count } = await supabase
        .from("check_ins")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("week_id", currentWeek.id)
        .in("status", ["O", "☆"]);

      const workoutCount = count ?? 0;
      const fineAmount = workoutCount < 3 ? (3 - workoutCount) * 2000 : 0;

      // 4. Upsert into fines table
      const { error: fineError } = await supabase
        .from("fines")
        .upsert(
          {
            user_id: user.id,
            week_id: currentWeek.id,
            workout_count: workoutCount,
            fine_amount: fineAmount,
          },
          { onConflict: "user_id,week_id" }
        );

      if (fineError) {
        // If upsert with onConflict fails (no unique constraint), try insert
        await supabase.from("fines").insert({
          user_id: user.id,
          week_id: currentWeek.id,
          workout_count: workoutCount,
          fine_amount: fineAmount,
        });
      }

      totalFines += fineAmount;
      usersProcessed++;
    }

    // 5. Clear current week before creating next
    const nextStartDate = addDays(new Date(currentWeek.start_date), 7);
    const nextEndDate = addDays(new Date(currentWeek.end_date), 7);
    const nextTitle = `${format(nextStartDate, "M/d")} ~ ${format(nextEndDate, "M/d")}`;

    // First, update old week: set is_current=false, aggregated_at, aggregated_by
    const { error: updateError } = await supabase
      .from("weeks")
      .update({
        is_current: false,
        aggregated_at: new Date().toISOString(),
        aggregated_by: adminId ?? null,
      })
      .eq("id", currentWeek.id);

    if (updateError) {
      return Response.json(
        { error: "이전 주차 업데이트 실패: " + updateError.message },
        { status: 500 }
      );
    }

    // 6. Then create the next week with is_current=true
    const { error: insertWeekError } = await supabase.from("weeks").insert({
      title: nextTitle,
      start_date: format(nextStartDate, "yyyy-MM-dd"),
      end_date: format(nextEndDate, "yyyy-MM-dd"),
      is_current: true,
    });

    if (insertWeekError) {
      return Response.json(
        { error: "다음 주차 생성 실패: " + insertWeekError.message },
        { status: 500 }
      );
    }

    // 7. Return summary
    return Response.json({
      usersProcessed,
      totalFines,
      newWeekTitle: nextTitle,
    });
  } catch (err) {
    return Response.json(
      { error: "집계 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
