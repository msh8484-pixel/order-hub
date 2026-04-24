import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">떡함지</h1>
          <p className="text-gray-400 text-sm">주문 통합 관리 시스템</p>
        </div>

        <Link
          href="/production"
          className="block w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-4 px-6 rounded-2xl text-center transition-colors"
        >
          🏭 생산팀 대시보드
        </Link>

        <Link
          href="/dashboard"
          className="block w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-2xl text-center transition-colors"
        >
          📊 사장님 대시보드
        </Link>

        <Link
          href="/chat"
          className="block w-full bg-gray-800 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-2xl text-center transition-colors"
        >
          💬 단톡방
        </Link>

        <div className="border-t border-gray-800 pt-4">
          <p className="text-gray-500 text-xs text-center mb-3">매장 발주 입력</p>
          <div className="grid grid-cols-3 gap-2">
            <Link
              href="/store/jamsil"
              className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-3 px-2 rounded-xl text-center transition-colors"
            >
              잠실점
            </Link>
            <Link
              href="/store/gangnam"
              className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-3 px-2 rounded-xl text-center transition-colors"
            >
              강남점
            </Link>
            <Link
              href="/store/main"
              className="bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium py-3 px-2 rounded-xl text-center transition-colors"
            >
              본점
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
