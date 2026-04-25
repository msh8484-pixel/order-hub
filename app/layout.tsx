import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "떡함지 주문관리",
  description: "매장 발주 · 생산 대시보드 · 단톡방",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "떡함지",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#111827",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={geist.variable}>
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <Sidebar />
        {/* 모바일: 풀 너비 + 하단 네비 여백 / 데스크탑: 사이드바 너비(240px) 오른쪽 */}
        <div className="pb-16 md:pb-0 md:ml-60">
          {children}
        </div>
        <BottomNav />
      </body>
    </html>
  );
}
