"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type StoreOrder = {
  store_id: string;
  store_name: string;
  order_id: string;
  status: string;
  submitted_at: string;
  items: { product_name: string; quantity: number }[];
};

const STATUS_LABEL: Record<string, string> = {
  pending: "접수",
  confirmed: "확인됨",
  producing: "생산중",
  done: "완료",
  cancelled: "취소",
};

const STATUS_COLOR: Record<string, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-blue-500",
  producing: "bg-orange-500",
  done: "bg-green-500",
  cancelled: "bg-gray-500",
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        status,
        created_at,
        store_id,
        stores(name),
        order_items(product_name, quantity)
      `)
      .eq("order_date", selectedDate)
      .eq("source", "store")
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const result: StoreOrder[] = (data || []).map((row: any) => ({
      store_id: row.store_id,
      store_name: row.stores?.name || "알 수 없음",
      order_id: row.id,
      status: row.status,
      submitted_at: row.created_at,
      items: row.order_items || [],
    }));

    setOrders(result);
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

  return (
    <div className="min-h-screen bg-gray-950 pb-10">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-lg">사장님 대시보드</h1>
            <p className="text-gray-400 text-xs">
              매장 {storeCount}곳 · 총 {totalItems.toLocaleString()}개
            </p>
          </div>
          <button onClick={load} className="text-indigo-400 text-sm font-medium">
            새로고침
          </button>
        </div>

        {/* 날짜 선택 */}
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() - 1);
              setSelectedDate(d.toISOString().slice(0, 10));
            }}
            className="text-gray-400 px-2 py-1 bg-gray-800 rounded-lg text-sm"
          >
            ←
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 bg-gray-800 text-white text-sm rounded-lg px-3 py-1 outline-none"
          />
          <button
            onClick={() => {
              const d = new Date(selectedDate);
              d.setDate(d.getDate() + 1);
              setSelectedDate(d.toISOString().slice(0, 10));
            }}
            className="text-gray-400 px-2 py-1 bg-gray-800 rounded-lg text-sm"
          >
            →
          </button>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="px-4 pt-4 grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gray-800 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{orders.length}</p>
          <p className="text-gray-400 text-xs mt-1">발주 건수</p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-indigo-400">{storeCount}</p>
          <p className="text-gray-400 text-xs mt-1">참여 매장</p>
        </div>
        <div className="bg-gray-800 rounded-2xl p-3 text-center">
          <p className="text-2xl font-bold text-green-400">{totalItems.toLocaleString()}</p>
          <p className="text-gray-400 text-xs mt-1">총 수량</p>
        </div>
      </div>

      {/* 발주 목록 */}
      <div className="px-4 space-y-3">
        {loading ? (
          <div className="text-center text-gray-500 py-16">로딩 중...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-gray-500 py-16">
            <p className="text-4xl mb-3">📋</p>
            <p>{selectedDate} 매장 발주 없음</p>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.order_id} className="bg-gray-800 rounded-2xl p-4">
              {/* 매장명 + 상태 */}
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-white font-bold">{order.store_name}</span>
                  <span className="text-gray-500 text-xs ml-2">
                    {new Date(order.submitted_at).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <span className={`text-xs text-white px-2 py-1 rounded-full ${STATUS_COLOR[order.status] || "bg-gray-600"}`}>
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              </div>

              {/* 품목 목록 */}
              <div className="space-y-1 mb-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-gray-300">{item.product_name}</span>
                    <span className="text-white font-semibold">{item.quantity}개</span>
                  </div>
                ))}
              </div>

              {/* 상태 변경 버튼 */}
              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-700">
                {["confirmed", "producing", "done"].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(order.order_id, s)}
                    disabled={order.status === s}
                    className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${
                      order.status === s
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
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
        <p className="text-center text-gray-600 text-xs pt-6">
          {lastUpdated.toLocaleTimeString("ko-KR")} 기준 · 30초 자동갱신
        </p>
      )}
    </div>
  );
}
