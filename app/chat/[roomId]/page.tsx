"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Message = {
  id: string;
  room_id: string;
  sender_name: string;
  sender_role: string;
  content: string;
  is_parsed: boolean;
  created_at: string;
};

type Room = {
  id: string;
  name: string;
  type: string;
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-indigo-600",
  store: "bg-teal-600",
  production: "bg-orange-600",
};

function Avatar({ name, role }: { name: string; role: string }) {
  const bg = ROLE_COLORS[role] || "bg-gray-600";
  const initial = name.slice(0, 1);
  return (
    <div className={`w-9 h-9 rounded-full ${bg} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}>
      {initial}
    </div>
  );
}

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [senderName, setSenderName] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("chat_name") || "" : ""
  );
  const [nameSet, setNameSet] = useState(false);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (senderName) setNameSet(true);
  }, []);

  useEffect(() => {
    async function load() {
      const [{ data: roomData }, { data: msgData }] = await Promise.all([
        supabase.from("chat_rooms").select("*").eq("id", roomId).single(),
        supabase
          .from("chat_messages")
          .select("*")
          .eq("room_id", roomId)
          .order("created_at")
          .limit(100),
      ]);
      if (roomData) setRoom(roomData);
      if (msgData) setMessages(msgData);
    }
    load();

    // Realtime 구독
    const channel = supabase
      .channel(`room:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `room_id=eq.${roomId}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => setMessages((prev) => [...prev, payload.new as Message])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveName = useCallback(() => {
    if (!senderName.trim()) return;
    localStorage.setItem("chat_name", senderName);
    setNameSet(true);
  }, [senderName]);

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);

    const { error } = await supabase.from("chat_messages").insert({
      room_id: roomId,
      sender_name: senderName,
      sender_role: "store",
      content: input.trim(),
    });

    if (!error) {
      setInput("");
      // 발주방이면 AI 파싱 요청
      if (room?.type === "order") {
        fetch("/api/chat/parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ room_id: roomId, message: input.trim(), sender: senderName }),
        }).catch(() => {});
      }
    }
    setSending(false);
  }

  // 이름 설정 화면
  if (!nameSet) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-4">
          <h2 className="text-white font-bold text-xl text-center">이름을 입력해주세요</h2>
          <input
            type="text"
            placeholder="홍길동 (잠실점)"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && saveName()}
            className="w-full bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={saveName}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl"
          >
            입장하기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      {/* 헤더 */}
      <div className="sticky top-0 md:top-16 z-10 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400">
          ←
        </button>
        <div className="flex-1">
          <h1 className="text-white font-bold text-base">{room?.name || "..."}</h1>
          {room?.type === "order" && (
            <p className="text-indigo-400 text-xs">📦 발주방 — 메시지가 자동 파싱됩니다</p>
          )}
        </div>
      </div>

      {/* 메시지 목록 */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-start gap-2">
            <Avatar name={msg.sender_name} role={msg.sender_role} />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-white text-sm font-semibold">{msg.sender_name}</span>
                <span className="text-gray-500 text-xs">
                  {new Date(msg.created_at).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}
                </span>
                {msg.is_parsed && (
                  <span className="text-indigo-400 text-xs">✓ 파싱됨</span>
                )}
              </div>
              <div className="bg-gray-800 rounded-2xl rounded-tl-sm px-3 py-2 inline-block max-w-xs">
                <p className="text-white text-sm whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div className="sticky bottom-0 bg-gray-900 border-t border-gray-800 px-4 py-3 flex gap-2">
        <input
          type="text"
          placeholder={room?.type === "order" ? "예: 쑥인절미 50개, 약밥 30개" : "메시지 입력..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
          className="flex-1 bg-gray-800 text-white placeholder-gray-500 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 text-white px-4 rounded-xl font-semibold text-sm transition-colors"
        >
          전송
        </button>
      </div>
    </div>
  );
}
