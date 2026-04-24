"use client";

import { useState, useEffect } from "react";
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
};

type OrderItem = {
  product_id: string;
  product_name: string;
  quantity: number;
};

const CATEGORY_ORDER = ["쑥인절미", "약밥", "무설탕", "개떡", "찹쌀떡", "찰떡", "설기", "현미", "음료", "답례떡"];

export default function StorePage() {
  const { slug } = useParams<{ slug: string }>();
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [senderName, setSenderName] = useState("");

  useEffect(() => {
    async function load() {
      const [{ data: storeData }, { data: productData }] = await Promise.all([
        supabase.from("stores").select("*").eq("slug", slug).single(),
        supabase.from("products").select("*").eq("is_active", true).order("sort_order"),
      ]);
      if (storeData) setStore(storeData);
      if (productData) setProducts(productData);
    }
    load();
  }, [slug]);

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

  async function handleSubmit() {
    if (!store) return;
    if (!senderName.trim()) { setError("이름을 입력해주세요"); return; }
    if (items.length === 0) { setError("수량을 1개 이상 입력해주세요"); return; }

    setSubmitting(true);
    setError("");

    try {
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

      setSubmitted(true);
    } catch {
      setError("저장 중 오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-stone-900 mb-2">발주 완료!</h2>
        <p className="text-stone-400 text-sm mb-2">{store?.name} · {senderName}</p>
        <p className="text-stone-400 text-sm mb-8">총 {items.length}개 품목이 전송됐습니다</p>
        <ul className="text-left w-full max-w-xs space-y-1 mb-8">
          {items.map((item) => (
            <li key={item.product_id} className="flex justify-between text-sm">
              <span className="text-stone-600">{item.product_name}</span>
              <span className="text-stone-900 font-semibold">{item.quantity}개</span>
            </li>
          ))}
        </ul>
        <button
          onClick={() => { setSubmitted(false); setQuantities({}); setSenderName(""); }}
          className="text-emerald-700 text-sm"
        >
          다시 입력하기
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-32">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-stone-50 border-b border-stone-200 px-4 py-3">
        <h1 className="text-stone-900 font-bold text-base">{store?.name || "..."} 발주 입력</h1>
        <p className="text-stone-400 text-xs">마감: {store?.order_deadline?.slice(0, 5) || "14:00"} 이전</p>
      </div>

      {/* 이름 입력 */}
      <div className="px-4 pt-4 pb-2">
        <input
          type="text"
          placeholder="이름 입력 (예: 홍길동 점장)"
          value={senderName}
          onChange={(e) => setSenderName(e.target.value)}
          className="w-full bg-stone-50 text-stone-900 placeholder-stone-300 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>

      {/* 상품 목록 */}
      <div className="px-4 space-y-6 pt-2">
        {Object.entries(grouped).map(([category, items]) => (
          <div key={category}>
            <h3 className="text-stone-400 text-xs font-semibold uppercase tracking-wider mb-2">{category}</h3>
            <div className="space-y-2">
              {items.map((product) => (
                <div key={product.id} className="bg-white rounded-xl px-4 py-3">
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

      {/* 하단 고정 버튼 */}
      <div className="fixed bottom-0 left-0 right-0 bg-stone-50 border-t border-stone-200 p-4 space-y-2">
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        {items.length > 0 && (
          <p className="text-stone-400 text-xs text-center">
            {items.length}개 품목 · 총 {items.reduce((s, i) => s + i.quantity, 0)}개
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-100 text-white font-bold py-4 rounded-2xl transition-colors"
        >
          {submitting ? "전송 중..." : "발주 전송"}
        </button>
      </div>
    </div>
  );
}
