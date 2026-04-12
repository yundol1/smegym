import { createClient, PostgrestError } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

interface WeekRow { id: string }
interface CheckInRow { user_id: string; status: string | null }
interface UserRow { id: string; nickname: string }
interface ReportRow { user_id: string; current_streak: number; max_streak: number }

type QResult<T> = { data: T[] | null; error: PostgrestError | null };

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json(
      { error: "Server configuration error: missing SUPABASE_SERVICE_ROLE_KEY" },
      { status: 500 }
    );
  }

  const supabase = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    // Get all weeks starting from 2026-01-01
    const { data: weeks, error: weeksError } = await supabase
      .from("weeks")
      .select("id")
      .gte("start_date", "2026-01-01") as QResult<WeekRow>;

    if (weeksError) throw weeksError;

    const weekIds = (weeks ?? []).map((w) => w.id);

    if (weekIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get all completed check-ins for those weeks
    const { data: checkIns, error: checkInsError } = await supabase
      .from("check_ins")
      .select("user_id, status")
      .in("week_id", weekIds) as QResult<CheckInRow>;

    if (checkInsError) throw checkInsError;

    // Filter completed statuses in JS to avoid chaining .in()
    const completed = (checkIns ?? []).filter(
      (ci) => ci.status === "O" || ci.status === "☆"
    );

    // Count completed check-ins per user
    const countMap: Record<string, number> = {};
    for (const ci of completed) {
      countMap[ci.user_id] = (countMap[ci.user_id] ?? 0) + 1;
    }

    const userIds = Object.keys(countMap);
    if (userIds.length === 0) {
      return NextResponse.json([]);
    }

    // Get user info (bypasses RLS with service_role)
    const { data: users, error: usersError } = await supabase
      .from("users")
      .select("id, nickname")
      .in("id", userIds) as QResult<UserRow>;

    if (usersError) throw usersError;

    // Get streak info from semi_annual_reports
    const { data: reports, error: reportsError } = await supabase
      .from("semi_annual_reports")
      .select("user_id, current_streak, max_streak")
      .in("user_id", userIds)
      .order("created_at", { ascending: false }) as QResult<ReportRow>;

    if (reportsError) throw reportsError;

    // Build streak map (latest report per user)
    const streakMap: Record<string, { current: number; max: number }> = {};
    for (const r of reports ?? []) {
      if (!streakMap[r.user_id]) {
        streakMap[r.user_id] = {
          current: r.current_streak,
          max: r.max_streak,
        };
      }
    }

    // Build ranking array
    const ranking = (users ?? [])
      .map((u) => ({
        userId: u.id,
        nickname: u.nickname,
        initial: u.nickname.charAt(0).toUpperCase(),
        totalWorkouts: countMap[u.id] ?? 0,
        currentStreak: streakMap[u.id]?.current ?? 0,
        maxStreak: streakMap[u.id]?.max ?? 0,
      }))
      .sort((a, b) => b.totalWorkouts - a.totalWorkouts);

    // Assign ranks (same workout count = same rank)
    let currentRank = 1;
    const result = ranking.map((item, idx) => {
      if (idx > 0 && item.totalWorkouts < ranking[idx - 1].totalWorkouts) {
        currentRank = idx + 1;
      }
      return { rank: currentRank, ...item };
    });

    // Calculate percentile for the requesting user
    let myPercentile: number | null = null;
    try {
      const sSupabase = await createServerSupabase();
      const { data: { user: authUser } } = await sSupabase.auth.getUser();
      if (authUser) {
        const totalUsers = result.length;
        const myEntry = result.find((r: { userId: string }) => r.userId === authUser.id);
        if (myEntry && totalUsers > 0) {
          myPercentile = Math.round(((totalUsers - myEntry.rank) / totalUsers) * 100);
        }
      }
    } catch {
      // ignore - percentile is optional
    }

    return NextResponse.json({ rankings: result, myPercentile });
  } catch (error) {
    console.error("Ranking API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch ranking data" },
      { status: 500 }
    );
  }
}
