"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";

// ─── Types ────────────────────────────────────────────────────────────
type Store = {
  id: string;
  name: string;
  slug: string;
  order_deadline: string;
  contact_name: string;
};

type Product = {
  id: string;
  name: string;
  category: string;
  unit: string;
  is_active: boolean;
  sort_order: number;
  pieces_per_unit: number;
};

const EMPTY_STORE: Omit<Store, "id"> = { name: "", slug: "", order_deadline: "14:00", contact_name: "" };
const CATEGORIES = ["쑥인절미", "약밥", "무설탕", "개떡", "찹쌀떡", "찰떡", "설기", "현미", "음료", "답례떡", "기타"];

// ─── Main ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<"stores" | "products">("stores");

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3">
        <h1 className="text-stone-900 font-bold text-base">설정</h1>
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-stone-100 flex">
        {([["stores", "매장 설정"], ["products", "상품 관리"]] as ["stores" | "products", string][]).map(([key, label]) => (
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

      {tab === "stores" ? <StoresTab /> : <ProductsTab />}
    </div>
  );
}

// ─── 매장 설정 탭 ─────────────────────────────────────────────────────
function StoresTab() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Omit<Store, "id">>(EMPTY_STORE);
  const [adding, setAdding] = useState(false);
  const [newStore, setNewStore] = useState<Omit<Store, "id">>(EMPTY_STORE);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  async function loadStores() {
    setLoading(true);
    const { data } = await supabase.from("stores").select("*").order("name");
    setStores(data || []);
    setLoading(false);
  }

  useEffect(() => { loadStores(); }, []);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 2000); }

  function startEdit(store: Store) {
    setEditingId(store.id);
    setEditValues({ name: store.name, slug: store.slug, order_deadline: store.order_deadline || "14:00", contact_name: store.contact_name || "" });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    await supabase.from("stores").update(editValues).eq("id", editingId);
    setEditingId(null);
    flash("저장됐습니다");
    setSaving(false);
    loadStores();
  }

  async function saveNew() {
    if (!newStore.name.trim() || !newStore.slug.trim()) { flash("매장명과 슬러그를 입력해주세요"); return; }
    setSaving(true);
    await supabase.from("stores").insert(newStore);
    setAdding(false);
    setNewStore(EMPTY_STORE);
    flash("매장이 추가됐습니다");
    setSaving(false);
    loadStores();
  }

  function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
    return (
      <div>
        <label className="text-stone-500 text-xs font-medium block mb-1">{label}</label>
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          className="w-full bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-500" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 space-y-4">
      {msg && <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm text-center font-medium">{msg}</div>}

      <div className="flex items-center justify-between">
        <p className="text-stone-500 text-xs font-semibold">매장 목록</p>
        <button onClick={() => { setAdding(true); setEditingId(null); }}
          className="text-xs bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium">
          + 매장 추가
        </button>
      </div>

      {/* 추가 폼 */}
      {adding && (
        <div className="bg-white rounded-xl border border-emerald-200 p-4 space-y-3">
          <p className="text-emerald-700 font-bold text-sm">새 매장</p>
          <Field label="매장명" value={newStore.name} onChange={(v) => setNewStore(p => ({ ...p, name: v }))} placeholder="예: 강남점" />
          <Field label="슬러그 (URL 주소)" value={newStore.slug} onChange={(v) => setNewStore(p => ({ ...p, slug: v }))} placeholder="예: gangnam" />
          <Field label="마감시간" value={newStore.order_deadline} onChange={(v) => setNewStore(p => ({ ...p, order_deadline: v }))} type="time" />
          <Field label="담당자 이름" value={newStore.contact_name} onChange={(v) => setNewStore(p => ({ ...p, contact_name: v }))} placeholder="예: 홍길동 점장" />
          <div className="flex gap-2 pt-1">
            <button onClick={saveNew} disabled={saving} className="flex-1 bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-xl">
              {saving ? "저장 중..." : "추가"}
            </button>
            <button onClick={() => { setAdding(false); setNewStore(EMPTY_STORE); }} className="flex-1 bg-stone-100 text-stone-600 text-sm font-medium py-2.5 rounded-xl">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 매장 카드 */}
      {loading ? (
        <div className="text-center text-stone-400 py-10 text-sm">불러오는 중...</div>
      ) : stores.map((store) => (
        <div key={store.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          {editingId === store.id ? (
            <div className="p-4 space-y-3">
              <p className="text-stone-700 font-bold text-sm">수정 중 — {store.name}</p>
              <Field label="매장명" value={editValues.name} onChange={(v) => setEditValues(p => ({ ...p, name: v }))} />
              <Field label="슬러그 (URL)" value={editValues.slug} onChange={(v) => setEditValues(p => ({ ...p, slug: v }))} />
              <Field label="마감시간" value={editValues.order_deadline} onChange={(v) => setEditValues(p => ({ ...p, order_deadline: v }))} type="time" />
              <Field label="담당자 이름" value={editValues.contact_name} onChange={(v) => setEditValues(p => ({ ...p, contact_name: v }))} placeholder="예: 홍길동 점장" />
              <div className="flex gap-2 pt-1">
                <button onClick={saveEdit} disabled={saving} className="flex-1 bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-xl">
                  {saving ? "저장 중..." : "저장"}
                </button>
                <button onClick={() => setEditingId(null)} className="flex-1 bg-stone-100 text-stone-600 text-sm font-medium py-2.5 rounded-xl">
                  취소
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-stone-900 font-bold text-sm">{store.name}</p>
                  <p className="text-stone-400 text-xs mt-0.5">/store/{store.slug}</p>
                </div>
                <button onClick={() => startEdit(store)}
                  className="text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                  수정
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-stone-50 rounded-lg px-3 py-2">
                  <p className="text-stone-400 text-[10px] font-medium">마감시간</p>
                  <p className="text-stone-800 text-sm font-semibold mt-0.5">{store.order_deadline?.slice(0, 5) || "미설정"}</p>
                </div>
                <div className="bg-stone-50 rounded-lg px-3 py-2">
                  <p className="text-stone-400 text-[10px] font-medium">담당자</p>
                  <p className="text-stone-800 text-sm font-semibold mt-0.5">{store.contact_name || "미설정"}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── 상품 관리 탭 ─────────────────────────────────────────────────────
function ProductsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", category: "쑥인절미", unit: "세트", pieces_per_unit: 1 });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase.from("products").select("*").order("category").order("name");
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
      await supabase.from("products").update({ name: form.name, category: form.category, unit: form.unit, pieces_per_unit: form.pieces_per_unit }).eq("id", editTarget.id);
    } else {
      await supabase.from("products").insert({ ...form, is_active: true, sort_order: products.length * 10 });
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
    <div>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between">
        <p className="text-stone-500 text-xs font-semibold">총 {products.length}개 상품</p>
        <button onClick={openNew} className="bg-emerald-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg">
          + 추가
        </button>
      </div>

      <div className="px-4 space-y-5 pb-4">
        {loading ? (
          <div className="text-center text-stone-400 py-16 text-sm">불러오는 중...</div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h3 className="text-stone-400 text-xs font-semibold tracking-widest mb-2 px-1">{cat}</h3>
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
                {items.map((p, i) => (
                  <div key={p.id} className={`px-4 py-3 flex items-center gap-3 ${i > 0 ? "border-t border-stone-100" : ""} ${!p.is_active ? "opacity-40" : ""}`}>
                    <div className="flex-1 min-w-0">
                      <p className="text-stone-900 text-sm font-medium truncate">{p.name}</p>
                      <p className="text-stone-400 text-xs mt-0.5">세트당 {p.pieces_per_unit ?? 1}개</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button onClick={() => toggleActive(p)}
                        className={`text-xs px-2.5 py-1 rounded-md font-medium ${p.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-stone-100 text-stone-400 border border-stone-200"}`}>
                        {p.is_active ? "활성" : "비활성"}
                      </button>
                      <button onClick={() => openEdit(p)} className="text-xs bg-stone-100 text-stone-600 px-2.5 py-1 rounded-md border border-stone-200">수정</button>
                      <button onClick={() => deleteProduct(p.id)} className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-md border border-red-200">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 상품 추가/수정 모달 */}
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
                <input type="text" placeholder="예: 쑥인절미 10구" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-stone-50 text-stone-900 placeholder-stone-300 rounded-lg px-4 py-3 text-sm outline-none border border-stone-200 focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="text-stone-500 text-xs font-medium mb-1 block">카테고리</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-stone-50 text-stone-900 rounded-lg px-4 py-3 text-sm outline-none border border-stone-200 focus:ring-2 focus:ring-emerald-500">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-stone-500 text-xs font-medium mb-1 block">세트당 개수</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setForm({ ...form, pieces_per_unit: Math.max(1, form.pieces_per_unit - 1) })}
                    className="w-10 h-10 rounded-lg bg-stone-100 text-stone-600 font-bold border border-stone-200 text-lg flex items-center justify-center">-</button>
                  <div className="flex-1 text-center">
                    <span className="text-2xl font-bold text-stone-900">{form.pieces_per_unit}</span>
                    <span className="text-stone-400 text-sm ml-1">개</span>
                  </div>
                  <button type="button" onClick={() => setForm({ ...form, pieces_per_unit: form.pieces_per_unit + 1 })}
                    className="w-10 h-10 rounded-lg bg-stone-100 text-stone-600 font-bold border border-stone-200 text-lg flex items-center justify-center">+</button>
                </div>
                <p className="text-stone-300 text-xs text-center mt-1">예) 10구 세트 → 10 입력 · 발주 3세트 = 생산 30개</p>
              </div>
            </div>
            <button onClick={save} disabled={saving || !form.name.trim()}
              className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold py-4 rounded-xl transition-colors">
              {saving ? "저장 중..." : "저장"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
