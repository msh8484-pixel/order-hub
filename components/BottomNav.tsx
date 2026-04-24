"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/production", label: "생산", icon: "🏭" },
  { href: "/dashboard", label: "대시보드", icon: "📊" },
  { href: "/chat", label: "채팅", icon: "💬" },
  { href: "/admin/products", label: "메뉴", icon: "⚙️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  // 매장 발주 페이지에선 네비 숨김
  if (pathname.startsWith("/store/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900 border-t border-gray-800 flex">
      {NAV.map(({ href, label, icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors ${
              active ? "text-indigo-400" : "text-gray-500"
            }`}
          >
            <span className="text-xl">{icon}</span>
            <span className="text-xs font-medium">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
