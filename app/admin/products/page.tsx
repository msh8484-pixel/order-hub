"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  is_active: boolean;
  sort_order: number;
  pieces_per_unit: number;
};

const CATEGORIES = ["쑥인절미", "약밥", "무설탕", "개떡", "찹쌀떡", "찰떡", "설기", "현미", "음료", "답례떡", "기타"];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", category: "쑥인절미", unit: "세트", pieces_per_unit: 1 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("category")
      .order("name");
    if (data) setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditTarget(null);
    setForm({ name: "", category: "쑥인절미", unit: "세트", pieces_per_unit: 1 });
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditTarget(p);
    setForm({ name: p.name, category: p.category, unit: p.unit, pieces_per_unit: p.pieces_per_unit ?? 1 });
    setShowForm(true);
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    if (editTarget) {
      await supabase.from("products").update({
        name: form.name,
        category: form.category,
        unit: form.unit,
        pieces_per_unit: form.pieces_per_unit,
      }).eq("id", editTarget.id);
    } else {
      await supabase.from("products").insert({
        name: form.name,
        category: form.category,
        unit: form.unit,
        pieces_per_unit: form.pieces_per_unit,
        is_active: true,
        sort_order: products.length * 10,
      });
    }
    setSaving(false);
    setShowForm(false);
    load();
  }

  async function toggleActive(p: Product) {
    await supabase.from("products").update({ is_active: !p.is_active }).eq("id", p.id);
    load();
  }

  async function deleteProduct(id: string) {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  }

  const grouped = CATEGORIES.reduce<Record<string, Product[]>>((acc, cat) => {
    const items = products.filter((p) => p.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      <div className="sticky top-0 md:top-16 z-10 bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-stone-900 font-bold text-base">메뉴 관리</h1>
          <p className="text-stone-400 text-xs">총 {products.length}개 상품</p>
        </div>
        <button
          onClick={openNew}
          className="bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          + 추가
        </button>
      </div>

      <div className="px-4 py-4 space-y-5">
        {loading ? (
          <div className="text-center text-stone-400 py-16 text-sm">불러오는 중...</div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-stone-400 text-xs font-semibold tracking-widest mb-2 px-1">{cat}</h3>
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                {items.map((p, i) => (
                  <div
                    key={p.id}
                    className={`px-4 py-3 flex items-center gap-3 ${i > 0 ? "border-t border-stone-100" : ""} ${!p.is_active ? "opacity-40" : ""}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-stone-900 text-sm font-medium truncate">{p.name}</p>
                      <p className="text-stone-400 text-xs mt-0.5">
                        세트당 {p.pieces_per_unit ?? 1}개
                        {p.unit && p.unit !== "세트" ? ` · 단위: ${p.unit}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                          p.is_active
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-stone-100 text-stone-400 border border-stone-200"
                        }`}
                      >
                        {p.is_active ? "활성" : "비활성"}
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-md border border-stone-200"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-md border border-red-200"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-6 space-y-4 border-t border-stone-200">
            <div className="flex items-center justify-between">
              <h2 className="text-stone-900 font-bold text-base">{editTarget ? "상품 수정" : "상품 추가"}</h2>
              <button onClick={() => setShowForm(false)} className="text-stone-400 text-lg leading-none">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-stone-500 text-xs font-medium mb-1 block">상품명</label>
                <input
                  type="text"
                  placeholder="예: 쑥인절미 10구"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-stone-50 text-stone-900 placeholder-stone-300 rounded-lg px-4 py-3 text-sm outline-none border border-stone-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-stone-500 text-xs font-medium mb-1 block">카테고리</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-stone-50 text-stone-900 rounded-lg px-4 py-3 text-sm outline-none border border-stone-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-stone-500 text-xs font-medium mb-1 block">세트당 개수 (생산량 계산에 사용)</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, pieces_per_unit: Math.max(1, form.pieces_per_unit - 1) })}
                    className="w-10 h-10 rounded-lg bg-stone-100 text-stone-600 font-bold border border-stone-200 text-lg flex items-center justify-center"
                  >
                    -
                  </button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-stone-900">{form.pieces_per_unit}</span>
                    <span className="text-stone-400 text-sm ml-1">개</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, pieces_per_unit: form.pieces_per_unit + 1 })}
                    className="w-10 h-10 rounded-lg bg-stone-100 text-stone-600 font-bold border border-stone-200 text-lg flex items-center justify-center"
                  >
                    +
                  </button>
                </div>
                <p className="text-stone-300 text-xs text-center mt-1">
                  예) 10구 세트 → 10 입력 · 발주 3세트 = 생산 30개
                </p>
              </div>
            </div>

            <button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold py-4 rounded-xl transition-colors"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
