"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type ProductionItem = {
  product_name: string;
  set_qty: number;
  pieces_per_unit: number;
  total_pieces: number;
  sources: { source: string; qty: number }[];
  by_store: { store_name: string; qty: number }[];
};

type StoreItem = {
  store_name: string;
  items: { product_name: string; set_qty: number; pieces_per_unit: number; total_pieces: number }[];
  total_pieces: number;
};

const SOURCE_LABELS: Record<string, string> = {
  store: "매장",
  cafe24: "카페24",
  naver: "네이버",
  coupang: "쿠팡",
  chat: "발주방",
};

type Tab = "total" | "store" | "print";

export default function ProductionPage() {
  const [items, setItems] = useState<ProductionItem[]>([]);
  const [storeItems, setStoreItems] = useState<StoreItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [tab, setTab] = useState<Tab>("total");
  const today = new Date().toISOString().slice(0, 10);
  const todayLabel = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric", weekday: "short" });

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("order_items")
      .select(`
        product_name,
        quantity,
        orders!inner(source, order_date, status, store_id, stores(name)),
        products(pieces_per_unit)
      `)
      .eq("orders.order_date", today)
      .neq("orders.status", "cancelled");

    if (error) { console.error(error); setLoading(false); return; }

    const map = new Map<string, {
      set_qty: number;
      pieces_per_unit: number;
      sources: Map<string, number>;
      stores: Map<string, number>;
    }>();

    for (const item of data || []) {
      const name = item.product_name;
      const order = item.orders as any;
      const source = order.source;
      const storeName = order.stores?.name || "온라인";
      const setQty = item.quantity;
      const ppu = (item.products as any)?.pieces_per_unit ?? 1;

      if (!map.has(name)) map.set(name, { set_qty: 0, pieces_per_unit: ppu, sources: new Map(), stores: new Map() });
      const entry = map.get(name)!;
      entry.set_qty += setQty;
      entry.sources.set(source, (entry.sources.get(source) || 0) + setQty);
      entry.stores.set(storeName, (entry.stores.get(storeName) || 0) + setQty);
    }

    const result: ProductionItem[] = Array.from(map.entries())
      .map(([name, { set_qty, pieces_per_unit, sources, stores }]) => ({
        product_name: name,
        set_qty,
        pieces_per_unit,
        total_pieces: set_qty * pieces_per_unit,
        sources: Array.from(sources.entries()).map(([source, qty]) => ({ source, qty })),
        by_store: Array.from(stores.entries()).map(([store_name, qty]) => ({ store_name, qty })),
      }))
      .sort((a, b) => b.total_pieces - a.total_pieces);

    setItems(result);

    // 매장별
    const storeMap = new Map<string, Map<string, { set_qty: number; ppu: number }>>();
    for (const item of data || []) {
      const order = item.orders as any;
      if (order.source !== "store") continue;
      const storeName = order.stores?.name || "알 수 없음";
      const name = item.product_name;
      const ppu = (item.products as any)?.pieces_per_unit ?? 1;
      if (!storeMap.has(storeName)) storeMap.set(storeName, new Map());
      const m = storeMap.get(storeName)!;
      const prev = m.get(name) || { set_qty: 0, ppu };
      m.set(name, { set_qty: prev.set_qty + item.quantity, ppu });
    }

    const storeResult: StoreItem[] = Array.from(storeMap.entries()).map(([store_name, itemMap]) => {
      const storeItemsList = Array.from(itemMap.entries())
        .map(([product_name, { set_qty, ppu }]) => ({
          product_name,
          set_qty,
          pieces_per_unit: ppu,
          total_pieces: set_qty * ppu,
        }))
        .sort((a, b) => b.total_pieces - a.total_pieces);
      return {
        store_name,
        items: storeItemsList,
        total_pieces: storeItemsList.reduce((s, i) => s + i.total_pieces, 0),
      };
    }).sort((a, b) => b.total_pieces - a.total_pieces);

    setStoreItems(storeResult);
    setLastUpdated(new Date());
    setLoading(false);
  }, [today]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const totalPieces = items.reduce((s, i) => s + i.total_pieces, 0);
  const totalSets = items.reduce((s, i) => s + i.set_qty, 0);

  if (loading) return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <p className="text-gray-500 text-sm">로딩 중...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-gray-900 font-bold text-lg">생산 현황</h1>
            <p className="text-gray-500 text-xs">{todayLabel} — 총 {totalPieces.toLocaleString()}개 생산</p>
          </div>
          <button onClick={load} className="text-indigo-600 text-sm font-medium">갱신</button>
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {([["total", "전체 총량"], ["store", "매장별"], ["print", "인쇄용 표"]] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${tab === key ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 전체 총량 */}
      {tab === "total" && (
        <div className="px-4 py-4">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-indigo-600">{totalPieces.toLocaleString()}</p>
              <p className="text-gray-500 text-xs mt-1">총 생산 개수</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-gray-700">{totalSets.toLocaleString()}</p>
              <p className="text-gray-500 text-xs mt-1">총 세트 수</p>
            </div>
          </div>

          {items.length === 0 ? (
            <div className="text-center text-gray-400 py-16">오늘 주문이 없습니다</div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-gray-500 px-4 py-2.5 font-medium">품목</th>
                    <th className="text-right text-gray-500 px-3 py-2.5 font-medium">세트</th>
                    <th className="text-right text-gray-500 px-4 py-2.5 font-medium">생산량</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={item.product_name} className={i < items.length - 1 ? "border-b border-gray-100" : ""}>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 font-medium">{item.product_name}</p>
                        <p className="text-gray-400 text-xs">
                          {item.sources.map(s => `${SOURCE_LABELS[s.source] || s.source} ${s.qty}`).join(" · ")}
                        </p>
                      </td>
                      <td className="text-right text-gray-500 px-3 py-3 text-sm">{item.set_qty}세트</td>
                      <td className="text-right px-4 py-3">
                        <span className="text-indigo-600 font-bold text-base">{item.total_pieces.toLocaleString()}개</span>
                      </td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-gray-200 bg-gray-50">
                    <td className="px-4 py-3 text-gray-700 font-bold">합계</td>
                    <td className="text-right px-3 py-3 text-gray-500 text-sm">{totalSets}세트</td>
                    <td className="text-right px-4 py-3 text-indigo-600 font-bold text-base">{totalPieces.toLocaleString()}개</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 매장별 */}
      {tab === "store" && (
        <div className="px-4 py-4 space-y-4">
          {storeItems.length === 0 ? (
            <div className="text-center text-gray-400 py-16">매장 발주가 없습니다</div>
          ) : storeItems.map((store) => (
            <div key={store.store_name} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <span className="text-gray-900 font-bold">{store.store_name}</span>
                <span className="text-indigo-600 font-bold">총 {store.total_pieces.toLocaleString()}개</span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-gray-400 px-4 py-2 font-medium">품목</th>
                    <th className="text-right text-gray-400 px-3 py-2 font-medium">세트</th>
                    <th className="text-right text-gray-400 px-4 py-2 font-medium">생산량</th>
                  </tr>
                </thead>
                <tbody>
                  {store.items.map((item, i) => (
                    <tr key={item.product_name} className={i < store.items.length - 1 ? "border-b border-gray-100" : ""}>
                      <td className="text-gray-800 px-4 py-2.5">{item.product_name}</td>
                      <td className="text-right text-gray-400 px-3 py-2.5">{item.set_qty}세트</td>
                      <td className="text-right text-gray-900 font-semibold px-4 py-2.5">{item.total_pieces}개</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {/* 인쇄용 표 */}
      {tab === "print" && (
        <div className="px-4 py-4">
          <div className="no-print flex justify-end mb-3">
            <button
              onClick={() => window.print()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-5 py-2 rounded-lg font-medium"
            >
              인쇄
            </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-6 print-content">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">생산 작업 지시서</h2>
              <p className="text-gray-500 text-sm mt-1">{todayLabel}</p>
            </div>

            <h3 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b border-gray-200">전체 품목별 생산량</h3>
            <table className="w-full text-sm mb-6 border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left border border-gray-300 px-3 py-2 font-semibold text-gray-700">품목명</th>
                  <th className="text-center border border-gray-300 px-3 py-2 font-semibold text-gray-700">세트 수</th>
                  <th className="text-center border border-gray-300 px-3 py-2 font-semibold text-gray-700">개/세트</th>
                  <th className="text-center border border-gray-300 px-3 py-2 font-semibold text-gray-700">생산량</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.product_name}>
                    <td className="border border-gray-300 px-3 py-2 text-gray-800">{item.product_name}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-700">{item.set_qty}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center text-gray-500">{item.pieces_per_unit}</td>
                    <td className="border border-gray-300 px-3 py-2 text-center font-bold text-gray-900">{item.total_pieces}</td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-bold">
                  <td className="border border-gray-300 px-3 py-2 text-gray-800">합계</td>
                  <td className="border border-gray-300 px-3 py-2 text-center text-gray-700">{totalSets}</td>
                  <td className="border border-gray-300 px-3 py-2"></td>
                  <td className="border border-gray-300 px-3 py-2 text-center text-gray-900">{totalPieces.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {storeItems.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-gray-700 mb-2 pb-1 border-b border-gray-200">매장별 발주 내역</h3>
                {storeItems.map((store) => (
                  <div key={store.store_name} className="mb-4">
                    <p className="text-sm font-semibold text-gray-700 mb-1">{store.store_name} — 총 {store.total_pieces}개</p>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="text-left border border-gray-300 px-3 py-1.5 font-medium text-gray-600">품목명</th>
                          <th className="text-center border border-gray-300 px-3 py-1.5 font-medium text-gray-600">세트</th>
                          <th className="text-center border border-gray-300 px-3 py-1.5 font-medium text-gray-600">생산량</th>
                        </tr>
                      </thead>
                      <tbody>
                        {store.items.map((item) => (
                          <tr key={item.product_name}>
                            <td className="border border-gray-300 px-3 py-1.5 text-gray-800">{item.product_name}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-center text-gray-600">{item.set_qty}</td>
                            <td className="border border-gray-300 px-3 py-1.5 text-center font-semibold text-gray-900">{item.total_pieces}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </>
            )}

            <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-400 text-right">
              출력 시각: {new Date().toLocaleString("ko-KR")}
            </div>
          </div>
        </div>
      )}

      {lastUpdated && (
        <p className="no-print text-center text-gray-400 text-xs py-4">
          {lastUpdated.toLocaleTimeString("ko-KR")} 기준 · 30초 자동갱신
        </p>
      )}
    </div>
  );
}
