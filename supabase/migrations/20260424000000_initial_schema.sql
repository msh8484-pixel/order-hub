-- ============================================================
-- order-hub DB 스키마 (떡함지)
-- ============================================================

-- 1. 매장 테이블
CREATE TABLE IF NOT EXISTS stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,  -- URL용 (ex: jamsil, gangnam)
  phone TEXT,
  address TEXT,
  manager_name TEXT,
  order_deadline TIME DEFAULT '14:00',  -- 발주 마감 시간
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. 상품 테이블
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,  -- 쑥인절미, 약밥, 무설탕, 설기류 등
  unit TEXT DEFAULT '개',
  price INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. 주문 테이블
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT NOT NULL,  -- 'store', 'cafe24', 'naver', 'coupang', 'chat'
  source_order_no TEXT,  -- 외부 주문번호
  store_id UUID REFERENCES stores(id),
  customer_name TEXT,
  status TEXT DEFAULT 'pending',  -- pending, confirmed, producing, done
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. 주문 품목 테이블
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL,  -- product_id 없을 때도 이름 저장
  quantity INTEGER NOT NULL DEFAULT 0,
  unit_price INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. 사용자 테이블
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'store',  -- admin, store, production
  store_id UUID REFERENCES stores(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. 채팅방 테이블
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'general',  -- general, order
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  sender_role TEXT DEFAULT 'store',
  content TEXT NOT NULL,
  is_parsed BOOLEAN DEFAULT false,  -- 발주방에서 AI 파싱 완료 여부
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. AI 파싱 발주 테이블 (발주방 전용)
CREATE TABLE IF NOT EXISTS parsed_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES chat_messages(id) ON DELETE CASCADE,
  room_id UUID REFERENCES chat_rooms(id),
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  raw_text TEXT,  -- 원본 메시지
  is_confirmed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- 초기 데이터
-- ============================================================

-- 기본 채팅방
INSERT INTO chat_rooms (name, type, description) VALUES
  ('전체 대화방', 'general', '직원 간 자유 대화'),
  ('발주방', 'order', '발주 메시지 전용 — AI 자동 파싱')
ON CONFLICT DO NOTHING;

-- 상품 초기 데이터 (카페24 분석 기반)
INSERT INTO products (name, category, sort_order) VALUES
  ('쑥떡 쑥인절미 10개', '쑥인절미', 10),
  ('쑥떡 쑥인절미 20개', '쑥인절미', 11),
  ('쑥떡 쑥인절미 30개', '쑥인절미', 12),
  ('쑥떡 쑥인절미 55개', '쑥인절미', 13),
  ('쑥떡 쑥인절미 55개×2세트', '쑥인절미', 14),
  ('약밥 약식', '약밥', 20),
  ('무설탕 쑥인절미', '무설탕', 30),
  ('무설탕 현미쑥인절미', '무설탕', 31),
  ('쑥개떡', '개떡', 40),
  ('쑥찹쌀떡 국산팥', '찹쌀떡', 50),
  ('흑임자 쑥찹쌀떡', '찹쌀떡', 51),
  ('콩모듬 영양찰떡', '찰떡', 60),
  ('흑미찰떡', '찰떡', 61),
  ('단호박설기', '설기', 70),
  ('콩백설기', '설기', 71),
  ('쑥콩설기', '설기', 72),
  ('현미쑥떡 현미쑥인절미', '현미', 80),
  ('식혜 10개 세트', '음료', 90),
  ('답례떡 4구', '답례떡', 100)
ON CONFLICT DO NOTHING;

-- 매장 초기 데이터
INSERT INTO stores (name, slug) VALUES
  ('잠실점', 'jamsil'),
  ('강남점', 'gangnam'),
  ('본점', 'main')
ON CONFLICT DO NOTHING;
