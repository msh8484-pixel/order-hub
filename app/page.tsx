import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Factory,
  BarChart2,
  MessageSquare,
  Settings,
  ShoppingBag,
  Store,
  Package,
  ClipboardList,
} from "lucide-react";

type StoreOrderStatus = {
  id: string;
  name: string;
  slug: string;
  hasOrdered: boolean;
  orderedAt: string | null;
  deadline: string | null;
};

function calcTimeLeft(deadlineHHMM: string, nowKST: Date): string {
  const [h, m] = deadlineHHMM.split(":").map(Number);
  const deadline = new Date(nowKST);
  deadline.setHours(h, m, 0, 0);
  const diffMs = deadline.getTime() - nowKST.getTime();
  if (diffMs <= 0) return "마감";
  const diffMin = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMin / 60);
  const mins = diffMin % 60;
  if (hours > 0) return `${hours}시간 ${mins}분 전`;
  return `${mins}분 전`;
}

async function getHomeData() {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: stores }, { data: todayOrders }, { data: products }] = await Promise.all([
    supabase.from("stores").select("id, name, slug, order_deadline").order("created_at"),
    supabase
      .from("orders")
      .select("id, status, store_id, created_at, order_items(quantity)")
      .eq("order_date", today)
      .neq("status", "cancelled"),
    supabase.from("products").select("id, is_active").eq("is_active", true),
  ]);

  const orderCount = todayOrders?.length || 0;
  const storeCount = new Set(todayOrders?.map((o) => o.store_id).filter(Boolean)).size;
  const totalQty = todayOrders?.reduce((sum, o) => {
    return sum + ((o.order_items as { quantity: number }[]) || []).reduce((s, i) => s + i.quantity, 0);
  }, 0) || 0;
  const productCount = products?.length || 0;

  // 매장별 가장 최근 주문 created_at 추출
  const latestOrderByStore = new Map<string, string>();
  for (const o of todayOrders || []) {
    if (!o.store_id) continue;
    const prev = latestOrderByStore.get(o.store_id);
    if (!prev || o.created_at > prev) {
      latestOrderByStore.set(o.store_id, o.created_at);
    }
  }

  const nowKST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Seoul" }));

  const storeOrderStatus: StoreOrderStatus[] = (stores || []).map((store) => {
    const orderedAt = latestOrderByStore.get(store.id) ?? null;
    return {
      id: store.id,
      name: store.name,
      slug: store.slug,
      hasOrdered: !!orderedAt,
      orderedAt: orderedAt
        ? new Date(orderedAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Seoul" })
        : null,
      deadline: store.order_deadline ?? null,
    };
  });

  return { stores: stores || [], orderCount, storeCount, totalQty, productCount, storeOrderStatus, nowKST };
}

export default async function Home() {
  let data = {
    stores: [] as { id: string; name: string; slug: string }[],
    orderCount: 0,
    storeCount: 0,
    totalQty: 0,
    productCount: 0,
    storeOrderStatus: [] as StoreOrderStatus[],
    nowKST: new Date(),
  };
  try { data = await getHomeData(); } catch {}

  const { stores, orderCount, storeCount, totalQty, productCount, storeOrderStatus, nowKST } = data;

  const today = new Date();
  const dateStr = today.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  const QUICK = [
    { href: "/production", label: "생산 대시보드", desc: "오늘 생산 목록 확인", icon: Factory, color: "bg-emerald-700 text-white" },
    { href: "/dashboard", label: "주문 통계", desc: "매출 · 채널별 분석", icon: BarChart2, color: "bg-white text-stone-900 border border-stone-200" },
    { href: "/chat", label: "단톡방", desc: "발주방 · 직원 채팅", icon: MessageSquare, color: "bg-white text-stone-900 border border-stone-200" },
    { href: "/admin", label: "시스템 설정", desc: "매장 · 상품 관리", icon: Settings, color: "bg-white text-stone-900 border border-stone-200" },
  ];

  return (
    <main className="min-h-screen bg-stone-50">
      {/* ─── 헤더 ─────────────────────────────────────── */}
      <div className="bg-white border-b border-stone-200 px-6 py-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-stone-400 text-xs font-medium mb-1">{dateStr}</p>
            <h1 className="text-stone-900 text-xl font-black">안녕하세요 👋</h1>
            <p className="text-stone-500 text-sm mt-0.5">떡함지 주문 통합 관리 시스템</p>
          </div>
          <div className="hidden md:flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold px-3 py-2 rounded-xl">
            <ShoppingBag size={14} />
            ORDER HUB
          </div>
        </div>
      </div>

      <div className="px-4 md:px-6 py-5 space-y-6 pb-8">
        {/* ─── 오늘 통계 카드 ─────────────────────────── */}
        <section>
          <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-3">오늘 현황</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={ClipboardList} label="발주 건수" value={orderCount} unit="건" color="emerald" />
            <StatCard icon={Store} label="발주 매장" value={storeCount} unit="곳" color="blue" />
            <StatCard icon={Package} label="생산 수량" value={totalQty} unit="개" color="amber" />
            <StatCard icon={ShoppingBag} label="활성 상품" value={productCount} unit="종" color="stone" />
          </div>
        </section>

        {/* ─── 오늘 발주 현황 ─────────────────────────── */}
        {storeOrderStatus.length > 0 && (
          <section>
            <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-3">오늘 발주 현황</p>
            <div className="bg-white rounded-2xl border border-stone-200 divide-y divide-stone-100">
              {storeOrderStatus.map((s) => {
                const timeLeft = s.deadline ? calcTimeLeft(s.deadline, nowKST) : null;
                const isPast = timeLeft === "마감";
                return (
                  <div key={s.id} className="flex items-center justify-between px-4 py-3 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {s.hasOrdered ? (
                        <span className="shrink-0 inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          ✅ 완료
                        </span>
                      ) : (
                        <span className="shrink-0 inline-flex items-center gap-1 bg-red-50 text-red-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                          ❌ 미발주
                        </span>
                      )}
                      <span className="text-stone-800 text-sm font-semibold truncate">{s.name}</span>
                      {s.hasOrdered && s.orderedAt && (
                        <span className="text-stone-400 text-xs">{s.orderedAt} 입력</span>
                      )}
                    </div>
                    {s.deadline && (
                      <div className="shrink-0 text-right">
                        <span className="text-stone-500 text-xs">마감 {s.deadline}</span>
                        {timeLeft && (
                          <span className={`ml-2 text-xs font-semibold ${isPast ? "text-stone-400" : "text-amber-600"}`}>
                            ({timeLeft})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ─── 퀵 메뉴 ─────────────────────────────────── */}
        <section>
          <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-3">바로가기</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {QUICK.map(({ href, label, desc, icon: Icon, color }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition-all hover:shadow-sm ${color}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color.includes("emerald") ? "bg-white/20" : "bg-stone-100"}`}>
                  <Icon size={20} strokeWidth={2} className={color.includes("emerald") ? "text-white" : "text-stone-600"} />
                </div>
                <div>
                  <p className={`font-bold text-sm ${color.includes("emerald") ? "text-white" : "text-stone-900"}`}>{label}</p>
                  <p className={`text-xs mt-0.5 ${color.includes("emerald") ? "text-emerald-100" : "text-stone-400"}`}>{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ─── 매장 발주 링크 ──────────────────────────── */}
        <section>
          <p className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-3">매장 발주 입력</p>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
            {stores.map((store) => (
              <Link
                key={store.id}
                href={`/store/${store.slug}`}
                className="bg-white hover:bg-emerald-50 hover:border-emerald-200 text-stone-700 hover:text-emerald-700 text-sm font-medium py-3 px-2 rounded-xl text-center transition-colors border border-stone-200"
              >
                {store.name}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  unit: string;
  color: "emerald" | "blue" | "amber" | "stone";
}) {
  const colors = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-700", icon: "text-emerald-600" },
    blue: { bg: "bg-blue-50", text: "text-blue-700", icon: "text-blue-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-700", icon: "text-amber-600" },
    stone: { bg: "bg-stone-100", text: "text-stone-700", icon: "text-stone-500" },
  };
  const c = colors[color];

  return (
    <div className="bg-white rounded-2xl border border-stone-200 px-4 py-4">
      <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-3`}>
        <Icon size={16} className={c.icon} strokeWidth={2.5} />
      </div>
      <p className="text-stone-400 text-xs font-medium">{label}</p>
      <div className="flex items-baseline gap-1 mt-1">
        <span className="text-stone-900 text-2xl font-black">{value}</span>
        <span className={`text-xs font-semibold ${c.text}`}>{unit}</span>
      </div>
    </div>
  );
}
