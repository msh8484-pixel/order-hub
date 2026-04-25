"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/production", label: "생산" },
  { href: "/dashboard", label: "대시보드" },
  { href: "/chat", label: "채팅" },
  { href: "/admin", label: "설정" },
];

export default function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 h-16 bg-white border-b border-stone-200 items-center px-8 gap-8">
      {/* 로고 */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 bg-emerald-700 rounded-lg flex items-center justify-center">
          <span className="text-white font-black text-xs">떡</span>
        </div>
        <div className="leading-tight">
          <p className="text-stone-900 font-black text-sm">떡함지</p>
          <p className="text-stone-400 text-[10px] font-medium -mt-0.5">주문관리 시스템</p>
        </div>
      </div>

      {/* 구분선 */}
      <div className="w-px h-5 bg-stone-200" />

      {/* 네비 아이템 */}
      <div className="flex items-center gap-1">
        {NAV.map(({ href, label }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-emerald-700 text-white"
                  : "text-stone-500 hover:text-stone-900 hover:bg-stone-100"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
