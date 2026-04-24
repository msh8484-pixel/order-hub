## ⭐ 절대 원칙 (1순위)
**거짓말·속임 금지**: 모르면 모른다고, 불확실하면 불확실하다고 말할 것.

## 프로젝트
- 프로젝트명: 주문 통합 관리 시스템 (Order Hub)
- 고객사: 떡함지
- 업종: 떡/제과 제조업 — 오프라인 매장 6~8개 + 온라인 판매 6개 채널
- 스택: Next.js (App Router) + TypeScript + Tailwind + Supabase + Socket.io
- GitHub: https://github.com/msh8484-pixel/order-hub
- 배포: Vercel [입력 예정]

## 비즈니스 구조
- 오프라인 매장: 6~8개 (각 매장 점장이 발주 입력)
- 온라인 채널: 쿠팡, 네이버 등 6개 플랫폼
- 생산센터: 공장 1곳 (당일 생산 처리)
- 배송: 직접 배송 + 택배사

## 핵심 기능 (MVP)

### 1. 매장 발주 입력 (모바일)
- 각 지점 점장이 마감 시간 전 모바일로 수량 입력
- 매장별 개별 URL (비밀번호 없이 QR/링크로 접근)
- Google Sheets 완전 대체

### 2. 온라인 주문 수집
- 6개 플랫폼 API 연동 (API 없는 곳은 Cafe24 Playwright 스크래핑)
- 날짜 지정 주문(@표시) 자동 분류
- 당일 처리 주문만 생산 목록에 반영

### 3. 단톡방 (채팅 시스템)
- 실시간 채팅 (Socket.io WebSocket 기반)
- 방 타입 2종:
  - 일반 대화방: 직원 간 자유 대화
  - 발주방: 발주 메시지 전용 → AI(Claude)가 자동 파싱 → 발주 수치 합산
- 발주방 파싱 예시: "딸기 찹쌀떡 50개" → {product: "딸기 찹쌀떡", qty: 50}
- 파싱 실패 시 알림 메시지 자동 반환

### 4. 생산팀 대시보드
- 당일 생산 목록 자동 합산 (매장 발주 + 발주방 + 온라인 주문)
- 품목별 총 수량 정렬
- 태블릿에서 처리 완료 체크

### 5. 사장님 대시보드
- 달력 뷰 — 날짜별 주문 현황
- 채널별/매장별 주문 통계
- 발주 현황 실시간 확인

## 2단계 기능 (MVP 이후)
- 수기 주문서 사진 → OCR 자동 입력
- 고객 CRM (재구매, 연락처 누적)
- 택배사 API → 송장번호 자동 문자 발송
- 원가 계산 + 제품별 수익률 분석
- 카페24 CRM 연동

## 페이지 구조
- / → 로그인
- /dashboard → 사장님 대시보드 (달력 + 전체 현황)
- /store/[id] → 매장별 발주 입력 페이지 (모바일 최적화)
- /production → 생산팀 대시보드
- /orders → 온라인 주문 목록 (날짜 필터)
- /chat → 단톡방 (일반방 + 발주방 목록)
- /chat/[roomId] → 개별 채팅방
- /admin → 관리자 (매장/상품/사용자 관리)
- /admin/stores → 매장 관리
- /admin/products → 상품 관리
- /api/orders → 주문 수집 API
- /api/chat → WebSocket 엔드포인트

## DB 테이블 (Supabase)
- stores: 매장 정보
- products: 상품 목록
- orders: 주문 (출처, 날짜, 수량)
- order_items: 주문 상세 품목
- users: 사용자 (역할: admin/store/production)
- chat_rooms: 채팅방 (type: general/order)
- chat_messages: 채팅 메시지
- parsed_orders: 발주방에서 AI 파싱된 발주 항목

## 코딩 규칙
- 코드 수정 후 항상 git push
- 더미·지어낸 내용 금지 ([입력 예정] 표기)
- 배포 전 레이아웃 확인 필수
- Supabase 프로젝트 ID: [입력 예정]
