import { NextResponse } from "next/server";
import { Client } from "pg";

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  phone TEXT, address TEXT, manager_name TEXT,
  order_deadline TIME DEFAULT '14:00',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, category TEXT NOT NULL,
  unit TEXT DEFAULT '개', price INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true, sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL, source_order_no TEXT,
  store_id UUID REFERENCES stores(id),
  customer_name TEXT, status TEXT DEFAULT 'pending',
  note TEXT, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL, quantity INTEGER NOT NULL DEFAULT 0,
  unit_price INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'store',
  store_id UUID REFERENCES stores(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, type TEXT NOT NULL DEFAULT 'general',
  description TEXT, is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL, sender_role TEXT DEFAULT 'store',
  content TEXT NOT NULL, is_parsed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS parsed_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  room_id UUID REFERENCES chat_rooms(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_name TEXT NOT NULL, quantity INTEGER NOT NULL,
  raw_text TEXT, is_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO chat_rooms (name, type, description) VALUES
  ('전체 대화방', 'general', '직원 간 자유 대화'),
  ('발주방', 'order', '발주 메시지 전용 — AI 자동 파싱')
ON CONFLICT DO NOTHING;

INSERT INTO stores (name, slug) VALUES
  ('잠실점', 'jamsil'), ('강남점', 'gangnam'), ('본점', 'main')
ON CONFLICT DO NOTHING;

INSERT INTO products (name, category, sort_order) VALUES
  ('쑥떡 쑥인절미 10개','쑥인절미',10),('쑥떡 쑥인절미 20개','쑥인절미',11),
  ('쑥떡 쑥인절미 30개','쑥인절미',12),('쑥떡 쑥인절미 55개','쑥인절미',13),
  ('약밥 약식','약밥',20),('무설탕 쑥인절미','무설탕',30),
  ('무설탕 현미쑥인절미','무설탕',31),('쑥개떡','개떡',40),
  ('쑥찹쌀떡 국산팥','찹쌀떡',50),('흑임자 쑥찹쌀떡','찹쌀떡',51),
  ('콩모듬 영양찰떡','찰떡',60),('흑미찰떡','찰떡',61),
  ('단호박설기','설기',70),('콩백설기','설기',71),('쑥콩설기','설기',72),
  ('현미쑥떡 현미쑥인절미','현미',80),('식혜 10개 세트','음료',90),
  ('답례떡 4구','답례떡',100)
ON CONFLICT DO NOTHING;
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  if (searchParams.get("key") !== "setup-order-hub-2026") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const connectionString = process.env.DATABASE_URL ||
    `postgresql://postgres.qxaknocanyetglkvpacj:${encodeURIComponent("Miamia0406@@")}@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres`;

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });

  try {
    await client.connect();
    await client.query(SCHEMA_SQL);
    await client.end();
    return NextResponse.json({ done: true, message: "DB 스키마 및 초기 데이터 설정 완료" });
  } catch (error: unknown) {
    await client.end().catch(() => {});
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
