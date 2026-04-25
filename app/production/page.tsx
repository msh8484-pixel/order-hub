"use client";

import { useState, useEffect, useCallback } from "react";
import { Printer } from "lucide-react";
import { supabase } from "@/lib/supabase";

type ProductionItem = {
  product_name: string;
  category: string;
  set_qty: number;
  pieces_per_unit: number;
  total_pieces: number;
  sources: { source: string; qty: number }[];
  by_store: { store_name: string; qty: number }[];
};

type CategoryGroup = {
  category: string;
  total_pieces: number;
  items: ProductionItem[];
};

type StoreItem = {
  store_name: string;
  items: { product_name: string; category: string; set_qty: number; pieces_per_unit: number; total_pieces: number }[];
  total_pieces: number;
};

const SOURCE_LABELS: Record<string, string> = {
  store: "매장",
  cafe24: "카페24",
  naver: "네이버",
  coupang: "쿠팡",
  chat: "발주방",
};

const CATEGORY_ORDER = ["쑥인절미", "약밥", "무설탕", "개떡", "찹쌀떡", "찰떡", "설기", "현미", "음료", "답례떡", "기타"];

type Tab = "total" | "store" | "print";

export default function ProductionPage() {
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([]);
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
        products(pieces_per_unit, category)
      `)
      .eq("orders.order_date", today)
      .neq("orders.status", "cancelled");

    if (error) { console.error(error); setLoading(false); return; }

    // 품목별 집계
    const map = new Map<string, {
      category: string;
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
      const category = (item.products as any)?.category ?? "기타";

      if (!map.has(name)) map.set(name, { category, set_qty: 0, pieces_per_unit: ppu, sources: new Map(), stores: new Map() });
      const entry = map.get(name)!;
      entry.set_qty += setQty;
      entry.sources.set(source, (entry.sources.get(source) || 0) + setQty);
      entry.stores.set(storeName, (entry.stores.get(storeName) || 0) + setQty);
    }

    const allItems: ProductionItem[] = Array.from(map.entries())
      .map(([name, { category, set_qty, pieces_per_unit, sources, stores }]) => ({
        product_name: name,
        category,
        set_qty,
        pieces_per_unit,
        total_pieces: set_qty * pieces_per_unit,
        sources: Array.from(sources.entries()).map(([source, qty]) => ({ source, qty })),
        by_store: Array.from(stores.entries()).map(([store_name, qty]) => ({ store_name, qty })),
      }))
      .sort((a, b) => b.total_pieces - a.total_pieces);

    setItems(allItems);

    // 카테고리별 그룹
    const catMap = new Map<string, ProductionItem[]>();
    for (const item of allItems) {
      const cat = item.category || "기타";
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat)!.push(item);
    }

    const groups: CategoryGroup[] = CATEGORY_ORDER
      .filter(cat => catMap.has(cat))
      .map(cat => ({
        category: cat,
        total_pieces: catMap.get(cat)!.reduce((s, i) => s + i.total_pieces, 0),
        items: catMap.get(cat)!,
      }));

    // CATEGORY_ORDER에 없는 카테고리 추가
    for (const [cat, catItems] of catMap.entries()) {
      if (!CATEGORY_ORDER.includes(cat)) {
        groups.push({ category: cat, total_pieces: catItems.reduce((s, i) => s + i.total_pieces, 0), items: catItems });
      }
    }

    setCategoryGroups(groups);

    // 매장별 집계
    const storeMap = new Map<string, Map<string, { set_qty: number; ppu: number; category: string }>>();
    for (const item of data || []) {
      const order = item.orders as any;
      if (order.source !== "store") continue;
      const storeName = order.stores?.name || "알 수 없음";
      const name = item.product_name;
      const ppu = (item.products as any)?.pieces_per_unit ?? 1;
      const category = (item.products as any)?.category ?? "기타";
      if (!storeMap.has(storeName)) storeMap.set(storeName, new Map());
      const m = storeMap.get(storeName)!;
      const prev = m.get(name) || { set_qty: 0, ppu, category };
      m.set(name, { set_qty: prev.set_qty + item.quantity, ppu, category });
    }

    const storeResult: StoreItem[] = Array.from(storeMap.entries()).map(([store_name, itemMap]) => {
      const storeItemsList = Array.from(itemMap.entries())
        .map(([product_name, { set_qty, ppu, category }]) => ({
          product_name,
          category,
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
    <div className="min-h-screen bg-stone-50 flex items-center justify-center">
      <p className="text-stone-400 text-sm">불러오는 중...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          nav, footer { display: none !important; }
          body { font-size: 12px; margin: 0; padding: 0; }
          .min-h-screen { min-height: unset; padding-bottom: 0; }
          .pb-20 { padding-bottom: 0 !important; }
          @page { margin: 15mm 10mm; }
        }
        .print-only { display: none; }
      `}</style>

      {/* 인쇄용 헤더 — 화면에서는 숨김 */}
      <div className="print-only px-6 pt-4 pb-2 border-b border-stone-300 mb-4">
        <h1 className="text-lg font-bold text-stone-900">생산 작업 지시서</h1>
        <p className="text-sm text-stone-500">{todayLabel} — 총 {totalPieces.toLocaleString()}개 생산</p>
        <p className="text-xs text-stone-400 mt-1">출력: {new Date().toLocaleString("ko-KR")}</p>
      </div>

      {/* 헤더 */}
      <div className="no-print sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-stone-900 font-bold text-base">생산 현황</h1>
            <p className="text-stone-400 text-xs">{todayLabel} — 총 {totalPieces.toLocaleString()}개 생산</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-sm px-3 py-1.5 rounded-lg font-medium transition-colors"
            >
              <Printer size={14} />
              인쇄
            </button>
            <button onClick={load} className="text-emerald-700 text-sm font-medium">갱신</button>
          </div>
        </div>
        <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
          {([["total", "전체 총량"], ["store", "매장별"], ["print", "인쇄용 표"]] as [Tab, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${tab === key ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500"}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 전체 총량 — 카테고리별 */}
      {tab === "total" && (
        <div className="px-4 py-4 space-y-3">
          {/* 요약 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white border border-stone-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{totalPieces.toLocaleString()}</p>
              <p className="text-stone-400 text-xs mt-1">총 생산량</p>
            </div>
            <div className="bg-white border border-stone-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-stone-700">{totalSets.toLocaleString()}</p>
              <p className="text-stone-400 text-xs mt-1">총 세트 수</p>
            </div>
          </div>

          {categoryGroups.length === 0 ? (
            <div className="text-center text-stone-400 py-16 text-sm">오늘 주문이 없습니다</div>
          ) : (
            categoryGroups.map((group) => (
              <div key={group.category} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                {/* 카테고리 헤더 */}
                <div className="px-4 py-2.5 bg-emerald-700 flex items-center justify-between">
                  <span className="text-white font-bold text-sm">{group.category}</span>
                  <span className="text-emerald-100 font-bold text-base">{group.total_pieces.toLocaleString()}개</span>
                </div>
                {/* 품목 행 */}
                {group.items.map((item) => (
                  <div key={item.product_name} className="flex items-center gap-3 px-4 py-3 border-b border-stone-100 last:border-0">
                    <span className="flex-1 text-stone-800 text-sm leading-tight">{item.product_name}</span>
                    <span className="bg-stone-100 border border-stone-200 rounded px-2 py-1 text-stone-600 text-xs font-medium flex-shrink-0">{item.set_qty}세트</span>
                    <span className="text-stone-900 font-bold text-sm w-16 text-right flex-shrink-0">{item.total_pieces.toLocaleString()}개</span>
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      )}

      {/* 매장별 */}
      {tab === "store" && (
        <div className="px-4 py-4 space-y-4">
          {storeItems.length === 0 ? (
            <div className="text-center text-stone-400 py-16 text-sm">매장 발주가 없습니다</div>
          ) : storeItems.map((store) => {
            // 카테고리별 그룹화
            const storeCatMap = new Map<string, typeof store.items>();
            for (const item of store.items) {
              const c = item.category || "기타";
              if (!storeCatMap.has(c)) storeCatMap.set(c, []);
              storeCatMap.get(c)!.push(item);
            }
            const storeCats = CATEGORY_ORDER.filter(c => storeCatMap.has(c))
              .concat([...storeCatMap.keys()].filter(c => !CATEGORY_ORDER.includes(c)));
            return (
              <div key={store.store_name} className="bg-white border border-stone-200 rounded-xl overflow-hidden">
                {/* 매장 헤더 */}
                <div className="px-4 py-2.5 bg-emerald-700 flex justify-between items-center">
                  <span className="text-white font-bold text-sm">{store.store_name}</span>
                  <span className="text-emerald-100 font-bold text-base">총 {store.total_pieces.toLocaleString()}개</span>
                </div>
                {storeCats.map((cat, ci) => (
                  <div key={cat}>
                    {/* 카테고리 구분행 */}
                    <div className={`flex items-center px-4 py-2 bg-stone-50 border-b border-stone-100 ${ci > 0 ? "border-t border-stone-200" : ""}`}>
                      <span className="text-stone-600 text-xs font-bold tracking-wider">{cat}</span>
                      <span className="ml-auto text-stone-500 text-xs font-semibold">
                        {storeCatMap.get(cat)!.reduce((s, i) => s + i.total_pieces, 0).toLocaleString()}개
                      </span>
                    </div>
                    {storeCatMap.get(cat)!.map((item) => (
                      <div key={item.product_name} className="flex items-center gap-3 px-4 py-3 border-b border-stone-100 last:border-0">
                        <span className="flex-1 text-stone-800 text-sm leading-tight">{item.product_name}</span>
                        <span className="bg-stone-100 border border-stone-200 rounded px-2 py-1 text-stone-600 text-xs font-medium flex-shrink-0">{item.set_qty}세트</span>
                        <span className="text-stone-900 font-bold text-sm w-16 text-right flex-shrink-0">{item.total_pieces.toLocaleString()}개</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* 인쇄용 표 */}
      {tab === "print" && (
        <div className="px-4 py-4">
          <div className="no-print flex justify-end mb-3">
            <button
              onClick={() => window.print()}
              className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm px-5 py-2 rounded-lg font-medium"
            >
              인쇄
            </button>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-6">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold text-stone-900">생산 작업 지시서</h2>
              <p className="text-stone-400 text-sm mt-1">{todayLabel}</p>
            </div>

            {/* 카테고리별 생산량 */}
            <h3 className="text-sm font-bold text-stone-700 mb-2 pb-1 border-b border-stone-200">카테고리별 총 생산량</h3>
            <table className="w-full text-sm mb-6 border-collapse">
              <thead>
                <tr className="bg-stone-100">
                  <th className="text-left border border-stone-300 px-3 py-2 font-semibold text-stone-700">분류</th>
                  <th className="text-center border border-stone-300 px-3 py-2 font-semibold text-stone-700">생산량</th>
                </tr>
              </thead>
              <tbody>
                {categoryGroups.map((group) => (
                  <tr key={group.category}>
                    <td className="border border-stone-300 px-3 py-2 text-stone-800 font-medium">{group.category}</td>
                    <td className="border border-stone-300 px-3 py-2 text-center font-bold text-stone-900">{group.total_pieces}개</td>
                  </tr>
                ))}
                <tr className="bg-stone-50 font-bold">
                  <td className="border border-stone-300 px-3 py-2 text-stone-800">합계</td>
                  <td className="border border-stone-300 px-3 py-2 text-center text-stone-900">{totalPieces.toLocaleString()}개</td>
                </tr>
              </tbody>
            </table>

            {/* 품목별 상세 */}
            <h3 className="text-sm font-bold text-stone-700 mb-2 pb-1 border-b border-stone-200">품목별 상세 생산량</h3>
            <table className="w-full text-sm mb-6 border-collapse">
              <thead>
                <tr className="bg-stone-100">
                  <th className="text-left border border-stone-300 px-3 py-2 font-semibold text-stone-700">품목명</th>
                  <th className="text-center border border-stone-300 px-3 py-2 font-semibold text-stone-700">세트</th>
                  <th className="text-center border border-stone-300 px-3 py-2 font-semibold text-stone-700">개/세트</th>
                  <th className="text-center border border-stone-300 px-3 py-2 font-semibold text-stone-700">생산량</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.product_name}>
                    <td className="border border-stone-300 px-3 py-2 text-stone-800">{item.product_name}</td>
                    <td className="border border-stone-300 px-3 py-2 text-center text-stone-700">{item.set_qty}</td>
                    <td className="border border-stone-300 px-3 py-2 text-center text-stone-500">{item.pieces_per_unit}</td>
                    <td className="border border-stone-300 px-3 py-2 text-center font-bold text-stone-900">{item.total_pieces}</td>
                  </tr>
                ))}
                <tr className="bg-stone-50 font-bold">
                  <td className="border border-stone-300 px-3 py-2 text-stone-800">합계</td>
                  <td className="border border-stone-300 px-3 py-2 text-center text-stone-700">{totalSets}</td>
                  <td className="border border-stone-300 px-3 py-2"></td>
                  <td className="border border-stone-300 px-3 py-2 text-center text-stone-900">{totalPieces.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            {storeItems.length > 0 && (
              <>
                <h3 className="text-sm font-bold text-stone-700 mb-2 pb-1 border-b border-stone-200">매장별 발주 내역</h3>
                {storeItems.map((store) => (
                  <div key={store.store_name} className="mb-4">
                    <p className="text-sm font-semibold text-stone-700 mb-1">{store.store_name} — 총 {store.total_pieces}개</p>
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-stone-50">
                          <th className="text-left border border-stone-300 px-3 py-1.5 font-medium text-stone-600">품목명</th>
                          <th className="text-center border border-stone-300 px-3 py-1.5 font-medium text-stone-600">세트</th>
                          <th className="text-center border border-stone-300 px-3 py-1.5 font-medium text-stone-600">생산량</th>
                        </tr>
                      </thead>
                      <tbody>
                        {store.items.map((item) => (
                          <tr key={item.product_name}>
                            <td className="border border-stone-300 px-3 py-1.5 text-stone-800">{item.product_name}</td>
                            <td className="border border-stone-300 px-3 py-1.5 text-center text-stone-600">{item.set_qty}</td>
                            <td className="border border-stone-300 px-3 py-1.5 text-center font-semibold text-stone-900">{item.total_pieces}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ))}
              </>
            )}

            <div className="mt-6 pt-4 border-t border-stone-200 text-xs text-stone-400 text-right">
              출력: {new Date().toLocaleString("ko-KR")}
            </div>
          </div>
        </div>
      )}

      {lastUpdated && (
        <p className="no-print text-center text-stone-300 text-xs py-4">
          {lastUpdated.toLocaleTimeString("ko-KR")} 기준 · 30초 자동갱신
        </p>
      )}
    </div>
  );
}
