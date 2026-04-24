"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
};

type Store = {
  id: string;
  name: string;
  slug: string;
  order_deadline: string;
  contact_name: string;
};

type OrderItem = {
  product_id: string;
  product_name: string;
  quantity: number;
};

type TodayOrder = {
  id: string;
  customer_name: string;
  status: string;
  created_at: string;
  items: { product_name: string; quantity: number }[];
};

const CATEGORY_ORDER = ["쑥인절미", "약밥", "무설탕", "개떡", "찹쌀떡", "찰떡", "설기", "현미", "음료", "답례떡"];

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

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [tab, setTab] = useState<"order" | "history">("order");
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [senderName, setSenderName] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [submittedItems, setSubmittedItems] = useState<OrderItem[]>([]);
  const [todayOrders, setTodayOrders] = useState<TodayOrder[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    async function load() {
      const [{ data: storeData }, { data: productData }] = await Promise.all([
        supabase.from("stores").select("*").eq("slug", slug).single(),
        supabase.from("products").select("*").eq("is_active", true).order("sort_order"),
      ]);
      if (storeData) {
        setStore(storeData);
        if (storeData.contact_name) setSenderName(storeData.contact_name);
      }
      if (productData) setProducts(productData);
    }
    load();
  }, [slug]);

  const loadHistory = useCallback(async () => {
    if (!store) return;
    setHistoryLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data } = await supabase
      .from("orders")
      .select("id, customer_name, status, created_at, order_items(product_name, quantity)")
      .eq("store_id", store.id)
      .eq("order_date", today)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false });

    setTodayOrders(
      (data || []).map((o: any) => ({
        id: o.id,
        customer_name: o.customer_name,
        status: o.status,
        created_at: o.created_at,
        items: o.order_items || [],
      }))
    );
    setHistoryLoading(false);
  }, [store]);

  useEffect(() => {
    if (tab === "history") loadHistory();
  }, [tab, loadHistory]);

  const grouped = CATEGORY_ORDER.reduce<Record<string, Product[]>>((acc, cat) => {
    const items = products.filter((p) => p.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  function setQty(productId: string, value: number) {
    setQuantities((prev) => ({ ...prev, [productId]: Math.max(0, value) }));
  }

  const items: OrderItem[] = products
    .filter((p) => (quantities[p.id] || 0) > 0)
    .map((p) => ({ product_id: p.id, product_name: p.name, quantity: quantities[p.id] }));

  function isBeforeDeadline(): boolean {
    if (!store?.order_deadline) return true;
    const now = new Date();
    const [h, m] = store.order_deadline.slice(0, 5).split(":").map(Number);
    const deadline = new Date();
    deadline.setHours(h, m, 0, 0);
    return now < deadline;
  }

  async function handleSubmit() {
    if (!store) return;
    if (!senderName.trim()) { setError("이름을 입력해주세요"); return; }
    if (items.length === 0) { setError("수량을 1개 이상 입력해주세요"); return; }

    setSubmitting(true);
    setError("");

    try {
      if (orderId) {
        await supabase.from("order_items").delete().eq("order_id", orderId);
        const { error: itemErr } = await supabase.from("order_items").insert(
          items.map((item) => ({ order_id: orderId, ...item, unit_price: 0 }))
        );
        if (itemErr) throw itemErr;
      } else {
        const { data: order, error: orderErr } = await supabase
          .from("orders")
          .insert({
            source: "store",
            store_id: store.id,
            customer_name: senderName,
            order_date: new Date().toISOString().slice(0, 10),
            status: "pending",
          })
          .select()
          .single();

        if (orderErr || !order) throw orderErr;

        const { error: itemErr } = await supabase.from("order_items").insert(
          items.map((item) => ({ order_id: order.id, ...item, unit_price: 0 }))
        );
        if (itemErr) throw itemErr;
        setOrderId(order.id);
      }

      setSubmittedItems([...items]);
      setSubmitted(true);
    } catch {
      setError("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  function handleEdit() {
    setSubmitted(false);
  }

  function handleReset() {
    setSubmitted(false);
    setQuantities({});
    setSenderName("");
    setOrderId(null);
    setSubmittedItems([]);
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3">
        <h1 className="text-stone-900 font-bold text-base">{store?.name || "..."} 발주</h1>
        <p className="text-stone-400 text-xs">마감: {store?.order_deadline?.slice(0, 5) || "14:00"} 이전</p>
      </div>

      {/* 상단 탭 */}
      <div className="bg-white border-b border-stone-100 flex">
        {([["order", "발주 입력"], ["history", "오늘 내역"]] as ["order" | "history", string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 text-sm font-medium py-2.5 border-b-2 transition-colors ${
              tab === key ? "border-emerald-700 text-emerald-700" : "border-transparent text-stone-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ===== 발주 입력 탭 ===== */}
      {tab === "order" && (
        <>
          {submitted ? (
            <div className="flex flex-col items-center justify-center p-6 text-center pt-16">
              <div className="text-5xl mb-4">✅</div>
              <h2 className="text-xl font-bold text-stone-900 mb-2">
                {orderId ? "발주 수정 완료!" : "발주 완료!"}
              </h2>
              <p className="text-stone-400 text-sm mb-2">{store?.name} · {senderName}</p>
              <p className="text-stone-400 text-sm mb-8">총 {submittedItems.length}개 품목이 전송됐습니다</p>
              <ul className="text-left w-full max-w-xs space-y-1 mb-8">
                {submittedItems.map((item) => (
                  <li key={item.product_id} className="flex justify-between text-sm">
                    <span className="text-stone-600">{item.product_name}</span>
                    <span className="text-stone-900 font-semibold">{item.quantity}개</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 w-full max-w-xs">
                {isBeforeDeadline() ? (
                  <button
                    onClick={handleEdit}
                    className="w-full bg-emerald-700 text-white font-semibold py-3 rounded-2xl text-sm"
                  >
                    수정하기
                  </button>
                ) : (
                  <div className="w-full bg-stone-100 text-stone-400 font-semibold py-3 rounded-2xl text-sm text-center">
                    마감됨 — 수정 불가 ({store?.order_deadline?.slice(0, 5)} 이후)
                  </div>
                )}
                <button onClick={handleReset} className="text-stone-400 text-sm py-2">
                  새로 입력하기
                </button>
              </div>
            </div>
          ) : (
            /* pb-36: 발주 전송 버튼(~60px) + 글로벌 네비(64px) 여유 */
            <div className="pb-36">
              {orderId && (
                <div className="mx-4 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs font-medium">
                  수정 모드 — 저장하면 기존 발주가 교체됩니다
                </div>
              )}

              <div className="px-4 pt-4 pb-2">
                <input
                  type="text"
                  placeholder="이름 입력 (예: 홍길동 점장)"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full bg-white border border-stone-200 text-stone-900 placeholder-stone-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="px-4 space-y-6 pt-2">
                {Object.entries(grouped).map(([category, catItems]) => (
                  <div key={category}>
                    <h3 className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-2">{category}</h3>
                    <div className="space-y-2">
                      {catItems.map((product) => (
                        <div key={product.id} className="bg-white rounded-xl px-4 py-3 border border-stone-100">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-stone-900 text-sm flex-1">{product.name}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setQty(product.id, (quantities[product.id] || 0) - 1)}
                                className="w-7 h-7 rounded-full bg-stone-100 text-stone-600 font-bold flex items-center justify-center"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={0}
                                value={quantities[product.id] || ""}
                                onChange={(e) => setQty(product.id, parseInt(e.target.value) || 0)}
                                placeholder="0"
                                className="w-12 text-center bg-stone-50 text-stone-900 rounded-lg border border-stone-200 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                              />
                              <button
                                onClick={() => setQty(product.id, (quantities[product.id] || 0) + 1)}
                                className="w-7 h-7 rounded-full bg-stone-100 text-stone-600 font-bold flex items-center justify-center"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            {[5, 10, 20, 30].map((n) => (
                              <button
                                key={n}
                                onClick={() => setQty(product.id, (quantities[product.id] || 0) + n)}
                                className="flex-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg py-1 transition-colors"
                              >
                                +{n}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* 발주 전송 버튼 — 글로벌 네비(bottom-0~16) 바로 위 */}
              <div className="fixed bottom-16 left-0 right-0 z-[55] bg-white border-t border-stone-200 px-4 pt-3 pb-3 space-y-2">
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                {!isBeforeDeadline() ? (
                  <div className="w-full bg-stone-100 text-stone-400 font-bold py-3.5 rounded-2xl text-center text-sm">
                    마감됨 ({store?.order_deadline?.slice(0, 5)} 이후 발주 불가)
                  </div>
                ) : (
                  <>
                    {items.length > 0 && (
                      <p className="text-stone-400 text-xs text-center">
                        {items.length}개 품목 · 총 {items.reduce((s, i) => s + i.quantity, 0)}개
                      </p>
                    )}
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-100 disabled:text-stone-400 text-white font-bold py-3.5 rounded-2xl transition-colors"
                    >
                      {submitting ? "전송 중..." : orderId ? "수정 저장" : "발주 전송"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ===== 오늘 내역 탭 ===== */}
      {tab === "history" && (
        <div className="px-4 pt-4 pb-20 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <p className="text-stone-500 text-xs font-semibold">오늘 발주 내역</p>
            <button onClick={loadHistory} className="text-emerald-700 text-xs font-medium">새로고침</button>
          </div>
          {historyLoading ? (
            <div className="text-center text-stone-400 py-12 text-sm">불러오는 중...</div>
          ) : todayOrders.length === 0 ? (
            <div className="text-center text-stone-400 py-12 text-sm">오늘 발주 내역이 없습니다</div>
          ) : (
            todayOrders.map((order) => (
              <div key={order.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between border-b border-stone-100">
                  <div>
                    <span className="text-stone-900 font-bold text-sm">{order.customer_name}</span>
                    <span className="text-stone-400 text-xs ml-2">
                      {new Date(order.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-md font-medium ${STATUS_STYLE[order.status] || "bg-stone-100 text-stone-500"}`}>
                    {STATUS_LABEL[order.status] || order.status}
                  </span>
                </div>
                <div className="px-4 py-2">
                  {order.items.map((item) => (
                    <div key={item.product_name} className="flex justify-between py-1.5 border-b border-stone-50 last:border-0">
                      <span className="text-stone-600 text-sm">{item.product_name}</span>
                      <span className="text-stone-900 font-semibold text-sm">{item.quantity}개</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
