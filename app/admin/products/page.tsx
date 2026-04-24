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
};

const CATEGORIES = ["쑥인절미", "약밥", "무설탕", "개떡", "찹쌀떡", "찰떡", "설기", "현미", "음료", "답례떡", "기타"];

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", category: "쑥인절미", unit: "개", sort_order: 0 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .order("sort_order");
    if (data) setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function openNew() {
    setEditTarget(null);
    setForm({ name: "", category: "쑥인절미", unit: "개", sort_order: (products.length + 1) * 10 });
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditTarget(p);
    setForm({ name: p.name, category: p.category, unit: p.unit, sort_order: p.sort_order });
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
        sort_order: form.sort_order,
      }).eq("id", editTarget.id);
    } else {
      await supabase.from("products").insert({
        name: form.name,
        category: form.category,
        unit: form.unit,
        sort_order: form.sort_order,
        is_active: true,
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
    <div className="min-h-screen bg-gray-950 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-lg">메뉴 관리</h1>
          <p className="text-gray-400 text-xs">총 {products.length}개 상품</p>
        </div>
        <button
          onClick={openNew}
          className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold px-4 py-2 rounded-xl"
        >
          + 추가
        </button>
      </div>

      {/* 상품 목록 */}
      <div className="px-4 py-4 space-y-4">
        {loading ? (
          <div className="text-center text-gray-500 py-16">로딩 중...</div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-gray-400 text-xs font-semibold uppercase tracking-wider mb-2">{cat}</h3>
              <div className="space-y-2">
                {items.map((p) => (
                  <div key={p.id} className={`bg-gray-800 rounded-xl px-4 py-3 flex items-center gap-3 ${!p.is_active ? "opacity-50" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{p.name}</p>
                      <p className="text-gray-500 text-xs">단위: {p.unit} · 순서: {p.sort_order}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`text-xs px-2 py-1 rounded-lg ${p.is_active ? "bg-green-900 text-green-400" : "bg-gray-700 text-gray-500"}`}
                      >
                        {p.is_active ? "활성" : "비활성"}
                      </button>
                      <button
                        onClick={() => openEdit(p)}
                        className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded-lg"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => deleteProduct(p.id)}
                        className="text-xs bg-red-900 text-red-400 px-2 py-1 rounded-lg"
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

      {/* 폼 모달 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end">
          <div className="bg-gray-900 w-full rounded-t-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-bold text-lg">{editTarget ? "상품 수정" : "상품 추가"}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 text-xl">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-gray-400 text-xs mb-1 block">상품명</label>
                <input
                  type="text"
                  placeholder="예: 쑥떡 쑥인절미 10개"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="text-gray-400 text-xs mb-1 block">카테고리</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-gray-400 text-xs mb-1 block">단위</label>
                  <input
                    type="text"
                    value={form.unit}
                    onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-gray-400 text-xs mb-1 block">정렬 순서</label>
                  <input
                    type="number"
                    value={form.sort_order}
                    onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={save}
              disabled={saving || !form.name.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white font-bold py-4 rounded-2xl transition-colors"
            >
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
