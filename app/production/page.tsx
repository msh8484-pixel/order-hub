"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type ProductionItem = {
  product_name: string;
  total_qty: number;
  sources: { source: string; qty: number }[];
  by_store: { store_name: string; qty: number }[];
};

type StoreItem = {
  store_name: string;
  items: { product_name: string; quantity: number }[];
  total: number;
};

const SOURCE_LABELS: Record<string, string> = {
  store: "매장",
  cafe24: "카페24",
  naver: "네이버",
  coupang: "쿠팡",
  chat: "발주방",
};

type Tab = "total" | "store" | "table";

export default function ProductionPage() {
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("total");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from("order_items")
      .select(`
        product_name,
        quantity,
        orders!inner(source, order_date, status, store_id, stores(name))
      `)
      .eq("orders.order_date", today)
      .neq("orders.status", "cancelled");

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    // 품목별 총량 집계
    const map = new Map<string, { total: number; sources: Map<string, number>; stores: Map<string, number> }>();
    for (const item of data || []) {
      const name = item.product_name;
      const order = item.orders as any;
      const source = order.source;
      const storeName = order.stores?.name || "온라인";
      const qty = item.quantity;

      if (!map.has(name)) map.set(name, { total: 0, sources: new Map(), stores: new Map() });
      const entry = map.get(name)!;
      entry.total += qty;
      entry.sources.set(source, (entry.sources.get(source) || 0) + qty);
      entry.stores.set(storeName, (entry.stores.get(storeName) || 0) + qty);
    }

    const result: ProductionItem[] = Array.from(map.entries())
      .map(([name, { total, sources, stores }]) => ({
        product_name: name,
        total_qty: total,
        sources: Array.from(sources.entries()).map(([source, qty]) => ({ source, qty })),
        by_store: Array.from(stores.entries()).map(([store_name, qty]) => ({ store_name, qty })),
      }))
      .sort((a, b) => b.total_qty - a.total_qty);

    setItems(result);

    // 매장별 집계
    const storeMap = new Map<string, Map<string, number>>();
    for (const item of data || []) {
      const order = item.orders as any;
      if (order.source !== "store") continue;
      const storeName = order.stores?.name || "알 수 없음";
      const name = item.product_name;
      if (!storeMap.has(storeName)) storeMap.set(storeName, new Map());
      const m = storeMap.get(storeName)!;
      m.set(name, (m.get(name) || 0) + item.quantity);
    }

    const storeResult: StoreItem[] = Array.from(storeMap.entries()).map(([store_name, itemMap]) => {
      const storeItemsList = Array.from(itemMap.entries())
        .map(([product_name, quantity]) => ({ product_name, quantity }))
        .sort((a, b) => b.quantity - a.quantity);
      return {
        store_name,
        items: storeItemsList,
        total: storeItemsList.reduce((s, i) => s + i.quantity, 0),
      };
    }).sort((a, b) => b.total - a.total);

    setStoreItems(storeResult);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const totalItems = items.reduce((s, i) => s + i.total_qty, 0);

  function buildMarkdown() {
    const today = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
    let md = `# 생산 현황 — ${today}\n\n`;
    md += `> 총 ${totalItems.toLocaleString()}개\n\n`;

    md += `## 전체 품목별 총량\n\n`;
    md += `| 품목 | 수량 |\n|------|------|\n`;
    for (const item of items) {
      md += `| ${item.product_name} | ${item.total_qty}개 |\n`;
    }

    if (storeItems.length > 0) {
      md += `\n## 매장별 발주\n\n`;
      for (const store of storeItems) {
        md += `### ${store.store_name} (총 ${store.total}개)\n\n`;
        md += `| 품목 | 수량 |\n|------|------|\n`;
        for (const item of store.items) {
          md += `| ${item.product_name} | ${item.quantity}개 |\n`;
        }
        md += `\n`;
      }
    }

    return md;
  }

  async function copyMarkdown() {
    await navigator.clipboard.writeText(buildMarkdown());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

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
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-white font-bold text-lg">생산 대시보드</h1>
            <p className="text-gray-400 text-xs">
              {new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" })} · 총 {totalItems.toLocaleString()}개
            </p>
          </div>
          <button onClick={load} className="text-indigo-400 text-sm font-medium">새로고침</button>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-800 rounded-xl p-1">
          {([["total", "전체 총량"], ["store", "매장별"], ["table", "표로 보기"]] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
                tab === key ? "bg-indigo-600 text-white" : "text-gray-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 총량 탭 */}
      {tab === "total" && (
        <div className="px-4 py-4 space-y-2">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <p className="text-4xl mb-3">📦</p>
              <p>오늘 주문이 없습니다</p>
            </div>
          ) : items.map((item) => (
            <div key={item.product_name} className="bg-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-white font-semibold">{item.product_name}</span>
                <span className="text-2xl font-bold text-indigo-400">{item.total_qty.toLocaleString()}개</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {item.sources.map(({ source, qty }) => (
                  <span key={source} className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-lg">
                    {SOURCE_LABELS[source] || source} {qty}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 매장별 탭 */}
      {tab === "store" && (
        <div className="px-4 py-4 space-y-4">
          {storeItems.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <p className="text-4xl mb-3">🏪</p>
              <p>매장 발주가 없습니다</p>
            </div>
          ) : storeItems.map((store) => (
            <div key={store.store_name} className="bg-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-white font-bold text-base">{store.store_name}</span>
                <span className="text-indigo-400 font-bold">총 {store.total}개</span>
              </div>
              <div className="space-y-1.5">
                {store.items.map((item) => (
                  <div key={item.product_name} className="flex justify-between items-center">
                    <span className="text-gray-300 text-sm">{item.product_name}</span>
                    <span className="text-white text-sm font-semibold">{item.quantity}개</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 표로 보기 탭 */}
      {tab === "table" && (
        <div className="px-4 py-4">
          <div className="flex justify-end mb-3">
            <button
              onClick={copyMarkdown}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-xl transition-colors"
            >
              {copied ? "✓ 복사됨" : "📋 마크다운 복사"}
            </button>
          </div>

          {/* 전체 총량 표 */}
          <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">전체 품목별 총량</h3>
          <div className="bg-gray-800 rounded-2xl overflow-hidden mb-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 px-4 py-2 font-medium">품목</th>
                  <th className="text-right text-gray-400 px-4 py-2 font-medium">수량</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.product_name} className={i < items.length - 1 ? "border-b border-gray-700" : ""}>
                    <td className="text-white px-4 py-2">{item.product_name}</td>
                    <td className="text-indigo-400 font-bold text-right px-4 py-2">{item.total_qty}개</td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-600 bg-gray-750">
                  <td className="text-gray-300 font-bold px-4 py-2">합계</td>
                  <td className="text-white font-bold text-right px-4 py-2">{totalItems.toLocaleString()}개</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 매장별 표 */}
          {storeItems.map((store) => (
            <div key={store.store_name} className="mb-4">
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">
                {store.store_name} (총 {store.total}개)
              </h3>
              <div className="bg-gray-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700">
                      <th className="text-left text-gray-400 px-4 py-2 font-medium">품목</th>
                      <th className="text-right text-gray-400 px-4 py-2 font-medium">수량</th>
                    </tr>
                  </thead>
                  <tbody>
                    {store.items.map((item, i) => (
                      <tr key={item.product_name} className={i < store.items.length - 1 ? "border-b border-gray-700" : ""}>
                        <td className="text-white px-4 py-2">{item.product_name}</td>
                        <td className="text-white font-semibold text-right px-4 py-2">{item.quantity}개</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {lastUpdated && (
        <p className="text-center text-gray-600 text-xs py-4">
          {lastUpdated.toLocaleTimeString("ko-KR")} 기준 · 30초마다 자동갱신
        </p>
      )}
    </div>
  );
}
