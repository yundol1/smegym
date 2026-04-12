import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

interface CheckInRow {
  user_id: string;
  status: string | null;
}

interface UserRow {
  id: string;
  nickname: string;
}

export async function GET(request: NextRequest) {
  const challengeId = request.nextUrl.searchParams.get("challengeId");
  if (!challengeId) {
    return NextResponse.json(
      { error: "challengeId is required" },
      { status: 400 },
    );
  }

  const serverSupabase = await createServerSupabase();
  const {
    data: { user: authUser },
  } = await serverSupabase.auth.getUser();

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 },
    );
  }

  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    { auth: { persistSession: false } },
  );

  try {
    // Fetch the challenge
    const { data: challenge, error: challengeError } = (await supabase
      .from("challenges")
      .select("id, start_date, end_date, target_count")
      .eq("id", challengeId)
      .single()) as unknown as { data: { id: string; start_date: string; end_date: string; target_count: number } | null; error: unknown };

    if (challengeError || !challenge) {
      return NextResponse.json(
        { error: "Challenge not found" },
        { status: 404 },
      );
    }

    // Find weeks that overlap with the challenge period
    const { data: weeks } = (await supabase
      .from("weeks")
      .select("id")
      .lte("start_date", challenge.end_date)
      .gte("end_date", challenge.start_date)) as { data: { id: string }[] | null };

    const weekIds = (weeks ?? []).map((w) => w.id);

    if (weekIds.length === 0) {
      return NextResponse.json({
        participants: [],
        myCount: 0,
        target: challenge.target_count,
      });
    }

    // Get all check-ins with status O during those weeks
    const { data: checkIns } = (await supabase
      .from("check_ins")
      .select("user_id, status")
      .in("week_id", weekIds)) as { data: CheckInRow[] | null };

    const approved = (checkIns ?? []).filter((ci) => ci.status === "O");

    // Count per user
    const countMap: Record<string, number> = {};
    for (const ci of approved) {
      countMap[ci.user_id] = (countMap[ci.user_id] ?? 0) + 1;
    }

    const userIds = Object.keys(countMap);
    if (userIds.length === 0) {
      return NextResponse.json({
        participants: [],
        myCount: 0,
        target: challenge.target_count,
      });
    }

    // Get nicknames
    const { data: users } = (await supabase
      .from("users")
      .select("id, nickname")
      .in("id", userIds)) as { data: UserRow[] | null };

    const userMap: Record<string, string> = {};
    for (const u of users ?? []) {
      userMap[u.id] = u.nickname;
    }

    const participants = userIds
      .map((uid) => ({
        nickname: userMap[uid] ?? "알 수 없음",
        count: countMap[uid],
      }))
      .sort((a, b) => b.count - a.count);

    const myCount = authUser ? (countMap[authUser.id] ?? 0) : 0;

    return NextResponse.json({
      participants,
      myCount,
      target: challenge.target_count,
    });
  } catch (error) {
    console.error("Challenge stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch challenge stats" },
      { status: 500 },
    );
  }
}
