import { createClient } from "@supabase/supabase-js";

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
  const supabase = getAdminClient();
  if (!supabase) {
    return Response.json(
      { error: "서버 설정 오류입니다. (SERVICE_ROLE_KEY 누락)" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { author_id, content } = body;

    if (!author_id || !content) {
      return Response.json(
        { error: "author_id와 content는 필수입니다" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("notices")
      .insert({ author_id, content })
      .select()
      .single();

    if (error) {
      return Response.json(
        { error: "공지 등록 실패: " + error.message },
        { status: 500 }
      );
    }

    return Response.json({ notice: data });
  } catch {
    return Response.json(
      { error: "공지 처리 중 오류가 발생했습니다" },
      { status: 500 }
    );
  }
}
