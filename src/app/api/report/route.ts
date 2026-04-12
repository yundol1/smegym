import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SemiAnnualReport } from "@/types/database";

interface WeekRow {
  id: string;
  start_date: string;
  end_date: string;
}

interface CheckInRow {
  id: string;
  day_of_week: number;
  status: string | null;
  is_public: boolean;
  post_content: string | null;
  created_at: string;
}

interface WeeklyCheckInRow {
  week_id: string;
  status: string | null;
}

interface FineRow {
  fine_amount: number;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const userId = user.id;

    // Determine the current semi-annual period
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const isFirstHalf = month <= 6;
    const period = `${year}-${isFirstHalf ? "H1" : "H2"}`;
    const periodStart = isFirstHalf ? `${year}-01-01` : `${year}-07-01`;
    const periodEnd = isFirstHalf ? `${year}-06-30` : `${year}-12-31`;
    const periodLabel = isFirstHalf ? `${year}년 상반기` : `${year}년 하반기`;

    // Try to fetch existing report
    const { data: existingReport } = await supabase
      .from("semi_annual_reports")
      .select("*")
      .eq("user_id", userId)
      .eq("period", period)
      .single<SemiAnnualReport>();

    if (existingReport) {
      const total =
        existingReport.mon_count +
        existingReport.tue_count +
        existingReport.wed_count +
        existingReport.thu_count +
        existingReport.fri_count +
        existingReport.sat_count +
        existingReport.sun_count;

      return NextResponse.json({
        report: existingReport,
        period,
        periodLabel,
        periodStart,
        periodEnd,
        totalWorkouts: total,
      });
    }

    // No saved report - calculate from raw data

    // 1. Fetch weeks in this period
    const { data: weeksRaw } = await supabase
      .from("weeks")
      .select("id, start_date, end_date")
      .gte("start_date", periodStart)
      .lte("end_date", periodEnd);

    const weeks = (weeksRaw as WeekRow[] | null) ?? [];
    const weekIds = weeks.map((w) => w.id);

    // 2. Fetch check_ins for this user in the period
    let checkIns: CheckInRow[] = [];

    if (weekIds.length > 0) {
      const { data } = await supabase
        .from("check_ins")
        .select("id, day_of_week, status, is_public, post_content, created_at")
        .eq("user_id", userId)
        .in("week_id", weekIds);
      checkIns = (data as CheckInRow[] | null) ?? [];
    }

    // Day-of-week counts (1=Mon ... 7=Sun)
    const dayCounts = { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, sat: 0, sun: 0 };
    const dayKeys = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

    const approvedCheckIns = checkIns.filter(
      (ci) => ci.status === "O" || ci.status === "\u2606"
    );

    for (const ci of approvedCheckIns) {
      const idx = ci.day_of_week - 1;
      if (idx >= 0 && idx < 7) {
        dayCounts[dayKeys[idx]]++;
      }
    }

    const totalWorkouts = approvedCheckIns.length;

    // Streak calculation using weekly data
    let weeklyCheckIns: WeeklyCheckInRow[] = [];
    if (weekIds.length > 0) {
      const { data } = await supabase
        .from("check_ins")
        .select("week_id, status")
        .eq("user_id", userId)
        .in("week_id", weekIds);
      weeklyCheckIns = (data as WeeklyCheckInRow[] | null) ?? [];
    }

    // Group by week_id
    const weekWorkoutMap = new Map<string, boolean>();
    for (const ci of weeklyCheckIns) {
      if (ci.status === "O" || ci.status === "\u2606") {
        weekWorkoutMap.set(ci.week_id, true);
      }
    }

    let currentStreak = 0;
    let maxStreak = 0;
    let currentMissStreak = 0;
    let maxMissStreak = 0;

    if (weeks.length > 0) {
      const sortedWeeks = [...weeks].sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      );

      let tempStreak = 0;
      let tempMissStreak = 0;

      for (const week of sortedWeeks) {
        if (weekWorkoutMap.has(week.id)) {
          tempStreak++;
          if (tempStreak > maxStreak) maxStreak = tempStreak;
          tempMissStreak = 0;
        } else {
          tempMissStreak++;
          if (tempMissStreak > maxMissStreak) maxMissStreak = tempMissStreak;
          tempStreak = 0;
        }
      }
      currentStreak = tempStreak;
      currentMissStreak = tempMissStreak;
    }

    // 3. Reactions
    const checkInIds = checkIns.map((ci) => ci.id);
    let reactionsReceived = 0;
    let reactionsSent = 0;

    if (checkInIds.length > 0) {
      const { count: rcvCount } = await supabase
        .from("reactions")
        .select("id", { count: "exact", head: true })
        .in("check_in_id", checkInIds);
      reactionsReceived = rcvCount ?? 0;
    }

    const { count: sentCount } = await supabase
      .from("reactions")
      .select("id", { count: "exact", head: true })
      .eq("reactor_id", userId);
    reactionsSent = sentCount ?? 0;

    // 4. Gallery shares
    const galleryShares = checkIns.filter((ci) => ci.is_public).length;

    // 5. Fines paid
    let totalFinesPaid = 0;
    if (weekIds.length > 0) {
      const { data: finesRaw } = await supabase
        .from("fines")
        .select("fine_amount")
        .eq("user_id", userId)
        .eq("is_paid", true)
        .in("week_id", weekIds);
      const fines = (finesRaw as FineRow[] | null) ?? [];
      totalFinesPaid = fines.reduce((sum, f) => sum + (f.fine_amount || 0), 0);
    }

    // 6. Posts written
    const postsWritten = checkIns.filter(
      (ci) => ci.post_content && ci.post_content.trim().length > 0
    ).length;

    // 7. AI coach uses
    const { count: aiCount } = await supabase
      .from("ai_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    // 8. Exemptions
    const { count: exemptionCount } = await supabase
      .from("exemptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "approved");

    const report = {
      user_id: userId,
      period,
      mon_count: dayCounts.mon,
      tue_count: dayCounts.tue,
      wed_count: dayCounts.wed,
      thu_count: dayCounts.thu,
      fri_count: dayCounts.fri,
      sat_count: dayCounts.sat,
      sun_count: dayCounts.sun,
      current_streak: currentStreak,
      max_streak: maxStreak,
      current_miss_streak: currentMissStreak,
      max_miss_streak: maxMissStreak,
      total_exemptions: exemptionCount ?? 0,
      reactions_received: reactionsReceived,
      reactions_sent: reactionsSent,
      gallery_shares: galleryShares,
      total_fines_paid: totalFinesPaid,
      posts_written: postsWritten,
      ai_coach_uses: aiCount ?? 0,
    };

    return NextResponse.json({
      report,
      period,
      periodLabel,
      periodStart,
      periodEnd,
      totalWorkouts,
      calculated: true,
    });
  } catch (err) {
    console.error("Report API error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
