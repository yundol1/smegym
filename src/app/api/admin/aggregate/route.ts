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

/** Map day_of_week (1=Mon..7=Sun) to the column name in semi_annual_reports */
const DAY_COL_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

function getCurrentPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return `${year}-${month <= 6 ? "H1" : "H2"}`;
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
    const adminId: string | undefined = body.admin_id;

    // ── Blocker 4: Verify exactly 1 current week exists ──
    const { data: currentWeeks, error: currentWeeksError } = await supabase
      .from("weeks")
      .select("*")
      .eq("is_current", true);

    if (currentWeeksError) {
      return Response.json(
        { error: "현재 주차 조회 실패: " + currentWeeksError.message },
        { status: 500 }
      );
    }

    if (!currentWeeks || currentWeeks.length === 0) {
      return Response.json(
        {
          error: "현재 주차가 없습니다 (is_current=true 레코드 0개). 복구 방법: weeks 테이블에서 가장 최근 주차의 is_current를 true로 수동 설정하세요.",
        },
        { status: 500 }
      );
    }

    if (currentWeeks.length > 1) {
      return Response.json(
        {
          error: `현재 주차가 ${currentWeeks.length}개 존재합니다. is_current=true인 주차가 1개여야 합니다. 중복 주차를 수동으로 정리해주세요.`,
        },
        { status: 500 }
      );
    }

    const currentWeek = currentWeeks[0];

    // ── Blocker 3: Duplicate execution prevention ──
    if (currentWeek.aggregated_at) {
      return Response.json(
        { error: "이미 집계가 완료된 주차입니다." },
        { status: 400 }
      );
    }

    // Warn if end_date has not passed yet
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(currentWeek.end_date);
    endDate.setHours(0, 0, 0, 0);
    const endDateNotPassed = today < endDate;

    // ── Step 1-2: Get users & calculate fines ──
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

    let totalFines = 0;
    let usersProcessed = 0;
    const streakUpdates: Array<{ userId: string; nickname: string; currentStreak: number; maxStreak: number }> = [];
    const reportUpdates: Array<{ userId: string; nickname: string; period: string }> = [];
    const period = getCurrentPeriod();

    for (const user of users) {
      // Get all check_ins for this user + week (with details for day-of-week)
      const { data: checkIns } = await supabase
        .from("check_ins")
        .select("id, day_of_week, status")
        .eq("user_id", user.id)
        .eq("week_id", currentWeek.id);

      const userCheckIns = checkIns ?? [];
      const approvedCheckIns = userCheckIns.filter(
        (ci) => ci.status === "O" || ci.status === "☆"
      );
      const workoutCount = approvedCheckIns.length;

      // ── Step 2: Calculate fine ──
      const fineAmount = workoutCount < 3 ? (3 - workoutCount) * 2000 : 0;

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
        // Fallback: try insert if upsert fails
        await supabase.from("fines").insert({
          user_id: user.id,
          week_id: currentWeek.id,
          workout_count: workoutCount,
          fine_amount: fineAmount,
        });
      }

      totalFines += fineAmount;
      usersProcessed++;

      // ── Step 3: Update semi_annual_reports ──

      // 3a: Increment day-of-week counts for days with status "O"
      const dayIncrements: Record<string, number> = {
        mon_count: 0, tue_count: 0, wed_count: 0,
        thu_count: 0, fri_count: 0, sat_count: 0, sun_count: 0,
      };
      for (const ci of userCheckIns) {
        if (ci.status === "O") {
          const idx = ci.day_of_week - 1;
          if (idx >= 0 && idx < 7) {
            dayIncrements[`${DAY_COL_KEYS[idx]}_count`]++;
          }
        }
      }

      // 3b: Count exemptions (☆) this week
      const weekExemptions = userCheckIns.filter((ci) => ci.status === "☆").length;

      // 3c: Check if fine was paid (is_paid on the fines record)
      const { data: fineRecord } = await supabase
        .from("fines")
        .select("is_paid, fine_amount")
        .eq("user_id", user.id)
        .eq("week_id", currentWeek.id)
        .single();

      const finePaidAmount = (fineRecord && fineRecord.is_paid) ? (fineRecord.fine_amount ?? 0) : 0;

      // 3d: Fetch or create the report row
      const { data: existingReport } = await supabase
        .from("semi_annual_reports")
        .select("*")
        .eq("user_id", user.id)
        .eq("period", period)
        .single();

      if (existingReport) {
        // 3e: Streak calculation - need to determine if user met goal this week
        const metGoal = workoutCount >= 3;
        let newCurrentStreak = existingReport.current_streak;
        let newMaxStreak = existingReport.max_streak;
        let newCurrentMissStreak = existingReport.current_miss_streak;
        let newMaxMissStreak = existingReport.max_miss_streak;

        if (metGoal) {
          newCurrentStreak += 1;
          if (newCurrentStreak > newMaxStreak) {
            newMaxStreak = newCurrentStreak;
          }
          newCurrentMissStreak = 0;
        } else {
          newCurrentMissStreak += 1;
          if (newCurrentMissStreak > newMaxMissStreak) {
            newMaxMissStreak = newCurrentMissStreak;
          }
          newCurrentStreak = 0;
        }

        const { error: updateReportError } = await supabase
          .from("semi_annual_reports")
          .update({
            mon_count: existingReport.mon_count + dayIncrements.mon_count,
            tue_count: existingReport.tue_count + dayIncrements.tue_count,
            wed_count: existingReport.wed_count + dayIncrements.wed_count,
            thu_count: existingReport.thu_count + dayIncrements.thu_count,
            fri_count: existingReport.fri_count + dayIncrements.fri_count,
            sat_count: existingReport.sat_count + dayIncrements.sat_count,
            sun_count: existingReport.sun_count + dayIncrements.sun_count,
            current_streak: newCurrentStreak,
            max_streak: newMaxStreak,
            current_miss_streak: newCurrentMissStreak,
            max_miss_streak: newMaxMissStreak,
            total_exemptions: existingReport.total_exemptions + weekExemptions,
            total_fines_paid: existingReport.total_fines_paid + finePaidAmount,
          })
          .eq("id", existingReport.id);

        if (!updateReportError) {
          streakUpdates.push({
            userId: user.id,
            nickname: user.nickname,
            currentStreak: newCurrentStreak,
            maxStreak: newMaxStreak,
          });
          reportUpdates.push({ userId: user.id, nickname: user.nickname, period });
        }
      } else {
        // Create new report row for this period
        const metGoal = workoutCount >= 3;
        const newCurrentStreak = metGoal ? 1 : 0;
        const newMaxStreak = metGoal ? 1 : 0;
        const newCurrentMissStreak = metGoal ? 0 : 1;
        const newMaxMissStreak = metGoal ? 0 : 1;

        const { error: insertReportError } = await supabase
          .from("semi_annual_reports")
          .insert({
            user_id: user.id,
            period,
            mon_count: dayIncrements.mon_count,
            tue_count: dayIncrements.tue_count,
            wed_count: dayIncrements.wed_count,
            thu_count: dayIncrements.thu_count,
            fri_count: dayIncrements.fri_count,
            sat_count: dayIncrements.sat_count,
            sun_count: dayIncrements.sun_count,
            current_streak: newCurrentStreak,
            max_streak: newMaxStreak,
            current_miss_streak: newCurrentMissStreak,
            max_miss_streak: newMaxMissStreak,
            total_exemptions: weekExemptions,
            total_fines_paid: finePaidAmount,
          });

        if (!insertReportError) {
          streakUpdates.push({
            userId: user.id,
            nickname: user.nickname,
            currentStreak: newCurrentStreak,
            maxStreak: newMaxStreak,
          });
          reportUpdates.push({ userId: user.id, nickname: user.nickname, period });
        }
      }
    }

    // ── Step 4-5: Close current week & create next week ──
    // (Wrapped in try-catch for rollback - Blocker 2)
    const nextStartDate = addDays(new Date(currentWeek.start_date), 7);
    const nextEndDate = addDays(new Date(currentWeek.end_date), 7);
    const nextTitle = `${format(nextStartDate, "M/d")} ~ ${format(nextEndDate, "M/d")}`;

    // Step 5: Mark current week as aggregated, set is_current=false
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

    // Step 4: Create next week
    const { error: insertWeekError } = await supabase.from("weeks").insert({
      title: nextTitle,
      start_date: format(nextStartDate, "yyyy-MM-dd"),
      end_date: format(nextEndDate, "yyyy-MM-dd"),
      is_current: true,
    });

    if (insertWeekError) {
      // ── Blocker 2: Rollback - restore is_current on old week ──
      await supabase
        .from("weeks")
        .update({ is_current: true, aggregated_at: null, aggregated_by: null })
        .eq("id", currentWeek.id);

      return Response.json(
        { error: "다음 주차 생성 실패 (롤백 완료): " + insertWeekError.message },
        { status: 500 }
      );
    }

    // ── Blocker 4: Verify new week is current ──
    const { data: verifyWeeks } = await supabase
      .from("weeks")
      .select("id")
      .eq("is_current", true);

    if (!verifyWeeks || verifyWeeks.length !== 1) {
      console.error(
        "집계 후 is_current=true 주차 수 이상:",
        verifyWeeks?.length ?? 0
      );
    }

    // Return detailed summary
    return Response.json({
      usersProcessed,
      totalFines,
      newWeekTitle: nextTitle,
      streakUpdates,
      reportUpdates,
      ...(endDateNotPassed ? { warning: "주차 종료일이 아직 지나지 않았습니다." } : {}),
    });
  } catch (err) {
    // ── Blocker 2: Top-level catch ──
    console.error("집계 처리 중 오류:", err);
    return Response.json(
      { error: "집계 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
