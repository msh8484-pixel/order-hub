"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type Store = {
  id: string;
  name: string;
  slug: string;
  order_deadline: string;
  contact_name: string;
};

const EMPTY_STORE: Omit<Store, "id"> = {
  name: "",
  slug: "",
  order_deadline: "14:00",
  contact_name: "",
};

export default function AdminPage() {
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

  function startEdit(store: Store) {
    setEditingId(store.id);
    setEditValues({
      name: store.name,
      slug: store.slug,
      order_deadline: store.order_deadline || "14:00",
      contact_name: store.contact_name || "",
    });
  }

  async function saveEdit() {
    if (!editingId) return;
    setSaving(true);
    await supabase.from("stores").update({
      name: editValues.name,
      slug: editValues.slug,
      order_deadline: editValues.order_deadline,
      contact_name: editValues.contact_name,
    }).eq("id", editingId);
    setEditingId(null);
    setMsg("저장됐습니다");
    setTimeout(() => setMsg(""), 2000);
    setSaving(false);
    loadStores();
  }

  async function saveNew() {
    if (!newStore.name.trim() || !newStore.slug.trim()) {
      setMsg("매장명과 슬러그를 입력해주세요");
      return;
    }
    setSaving(true);
    await supabase.from("stores").insert({
      name: newStore.name,
      slug: newStore.slug,
      order_deadline: newStore.order_deadline,
      contact_name: newStore.contact_name,
    });
    setAdding(false);
    setNewStore(EMPTY_STORE);
    setMsg("매장이 추가됐습니다");
    setTimeout(() => setMsg(""), 2000);
    setSaving(false);
    loadStores();
  }

  function field(label: string, value: string, onChange: (v: string) => void, placeholder?: string, type = "text") {
    return (
      <div>
        <label className="text-stone-500 text-xs font-medium block mb-1">{label}</label>
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-stone-50 border border-stone-200 text-stone-900 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3">
        <h1 className="text-stone-900 font-bold text-base">설정</h1>
        <p className="text-stone-400 text-xs">매장 · 마감시간 · 담당자 관리</p>
      </div>

      {msg && (
        <div className="mx-4 mt-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm text-center font-medium">
          {msg}
        </div>
      )}

      <div className="px-4 pt-4 space-y-4">
        {/* 매장 목록 */}
        <div className="flex items-center justify-between">
          <h2 className="text-stone-700 font-bold text-sm">매장 관리</h2>
          <button
            onClick={() => { setAdding(true); setEditingId(null); }}
            className="text-xs bg-emerald-700 text-white px-3 py-1.5 rounded-lg font-medium"
          >
            + 매장 추가
          </button>
        </div>

        {/* 매장 추가 폼 */}
        {adding && (
          <div className="bg-white rounded-xl border border-emerald-200 p-4 space-y-3">
            <p className="text-emerald-700 font-bold text-sm">새 매장 추가</p>
            {field("매장명", newStore.name, (v) => setNewStore(p => ({ ...p, name: v })), "예: 강남점")}
            {field("슬러그 (URL)", newStore.slug, (v) => setNewStore(p => ({ ...p, slug: v })), "예: gangnam")}
            {field("마감시간", newStore.order_deadline, (v) => setNewStore(p => ({ ...p, order_deadline: v })), "14:00", "time")}
            {field("담당자 이름", newStore.contact_name, (v) => setNewStore(p => ({ ...p, contact_name: v })), "예: 홍길동 점장")}
            <div className="flex gap-2 pt-1">
              <button
                onClick={saveNew}
                disabled={saving}
                className="flex-1 bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-xl"
              >
                {saving ? "저장 중..." : "추가"}
              </button>
              <button
                onClick={() => { setAdding(false); setNewStore(EMPTY_STORE); }}
                className="flex-1 bg-stone-100 text-stone-600 text-sm font-medium py-2.5 rounded-xl"
              >
                취소
              </button>
            </div>
          </div>
        )}

        {/* 매장 카드 목록 */}
        {loading ? (
          <div className="text-center text-stone-400 py-10 text-sm">불러오는 중...</div>
        ) : (
          stores.map((store) => (
            <div key={store.id} className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              {editingId === store.id ? (
                <div className="p-4 space-y-3">
                  <p className="text-stone-700 font-bold text-sm">수정 중</p>
                  {field("매장명", editValues.name, (v) => setEditValues(p => ({ ...p, name: v })))}
                  {field("슬러그 (URL)", editValues.slug, (v) => setEditValues(p => ({ ...p, slug: v })))}
                  {field("마감시간", editValues.order_deadline, (v) => setEditValues(p => ({ ...p, order_deadline: v })), "", "time")}
                  {field("담당자 이름", editValues.contact_name, (v) => setEditValues(p => ({ ...p, contact_name: v })), "예: 홍길동 점장")}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveEdit}
                      disabled={saving}
                      className="flex-1 bg-emerald-700 text-white text-sm font-bold py-2.5 rounded-xl"
                    >
                      {saving ? "저장 중..." : "저장"}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 bg-stone-100 text-stone-600 text-sm font-medium py-2.5 rounded-xl"
                    >
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
                    <button
                      onClick={() => startEdit(store)}
                      className="text-xs text-emerald-700 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg"
                    >
                      수정
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-stone-50 rounded-lg px-3 py-2">
                      <p className="text-stone-400 text-[10px] font-medium">마감시간</p>
                      <p className="text-stone-800 text-sm font-semibold mt-0.5">
                        {store.order_deadline?.slice(0, 5) || "미설정"}
                      </p>
                    </div>
                    <div className="bg-stone-50 rounded-lg px-3 py-2">
                      <p className="text-stone-400 text-[10px] font-medium">담당자</p>
                      <p className="text-stone-800 text-sm font-semibold mt-0.5">
                        {store.contact_name || "미설정"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* 상품 관리 링크 */}
        <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
          <Link href="/admin/products" className="flex items-center justify-between px-4 py-4">
            <div>
              <p className="text-stone-800 font-bold text-sm">상품 관리</p>
              <p className="text-stone-400 text-xs mt-0.5">품목 추가 · 수정 · 가격</p>
            </div>
            <span className="text-stone-400 text-lg">›</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
