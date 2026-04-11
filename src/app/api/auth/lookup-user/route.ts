import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// 서버 사이드에서 service_role로 유저 조회 (RLS 우회)
export async function POST(request: NextRequest) {
  try {
    const { nickname } = await request.json();

    if (!nickname) {
      return NextResponse.json(
        { error: "닉네임을 입력해주세요." },
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlaG1rbWZpa3N1eXJtcXZkaWZ5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTcxNzk1MywiZXhwIjoyMDkxMjkzOTUzfQ.jBvQ9heWyNJ4nKnih03pMEj8KTtRTJyzw1iFFa4llc8"
    );

    const { data: user, error } = await supabaseAdmin
      .from("users")
      .select("id, security_question")
      .eq("nickname", nickname)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "해당 닉네임의 사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    // security_answer는 절대 반환하지 않음 — 질문만 반환
    return NextResponse.json({
      userId: user.id,
      securityQuestion: user.security_question,
    });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
