import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const { userId, email, newPassword, securityAnswer } = await request.json();

    if (!userId || !email || !newPassword || !securityAnswer) {
      return NextResponse.json(
        { error: "필수 정보가 누락되었습니다." },
        { status: 400 },
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "비밀번호는 최소 6자 이상이어야 합니다." },
        { status: 400 },
      );
    }

    // Use service role key for admin operations
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      return NextResponse.json(
        { error: "서버 설정 오류입니다." },
        { status: 500 },
      );
    }
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceRoleKey,
    );

    // Verify security answer server-side as well
    const { data: user, error: fetchError } = (await supabaseAdmin
      .from("users")
      .select("security_answer")
      .eq("id", userId)
      .single()) as unknown as {
      data: { security_answer: string | null } | null;
      error: any;
    };

    if (fetchError || !user || !user.security_answer) {
      return NextResponse.json(
        { error: "사용자를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (
      user.security_answer.trim().toLowerCase() !==
      securityAnswer.trim().toLowerCase()
    ) {
      return NextResponse.json(
        { error: "보안 답변이 일치하지 않습니다." },
        { status: 403 },
      );
    }

    // Update password using admin API
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

    if (updateError) {
      return NextResponse.json(
        { error: "비밀번호 변경에 실패했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "서버 오류가 발생했습니다." },
      { status: 500 },
    );
  }
}
