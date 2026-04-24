import Link from "next/link";
import { supabase } from "@/lib/supabase";

async function getStores() {
  const { data } = await supabase.from("stores").select("id, name, slug").order("created_at");
  return data || [];
}

export default async function Home() {
  let stores: { id: string; name: string; slug: string }[] = [];
  try { stores = await getStores(); } catch {}

  return (
    <main className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-3">
        <div className="text-center mb-8">
          <div className="inline-block bg-emerald-700 text-white text-xs font-semibold px-3 py-1 rounded-full mb-3 tracking-wider">
            ORDER HUB
          </div>
          <h1 className="text-2xl font-bold text-stone-900 mb-1">떡함지</h1>
          <p className="text-stone-500 text-sm">주문 통합 관리 시스템</p>
        </div>

        <Link
          href="/production"
          className="block w-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold py-4 px-6 rounded-xl text-center transition-colors text-sm"
        >
          생산팀 대시보드
        </Link>

        <Link
          href="/dashboard"
          className="block w-full bg-white hover:bg-stone-50 text-stone-900 font-semibold py-4 px-6 rounded-xl text-center transition-colors border border-stone-200 text-sm"
        >
          사장님 대시보드
        </Link>

        <Link
          href="/chat"
          className="block w-full bg-white hover:bg-stone-50 text-stone-900 font-semibold py-4 px-6 rounded-xl text-center transition-colors border border-stone-200 text-sm"
        >
          단톡방
        </Link>

        <div className="pt-4 border-t border-stone-200">
          <p className="text-stone-400 text-xs text-center mb-3 font-medium tracking-wider uppercase">매장 발주 입력</p>
          <div className="grid grid-cols-3 gap-2">
            {stores.length > 0 ? stores.map((store) => (
              <Link
                key={store.id}
                href={`/store/${store.slug}`}
                className="bg-white hover:bg-stone-50 text-stone-700 text-sm font-medium py-3 px-2 rounded-xl text-center transition-colors border border-stone-200"
              >
                {store.name}
              </Link>
            )) : (
              <>
                <Link href="/store/jamsil" className="bg-white hover:bg-stone-50 text-stone-700 text-sm font-medium py-3 px-2 rounded-xl text-center transition-colors border border-stone-200">잠실점</Link>
                <Link href="/store/gangnam" className="bg-white hover:bg-stone-50 text-stone-700 text-sm font-medium py-3 px-2 rounded-xl text-center transition-colors border border-stone-200">강남점</Link>
                <Link href="/store/main" className="bg-white hover:bg-stone-50 text-stone-700 text-sm font-medium py-3 px-2 rounded-xl text-center transition-colors border border-stone-200">본점</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
