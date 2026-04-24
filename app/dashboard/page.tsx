"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import StatsTab from "./StatsTab";

type OrderItem = {
  product_name: string;
  quantity: number;
  pieces_per_unit: number;
  category: string;
};

type StoreOrder = {
  store_id: string;
  store_name: string;
  order_id: string;
  status: string;
  submitted_at: string;
  items: OrderItem[];
};

type CategoryTotal = {
  category: string;
  total_pieces: number;
};

const STATUS_LABEL: Record<string, string> = {
  pending: "접수",
  confirmed: "확인됨",
  producing: "생산중",
  done: "완료",
  cancelled: "취소",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border border-blue-200",
  producing: "bg-orange-50 text-orange-700 border border-orange-200",
  done: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-stone-100 text-stone-500 border border-stone-200",
};

const DAY_KO = ["일", "월", "화", "수", "목", "금", "토"];
const CATEGORY_ORDER = ["쑥인절미", "약밥", "무설탕", "개떡", "찹쌀떡", "찰떡", "설기", "현미", "음료", "답례떡", "기타"];

function buildStrip(centerDate: string, count = 15) {
  const center = new Date(centerDate);
  const today = new Date().toISOString().slice(0, 10);
  const days: { dateStr: string; day: number; weekday: string; isToday: boolean; dow: number }[] = [];
  for (let i = -Math.floor(count / 2); i <= Math.floor(count / 2); i++) {
    const d = new Date(center);
    d.setDate(d.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    days.push({ dateStr, day: d.getDate(), weekday: DAY_KO[d.getDay()], isToday: dateStr === today, dow: d.getDay() });
  }
  return days;
}

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const weeks: (number | null)[][] = [];
  let week: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d);
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week); }
  return weeks;
}

export default function DashboardPage() {
  const [mainTab, setMainTab] = useState<"orders" | "stats">("orders");

  // --- 발주 현황 state ---
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CategoryTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().toISOString().slice(0, 10);
  const [selectedDate, setSelectedDate] = useState(today);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const stripRef = useRef<HTMLDivElement>(null);

  const selD = new Date(selectedDate);
  const [calYear, setCalYear] = useState(selD.getFullYear());
  const [calMonth, setCalMonth] = useState(selD.getMonth());

  const stripDays = buildStrip(selectedDate, 15);
  const calWeeks = buildCalendar(calYear, calMonth);

  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const sel = el.querySelector("[data-selected='true']") as HTMLElement | null;
    if (sel) el.scrollTo({ left: sel.offsetLeft - el.clientWidth / 2 + sel.clientWidth / 2, behavior: "smooth" });
  }, [selectedDate]);

  function selectDate(dateStr: string) {
    setSelectedDate(dateStr);
    setShowCalendar(false);
  }

  function moveCalMonth(delta: number) {
    const d = new Date(calYear, calMonth + delta, 1);
    setCalYear(d.getFullYear());
    setCalMonth(d.getMonth());
  }

  const load = useCallback(async () => {
    const { data: orderData, error } = await supabase
      .from("orders")
      .select(`id, status, created_at, store_id, stores(name), order_items(product_name, quantity, products(pieces_per_unit, category))`)
      .eq("order_date", selectedDate)
      .eq("source", "store")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    if (error) { console.error(error); setLoading(false); return; }

    setOrders((orderData || []).map((row: any) => ({
      store_id: row.store_id,
      store_name: row.stores?.name || "알 수 없음",
      order_id: row.id,
      status: row.status,
      submitted_at: row.created_at,
      items: (row.order_items || []).map((it: any) => ({
        product_name: it.product_name,
        quantity: it.quantity,
        pieces_per_unit: it.products?.pieces_per_unit ?? 1,
        category: it.products?.category ?? "기타",
      })),
    })));

    const { data: itemData } = await supabase
      .from("order_items")
      .select(`quantity, orders!inner(order_date, status), products(pieces_per_unit, category)`)
      .eq("orders.order_date", selectedDate)
      .neq("orders.status", "cancelled");

    const catMap = new Map<string, number>();
    for (const item of itemData || []) {
      const ppu = (item.products as any)?.pieces_per_unit ?? 1;
      const cat = (item.products as any)?.category ?? "기타";
      catMap.set(cat, (catMap.get(cat) || 0) + item.quantity * ppu);
    }

    const totals: CategoryTotal[] = CATEGORY_ORDER
      .filter(c => catMap.has(c))
      .map(c => ({ category: c, total_pieces: catMap.get(c)! }));
    for (const [c, v] of catMap.entries()) {
      if (!CATEGORY_ORDER.includes(c)) totals.push({ category: c, total_pieces: v });
    }

    setCategoryTotals(totals);
    setLastUpdated(new Date());
    setLoading(false);
  }, [selectedDate]);

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  async function updateStatus(orderId: string, status: string) {
    await supabase.from("orders").update({ status }).eq("id", orderId);
    load();
  }

  const totalItems = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0);
  const storeCount = new Set(orders.map((o) => o.store_id)).size;
  const totalPieces = categoryTotals.reduce((s, c) => s + c.total_pieces, 0);

  const selectedLabel = new Date(selectedDate).toLocaleDateString("ko-KR", {
    year: "numeric", month: "long", day: "numeric", weekday: "short",
  });

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between">
          <div>
            <h1 className="text-stone-900 font-bold text-base">사장님 대시보드</h1>
            {mainTab === "orders" && (
              <button
                onClick={() => { setCalYear(selD.getFullYear()); setCalMonth(selD.getMonth()); setShowCalendar(!showCalendar); }}
                className="text-stone-500 text-xs mt-0.5 flex items-center gap-1"
              >
                {selectedLabel}
                <span className="text-stone-400">{showCalendar ? "▲" : "▼"}</span>
              </button>
            )}
            {mainTab === "stats" && (
              <p className="text-stone-400 text-xs mt-0.5">통계 분석</p>
            )}
          </div>
          <button
            onClick={() => load()}
            className="text-emerald-700 text-sm font-medium"
          >
            새로고침
          </button>
        </div>

        {/* 메인 탭 */}
        <div className="flex gap-1 mx-4 mb-2 bg-stone-100 rounded-lg p-1">
          {([["orders", "발주 현황"], ["stats", "통계 분석"]] as ["orders" | "stats", string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setMainTab(key)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-colors ${mainTab === key ? "bg-white text-emerald-700 shadow-sm" : "text-stone-500"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 날짜 스트립 — 발주 현황 탭만 */}
        {mainTab === "orders" && (
          <>
            <div ref={stripRef} className="flex gap-1 overflow-x-auto px-3 pb-3" style={{ scrollbarWidth: "none" }}>
              {stripDays.map(({ dateStr, day, weekday, isToday, dow }) => {
                const isSel = dateStr === selectedDate;
                return (
                  <button
                    key={dateStr}
                    data-selected={isSel}
                    onClick={() => selectDate(dateStr)}
                    className={`flex-shrink-0 flex flex-col items-center px-2.5 py-2 rounded-xl transition-colors min-w-[44px] ${
                      isSel ? "bg-emerald-700" : isToday ? "bg-emerald-50 border border-emerald-200" : "hover:bg-stone-50"
                    }`}
                  >
                    <span className={`text-[10px] font-medium mb-1 ${isSel ? "text-emerald-200" : dow === 0 ? "text-red-400" : dow === 6 ? "text-blue-400" : "text-stone-400"}`}>{weekday}</span>
                    <span className={`text-sm font-bold ${isSel ? "text-white" : isToday ? "text-emerald-700" : dow === 0 ? "text-red-500" : dow === 6 ? "text-blue-500" : "text-stone-800"}`}>{day}</span>
                  </button>
                );
              })}
            </div>

            {showCalendar && (
              <div className="border-t border-stone-100 bg-white px-4 pt-3 pb-4">
                <div className="flex items-center justify-between mb-3">
                  <button onClick={() => moveCalMonth(-1)} className="text-stone-400 px-2 py-1 rounded-lg hover:bg-stone-100 text-sm">‹</button>
                  <span className="text-stone-900 font-semibold text-sm">{calYear}년 {calMonth + 1}월</span>
                  <button onClick={() => moveCalMonth(1)} className="text-stone-400 px-2 py-1 rounded-lg hover:bg-stone-100 text-sm">›</button>
                </div>
                <div className="grid grid-cols-7 mb-1">
                  {DAY_KO.map((d, i) => (
                    <div key={d} className={`text-center text-xs font-medium py-1 ${i === 0 ? "text-red-400" : i === 6 ? "text-blue-400" : "text-stone-400"}`}>{d}</div>
                  ))}
                </div>
                {calWeeks.map((week, wi) => (
                  <div key={wi} className="grid grid-cols-7">
                    {week.map((d, di) => {
                      if (!d) return <div key={di} />;
                      const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                      const isSel = dateStr === selectedDate;
                      const isToday2 = dateStr === today;
                      return (
                        <button key={di} onClick={() => selectDate(dateStr)}
                          className={`mx-0.5 my-0.5 h-8 rounded-lg text-sm font-medium transition-colors ${
                            isSel ? "bg-emerald-700 text-white" :
                            isToday2 ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                            di === 0 ? "text-red-500 hover:bg-stone-100" :
                            di === 6 ? "text-blue-500 hover:bg-stone-100" :
                            "text-stone-700 hover:bg-stone-100"
                          }`}>
                          {d}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* ===================== 발주 현황 탭 ===================== */}
      {mainTab === "orders" && (
        <div className="px-4 pt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl p-3 text-center border border-stone-200">
              <p className="text-2xl font-bold text-stone-900">{orders.length}</p>
              <p className="text-stone-400 text-xs mt-1">발주 건수</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-stone-200">
              <p className="text-2xl font-bold text-emerald-700">{storeCount}</p>
              <p className="text-stone-400 text-xs mt-1">참여 매장</p>
            </div>
            <div className="bg-white rounded-xl p-3 text-center border border-stone-200">
              <p className="text-2xl font-bold text-stone-900">{totalItems.toLocaleString()}</p>
              <p className="text-stone-400 text-xs mt-1">총 세트</p>
            </div>
          </div>

          {!loading && categoryTotals.length > 0 && (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <div className="px-4 py-3 border-b border-stone-100 flex items-center justify-between">
                <span className="text-stone-700 font-bold text-sm">생산량 요약</span>
                <span className="text-emerald-700 font-bold text-sm">총 {totalPieces.toLocaleString()}개</span>
              </div>
              {categoryTotals.map((ct, i) => (
                <div key={ct.category} className={`px-4 py-3 flex items-center justify-between ${i < categoryTotals.length - 1 ? "border-b border-stone-100" : ""}`}>
                  <span className="text-stone-700 text-sm font-medium">{ct.category}</span>
                  <span className="text-stone-900 font-bold">{ct.total_pieces.toLocaleString()}개</span>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-stone-500 text-xs font-semibold tracking-wider">매장 발주 내역</h2>
            {loading ? (
              <div className="text-center text-stone-400 py-10 text-sm">불러오는 중...</div>
            ) : orders.length === 0 ? (
              <div className="text-center text-stone-400 py-10 text-sm">이날 매장 발주가 없습니다</div>
            ) : (
              orders.map((order) => (
                <div key={order.order_id} className="bg-white rounded-xl border border-stone-200 p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <span className="text-stone-900 font-bold text-sm">{order.store_name}</span>
                      <span className="text-stone-400 text-xs ml-2">
                        {new Date(order.submitted_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-md font-medium ${STATUS_STYLE[order.status] || "bg-stone-100 text-stone-500"}`}>
                      {STATUS_LABEL[order.status] || order.status}
                    </span>
                  </div>

                  <div className="mb-3 border border-stone-100 rounded-lg overflow-hidden">
                    {(() => {
                      const catMap = new Map<string, OrderItem[]>();
                      for (const it of order.items) {
                        const c = it.category || "기타";
                        if (!catMap.has(c)) catMap.set(c, []);
                        catMap.get(c)!.push(it);
                      }
                      const cats = CATEGORY_ORDER
                        .filter(c => catMap.has(c))
                        .concat([...catMap.keys()].filter(c => !CATEGORY_ORDER.includes(c)));
                      return cats.map((cat, ci) => (
                        <div key={cat}>
                          <div className={`flex items-center px-3 py-2 bg-stone-50 border-b border-stone-100 ${ci > 0 ? "border-t border-stone-200" : ""}`}>
                            <span className="text-stone-600 text-xs font-bold tracking-wider">{cat}</span>
                            <span className="ml-auto text-stone-500 text-xs font-semibold">
                              {catMap.get(cat)!.reduce((s, i) => s + i.quantity * i.pieces_per_unit, 0).toLocaleString()}개
                            </span>
                          </div>
                          {catMap.get(cat)!.map((item) => {
                            const pieces = item.quantity * item.pieces_per_unit;
                            return (
                              <div key={item.product_name} className="flex items-center gap-3 px-3 py-2.5 border-b border-stone-50 last:border-0">
                                <span className="flex-1 text-stone-700 text-sm leading-tight">{item.product_name}</span>
                                <span className="bg-stone-100 border border-stone-200 rounded px-2 py-0.5 text-stone-600 text-xs font-medium flex-shrink-0">{item.quantity}세트</span>
                                <span className="text-stone-900 font-semibold text-sm w-14 text-right flex-shrink-0">{pieces.toLocaleString()}개</span>
                              </div>
                            );
                          })}
                        </div>
                      ));
                    })()}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-stone-100">
                    {["confirmed", "producing", "done"].map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(order.order_id, s)}
                        disabled={order.status === s}
                        className={`flex-1 text-xs py-2 rounded-lg transition-colors font-medium ${
                          order.status === s
                            ? "bg-emerald-700 text-white"
                            : "bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-200"
                        }`}
                      >
                        {STATUS_LABEL[s]}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {lastUpdated && (
            <p className="text-center text-stone-300 text-xs pt-2">
              {lastUpdated.toLocaleTimeString("ko-KR")} 기준 · 30초 자동갱신
            </p>
          )}
        </div>
      )}

      {/* ===================== 통계 분석 탭 ===================== */}
      {mainTab === "stats" && <StatsTab />}
    </div>
  );
}
