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

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border border-blue-200",
  producing: "bg-orange-50 text-orange-700 border border-orange-200",
  done: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  cancelled: "bg-stone-100 text-stone-500 border border-stone-200",
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

  function moveDate(days: number) {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().slice(0, 10));
  }

  const totalItems = orders.reduce((s, o) => s + o.items.reduce((ss, i) => ss + i.quantity, 0), 0);
  const storeCount = new Set(orders.map((o) => o.store_id)).size;

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-stone-900 font-bold text-base">사장님 대시보드</h1>
          <button onClick={load} className="text-emerald-700 text-sm font-medium">
            새로고침
          </button>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => moveDate(-1)}
            className="text-stone-600 px-3 py-2 bg-stone-100 rounded-lg text-sm border border-stone-200"
          >
            ←
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 bg-stone-50 text-stone-900 text-sm rounded-lg px-3 py-2 outline-none border border-stone-200 focus:border-emerald-500"
          />
          <button
            onClick={() => moveDate(1)}
            className="text-stone-600 px-3 py-2 bg-stone-100 rounded-lg text-sm border border-stone-200"
          >
            →
          </button>
        </div>
      </div>

      <div className="px-4 pt-4 grid grid-cols-3 gap-3 mb-4">
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
          <p className="text-stone-400 text-xs mt-1">총 수량</p>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {loading ? (
          <div className="text-center text-stone-400 py-16 text-sm">불러오는 중...</div>
        ) : orders.length === 0 ? (
          <div className="text-center text-stone-400 py-16 text-sm">
            {selectedDate} 매장 발주 없음
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.order_id} className="bg-white rounded-xl border border-stone-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <span className="text-stone-900 font-bold text-sm">{order.store_name}</span>
                  <span className="text-stone-400 text-xs ml-2">
                    {new Date(order.submitted_at).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md font-medium ${STATUS_STYLE[order.status] || "bg-stone-100 text-stone-500"}`}>
                  {STATUS_LABEL[order.status] || order.status}
                </span>
              </div>

              <div className="space-y-1 mb-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-stone-600">{item.product_name}</span>
                    <span className="text-stone-900 font-semibold">{item.quantity}개</span>
                  </div>
                ))}
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
        <p className="text-center text-stone-300 text-xs pt-6">
          {lastUpdated.toLocaleTimeString("ko-KR")} 기준 · 30초 자동갱신
        </p>
      )}
    </div>
  );
}
