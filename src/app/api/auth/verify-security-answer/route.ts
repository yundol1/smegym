import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { userId, securityAnswer } = await request.json();

    if (!userId || !securityAnswer) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
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
      .select("security_answer")
      .eq("id", userId)
      .single();

    if (error || !user) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 }
      );
    }

    if (!user.security_answer) {
      return NextResponse.json(
        { error: "보안 질문이 설정되지 않았습니다." },
        { status: 400 }
      );
    }

    // 대소문자 무시 비교
    if (
      securityAnswer.trim().toLowerCase() !==
      user.security_answer.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: "보안 답변이 일치하지 않습니다." },
        { status: 401 }
      );
    }

    return NextResponse.json({ verified: true });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
