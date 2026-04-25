"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  Factory,
  BarChart2,
  MessageSquare,
  Settings,
} from "lucide-react";

const NAV = [
  { href: "/", label: "홈", icon: Home },
  { href: "/production", label: "생산", icon: Factory },
  { href: "/dashboard", label: "대시보드", icon: BarChart2 },
  { href: "/chat", label: "채팅", icon: MessageSquare },
  { href: "/admin", label: "설정", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-stone-200 z-50 flex-col">
      {/* 로고 */}
      <div className="px-5 py-5 border-b border-stone-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-emerald-700 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-white font-black text-sm">떡</span>
          </div>
          <div>
            <p className="text-stone-900 font-black text-sm leading-tight">떡함지</p>
            <p className="text-stone-400 text-xs font-medium">주문관리 시스템</p>
          </div>
        </div>
      </div>

      {/* 네비 */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? "bg-emerald-700 text-white"
                  : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              <Icon size={17} strokeWidth={active ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* 하단 정보 */}
      <div className="px-4 py-4 border-t border-stone-100">
        <p className="text-stone-400 text-xs text-center">떡함지 © 2025</p>
      </div>
    </aside>
  );
}
