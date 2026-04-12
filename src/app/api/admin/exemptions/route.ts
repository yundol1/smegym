import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import { createClient as createServerSupabase } from "@/lib/supabase/server";
import type { Database, Exemption, User } from "@/types/database";

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
    // Fetch pending exemptions
    const { data: exemptions, error: exemptionsError } = (await supabase
      .from("exemptions")
      .select("*")
      .eq("status" as string, "pending")
      .order("created_at", { ascending: true })) as unknown as { data: Exemption[] | null; error: typeof Error | null };

    if (exemptionsError) throw exemptionsError;
    if (!exemptions || exemptions.length === 0) {
      return NextResponse.json({ exemptions: [] });
    }

    // Fetch user nicknames
    const userIds = [...new Set(exemptions.map((e) => e.user_id))];
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

    const result = exemptions.map((e) => ({
      id: e.id,
      userId: e.user_id,
      nickname: userMap[e.user_id] || "알 수 없음",
      dates: e.dates,
      reason: e.reason,
      status: e.status,
      createdAt: e.created_at,
    }));

    return NextResponse.json({ exemptions: result });
  } catch (error) {
    console.error("Admin exemptions GET error:", error);
    return NextResponse.json(
      { error: "면제 목록을 불러오는데 실패했습니다." },
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
    const { exemptionId, action, adminId } = body as {
      exemptionId: string;
      action: "approve" | "reject";
      adminId: string;
    };

    if (!exemptionId || !action || !adminId) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 },
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    const { error: updateError } = await (supabase
      .from("exemptions") as any)
      .update({
        status: newStatus,
        processed_by: adminId,
      })
      .eq("id", exemptionId);

    if (updateError) throw updateError;

    // If approved, mark the exemption dates as ☆ in check_ins
    if (action === "approve") {
      // Fetch the exemption to get user_id and dates
      const { data: exemption } = (await supabase
        .from("exemptions")
        .select("user_id, dates")
        .eq("id" as string, exemptionId)
        .single()) as unknown as { data: Pick<Exemption, "user_id" | "dates"> | null };

      if (exemption) {
        // Get current week
        const { data: currentWeek } = (await supabase
          .from("weeks")
          .select("id")
          .eq("is_current" as string, true)
          .single()) as unknown as { data: { id: string } | null };

        if (currentWeek) {
          // Parse dates to determine day_of_week values
          // dates is free-form text like "3/25(월), 3/26(화)"
          // Try to extract day-of-week indicators
          const dayMap: Record<string, number> = {
            "월": 1, "화": 2, "수": 3, "목": 4, "금": 5, "토": 6, "일": 7,
          };

          const dayMatches = exemption.dates.match(/[월화수목금토일]/g);
          if (dayMatches) {
            const dayNumbers = [...new Set(dayMatches.map((d: string) => dayMap[d]))].filter(
              (n) => n !== undefined,
            );

            for (const dow of dayNumbers) {
              // Check if a check_in record already exists
              const { data: existing } = (await supabase
                .from("check_ins")
                .select("id")
                .eq("user_id" as string, exemption.user_id)
                .eq("week_id" as string, currentWeek.id)
                .eq("day_of_week" as string, dow)
                .maybeSingle()) as unknown as { data: { id: string } | null };

              if (existing) {
                // Update existing record
                await (supabase
                  .from("check_ins") as any)
                  .update({ status: "☆" })
                  .eq("id", existing.id);
              } else {
                // Insert new record
                await (supabase.from("check_ins") as any).insert({
                  user_id: exemption.user_id,
                  week_id: currentWeek.id,
                  day_of_week: dow,
                  status: "☆",
                });
              }
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("Admin exemptions PATCH error:", error);
    return NextResponse.json(
      { error: "면제 처리에 실패했습니다." },
      { status: 500 },
    );
  }
}
