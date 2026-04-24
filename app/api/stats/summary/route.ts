import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: NextRequest) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key || key === "[입력 예정]") {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY가 설정되지 않았습니다" }, { status: 503 });
  }

  const data = await req.json();
  const client = new Anthropic({ apiKey: key });

  const prompt = `떡함지 주문 관리 시스템의 현황을 간결하게 분석해주세요.

데이터 요약:
- 이번달 총 생산량: ${data.thisMonth.toLocaleString()}개
- 지난달 총 생산량: ${data.lastMonth.toLocaleString()}개
- 월별 추이 (최근 6개월): ${data.monthly.map((m: {label:string; pieces:number}) => `${m.label} ${m.pieces.toLocaleString()}개`).join(', ')}
- 이번달 카테고리별: ${data.categories.map((c: {category:string; pieces:number}) => `${c.category} ${c.pieces.toLocaleString()}개`).join(', ')}
- 이번달 매장별 상위: ${data.stores.map((s: {store:string; pieces:number}) => `${s.store} ${s.pieces.toLocaleString()}개`).join(', ')}

3~4문장으로 요약해주세요:
1. 이번달 생산 현황과 전달 대비 증감
2. 주목할 만한 카테고리나 매장 트렌드
3. 짧은 운영 제언 (있다면)`;

  const message = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 400,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return NextResponse.json({ summary: text });
}
