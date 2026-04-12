import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { createClient as createServerClient } from "@/lib/supabase/server";

interface ChatMessage {
  role: string;
  content: string;
}

interface RequestBody {
  message: string;
  history: ChatMessage[];
}

const SYSTEM_PROMPT =
  "당신은 SME 운동방의 AI 운동 코치입니다. 운동, 건강, 식단에 대한 질문에 친절하고 전문적으로 답변합니다. 한국어로 답변하세요. 짧고 실용적인 조언을 해주세요.";

const MOCK_RESPONSE =
  "AI 코치 기능은 OpenAI API 키가 설정된 후 사용할 수 있습니다. 현재는 데모 모드입니다.";

export async function POST(request: Request) {
  // Verify auth
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  const body: RequestBody = await request.json();
  const { message, history } = body;

  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "Message is required" },
      { status: 400 },
    );
  }

  // Service role client for logging
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const apiKey = process.env.OPENAI_API_KEY;

  let answer: string;

  if (!apiKey) {
    // Mock mode
    answer = MOCK_RESPONSE;
  } else {
    // Call OpenAI
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...(history ?? []).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages,
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error("OpenAI API error:", errText);
        return NextResponse.json(
          { error: "AI 서비스 오류가 발생했습니다." },
          { status: 502 },
        );
      }

      const data = await res.json();
      answer = data.choices?.[0]?.message?.content ?? "응답을 생성할 수 없습니다.";
    } catch (error) {
      console.error("OpenAI request failed:", error);
      return NextResponse.json(
        { error: "AI 서비스에 연결할 수 없습니다." },
        { status: 502 },
      );
    }
  }

  // Save to ai_logs table
  if (supabaseUrl && serviceRoleKey) {
    try {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { persistSession: false },
      });
      await adminClient.from("ai_logs").insert({
        user_id: user.id,
        question: message,
        answer,
      });
    } catch (logError) {
      console.error("Failed to save AI log:", logError);
    }
  }

  return NextResponse.json({ answer });
}
