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
    const { exemptionId, action } = body as {
      exemptionId: string;
      action: "approve" | "reject";
    };

    if (!exemptionId || !action) {
      return NextResponse.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 },
      );
    }

    const newStatus = action === "approve" ? "approved" : "rejected";

    const { error: updateError } = await supabase
      .from("exemptions")
      .update({
        status: newStatus,
        processed_by: authUser.id,
      } as never)
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
        // Parse actual dates from the free-form text (e.g., "4/13(월), 4/14(화)" or "2026-04-13")
        const dateRegex = /(\d{1,2})\/(\d{1,2})/g;
        const parsedDateStrings: string[] = [];
        let match;
        while ((match = dateRegex.exec(exemption.dates)) !== null) {
          const month = parseInt(match[1], 10);
          const day = parseInt(match[2], 10);
          const year = new Date().getFullYear();
          // 시간대 이슈 방지: Date 객체 대신 "YYYY-MM-DD" 문자열로 관리
          const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          parsedDateStrings.push(dateStr);
        }

        // Fetch all weeks to find the correct one for each date
        const { data: allWeeks } = (await supabase
          .from("weeks")
          .select("id, start_date, end_date")
          .order("start_date", { ascending: false })
          .limit(10)) as unknown as { data: { id: string; start_date: string; end_date: string }[] | null };

        if (allWeeks && parsedDateStrings.length > 0) {
          for (const dateStr of parsedDateStrings) {
            // 문자열 비교로 시간대 이슈 없이 주차 매칭
            const targetWeek = allWeeks.find((w) => {
              return dateStr >= w.start_date && dateStr <= w.end_date;
            });

            if (!targetWeek) continue;

            // Calculate day_of_week (1=Mon, 7=Sun) from date string
            // UTC 날짜로 파싱하여 요일 계산 (시간대 무관)
            const [y, m, d] = dateStr.split("-").map(Number);
            const utcDate = new Date(Date.UTC(y, m - 1, d));
            const jsDay = utcDate.getUTCDay(); // 0=Sun
            const dow = jsDay === 0 ? 7 : jsDay;

            // Check if a check_in record already exists
            const { data: existing } = (await supabase
              .from("check_ins")
              .select("id, status")
              .eq("user_id" as string, exemption.user_id)
              .eq("week_id" as string, targetWeek.id)
              .eq("day_of_week" as string, dow)
              .maybeSingle()) as unknown as { data: { id: string; status: string } | null };

            if (existing) {
              // 이미 승인(O)된 운동 기록은 보존 (면제로 덮어쓰지 않음)
              if (existing.status !== "O") {
                await supabase
                  .from("check_ins")
                  .update({ status: "☆" } as never)
                  .eq("id" as string, existing.id);
              }
            } else {
              await supabase.from("check_ins").insert({
                user_id: exemption.user_id,
                week_id: targetWeek.id,
                day_of_week: dow,
                status: "☆",
              } as never);
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
