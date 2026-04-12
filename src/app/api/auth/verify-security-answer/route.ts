import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

function hashAnswer(answer: string): string {
  return createHash("sha256")
    .update(answer.trim().toLowerCase())
    .digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const { userId, securityAnswer } = await request.json();

    if (!userId || !securityAnswer) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 }
      );
    }

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

    // 입력값을 해시하여 저장된 해시와 비교
    const inputHash = hashAnswer(securityAnswer);
    if (inputHash !== user.security_answer) {
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
