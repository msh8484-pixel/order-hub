"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Room = {
  id: string;
  name: string;
  type: string;
  description: string | null;
  last_message?: string;
  last_at?: string;
};

export default function ChatListPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("is_active", true)
        .order("created_at");

      if (data) {
        const roomsWithMsg = await Promise.all(
          data.map(async (room) => {
            const { data: msg } = await supabase
              .from("chat_messages")
              .select("content, created_at")
              .eq("room_id", room.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .single();

            return {
              ...room,
              last_message: msg?.content,
              last_at: msg?.created_at,
            };
          })
        );
        setRooms(roomsWithMsg);
      }
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-4 py-3">
        <h1 className="text-stone-900 font-bold text-base">단톡방</h1>
      </div>

      <div className="bg-white mx-4 mt-4 rounded-xl border border-stone-200 overflow-hidden">
        {loading ? (
          <div className="text-center text-stone-400 py-16 text-sm">불러오는 중...</div>
        ) : rooms.length === 0 ? (
          <div className="text-center text-stone-400 py-16 text-sm">채팅방이 없습니다</div>
        ) : (
          rooms.map((room, i) => (
            <Link
              key={room.id}
              href={`/chat/${room.id}`}
              className={`flex items-center gap-4 px-4 py-4 hover:bg-stone-50 transition-colors ${
                i > 0 ? "border-t border-stone-100" : ""
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white text-sm font-bold ${
                room.type === "order" ? "bg-emerald-700" : "bg-stone-400"
              }`}>
                {room.name.slice(0, 1)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-stone-900 font-semibold text-sm">{room.name}</span>
                  {room.type === "order" && (
                    <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">발주</span>
                  )}
                </div>
                <p className="text-stone-400 text-sm truncate mt-0.5">
                  {room.last_message || room.description || "메시지 없음"}
                </p>
              </div>

              {room.last_at && (
                <span className="text-stone-300 text-xs flex-shrink-0">
                  {new Date(room.last_at).toLocaleTimeString("ko-KR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
