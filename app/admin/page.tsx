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

type MaterialRow = {
  name: string;
  unit: string;        // g / kg / 개
  unit_price: number;  // 원/단위
  amount: number;      // 소요량(단위/개당)
};

type ProductCost = {
  product_id: string;
  materials: MaterialRow[];
  packaging_cost: number;
  labor_cost: number;
  overhead_cost: number;
  selling_price: number;
  monthly_fixed_cost: number;
};

const EMPTY_STORE: Omit<Store, "id"> = { name: "", slug: "", order_deadline: "14:00", contact_name: "" };
const CATEGORIES = ["쑥인절미", "약밥", "무설탕", "개떡", "찹쌀떡", "찰떡", "설기", "현미", "음료", "답례떡", "기타"];
const MATERIAL_UNITS = ["g", "kg", "개", "ml", "L"];

const EMPTY_MATERIAL: MaterialRow = { name: "", unit: "g", unit_price: 0, amount: 0 };
const EMPTY_COST = (product_id: string): ProductCost => ({
  product_id,
  materials: [{ ...EMPTY_MATERIAL }],
  packaging_cost: 0,
  labor_cost: 0,
  overhead_cost: 0,
  selling_price: 0,
  monthly_fixed_cost: 0,
});

// ─── Main ─────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [tab, setTab] = useState<"stores" | "products" | "costs">("stores");

  return (
    <div className="min-h-screen bg-stone-50 pb-20">
      {/* 헤더 */}
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3">
        <h1 className="text-stone-900 font-bold text-base">설정</h1>
      </div>

      {/* 탭 */}
      <div className="bg-white border-b border-stone-100 flex">
        {(
          [
            ["stores", "매장 설정"],
            ["products", "상품 관리"],
            ["costs", "원가 설정"],
          ] as ["stores" | "products" | "costs", string][]
        ).map(([key, label]) => (
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

      {tab === "stores" && <StoresTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "costs" && <CostsTab />}
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
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState("");

  const load = useCallback(async () => {
    const { data } = await supabase.from("products").select("*").order("category").order("name");
    if (data) setProducts(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const allCategories = [...CATEGORIES, ...customCategories.filter(c => !CATEGORIES.includes(c))];

  function openNew() {
    setEditTarget(null);
    setForm({ name: "", category: "쑥인절미", unit: "세트", pieces_per_unit: 1 });
    setAddingCat(false);
    setNewCatInput("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditTarget(p);
    setForm({ name: p.name, category: p.category, unit: p.unit, pieces_per_unit: p.pieces_per_unit ?? 1 });
    if (!allCategories.includes(p.category)) {
      setCustomCategories(prev => [...prev, p.category]);
    }
    setAddingCat(false);
    setNewCatInput("");
    setShowForm(true);
  }

  function confirmNewCat() {
    const cat = newCatInput.trim();
    if (!cat) return;
    if (!allCategories.includes(cat)) setCustomCategories(prev => [...prev, cat]);
    setForm(f => ({ ...f, category: cat }));
    setAddingCat(false);
    setNewCatInput("");
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
        <div className="fixed inset-0 z-[60] flex items-end bg-black/40" onClick={() => setShowForm(false)}>
          <div className="bg-white w-full rounded-t-2xl flex flex-col max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-stone-100 flex-shrink-0">
              <h2 className="text-stone-900 font-bold text-base">{editTarget ? "상품 수정" : "상품 추가"}</h2>
              <button onClick={() => setShowForm(false)} className="text-stone-400 text-xl leading-none w-8 h-8 flex items-center justify-center">✕</button>
            </div>

            {/* 내용 스크롤 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="text-stone-500 text-xs font-medium mb-1 block">상품명</label>
                <input type="text" placeholder="예: 쑥인절미 10구" value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-stone-50 text-stone-900 placeholder-stone-300 rounded-lg px-4 py-3 text-sm outline-none border border-stone-200 focus:ring-2 focus:ring-emerald-500" />
              </div>

              <div>
                <label className="text-stone-500 text-xs font-medium mb-2 block">카테고리</label>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map((c) => (
                    <button key={c} type="button" onClick={() => setForm({ ...form, category: c })}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        form.category === c ? "bg-emerald-700 text-white border-emerald-700" : "bg-stone-50 text-stone-600 border-stone-200"
                      }`}>
                      {c}
                    </button>
                  ))}
                  {addingCat ? (
                    <div className="flex items-center gap-1">
                      <input
                        autoFocus
                        type="text"
                        value={newCatInput}
                        onChange={(e) => setNewCatInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") confirmNewCat(); if (e.key === "Escape") setAddingCat(false); }}
                        placeholder="새 카테고리"
                        className="w-24 px-2 py-1.5 rounded-lg text-sm border border-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <button type="button" onClick={confirmNewCat} className="text-emerald-700 text-sm font-bold px-1">✓</button>
                      <button type="button" onClick={() => { setAddingCat(false); setNewCatInput(""); }} className="text-stone-400 text-sm px-1">✕</button>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setAddingCat(true)}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium border border-dashed border-stone-300 text-stone-400">
                      + 직접입력
                    </button>
                  )}
                </div>
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

            {/* 저장 버튼 고정 */}
            <div className="px-6 pb-8 pt-3 border-t border-stone-100 flex-shrink-0">
              <button onClick={save} disabled={saving || !form.name.trim()}
                className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold py-4 rounded-xl transition-colors">
                {saving ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── 원가 설정 탭 ─────────────────────────────────────────────────────
function CostsTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cost, setCost] = useState<ProductCost | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const loadProducts = useCallback(async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("name");
    setProducts(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { loadProducts(); }, [loadProducts]);

  function flash(m: string) { setMsg(m); setTimeout(() => setMsg(""), 2500); }

  async function openCost(product: Product) {
    setSelectedProduct(product);
    const { data } = await supabase
      .from("product_costs")
      .select("*")
      .eq("product_id", product.id)
      .single();

    if (data) {
      setCost({
        product_id: product.id,
        materials: Array.isArray(data.materials) && data.materials.length > 0
          ? data.materials
          : [{ ...EMPTY_MATERIAL }],
        packaging_cost: data.packaging_cost ?? 0,
        labor_cost: data.labor_cost ?? 0,
        overhead_cost: data.overhead_cost ?? 0,
        selling_price: data.selling_price ?? 0,
        monthly_fixed_cost: data.monthly_fixed_cost ?? 0,
      });
    } else {
      setCost(EMPTY_COST(product.id));
    }
  }

  function closeCost() {
    setSelectedProduct(null);
    setCost(null);
  }

  // 재료 행 업데이트
  function updateMaterial(index: number, field: keyof MaterialRow, value: string | number) {
    if (!cost) return;
    const updated = cost.materials.map((m, i) =>
      i === index ? { ...m, [field]: value } : m
    );
    setCost({ ...cost, materials: updated });
  }

  function addMaterial() {
    if (!cost) return;
    setCost({ ...cost, materials: [...cost.materials, { ...EMPTY_MATERIAL }] });
  }

  function removeMaterial(index: number) {
    if (!cost || cost.materials.length <= 1) return;
    setCost({ ...cost, materials: cost.materials.filter((_, i) => i !== index) });
  }

  // 계산
  function calcMaterialCost(m: MaterialRow): number {
    return m.unit_price * m.amount;
  }

  function calcTotalMaterialCost(): number {
    if (!cost) return 0;
    return cost.materials.reduce((sum, m) => sum + calcMaterialCost(m), 0);
  }

  function calcTotalCost(): number {
    if (!cost) return 0;
    return calcTotalMaterialCost() + cost.packaging_cost + cost.labor_cost + cost.overhead_cost;
  }

  function calcMargin(): number {
    if (!cost) return 0;
    return cost.selling_price - calcTotalCost();
  }

  function calcMarginRate(): number {
    if (!cost || cost.selling_price === 0) return 0;
    return (calcMargin() / cost.selling_price) * 100;
  }

  function calcBEP(): number | null {
    if (!cost || cost.monthly_fixed_cost === 0) return null;
    const margin = calcMargin();
    if (margin <= 0) return null;
    return Math.ceil(cost.monthly_fixed_cost / margin);
  }

  async function saveCost() {
    if (!cost) return;
    setSaving(true);
    const { error } = await supabase.from("product_costs").upsert(
      {
        product_id: cost.product_id,
        materials: cost.materials,
        packaging_cost: cost.packaging_cost,
        labor_cost: cost.labor_cost,
        overhead_cost: cost.overhead_cost,
        selling_price: cost.selling_price,
        monthly_fixed_cost: cost.monthly_fixed_cost,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "product_id" }
    );
    setSaving(false);
    if (error) {
      flash("저장 실패: " + error.message);
    } else {
      flash("저장됐습니다");
    }
  }

  const totalMat = calcTotalMaterialCost();
  const totalCost = calcTotalCost();
  const margin = calcMargin();
  const marginRate = calcMarginRate();
  const bep = calcBEP();

  // ── 상품 목록 화면 ──
  if (!selectedProduct || !cost) {
    return (
      <div className="px-4 pt-4 space-y-3">
        {msg && (
          <div className="px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm text-center font-medium">
            {msg}
          </div>
        )}
        <p className="text-stone-500 text-xs font-semibold">활성 상품 — 클릭하면 원가 입력</p>
        {loading ? (
          <div className="text-center text-stone-400 py-16 text-sm">불러오는 중...</div>
        ) : products.length === 0 ? (
          <div className="text-center text-stone-300 py-16 text-sm">활성 상품이 없습니다</div>
        ) : (
          <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
            {products.map((p, i) => (
              <button
                key={p.id}
                onClick={() => openCost(p)}
                className={`w-full text-left px-4 py-3 flex items-center justify-between gap-3 hover:bg-stone-50 transition-colors ${
                  i > 0 ? "border-t border-stone-100" : ""
                }`}
              >
                <div>
                  <p className="text-stone-900 text-sm font-medium">{p.name}</p>
                  <p className="text-stone-400 text-xs mt-0.5">{p.category}</p>
                </div>
                <span className="text-stone-300 text-base">›</span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── 원가 입력 폼 화면 ──
  return (
    <div className="pb-32">
      {/* 서브 헤더 */}
      <div className="px-4 pt-4 pb-3 flex items-center gap-3 border-b border-stone-100 bg-white sticky top-[101px] z-[5]">
        <button onClick={closeCost} className="text-stone-400 text-sm px-2 py-1 rounded-lg bg-stone-100">← 목록</button>
        <div className="flex-1 min-w-0">
          <p className="text-stone-900 font-bold text-sm truncate">{selectedProduct.name}</p>
          <p className="text-stone-400 text-xs">{selectedProduct.category}</p>
        </div>
      </div>

      {msg && (
        <div className="mx-4 mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm text-center font-medium">
          {msg}
        </div>
      )}

      <div className="px-4 pt-4 space-y-5">

        {/* ── 재료비 섹션 ── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-stone-700 text-sm font-bold">재료비</p>
            <button
              onClick={addMaterial}
              className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg font-medium"
            >
              + 재료 추가
            </button>
          </div>

          <div className="space-y-2">
            {/* 컬럼 헤더 */}
            <div className="grid grid-cols-[1fr_52px_72px_72px_32px] gap-1 px-1">
              <p className="text-stone-400 text-[10px] font-medium">재료명</p>
              <p className="text-stone-400 text-[10px] font-medium text-center">단위</p>
              <p className="text-stone-400 text-[10px] font-medium text-right">단가(원)</p>
              <p className="text-stone-400 text-[10px] font-medium text-right">소요량</p>
              <p className="text-stone-400 text-[10px] font-medium text-center">-</p>
            </div>

            {cost.materials.map((m, i) => (
              <div key={i} className="bg-white rounded-xl border border-stone-200 p-2.5 space-y-2">
                <div className="grid grid-cols-[1fr_52px_72px_72px_32px] gap-1 items-center">
                  {/* 재료명 */}
                  <input
                    type="text"
                    value={m.name}
                    onChange={(e) => updateMaterial(i, "name", e.target.value)}
                    placeholder="예: 쑥가루"
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs text-stone-900 placeholder-stone-300 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {/* 단위 */}
                  <select
                    value={m.unit}
                    onChange={(e) => updateMaterial(i, "unit", e.target.value)}
                    className="bg-stone-50 border border-stone-200 rounded-lg px-1 py-1.5 text-xs text-stone-900 outline-none focus:ring-1 focus:ring-emerald-500 text-center"
                  >
                    {MATERIAL_UNITS.map((u) => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  {/* 단가 */}
                  <input
                    type="number"
                    min={0}
                    value={m.unit_price === 0 ? "" : m.unit_price}
                    onChange={(e) => updateMaterial(i, "unit_price", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs text-stone-900 text-right font-mono outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {/* 소요량 */}
                  <input
                    type="number"
                    min={0}
                    step="0.01"
                    value={m.amount === 0 ? "" : m.amount}
                    onChange={(e) => updateMaterial(i, "amount", parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 text-xs text-stone-900 text-right font-mono outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                  {/* 삭제 */}
                  <button
                    onClick={() => removeMaterial(i)}
                    disabled={cost.materials.length <= 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 text-red-400 border border-red-100 disabled:opacity-30 text-xs"
                  >
                    ✕
                  </button>
                </div>
                {/* 재료별 소계 */}
                {(m.unit_price > 0 || m.amount > 0) && (
                  <div className="flex justify-end">
                    <span className="text-stone-400 text-[10px] font-mono">
                      {m.unit_price.toLocaleString()} × {m.amount} {m.unit} = {" "}
                      <span className="text-stone-700 font-semibold">{calcMaterialCost(m).toLocaleString()}원</span>
                    </span>
                  </div>
                )}
              </div>
            ))}

            {/* 재료비 소계 */}
            <div className="flex justify-end items-center gap-2 px-1 pt-1">
              <p className="text-stone-400 text-xs">재료비 소계</p>
              <p className="text-stone-800 text-sm font-bold font-mono">{totalMat.toLocaleString()}원</p>
            </div>
          </div>
        </div>

        {/* ── 기타 비용 섹션 ── */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
          <p className="text-stone-700 text-sm font-bold mb-1">기타 비용 (원/개)</p>

          {[
            { label: "포장비", sublabel: "상자·포장지·리본 등", key: "packaging_cost" as const },
            { label: "직접 노무비", sublabel: "제조 인건비", key: "labor_cost" as const },
            { label: "제조 간접비", sublabel: "수도광열비·감가상각 등", key: "overhead_cost" as const },
          ].map(({ label, sublabel, key }) => (
            <div key={key} className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-stone-700 text-xs font-medium">{label}</p>
                <p className="text-stone-400 text-[10px]">{sublabel}</p>
              </div>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  value={cost[key] === 0 ? "" : cost[key]}
                  onChange={(e) => setCost({ ...cost, [key]: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="w-28 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 text-right font-mono outline-none focus:ring-2 focus:ring-emerald-500 pr-8"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs pointer-events-none">원</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── 판매가 + 월 고정비 ── */}
        <div className="bg-white rounded-2xl border border-stone-200 p-4 space-y-3">
          <p className="text-stone-700 text-sm font-bold mb-1">판매가 / 고정비</p>

          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-stone-700 text-xs font-medium">판매가</p>
              <p className="text-stone-400 text-[10px]">개당 소비자 가격</p>
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                value={cost.selling_price === 0 ? "" : cost.selling_price}
                onChange={(e) => setCost({ ...cost, selling_price: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-28 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 text-right font-mono outline-none focus:ring-2 focus:ring-emerald-500 pr-8"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs pointer-events-none">원</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-stone-700 text-xs font-medium">월 고정비 <span className="text-stone-300 font-normal">(선택)</span></p>
              <p className="text-stone-400 text-[10px]">임대료·관리비 등 월 총액</p>
            </div>
            <div className="relative">
              <input
                type="number"
                min={0}
                value={cost.monthly_fixed_cost === 0 ? "" : cost.monthly_fixed_cost}
                onChange={(e) => setCost({ ...cost, monthly_fixed_cost: parseFloat(e.target.value) || 0 })}
                placeholder="0"
                className="w-28 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 text-sm text-stone-900 text-right font-mono outline-none focus:ring-2 focus:ring-emerald-500 pr-8"
              />
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs pointer-events-none">원</span>
            </div>
          </div>
        </div>

        {/* ── 계산 결과 ── */}
        <div className="bg-stone-50 rounded-xl p-4 space-y-3">
          <p className="text-stone-500 text-xs font-bold tracking-wider">자동 계산 결과</p>

          <div className="space-y-2">
            {[
              { label: "재료비", value: totalMat, color: "text-stone-700" },
              { label: "포장비", value: cost.packaging_cost, color: "text-stone-700" },
              { label: "직접 노무비", value: cost.labor_cost, color: "text-stone-700" },
              { label: "제조 간접비", value: cost.overhead_cost, color: "text-stone-700" },
            ].map(({ label, value, color }) => (
              <div key={label} className="flex justify-between items-center">
                <p className="text-stone-500 text-xs">{label}</p>
                <p className={`text-xs font-mono font-medium ${color}`}>{value.toLocaleString()}원</p>
              </div>
            ))}

            <div className="border-t border-stone-200 pt-2 flex justify-between items-center">
              <p className="text-stone-700 text-sm font-bold">총 원가</p>
              <p className="text-stone-900 text-sm font-bold font-mono">{totalCost.toLocaleString()}원</p>
            </div>

            {cost.selling_price > 0 && (
              <>
                <div className="flex justify-between items-center">
                  <p className="text-stone-500 text-xs">판매가</p>
                  <p className="text-stone-700 text-xs font-mono">{cost.selling_price.toLocaleString()}원</p>
                </div>
                <div className="flex justify-between items-center">
                  <p className="text-stone-500 text-xs">마진</p>
                  <p className={`text-xs font-mono font-semibold ${margin >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                    {margin >= 0 ? "+" : ""}{margin.toLocaleString()}원
                  </p>
                </div>
                <div className="bg-white rounded-lg px-3 py-2 flex justify-between items-center border border-stone-200">
                  <p className="text-stone-700 text-sm font-bold">마진율</p>
                  <p className={`text-base font-bold font-mono ${marginRate >= 30 ? "text-emerald-700" : marginRate >= 15 ? "text-amber-600" : "text-red-600"}`}>
                    {marginRate.toFixed(1)}%
                  </p>
                </div>
              </>
            )}

            {bep !== null && (
              <div className="bg-white rounded-lg px-3 py-2 flex justify-between items-center border border-stone-200">
                <div>
                  <p className="text-stone-700 text-sm font-bold">손익분기 수량</p>
                  <p className="text-stone-400 text-[10px]">월 고정비 기준</p>
                </div>
                <p className="text-stone-900 text-base font-bold font-mono">{bep.toLocaleString()}개/월</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 저장 버튼 (fixed) */}
      <div className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3 bg-white border-t border-stone-100 z-10">
        <button
          onClick={saveCost}
          disabled={saving}
          className="w-full bg-emerald-700 hover:bg-emerald-800 disabled:bg-stone-200 disabled:text-stone-400 text-white font-bold py-4 rounded-xl transition-colors"
        >
          {saving ? "저장 중..." : "원가 저장"}
        </button>
      </div>
    </div>
  );
}
