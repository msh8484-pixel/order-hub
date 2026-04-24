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
        // 각 방의 마지막 메시지 가져오기
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
    <div className="min-h-screen bg-gray-950">
      <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3">
        <h1 className="text-white font-bold text-lg">단톡방</h1>
      </div>

      <div className="divide-y divide-gray-800">
        {loading ? (
          <div className="text-center text-gray-500 py-16">로딩 중...</div>
        ) : (
          rooms.map((room) => (
            <Link
              key={room.id}
              href={`/chat/${room.id}`}
              className="flex items-center gap-4 px-4 py-4 hover:bg-gray-900 transition-colors"
            >
              {/* 아바타 */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0 ${
                room.type === "order" ? "bg-indigo-600" : "bg-gray-700"
              }`}>
                {room.type === "order" ? "📦" : "💬"}
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold text-sm">{room.name}</span>
                  {room.last_at && (
                    <span className="text-gray-500 text-xs">
                      {new Date(room.last_at).toLocaleTimeString("ko-KR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </div>
                <p className="text-gray-400 text-sm truncate mt-0.5">
                  {room.last_message || room.description || "메시지 없음"}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
