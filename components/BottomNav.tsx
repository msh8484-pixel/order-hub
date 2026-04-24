"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "홈" },
  { href: "/production", label: "생산" },
  { href: "/dashboard", label: "대시보드" },
  { href: "/chat", label: "채팅" },
  { href: "/admin/products", label: "메뉴" },
];

export default function BottomNav() {
  const pathname = usePathname();

  if (pathname.startsWith("/store/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-stone-200 flex">
      {NAV.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            className={`flex-1 flex flex-col items-center justify-center py-3 gap-0.5 transition-colors text-xs font-medium ${
              active ? "text-emerald-700" : "text-stone-400"
            }`}
          >
            {active && <div className="w-4 h-0.5 bg-emerald-700 rounded-full mb-0.5" />}
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
