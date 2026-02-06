'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
// ❌ 삭제: import { createClientComponentClient } ...
// ✅ 추가: 우리가 만든 싱글톤 클라이언트
import { supabase } from '../../utils/supabase'
import { useApp } from '../../context/AppContext'

// --- 아이콘 컴포넌트 (그대로 유지) ---
const Icons: any = {
  Menu: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  ChevronDown: () => <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>,
  Truck: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
  Doc: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Car: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
  Setting: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  // 관리자 아이콘 추가
  Admin: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  // 🔥 [핵심 변경] AppContext에서 이미 로딩한 정보를 바로 씁니다! (또 fetch 안 함)
  const { user, company, role, loading } = useApp()

  const [menus, setMenus] = useState<any[]>([])
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // 1. 회사가 변경되면 메뉴 목록 가져오기
  useEffect(() => {
    const fetchMenus = async () => {
        // 회사가 없으면 메뉴도 없음
        if (!company) return

        // Supabase에서 메뉴 가져오기
        const { data, error } = await supabase
            .from('company_modules')
            .select(`
                is_active,
                module:system_modules ( id, name, path, icon_key )
            `)
            .eq('company_id', company.id)
            .eq('is_active', true)

        if (!error && data) {
            const formattedMenus = data.map((item: any) => ({
                id: item.module.id,
                name: item.module.name,
                path: item.module.path,
                icon: Icons[item.module.icon_key] || Icons.Doc
            }))
            setMenus(formattedMenus)
        }
    }

    // 로딩이 끝났고 회사가 있을 때만 메뉴 로딩
    if (!loading && company) {
        fetchMenus()
    }
  }, [company, loading])

  // 로그인 페이지는 레이아웃 제외
  if (pathname === '/' || pathname === '/auth') return <>{children}</>

  return (
    <div className="flex min-h-screen bg-gray-50">
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-0'} bg-gray-900 text-white transition-all duration-300 overflow-hidden flex flex-col fixed h-full z-20`}>
        <div className="p-6 flex items-center justify-between">
            <span className="text-xl font-black text-white tracking-tight cursor-pointer" onClick={() => router.push('/dashboard')}>
              SECONDLIFE
            </span>
        </div>

        {/* 회사 정보 표시 (드롭다운 제거 - 당분간 심플하게) */}
        <div className="px-4 mb-6">
            <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <div className="text-gray-400 text-xs font-bold mb-1">CURRENT WORKSPACE</div>
                <div className="text-white font-bold text-lg flex items-center gap-2">
                    🏢 {company?.name || '로딩 중...'}
                </div>
                <div className="mt-2 flex gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${role === 'god_admin' ? 'bg-purple-900 text-purple-200' : 'bg-gray-700 text-gray-300'}`}>
                        {role === 'god_admin' ? '👑 GOD ADMIN' : role.toUpperCase()}
                    </span>
                    <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded font-bold">
                        {company?.plan?.toUpperCase() || 'FREE'}
                    </span>
                </div>
            </div>
        </div>

        {/* 메뉴 리스트 */}
        <nav className="flex-1 px-4 space-y-2 overflow-y-auto">
            {/* 👇 슈퍼 관리자 전용 메뉴 (항상 맨 위에 표시) */}
            {role === 'god_admin' && (
                <Link
                    href="/admin"
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm mb-4 border border-purple-500/30
                        ${pathname.startsWith('/admin') ? 'bg-purple-900/50 text-white' : 'text-purple-300 hover:bg-purple-900/30'}
                    `}
                >
                    <Icons.Admin />
                    전체 시스템 관리
                </Link>
            )}

            {/* 일반 메뉴들 */}
            {menus.map((menu) => {
                const IconComponent = menu.icon
                const isActive = pathname.startsWith(menu.path)
                return (
                    <Link
                        key={menu.id}
                        href={menu.path}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-bold text-sm
                            ${isActive
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                                : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
                        `}
                    >
                        <IconComponent />
                        {menu.name}
                    </Link>
                )
            })}
        </nav>

        {/* 하단 유저 정보 */}
        <div className="p-4 border-t border-gray-800">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold">
                    {user?.email?.[0].toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-bold truncate">{user?.email}</p>
                    <button
                        onClick={() => supabase.auth.signOut().then(() => router.push('/'))}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        로그아웃
                    </button>
                </div>
            </div>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-0'}`}>
        <div className="min-h-screen">
            {children}
        </div>
      </main>
    </div>
  )
}