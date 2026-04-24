import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { room_id, message, sender } = await req.json();

  if (!room_id || !message) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `다음 발주 메시지에서 상품명과 수량을 추출해주세요.
여러 품목이 있으면 모두 추출하세요.
JSON 배열로만 답하세요. 다른 텍스트 없이.

형식: [{"product_name": "상품명", "quantity": 숫자}, ...]

발주 메시지: "${message}"

주의:
- 수량이 없으면 해당 품목 제외
- 상품명이 불분명하면 최대한 유사하게 작성
- 단순 대화(안녕, 감사합니다 등)는 빈 배열 [] 반환`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "[]";

    let parsed: { product_name: string; quantity: number }[] = [];
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = [];
    }

    const today = new Date().toISOString().slice(0, 10);

    if (parsed.length > 0) {
      // 마지막 메시지 ID 가져오기
      const { data: lastMsg } = await supabaseAdmin
        .from("chat_messages")
        .select("id")
        .eq("room_id", room_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // parsed_orders에 저장
      await supabaseAdmin.from("parsed_orders").insert(
        parsed.map((item) => ({
          message_id: lastMsg?.id,
          room_id,
          order_date: today,
          product_name: item.product_name,
          quantity: item.quantity,
          raw_text: message,
        }))
      );

      // 메시지 is_parsed 업데이트
      if (lastMsg?.id) {
        await supabaseAdmin
          .from("chat_messages")
          .update({ is_parsed: true })
          .eq("id", lastMsg.id);
      }

      // 파싱 결과 메시지 전송
      const summary = parsed
        .map((p) => `✅ ${p.product_name} ${p.quantity}개`)
        .join("\n");

      await supabaseAdmin.from("chat_messages").insert({
        room_id,
        sender_name: "자비스 AI",
        sender_role: "admin",
        content: `📦 발주 파싱 완료\n${summary}`,
        is_parsed: false,
      });
    }

    return NextResponse.json({ parsed });
  } catch (error) {
    console.error("Parse error:", error);
    return NextResponse.json({ error: "parse failed" }, { status: 500 });
  }
}
