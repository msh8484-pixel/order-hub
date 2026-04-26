"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";

type Period = "week" | "month" | "3month";

type ProductCost = {
  product_id: string;
  materials: { name: string; unit: string; unit_price: number; amount: number }[];
  packaging_cost: number;
  labor_cost: number;
  overhead_cost: number;
  selling_price: number;
};

type SaleRow = {
  product_id: string;
  product_name: string;
  category: string;
  quantity: number;
  pieces_per_unit: number;
};

type ProductProfit = {
  product_id: string;
  product_name: string;
  category: string;
  totalPieces: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
  unitCost: number;
  sellingPrice: number;
};

type CategoryProfit = {
  category: string;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
};

const PIE_COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#047857", "#065f46", "#a7f3d0", "#f59e0b", "#ef4444", "#6b7280"];
const CATEGORY_ORDER = ["쑥인절미", "약밥", "무설탕", "개떡", "찹쌀떡", "찰떡", "설기", "현미", "음료", "답례떡", "기타"];

const PERIOD_LABELS: Record<Period, string> = { week: "1주", month: "1개월", "3month": "3개월" };

function getDateRange(period: Period): { from: string; to: string } {
  const to = new Date();
  const from = new Date();
  if (period === "week") from.setDate(from.getDate() - 6);
  else if (period === "month") from.setMonth(from.getMonth() - 1);
  else from.setMonth(from.getMonth() - 3);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

function calcUnitCost(c: ProductCost): number {
  const materialCost = (c.materials || []).reduce((s, m) => s + m.unit_price * m.amount, 0);
  return materialCost + c.packaging_cost + c.labor_cost + c.overhead_cost;
}

function MarginBadge({ margin }: { margin: number }) {
  if (margin >= 30) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{margin.toFixed(1)}%</span>;
  if (margin >= 15) return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">{margin.toFixed(1)}%</span>;
  return <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">{margin.toFixed(1)}%</span>;
}

export default function ProfitTab() {
  const [period, setPeriod] = useState<Period>("month");
  const [costs, setCosts] = useState<ProductCost[]>([]);
  const [productProfits, setProductProfits] = useState<ProductProfit[]>([]);
  const [categoryProfits, setCategoryProfits] = useState<CategoryProfit[]>([]);
  const [summary, setSummary] = useState({ revenue: 0, cost: 0, profit: 0, margin: 0 });
  const [loading, setLoading] = useState(true);
  const [noCostData, setNoCostData] = useState(false);
  const [sortBy, setSortBy] = useState<"profit" | "margin" | "revenue">("profit");

  const load = useCallback(async () => {
    setLoading(true);

    const { from, to } = getDateRange(period);

    const [{ data: costData }, { data: itemData }] = await Promise.all([
      supabase.from("product_costs").select("product_id, materials, packaging_cost, labor_cost, overhead_cost, selling_price"),
      supabase
        .from("order_items")
        .select(`product_id, product_name, quantity, products(pieces_per_unit, category), orders!inner(order_date, status)`)
        .gte("orders.order_date", from)
        .lte("orders.order_date", to)
        .neq("orders.status", "cancelled"),
    ]);

    if (!costData || costData.length === 0) {
      setNoCostData(true);
      setLoading(false);
      return;
    }
    setNoCostData(false);

    const costMap = new Map<string, ProductCost>();
    for (const c of costData) costMap.set(c.product_id, c as ProductCost);

    // 상품별 집계
    const profitMap = new Map<string, ProductProfit>();
    for (const item of itemData || []) {
      const pid = item.product_id;
      const ppu = (item.products as any)?.pieces_per_unit ?? 1;
      const cat = (item.products as any)?.category ?? "기타";
      const pieces = item.quantity * ppu;
      const c = costMap.get(pid);

      if (!c) continue; // 원가 없는 상품 제외

      const unitCost = calcUnitCost(c);
      const sellingPrice = c.selling_price || 0;

      if (!profitMap.has(pid)) {
        profitMap.set(pid, {
          product_id: pid,
          product_name: item.product_name,
          category: cat,
          totalPieces: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
          margin: 0,
          unitCost,
          sellingPrice,
        });
      }

      const p = profitMap.get(pid)!;
      p.totalPieces += pieces;
      p.revenue += pieces * sellingPrice;
      p.cost += pieces * unitCost;
    }

    // 마진 계산
    const profits: ProductProfit[] = [];
    for (const p of profitMap.values()) {
      p.profit = p.revenue - p.cost;
      p.margin = p.revenue > 0 ? (p.profit / p.revenue) * 100 : 0;
      profits.push(p);
    }

    // 카테고리별 집계
    const catMap = new Map<string, CategoryProfit>();
    for (const p of profits) {
      const cat = p.category;
      if (!catMap.has(cat)) catMap.set(cat, { category: cat, revenue: 0, cost: 0, profit: 0, margin: 0 });
      const c = catMap.get(cat)!;
      c.revenue += p.revenue;
      c.cost += p.cost;
      c.profit += p.profit;
    }
    const catProfits: CategoryProfit[] = [];
    for (const c of catMap.values()) {
      c.margin = c.revenue > 0 ? (c.profit / c.revenue) * 100 : 0;
      catProfits.push(c);
    }
    catProfits.sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a.category);
      const bi = CATEGORY_ORDER.indexOf(b.category);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    // 전체 요약
    const totalRevenue = profits.reduce((s, p) => s + p.revenue, 0);
    const totalCost = profits.reduce((s, p) => s + p.cost, 0);
    const totalProfit = totalRevenue - totalCost;

    setCosts(costData as ProductCost[]);
    setProductProfits(profits);
    setCategoryProfits(catProfits);
    setSummary({
      revenue: totalRevenue,
      cost: totalCost,
      profit: totalProfit,
      margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0,
    });
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  const sorted = [...productProfits].sort((a, b) => {
    if (sortBy === "margin") return b.margin - a.margin;
    if (sortBy === "revenue") return b.revenue - a.revenue;
    return b.profit - a.profit;
  });

  const topProducts = sorted.slice(0, 10);

  const barData = categoryProfits.map(c => ({
    name: c.category,
    매출: Math.round(c.revenue / 10000),
    원가: Math.round(c.cost / 10000),
    순이익: Math.round(c.profit / 10000),
  }));

  const pieData = categoryProfits
    .filter(c => c.profit > 0)
    .map(c => ({ name: c.category, value: Math.round(c.profit / 10000) }));

  const fw = (n: number) => (n / 10000).toFixed(0) + "만";

  if (loading) return <div className="text-center text-stone-400 py-20 text-sm">불러오는 중...</div>;

  if (noCostData) return (
    <div className="px-4 pt-8 text-center">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
        <p className="text-amber-700 font-bold text-sm mb-2">원가 데이터가 없습니다</p>
        <p className="text-amber-600 text-xs">설정 → 원가 설정 탭에서 상품별 원가를 입력하면<br />수익성 분석이 자동으로 표시됩니다.</p>
      </div>
    </div>
  );

  return (
    <div className="px-4 pt-4 space-y-5 pb-8">
      {/* 기간 선택 */}
      <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${period === p ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500"}`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-stone-400 text-xs font-medium mb-1">총 매출</p>
          <p className="text-stone-900 text-xl font-black">{fw(summary.revenue)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-stone-400 text-xs font-medium mb-1">총 원가</p>
          <p className="text-stone-700 text-xl font-black">{fw(summary.cost)}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${summary.profit >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <p className="text-stone-400 text-xs font-medium mb-1">순이익</p>
          <p className={`text-xl font-black ${summary.profit >= 0 ? "text-emerald-700" : "text-red-600"}`}>{fw(summary.profit)}</p>
        </div>
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-stone-400 text-xs font-medium mb-1">평균 마진율</p>
          <MarginBadge margin={summary.margin} />
        </div>
      </div>

      {/* 카테고리별 매출 vs 원가 vs 순이익 바차트 */}
      {barData.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-stone-700 font-bold text-sm mb-4">카테고리별 수익 분석 (만원)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={45} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip formatter={(v) => v != null ? `${Math.round(Number(v))}만원` : ""} />
              <Bar dataKey="매출" fill="#e2e8f0" radius={[3, 3, 0, 0]} />
              <Bar dataKey="원가" fill="#fca5a5" radius={[3, 3, 0, 0]} />
              <Bar dataKey="순이익" fill="#059669" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 justify-center mt-2">
            {[["#e2e8f0","매출"],["#fca5a5","원가"],["#059669","순이익"]].map(([color, label]) => (
              <div key={label} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: color }} />
                <span className="text-xs text-stone-500">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 순이익 파이차트 */}
      {pieData.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-4">
          <p className="text-stone-700 font-bold text-sm mb-3">카테고리별 순이익 비중</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => v != null ? `${Math.round(Number(v))}만원` : ""} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* 상품별 수익 랭킹 */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <p className="text-stone-700 font-bold text-sm">상품별 수익 랭킹</p>
          <div className="flex gap-1">
            {(["profit", "margin", "revenue"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${sortBy === s ? "bg-emerald-700 text-white" : "bg-stone-100 text-stone-500"}`}
              >
                {s === "profit" ? "이익순" : s === "margin" ? "마진순" : "매출순"}
              </button>
            ))}
          </div>
        </div>
        {sorted.length === 0 ? (
          <p className="text-center text-stone-400 text-sm py-8">원가 입력된 상품의 발주 데이터가 없습니다</p>
        ) : (
          topProducts.map((p, i) => (
            <div key={p.product_id} className={`px-4 py-3 flex items-center gap-3 ${i < topProducts.length - 1 ? "border-b border-stone-50" : ""}`}>
              <span className={`text-xs font-black w-5 text-center ${i < 3 ? "text-emerald-700" : "text-stone-400"}`}>{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-stone-800 text-sm font-semibold truncate">{p.product_name}</p>
                <p className="text-stone-400 text-xs">{p.totalPieces.toLocaleString()}개 · 원가 {p.unitCost.toLocaleString()}원/개</p>
              </div>
              <div className="text-right shrink-0">
                <MarginBadge margin={p.margin} />
                <p className="text-stone-900 font-bold text-sm mt-0.5">{fw(p.profit)} 이익</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 카테고리별 마진율 테이블 */}
      {categoryProfits.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="text-stone-700 font-bold text-sm">카테고리별 수익률</p>
          </div>
          {categoryProfits.map((c, i) => (
            <div key={c.category} className={`px-4 py-3 flex items-center justify-between ${i < categoryProfits.length - 1 ? "border-b border-stone-50" : ""}`}>
              <div>
                <p className="text-stone-800 text-sm font-semibold">{c.category}</p>
                <p className="text-stone-400 text-xs">매출 {fw(c.revenue)} · 원가 {fw(c.cost)}</p>
              </div>
              <div className="text-right">
                <MarginBadge margin={c.margin} />
                <p className="text-emerald-700 font-bold text-sm mt-0.5">+{fw(c.profit)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
