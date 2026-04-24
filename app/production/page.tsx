"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type ProductionItem = {
  product_name: string;
  category: string;
  total_qty: number;
  sources: { source: string; qty: number }[];
};

const SOURCE_LABELS: Record<string, string> = {
  store: "매장",
  cafe24: "카페24",
  naver: "네이버",
  coupang: "쿠팡",
  chat: "발주방",
};

export default function ProductionPage() {
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("order_items")
      .select(`
        product_name,
        quantity,
        orders!inner(source, order_date, status)
      `)
      .eq("orders.order_date", today)
      .neq("orders.status", "cancelled");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // 품목별 집계
    const map = new Map<string, { total: number; sources: Map<string, number> }>();
    for (const item of data || []) {
      const name = item.product_name;
      const source = (item.orders as { source: string }).source;
      const qty = item.quantity;

      if (!map.has(name)) map.set(name, { total: 0, sources: new Map() });
      const entry = map.get(name)!;
      entry.total += qty;
      entry.sources.set(source, (entry.sources.get(source) || 0) + qty);
    }

    const result: ProductionItem[] = Array.from(map.entries())
      .map(([name, { total, sources }]) => ({
        product_name: name,
        category: "",
        total_qty: total,
        sources: Array.from(sources.entries()).map(([source, qty]) => ({ source, qty })),
      }))
      .sort((a, b) => b.total_qty - a.total_qty);

    setItems(result);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const totalItems = items.reduce((s, i) => s + i.total_qty, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-lg">생산 대시보드</h1>
          <p className="text-gray-400 text-xs">
            {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })} ·
            총 {totalItems.toLocaleString()}개
          </p>
        </div>
        <button
          onClick={load}
          className="text-indigo-400 text-sm font-medium"
        >
          새로고침
        </button>
      </div>

      {/* 품목 목록 */}
      <div className="px-4 py-4 space-y-2">
        {items.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <p className="text-4xl mb-3">📦</p>
            <p>오늘 주문이 없습니다</p>
          </div>
        ) : (
          items.map((item) => (
            <div key={item.product_name} className="bg-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">{item.product_name}</span>
                <span className="text-2xl font-bold text-indigo-400">
                  {item.total_qty.toLocaleString()}개
                </span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {item.sources.map(({ source, qty }) => (
                  <span
                    key={source}
                    className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-lg"
                  >
                    {SOURCE_LABELS[source] || source} {qty}
                  </span>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 업데이트 시간 */}
      {lastUpdated && (
        <p className="text-center text-gray-600 text-xs py-4">
          {lastUpdated.toLocaleTimeString("ko-KR")} 기준 · 30초마다 자동 갱신
        </p>
      )}
    </div>
  );
}
