import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "서버 설정 오류입니다." },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey
    );

    const { searchParams } = new URL(request.url);
    const cursor = searchParams.get("cursor"); // created_at cursor for pagination
    const limit = Math.min(Number(searchParams.get("limit") || "20"), 50);

    // Fetch public check-ins ordered by created_at DESC
    let query = supabaseAdmin
      .from("check_ins")
      .select("id, user_id, day_of_week, status, image_url, is_public, post_content, created_at")
      .eq("is_public", true)
      .eq("status", "O")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt("created_at", cursor);
    }

    const { data: checkIns, error: checkInsError } = await query;

    if (checkInsError) {
      console.error("Gallery check_ins fetch error:", checkInsError);
      return NextResponse.json(
        { error: "데이터를 불러오는데 실패했습니다." },
        { status: 500 }
      );
    }

    if (!checkIns || checkIns.length === 0) {
      return NextResponse.json({ checkIns: [], hasMore: false });
    }

    // Collect unique user IDs and check-in IDs
    const userIds = [...new Set(checkIns.map((ci) => ci.user_id))];
    const checkInIds = checkIns.map((ci) => ci.id);

    // Fetch user info and reactions in parallel
    const [{ data: users }, { data: reactions }] = await Promise.all([
      supabaseAdmin
        .from("users")
        .select("id, nickname, profile_image_url")
        .in("id", userIds),
      supabaseAdmin
        .from("reactions")
        .select("check_in_id, emoji_type, reactor_id")
        .in("check_in_id", checkInIds),
    ]);

    const userMap: Record<string, { nickname: string; profileUrl: string | null }> = {};
    if (users) {
      for (const u of users) {
        userMap[u.id] = { nickname: u.nickname, profileUrl: u.profile_image_url };
      }
    }

    // Aggregate reactions per check-in
    const reactionMap: Record<
      string,
      {
        fire: { count: number; reactorIds: string[] };
        muscle: { count: number; reactorIds: string[] };
        chili: { count: number; reactorIds: string[] };
      }
    > = {};

    if (reactions) {
      for (const r of reactions) {
        if (!reactionMap[r.check_in_id]) {
          reactionMap[r.check_in_id] = {
            fire: { count: 0, reactorIds: [] },
            muscle: { count: 0, reactorIds: [] },
            chili: { count: 0, reactorIds: [] },
          };
        }
        const group = reactionMap[r.check_in_id][r.emoji_type as "fire" | "muscle" | "chili"];
        group.count++;
        group.reactorIds.push(r.reactor_id);
      }
    }

    // Generate signed URLs for images (썸네일 우선, 없으면 원본)
    const result = await Promise.all(
      checkIns.map(async (ci) => {
        let signedImageUrl: string | null = null;
        let signedFullUrl: string | null = null;
        if (ci.image_url && ci.image_url.startsWith(ci.user_id + "/")) {
          // 썸네일 경로 생성: {path}.jpg → {path}_thumb.jpg
          const thumbPath = ci.image_url.replace(/\.([^.]+)$/, "_thumb.jpg");

          // 썸네일과 원본 signed URL 병렬 생성
          const [thumbRes, fullRes] = await Promise.all([
            supabaseAdmin.storage.from("workout-photos").createSignedUrl(thumbPath, 3600),
            supabaseAdmin.storage.from("workout-photos").createSignedUrl(ci.image_url, 3600),
          ]);

          // 썸네일이 있으면 썸네일, 없으면 원본 사용
          signedImageUrl = thumbRes.data?.signedUrl || fullRes.data?.signedUrl || null;
          signedFullUrl = fullRes.data?.signedUrl || null;
        }

        const userInfo = userMap[ci.user_id];
        const rxn = reactionMap[ci.id] || {
          fire: { count: 0, reactorIds: [] },
          muscle: { count: 0, reactorIds: [] },
          chili: { count: 0, reactorIds: [] },
        };

        return {
          id: ci.id,
          userId: ci.user_id,
          nickname: userInfo?.nickname || "익명",
          profileUrl: userInfo?.profileUrl || null,
          dayOfWeek: ci.day_of_week,
          status: ci.status,
          imageUrl: signedImageUrl,
          fullImageUrl: signedFullUrl,
          postContent: ci.post_content,
          createdAt: ci.created_at,
          reactions: {
            fire: rxn.fire,
            muscle: rxn.muscle,
            chili: rxn.chili,
          },
        };
      })
    );

    const hasMore = checkIns.length === limit;

    return NextResponse.json({ checkIns: result, hasMore });
  } catch (err) {
    console.error("Gallery API error:", err);
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
