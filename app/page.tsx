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

async function getHomeData() {
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: stores }, { data: todayOrders }, { data: products }] = await Promise.all([
    supabase.from("stores").select("id, name, slug").order("created_at"),
    supabase
      .from("orders")
      .select("id, status, store_id, order_items(quantity)")
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

  return { stores: stores || [], orderCount, storeCount, totalQty, productCount };
}

export default async function Home() {
  let data = { stores: [] as { id: string; name: string; slug: string }[], orderCount: 0, storeCount: 0, totalQty: 0, productCount: 0 };
  try { data = await getHomeData(); } catch {}

  const { stores, orderCount, storeCount, totalQty, productCount } = data;

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
