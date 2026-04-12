import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerSupabase } from "@/lib/supabase/server";

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

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];

export async function GET(_request: NextRequest) {
  try {
    const serverSupabase = await createServerSupabase();
    const { data: { user: authUser } } = await serverSupabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    const { data: profile } = await serverSupabase.from("users").select("role").eq("id", authUser.id).single();
    if (!profile || (profile as any).role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return Response.json(
        { error: "서버 설정 오류입니다. (SERVICE_ROLE_KEY 누락)" },
        { status: 500 }
      );
    }

    // Fetch all pending check-ins (status = '△')
    const { data: checkIns, error: checkInsError } = await supabaseAdmin
      .from("check_ins")
      .select("id, user_id, week_id, day_of_week, image_url, post_content, created_at")
      .eq("status", "△")
      .order("created_at", { ascending: false });

    if (checkInsError) {
      console.error("Photo review check_ins fetch error:", checkInsError);
      return Response.json(
        { error: "데이터를 불러오는데 실패했습니다." },
        { status: 500 }
      );
    }

    if (!checkIns || checkIns.length === 0) {
      return Response.json({ checkIns: [] });
    }

    // Collect unique user IDs and week IDs
    const userIds = [...new Set(checkIns.map((ci) => ci.user_id))];
    const weekIds = [...new Set(checkIns.map((ci) => ci.week_id))];

    // Fetch user info and week info in parallel
    const [usersResult, weeksResult] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, nickname, profile_image_url")
        .in("id", userIds),
      supabaseAdmin
        .from("weeks")
        .select("id, title")
        .in("id", weekIds),
    ]);

    const userMap: Record<string, { nickname: string; profileUrl: string | null }> = {};
    if (usersResult.data) {
      for (const u of usersResult.data) {
        userMap[u.id] = { nickname: u.nickname, profileUrl: u.profile_image_url };
      }
    }

    const weekMap: Record<string, string> = {};
    if (weeksResult.data) {
      for (const w of weeksResult.data) {
        weekMap[w.id] = w.title;
      }
    }

    // Generate signed URLs and build result
    const result = await Promise.all(
      checkIns.map(async (ci) => {
        let signedImageUrl: string | null = null;
        if (ci.image_url && ci.image_url.startsWith(ci.user_id + "/")) {
          const { data } = await supabaseAdmin.storage
            .from("workout-photos")
            .createSignedUrl(ci.image_url, 3600);
          if (data?.signedUrl) {
            signedImageUrl = data.signedUrl;
          }
        }

        const userInfo = userMap[ci.user_id];
        return {
          id: ci.id,
          userId: ci.user_id,
          nickname: userInfo?.nickname || "익명",
          dayOfWeek: DAY_LABELS[ci.day_of_week - 1] || `Day${ci.day_of_week}`,
          imageUrl: signedImageUrl,
          postContent: ci.post_content,
          createdAt: ci.created_at,
          weekTitle: weekMap[ci.week_id] || "",
        };
      })
    );

    return Response.json({ checkIns: result });
  } catch (err) {
    console.error("Photo review GET error:", err);
    return Response.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const serverSupabase = await createServerSupabase();
    const { data: { user: authUser } } = await serverSupabase.auth.getUser();
    if (!authUser) {
      return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    const { data: profile } = await serverSupabase.from("users").select("role").eq("id", authUser.id).single();
    if (!profile || (profile as any).role !== "admin") {
      return NextResponse.json({ error: "관리자 권한이 필요합니다." }, { status: 403 });
    }

    const supabaseAdmin = getAdminClient();
    if (!supabaseAdmin) {
      return Response.json(
        { error: "서버 설정 오류입니다. (SERVICE_ROLE_KEY 누락)" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { checkInId, decision, reason, adminId } = body as {
      checkInId: string;
      decision: "approve" | "reject";
      reason?: string;
      adminId: string;
    };

    if (!checkInId || !decision || !adminId) {
      return Response.json(
        { error: "필수 파라미터가 누락되었습니다." },
        { status: 400 }
      );
    }

    if (decision !== "approve" && decision !== "reject") {
      return Response.json(
        { error: "decision은 'approve' 또는 'reject'여야 합니다." },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();

    if (decision === "approve") {
      const { error } = await supabaseAdmin
        .from("check_ins")
        .update({
          status: "O" as const,
          reviewed_by: adminId,
          reviewed_at: now,
        })
        .eq("id", checkInId);

      if (error) {
        console.error("Approve error:", error);
        return Response.json(
          { error: "승인 처리에 실패했습니다." },
          { status: 500 }
        );
      }
    } else {
      const { error } = await supabaseAdmin
        .from("check_ins")
        .update({
          status: "X" as const,
          reviewed_by: adminId,
          reviewed_at: now,
          reject_reason: reason || null,
        })
        .eq("id", checkInId);

      if (error) {
        console.error("Reject error:", error);
        return Response.json(
          { error: "반려 처리에 실패했습니다." },
          { status: 500 }
        );
      }
    }

    return Response.json({ success: true, decision });
  } catch (err) {
    console.error("Photo review PATCH error:", err);
    return Response.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
