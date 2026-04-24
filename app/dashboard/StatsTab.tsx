"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";

type Period = "day" | "month" | "year";

const CATEGORY_ORDER = ["쑥인절미", "약밥", "무설탕", "개떡", "찹쌀떡", "찰떡", "설기", "현미", "음료", "답례떡", "기타"];
const PIE_COLORS = ["#059669", "#10b981", "#34d399", "#6ee7b7", "#047857", "#065f46", "#a7f3d0", "#064e3b", "#022c22", "#f59e0b", "#6b7280"];
const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

type RawItem = {
  product_name: string;
  quantity: number;
  pieces_per_unit: number;
  category: string;
  order_date: string;
  source: string;
  store_name: string;
};

function toPeriodKey(dateStr: string, period: Period) {
  if (period === "day") return dateStr;
  if (period === "month") return dateStr.slice(0, 7);
  return dateStr.slice(0, 4);
}

function toPeriodLabel(key: string, period: Period) {
  if (period === "day") {
    const d = new Date(key + "T00:00:00");
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }
  if (period === "month") return `${parseInt(key.slice(5))}월`;
  return `${key}년`;
}

function getPeriodKeys(period: Period, count: number) {
  const now = new Date();
  const keys: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    if (period === "day") d.setDate(d.getDate() - i);
    else if (period === "month") d.setMonth(d.getMonth() - i);
    else d.setFullYear(d.getFullYear() - i);
    if (period === "day") keys.push(d.toISOString().slice(0, 10));
    else if (period === "month") keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    else keys.push(`${d.getFullYear()}`);
  }
  return keys;
}

function getCurrentKey(period: Period) {
  const now = new Date();
  if (period === "day") return now.toISOString().slice(0, 10);
  if (period === "month") return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return `${now.getFullYear()}`;
}

function getPrevKey(period: Period, key: string) {
  if (period === "day") {
    const d = new Date(key + "T00:00:00");
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  if (period === "month") {
    const [y, m] = key.split("-").map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }
  return `${parseInt(key) - 1}`;
}

function getYearAgoKey(period: Period, key: string) {
  if (period === "day") return `${parseInt(key.slice(0, 4)) - 1}${key.slice(4)}`;
  if (period === "month") return `${parseInt(key.slice(0, 4)) - 1}${key.slice(4)}`;
  return `${parseInt(key) - 1}`;
}

function diffLabel(cur: number, prev: number) {
  if (prev === 0) return null;
  const pct = Math.round(((cur - prev) / prev) * 100);
  return { pct, up: cur >= prev };
}

export default function StatsTab() {
  const [rawData, setRawData] = useState<RawItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>("month");
  const [selectedCategory, setSelectedCategory] = useState("전체");
  const [selectedStore, setSelectedStore] = useState("전체");
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
    const fromDate = twoYearsAgo.toISOString().slice(0, 10);

    const { data } = await supabase
      .from("order_items")
      .select("product_name, quantity, orders!inner(order_date, status, source, store_id, stores(name)), products(pieces_per_unit, category)")
      .gte("orders.order_date", fromDate)
      .neq("orders.status", "cancelled");

    if (data) {
      setRawData(data.map((item: any) => ({
        product_name: item.product_name,
        quantity: item.quantity,
        pieces_per_unit: item.products?.pieces_per_unit ?? 1,
        category: item.products?.category ?? "기타",
        order_date: item.orders.order_date,
        source: item.orders.source,
        store_name: item.orders.stores?.name || "온라인",
      })));
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // 카테고리 목록
  const categories = useMemo(() => {
    const cats = new Set(rawData.map(i => i.category));
    return ["전체", ...CATEGORY_ORDER.filter(c => cats.has(c)), ...[...cats].filter(c => !CATEGORY_ORDER.includes(c))];
  }, [rawData]);

  // 매장 목록
  const stores = useMemo(() => {
    const storeSet = new Set(rawData.filter(i => i.source === "store").map(i => i.store_name));
    return ["전체", ...[...storeSet].sort()];
  }, [rawData]);

  // 필터 적용된 데이터
  const filtered = useMemo(() => {
    return rawData
      .filter(i => selectedCategory === "전체" || i.category === selectedCategory)
      .filter(i => selectedStore === "전체" || i.store_name === selectedStore);
  }, [rawData, selectedCategory, selectedStore]);

  // 기간별 집계 맵
  const periodMap = useMemo(() => {
    const m = new Map<string, number>();
    for (const item of filtered) {
      const key = toPeriodKey(item.order_date, period);
      m.set(key, (m.get(key) || 0) + item.quantity * item.pieces_per_unit);
    }
    return m;
  }, [filtered, period]);

  // 트렌드 차트 데이터
  const trendData = useMemo(() => {
    const count = period === "day" ? 30 : period === "month" ? 12 : 5;
    return getPeriodKeys(period, count).map(key => ({
      key,
      label: toPeriodLabel(key, period),
      pieces: periodMap.get(key) || 0,
    }));
  }, [periodMap, period]);

  // 현재 기간 비교
  const currentKey = getCurrentKey(period);
  const prevKey = getPrevKey(period, currentKey);
  const yearAgoKey = getYearAgoKey(period, currentKey);
  const currentPieces = periodMap.get(currentKey) || 0;
  const prevPieces = periodMap.get(prevKey) || 0;
  const yearAgoPieces = periodMap.get(yearAgoKey) || 0;
  const diffPrev = diffLabel(currentPieces, prevPieces);
  const diffYear = diffLabel(currentPieces, yearAgoPieces);

  // 카테고리 비중 (현재 기간)
  const categoryData = useMemo(() => {
    const m = new Map<string, number>();
    for (const item of filtered) {
      if (toPeriodKey(item.order_date, period) !== currentKey) continue;
      m.set(item.category, (m.get(item.category) || 0) + item.quantity * item.pieces_per_unit);
    }
    return CATEGORY_ORDER
      .filter(c => m.has(c))
      .map(c => ({ category: c, pieces: m.get(c)! }))
      .concat([...m.keys()].filter(c => !CATEGORY_ORDER.includes(c)).map(c => ({ category: c, pieces: m.get(c)! })))
      .sort((a, b) => b.pieces - a.pieces);
  }, [filtered, period, currentKey]);

  // 요일별 패턴
  const weekdayData = useMemo(() => {
    const m = new Map<number, number>();
    for (const item of filtered) m.set(
      new Date(item.order_date + "T00:00:00").getDay(),
      (m.get(new Date(item.order_date + "T00:00:00").getDay()) || 0) + item.quantity * item.pieces_per_unit
    );
    return DAY_LABELS.map((label, i) => ({ label, pieces: m.get(i) || 0 }));
  }, [filtered]);

  // 매장별 순위 (현재 기간)
  const storeData = useMemo(() => {
    const m = new Map<string, number>();
    for (const item of filtered) {
      if (item.source !== "store") continue;
      if (toPeriodKey(item.order_date, period) !== currentKey) continue;
      m.set(item.store_name, (m.get(item.store_name) || 0) + item.quantity * item.pieces_per_unit);
    }
    return [...m.entries()].map(([store, pieces]) => ({ store, pieces })).sort((a, b) => b.pieces - a.pieces);
  }, [filtered, period, currentKey]);

  // 품목 TOP 10 (현재 기간)
  const top10 = useMemo(() => {
    const m = new Map<string, number>();
    for (const item of filtered) {
      if (toPeriodKey(item.order_date, period) !== currentKey) continue;
      m.set(item.product_name, (m.get(item.product_name) || 0) + item.quantity * item.pieces_per_unit);
    }
    return [...m.entries()].map(([name, pieces]) => ({ name, pieces })).sort((a, b) => b.pieces - a.pieces).slice(0, 10);
  }, [filtered, period, currentKey]);

  // 온라인 vs 매장 (현재 기간)
  const sourceData = useMemo(() => {
    let store = 0, online = 0;
    for (const item of filtered) {
      if (toPeriodKey(item.order_date, period) !== currentKey) continue;
      const p = item.quantity * item.pieces_per_unit;
      if (item.source === "store") store += p;
      else online += p;
    }
    return [{ name: "매장", pieces: store }, { name: "온라인", pieces: online }].filter(d => d.pieces > 0);
  }, [filtered, period, currentKey]);

  // 달력 히트맵 (최근 12주)
  const heatmapData = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of rawData) {
      if (selectedCategory !== "전체" && item.category !== selectedCategory) continue;
      map.set(item.order_date, (map.get(item.order_date) || 0) + item.quantity * item.pieces_per_unit);
    }
    const maxVal = Math.max(...map.values(), 1);
    // 최근 84일 (12주)
    const days: { date: string; pieces: number; intensity: number }[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const pieces = map.get(dateStr) || 0;
      days.push({ date: dateStr, pieces, intensity: pieces / maxVal });
    }
    return days;
  }, [rawData, selectedCategory]);

  async function getAiSummary() {
    setAiLoading(true);
    setAiSummary("");
    try {
      const res = await fetch("/api/stats/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          thisMonth: currentPieces,
          lastMonth: prevPieces,
          monthly: trendData,
          categories: categoryData.slice(0, 5),
          stores: storeData.slice(0, 5),
        }),
      });
      const json = await res.json();
      setAiSummary(json.summary || json.error || "요약 실패");
    } catch {
      setAiSummary("요약 요청에 실패했습니다.");
    }
    setAiLoading(false);
  }

  const periodLabel = { day: "일별", month: "월별", year: "연도별" }[period];

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <p className="text-stone-400 text-sm">통계 불러오는 중...</p>
    </div>
  );

  return (
    <div className="space-y-4 pb-6">
      {/* 기간 필터 */}
      <div className="bg-white rounded-xl border border-stone-200 p-3 space-y-2">
        <div className="flex gap-1 bg-stone-100 rounded-lg p-1">
          {(["day", "month", "year"] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${period === p ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500"}`}>
              {{ day: "일별", month: "월별", year: "연도별" }[p]}
            </button>
          ))}
        </div>

        {/* 카테고리 필터 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {categories.map(cat => (
            <button key={cat} onClick={() => setSelectedCategory(cat)}
              className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                selectedCategory === cat
                  ? "bg-emerald-700 text-white border-emerald-700"
                  : "bg-white text-stone-500 border-stone-200"
              }`}>
              {cat}
            </button>
          ))}
        </div>

        {/* 매장 필터 */}
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {stores.map(store => (
            <button key={store} onClick={() => setSelectedStore(store)}
              className={`flex-shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium transition-colors ${
                selectedStore === store
                  ? "bg-stone-700 text-white border-stone-700"
                  : "bg-white text-stone-500 border-stone-200"
              }`}>
              {store}
            </button>
          ))}
        </div>
      </div>

      {/* 현재 기간 vs 이전 vs 전년 비교 카드 */}
      <div className="grid grid-cols-3 gap-2">
        <div className="bg-white rounded-xl p-3 border border-stone-200">
          <p className="text-stone-400 text-xs mb-1">현재 {periodLabel}</p>
          <p className="text-xl font-bold text-emerald-700 leading-tight">{currentPieces.toLocaleString()}</p>
          <p className="text-stone-400 text-xs">개</p>
        </div>
        <div className="bg-white rounded-xl p-3 border border-stone-200">
          <p className="text-stone-400 text-xs mb-1">전 기간</p>
          <p className="text-xl font-bold text-stone-700 leading-tight">{prevPieces.toLocaleString()}</p>
          {diffPrev && (
            <p className={`text-xs font-medium ${diffPrev.up ? "text-emerald-600" : "text-red-500"}`}>
              {diffPrev.up ? "▲" : "▼"}{Math.abs(diffPrev.pct)}%
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl p-3 border border-stone-200">
          <p className="text-stone-400 text-xs mb-1">전년 동기</p>
          <p className="text-xl font-bold text-stone-700 leading-tight">{yearAgoPieces.toLocaleString()}</p>
          {diffYear && (
            <p className={`text-xs font-medium ${diffYear.up ? "text-emerald-600" : "text-red-500"}`}>
              {diffYear.up ? "▲" : "▼"}{Math.abs(diffYear.pct)}%
            </p>
          )}
        </div>
      </div>

      {/* 생산량 추이 */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100">
          <p className="text-stone-700 font-bold text-sm">생산량 추이 — {periodLabel}</p>
        </div>
        <div className="px-2 py-4">
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={trendData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} interval={period === "day" ? 4 : 0} />
              <YAxis tick={{ fontSize: 10, fill: "#a8a29e" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
              <Tooltip
                contentStyle={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${Number(v).toLocaleString()}개`, "생산량"]}
              />
              <Bar dataKey="pieces" fill="#059669" radius={[3, 3, 0, 0]}
                label={period !== "day" ? { position: "top", fontSize: 9, fill: "#a8a29e" } : undefined}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 요일별 패턴 + 온라인 vs 매장 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-stone-100">
            <p className="text-stone-700 font-bold text-xs">요일별 패턴</p>
          </div>
          <div className="px-1 py-3">
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={weekdayData} margin={{ top: 0, right: 4, left: -28, bottom: 0 }}>
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#78716c" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#a8a29e" }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)} />
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 8, fontSize: 11 }}
                  formatter={(v) => [`${Number(v).toLocaleString()}개`]}
                />
                <Bar dataKey="pieces" fill="#10b981" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-3 py-2.5 border-b border-stone-100">
            <p className="text-stone-700 font-bold text-xs">채널 비중</p>
            <p className="text-stone-400 text-xs">매장 vs 온라인</p>
          </div>
          {sourceData.length > 0 ? (
            <div className="flex items-center justify-center py-2">
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={sourceData} dataKey="pieces" nameKey="name" cx="50%" cy="50%" outerRadius={48} innerRadius={24}>
                    <Cell fill="#059669" />
                    <Cell fill="#10b981" />
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 8, fontSize: 11 }}
                    formatter={(v) => [`${Number(v).toLocaleString()}개`]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="py-8 text-center text-stone-300 text-xs">데이터 없음</div>
          )}
          <div className="flex justify-center gap-4 pb-2">
            {sourceData.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: i === 0 ? "#059669" : "#10b981" }} />
                <span className="text-xs text-stone-500">{d.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 품목 TOP 10 */}
      {top10.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="text-stone-700 font-bold text-sm">품목 TOP {top10.length}</p>
            <p className="text-stone-400 text-xs">현재 {periodLabel} 기준</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            {top10.map((item, i) => {
              const maxPieces = top10[0].pieces;
              const widthPct = Math.round((item.pieces / maxPieces) * 100);
              return (
                <div key={item.name} className="flex items-center gap-2">
                  <span className="text-stone-400 text-xs w-4 text-right flex-shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-stone-700 text-xs truncate">{item.name}</span>
                      <span className="text-stone-900 text-xs font-bold ml-2 flex-shrink-0">{item.pieces.toLocaleString()}개</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 카테고리 비중 (현재 기간) */}
      {categoryData.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="text-stone-700 font-bold text-sm">카테고리 비중</p>
            <p className="text-stone-400 text-xs">현재 {periodLabel} 기준</p>
          </div>
          <div className="flex items-center px-2 py-4 gap-0">
            <ResponsiveContainer width="45%" height={150}>
              <PieChart>
                <Pie data={categoryData} dataKey="pieces" nameKey="category" cx="50%" cy="50%" outerRadius={65} innerRadius={30}>
                  {categoryData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ background: "#fff", border: "1px solid #e7e5e4", borderRadius: 8, fontSize: 11 }}
                  formatter={(v) => [`${Number(v).toLocaleString()}개`]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5 pr-3">
              {categoryData.slice(0, 7).map((c, i) => (
                <div key={c.category} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-stone-500 text-xs flex-1 truncate">{c.category}</span>
                  <span className="text-stone-900 text-xs font-semibold">{c.pieces.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 매장별 순위 (현재 기간) */}
      {storeData.length > 0 && (
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-stone-100">
            <p className="text-stone-700 font-bold text-sm">매장별 순위</p>
            <p className="text-stone-400 text-xs">현재 {periodLabel} 기준</p>
          </div>
          <div className="px-4 py-3 space-y-2">
            {storeData.map((s, i) => {
              const maxPieces = storeData[0].pieces;
              const widthPct = Math.round((s.pieces / maxPieces) * 100);
              return (
                <div key={s.store} className="flex items-center gap-2">
                  <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${i === 0 ? "text-amber-500" : i === 1 ? "text-stone-400" : i === 2 ? "text-amber-700" : "text-stone-300"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-stone-700 text-xs truncate">{s.store}</span>
                      <span className="text-stone-900 text-xs font-bold ml-2 flex-shrink-0">{s.pieces.toLocaleString()}개</span>
                    </div>
                    <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
                      <div className="h-full bg-stone-500 rounded-full transition-all" style={{ width: `${widthPct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 달력 히트맵 (최근 12주) */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100">
          <p className="text-stone-700 font-bold text-sm">생산 활동 히트맵</p>
          <p className="text-stone-400 text-xs">최근 12주 — 색이 진할수록 생산량 많음</p>
        </div>
        <div className="px-4 py-4">
          <div className="flex gap-1 mb-2">
            {["일", "월", "화", "수", "목", "금", "토"].map((d, i) => (
              <div key={d} className="w-7 text-center text-xs text-stone-300">{i % 2 === 0 ? d : ""}</div>
            ))}
          </div>
          <div className="flex flex-col gap-1">
            {Array.from({ length: 12 }, (_, week) => (
              <div key={week} className="flex gap-1">
                {Array.from({ length: 7 }, (_, dow) => {
                  const idx = week * 7 + dow;
                  const day = heatmapData[idx];
                  if (!day) return <div key={dow} className="w-7 h-7" />;
                  const alpha = day.intensity;
                  const bg = alpha === 0 ? "#f5f5f4"
                    : alpha < 0.25 ? "#a7f3d0"
                    : alpha < 0.5 ? "#34d399"
                    : alpha < 0.75 ? "#10b981"
                    : "#059669";
                  return (
                    <div key={dow} title={`${day.date}: ${day.pieces.toLocaleString()}개`}
                      className="w-7 h-7 rounded-md flex items-center justify-center"
                      style={{ background: bg }}>
                      <span className="text-[9px] font-medium" style={{ color: alpha > 0.3 ? "#fff" : "#a8a29e" }}>
                        {new Date(day.date + "T00:00:00").getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-stone-300 text-xs">적음</span>
            {["#f5f5f4", "#a7f3d0", "#34d399", "#10b981", "#059669"].map((c, i) => (
              <div key={i} className="w-4 h-4 rounded-sm" style={{ background: c }} />
            ))}
            <span className="text-stone-300 text-xs">많음</span>
          </div>
        </div>
      </div>

      {/* AI 요약 */}
      <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
          <div>
            <p className="text-stone-700 font-bold text-sm">AI 현황 요약</p>
            <p className="text-stone-400 text-xs">Claude가 {periodLabel} 데이터를 분석합니다</p>
          </div>
          <button onClick={getAiSummary} disabled={aiLoading}
            className="bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-200 disabled:text-stone-400 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors">
            {aiLoading ? "분석 중..." : "분석하기"}
          </button>
        </div>
        {aiSummary ? (
          <div className="px-4 py-4">
            <p className="text-stone-700 text-sm leading-relaxed whitespace-pre-line">{aiSummary}</p>
          </div>
        ) : (
          <div className="px-4 py-6 text-center text-stone-400 text-sm">분석하기를 누르면 AI가 현황을 요약합니다</div>
        )}
      </div>
    </div>
  );
}
