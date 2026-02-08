'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../utils/supabase'
import { useApp } from '../context/AppContext'

// ============================================
// 대시보드 - 로그인 후 첫 화면
// god_admin → 플랫폼 관리 대시보드
// 회사 사용자 → 비즈니스 KPI 대시보드
// ============================================

type DashboardStats = {
  totalCars: number
  availableCars: number
  rentedCars: number
  maintenanceCars: number
  totalCustomers: number
  activeInvestments: number
  totalInvestAmount: number
  jiipContracts: number
  monthlyRevenue: number
  monthlyExpense: number
  netProfit: number
}

type PlatformStats = {
  totalCompanies: number
  activeCompanies: number
  pendingCompanies: number
  totalUsers: number
  totalActiveModules: number
  pendingList: { id: string; name: string; business_number: string; plan: string; created_at: string }[]
  companyList: { id: string; name: string; plan: string; is_active: boolean; created_at: string; moduleCount: number }[]
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, company, role, position, loading: appLoading } = useApp()
  const [stats, setStats] = useState<DashboardStats>({
    totalCars: 0, availableCars: 0, rentedCars: 0, maintenanceCars: 0,
    totalCustomers: 0, activeInvestments: 0, totalInvestAmount: 0, jiipContracts: 0,
    monthlyRevenue: 0, monthlyExpense: 0, netProfit: 0,
  })
  const [recentCars, setRecentCars] = useState<any[]>([])
  const [platformStats, setPlatformStats] = useState<PlatformStats>({
    totalCompanies: 0, activeCompanies: 0, pendingCompanies: 0,
    totalUsers: 0, totalActiveModules: 0,
    pendingList: [], companyList: [],
  })
  const [activeModules, setActiveModules] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())

  // 시계 업데이트
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(timer)
  }, [])

  // 데이터 로드
  useEffect(() => {
    if (appLoading) return
    if (!user) return
    fetchDashboardData()
  }, [appLoading, user, company, role])

  // 모듈 활성화 체크 헬퍼
  const hasModule = (path: string) => role === 'god_admin' || activeModules.has(path)

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const isGodAdmin = role === 'god_admin'
      const companyId = company?.id

      if (isGodAdmin) {
        // ========================================
        // god_admin: 플랫폼 통계만 로드
        // ========================================
        const { count: companyCount } = await supabase
          .from('companies').select('id', { count: 'exact', head: true })
        const { count: activeCount } = await supabase
          .from('companies').select('id', { count: 'exact', head: true }).eq('is_active', true)
        const { count: pendingCount } = await supabase
          .from('companies').select('id', { count: 'exact', head: true }).eq('is_active', false)
        const { count: userCount } = await supabase
          .from('profiles').select('id', { count: 'exact', head: true })

        // 활성 모듈 총 수 (RPC 사용)
        const { data: moduleData } = await supabase.rpc('get_all_company_modules')
        const activeModuleCount = moduleData?.filter((m: any) => m.is_active).length || 0

        // 승인 대기 회사 목록
        const { data: pendingData } = await supabase
          .from('companies')
          .select('id, name, business_number, plan, created_at')
          .eq('is_active', false)
          .order('created_at', { ascending: false })

        // 전체 회사 목록 (활성 모듈 수 포함)
        const { data: allCompanies } = await supabase
          .from('companies')
          .select('id, name, plan, is_active, created_at')
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        // 회사별 활성 모듈 수 계산
        const companyModuleCounts: Record<string, number> = {}
        if (moduleData) {
          moduleData.forEach((m: any) => {
            if (m.is_active) {
              companyModuleCounts[m.company_id] = (companyModuleCounts[m.company_id] || 0) + 1
            }
          })
        }

        setPlatformStats({
          totalCompanies: companyCount || 0,
          activeCompanies: activeCount || 0,
          pendingCompanies: pendingCount || 0,
          totalUsers: userCount || 0,
          totalActiveModules: activeModuleCount,
          pendingList: pendingData || [],
          companyList: (allCompanies || []).map(c => ({
            ...c,
            moduleCount: companyModuleCounts[c.id] || 0,
          })),
        })

      } else {
        // ========================================
        // 회사 사용자: 비즈니스 통계 로드
        // ========================================

        // 활성 모듈 목록
        if (companyId) {
          const { data: companyModules } = await supabase
            .from('company_modules')
            .select('module:system_modules(path)')
            .eq('company_id', companyId)
            .eq('is_active', true)
          if (companyModules) {
            setActiveModules(new Set(companyModules.map((m: any) => m.module?.path).filter(Boolean)))
          }
        }

        // 차량 통계
        let carQuery = supabase.from('cars').select('id, status', { count: 'exact' })
        if (companyId) carQuery = carQuery.eq('company_id', companyId)
        const { data: carData } = await carQuery
        const cars = carData || []

        // 최근 등록 차량 5개
        let recentQuery = supabase.from('cars').select('*').order('created_at', { ascending: false }).limit(5)
        if (companyId) recentQuery = recentQuery.eq('company_id', companyId)
        const { data: recentData } = await recentQuery

        // 고객 수
        let custQuery = supabase.from('customers').select('id', { count: 'exact' })
        if (companyId) custQuery = custQuery.eq('company_id', companyId)
        const { count: custCount } = await custQuery

        // 일반투자 통계
        let investQuery = supabase.from('general_investments').select('invest_amount')
        if (companyId) investQuery = investQuery.eq('company_id', companyId)
        const { data: investData } = await investQuery
        const totalInvest = (investData || []).reduce((sum, i) => sum + (i.invest_amount || 0), 0)

        // 지입 계약 수
        let jiipQuery = supabase.from('jiip_contracts').select('id', { count: 'exact' })
        if (companyId) jiipQuery = jiipQuery.eq('company_id', companyId)
        const { count: jiipCount } = await jiipQuery

        // 월 매출
        let revenueQuery = supabase.from('quotes').select('rent_fee').eq('status', 'active')
        if (companyId) revenueQuery = revenueQuery.eq('company_id', companyId)
        const { data: revenueData } = await revenueQuery
        const monthlyRevenue = (revenueData || []).reduce((sum: number, q: any) => sum + (q.rent_fee || 0), 0)

        // 월 지출
        let financeQuery = supabase.from('financial_products').select('monthly_payment')
        if (companyId) financeQuery = financeQuery.eq('company_id', companyId)
        const { data: financeData } = await financeQuery
        const totalFinance = (financeData || []).reduce((sum: number, f: any) => sum + (f.monthly_payment || 0), 0)

        let insuranceQuery = supabase.from('insurance_contracts').select('total_premium')
        if (companyId) insuranceQuery = insuranceQuery.eq('company_id', companyId)
        const { data: insuranceData } = await insuranceQuery
        const totalInsurance = (insuranceData || []).reduce((sum: number, i: any) => sum + Math.round((i.total_premium || 0) / 12), 0)

        setStats({
          totalCars: cars.length,
          availableCars: cars.filter(c => c.status === 'available').length,
          rentedCars: cars.filter(c => c.status === 'rented').length,
          maintenanceCars: cars.filter(c => c.status === 'maintenance').length,
          totalCustomers: custCount || 0,
          activeInvestments: (investData || []).length,
          totalInvestAmount: totalInvest,
          jiipContracts: jiipCount || 0,
          monthlyRevenue,
          monthlyExpense: totalFinance + totalInsurance,
          netProfit: monthlyRevenue - (totalFinance + totalInsurance),
        })
        setRecentCars(recentData || [])
      }

    } catch (err) {
      console.error('대시보드 로딩 에러:', err)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // 공통 헬퍼
  // ============================================
  const formatMoney = (n: number) => {
    if (n >= 100000000) return (n / 100000000).toFixed(1) + '억'
    if (n >= 10000) return (n / 10000).toFixed(0) + '만'
    return n.toLocaleString()
  }

  const getGreeting = () => {
    const h = currentTime.getHours()
    if (h < 6) return '늦은 밤이에요'
    if (h < 12) return '좋은 아침이에요'
    if (h < 18) return '좋은 오후에요'
    return '좋은 저녁이에요'
  }

  // ============================================
  // god_admin 승인/거부 액션
  // ============================================
  const approveCompany = async (companyId: string) => {
    const { data, error } = await supabase.rpc('approve_company', { target_company_id: companyId })
    if (error) alert('승인 실패: ' + error.message)
    else if (data && !data.success) alert('승인 실패: ' + data.error)
    else fetchDashboardData()
  }

  const rejectCompany = async (companyId: string) => {
    if (!confirm('이 회사 가입 요청을 거부하시겠습니까? 관련 데이터가 삭제됩니다.')) return
    const { data, error } = await supabase.rpc('reject_company', { target_company_id: companyId })
    if (error) alert('거부 실패: ' + error.message)
    else if (data && !data.success) alert('거부 실패: ' + data.error)
    else fetchDashboardData()
  }

  // ============================================
  // 로딩 상태
  // ============================================
  if (appLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">로딩 중...</p>
        </div>
      </div>
    )
  }

  // 회사 미배정 상태
  if (!company && role !== 'god_admin') {
    return (
      <div className="max-w-7xl mx-auto py-8 px-6 min-h-screen bg-gray-50">
        <div className="mb-8">
          <p className="text-gray-500 text-sm font-medium">
            {currentTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          <h1 className="text-3xl font-black text-gray-900 mt-1">
            {getGreeting()}, <span className="text-indigo-600">{user?.email?.split('@')[0]}</span>
          </h1>
        </div>
        <div className="bg-white rounded-2xl p-8 border border-yellow-200 shadow-sm text-center">
          <p className="text-5xl mb-4">🏢</p>
          <h2 className="text-xl font-black text-gray-800 mb-2">회사가 배정되지 않았습니다</h2>
          <p className="text-gray-500 mb-1">아직 소속 회사가 설정되지 않았어요.</p>
          <p className="text-gray-400 text-sm">관리자에게 회사 배정을 요청해주세요.</p>
        </div>
      </div>
    )
  }

  // 회사 승인 대기 상태
  if (company && company.is_active === false && role !== 'god_admin') {
    return (
      <div className="max-w-7xl mx-auto py-8 px-6 min-h-screen bg-gray-50">
        <div className="mb-8">
          <p className="text-gray-500 text-sm font-medium">
            {currentTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
          <h1 className="text-3xl font-black text-gray-900 mt-1">
            {getGreeting()}, <span className="text-indigo-600">{company.name}</span>
          </h1>
        </div>
        <div className="bg-white rounded-2xl p-10 border border-yellow-200 shadow-sm text-center">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-gray-800 mb-3">가입 승인 대기중</h2>
          <p className="text-gray-500 mb-1">회사 가입 신청이 접수되었습니다.</p>
          <p className="text-gray-500 mb-4">플랫폼 관리자의 승인 후 서비스를 이용하실 수 있습니다.</p>
          <div className="inline-flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-3">
            <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
            <span className="text-sm font-bold text-yellow-700">승인 대기중</span>
          </div>
        </div>
      </div>
    )
  }

  // ============================================
  // GOD ADMIN 대시보드
  // ============================================
  if (role === 'god_admin') {
    const adminActions = [
      { label: '회사/가입 관리', desc: '가입 승인 및 회사 관리', href: '/admin', icon: '🏢', color: 'from-purple-600 to-indigo-600' },
      { label: '모듈 구독관리', desc: '회사별 기능 ON/OFF', href: '/system-admin', icon: '⚡', color: 'from-yellow-500 to-orange-500' },
      { label: '조직/권한 관리', desc: '직원 및 권한 설정', href: '/admin/employees', icon: '👥', color: 'from-teal-500 to-cyan-500' },
    ]

    return (
      <div className="max-w-7xl mx-auto py-8 px-6 min-h-screen bg-gray-50">

        {/* 헤더 */}
        <div className="mb-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-gray-500 text-sm font-medium">
                {currentTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
              </p>
              <h1 className="text-3xl font-black text-gray-900 mt-1">
                {getGreeting()}, <span className="text-purple-600">Platform Admin</span>
              </h1>
              <p className="text-gray-400 mt-1 text-sm">플랫폼 전체 현황을 확인하세요</p>
            </div>
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">
              GOD ADMIN
            </span>
          </div>
        </div>

        {/* 플랫폼 KPI 카드 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-purple-200 uppercase">등록 회사</span>
              <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm">🏢</span>
            </div>
            <p className="text-3xl font-black">{loading ? '-' : platformStats.totalCompanies}<span className="text-base font-bold text-purple-200 ml-1">개</span></p>
            <p className="mt-2 text-[11px] text-purple-200">활성 {platformStats.activeCompanies}개</p>
          </div>

          <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-2xl p-5 text-white shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-blue-200 uppercase">전체 사용자</span>
              <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm">👤</span>
            </div>
            <p className="text-3xl font-black">{loading ? '-' : platformStats.totalUsers}<span className="text-base font-bold text-blue-200 ml-1">명</span></p>
            <p className="mt-2 text-[11px] text-blue-200">가입된 전체 사용자</p>
          </div>

          <div className={`rounded-2xl p-5 shadow-lg ${
            platformStats.pendingCompanies > 0
              ? 'bg-gradient-to-br from-yellow-500 to-orange-500 text-white'
              : 'bg-white border border-gray-100 text-gray-900'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold uppercase ${platformStats.pendingCompanies > 0 ? 'text-yellow-100' : 'text-gray-400'}`}>승인 대기</span>
              <span className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center text-sm">⏳</span>
            </div>
            <p className="text-3xl font-black">{loading ? '-' : platformStats.pendingCompanies}<span className={`text-base font-bold ml-1 ${platformStats.pendingCompanies > 0 ? 'text-yellow-100' : 'text-gray-400'}`}>건</span></p>
            <p className={`mt-2 text-[11px] ${platformStats.pendingCompanies > 0 ? 'text-yellow-100' : 'text-gray-400'}`}>
              {platformStats.pendingCompanies > 0 ? '처리가 필요합니다' : '대기 없음'}
            </p>
          </div>

          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase">활성 모듈</span>
              <span className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-sm">📦</span>
            </div>
            <p className="text-3xl font-black text-gray-900">{loading ? '-' : platformStats.totalActiveModules}<span className="text-base font-bold text-gray-400 ml-1">개</span></p>
            <p className="mt-2 text-[11px] text-gray-400">전체 회사 활성 모듈</p>
          </div>
        </div>

        {/* 승인 대기 목록 */}
        {platformStats.pendingList.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-bold text-orange-500 uppercase tracking-wider mb-3">승인 대기 ({platformStats.pendingList.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {platformStats.pendingList.map(c => (
                <div key={c.id} className="bg-white rounded-xl p-4 border-2 border-yellow-200 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-black text-gray-900">{c.name}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          c.plan === 'master' ? 'bg-yellow-100 text-yellow-700' :
                          c.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{c.plan?.toUpperCase() || 'FREE'}</span>
                      </div>
                      {c.business_number && <p className="text-xs text-gray-400">사업자번호: {c.business_number}</p>}
                      <p className="text-xs text-gray-400">신청일: {new Date(c.created_at).toLocaleDateString('ko-KR')}</p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => approveCompany(c.id)}
                        className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        승인
                      </button>
                      <button
                        onClick={() => rejectCompany(c.id)}
                        className="px-3 py-1.5 text-xs font-bold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        거부
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 플랫폼 관리 바로가기 */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-purple-500 uppercase tracking-wider mb-3">플랫폼 관리</h2>
          <div className="grid grid-cols-3 gap-3">
            {adminActions.map(action => (
              <Link
                key={action.href}
                href={action.href}
                className="group bg-gray-900 rounded-xl p-5 hover:bg-gray-800 transition-all hover:scale-[1.02] border border-gray-800"
              >
                <span className="text-2xl">{action.icon}</span>
                <p className="text-white font-bold text-sm mt-2">{action.label}</p>
                <p className="text-gray-500 text-xs mt-0.5">{action.desc}</p>
              </Link>
            ))}
          </div>
        </div>

        {/* 회사별 현황 테이블 */}
        {platformStats.companyList.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">활성 회사 현황</h2>
              <Link href="/admin" className="text-xs text-indigo-500 hover:text-indigo-700 font-bold">
                전체 관리 →
              </Link>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-4">회사명</th>
                    <th className="p-4 text-center">플랜</th>
                    <th className="p-4 text-center">활성 모듈</th>
                    <th className="p-4 text-right">가입일</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {platformStats.companyList.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => router.push('/system-admin')}>
                      <td className="p-4">
                        <span className="font-bold text-gray-900">{c.name}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                          c.plan === 'master' ? 'bg-yellow-100 text-yellow-700' :
                          c.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-500'
                        }`}>{c.plan?.toUpperCase() || 'FREE'}</span>
                      </td>
                      <td className="p-4 text-center">
                        <span className="text-sm font-bold text-gray-700">{c.moduleCount}</span>
                        <span className="text-xs text-gray-400">/9</span>
                      </td>
                      <td className="p-4 text-right text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('ko-KR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    )
  }

  // ============================================
  // 회사 사용자 대시보드 (기존)
  // ============================================
  const allQuickActions = [
    { label: '차량 관리', desc: '차량 등록/조회', href: '/cars', icon: '🚗', color: 'from-blue-500 to-blue-600', modulePath: '/cars' },
    { label: '고객 관리', desc: '고객 정보 관리', href: '/customers', icon: '👥', color: 'from-emerald-500 to-emerald-600', modulePath: '/customers' },
    { label: '견적/계약', desc: '견적서 작성', href: '/quotes', icon: '📋', color: 'from-amber-500 to-amber-600', modulePath: '/quotes' },
    { label: '일반투자', desc: '투자 현황 관리', href: '/invest', icon: '💰', color: 'from-purple-500 to-purple-600', modulePath: '/invest' },
    { label: '지입투자', desc: '지입 계약 관리', href: '/jiip', icon: '🚛', color: 'from-rose-500 to-rose-600', modulePath: '/jiip' },
    { label: '재무관리', desc: '수입/지출 관리', href: '/finance', icon: '📊', color: 'from-cyan-500 to-cyan-600', modulePath: '/finance' },
  ]
  const quickActions = allQuickActions.filter(a => hasModule(a.modulePath))

  const showCars = hasModule('/cars')
  const showCustomers = hasModule('/customers')
  const showInvest = hasModule('/invest') || hasModule('/jiip')
  const showFinance = hasModule('/finance') || hasModule('/quotes')

  return (
    <div className="max-w-7xl mx-auto py-8 px-6 min-h-screen bg-gray-50">

      {/* 상단 인사 영역 */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <p className="text-gray-500 text-sm font-medium">
              {currentTime.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
            </p>
            <h1 className="text-3xl font-black text-gray-900 mt-1">
              {getGreeting()}, <span className="text-indigo-600">{company?.name || user?.email?.split('@')[0] || '사용자'}</span>
            </h1>
            <p className="text-gray-400 mt-1 text-sm">오늘의 업무 현황을 확인하세요</p>
          </div>
          <div className="flex gap-2 items-center">
            {company?.plan && (
              <span className={`text-xs font-black px-2.5 py-1 rounded-full ${
                company.plan === 'master' ? 'bg-yellow-100 text-yellow-700' :
                company.plan === 'pro' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-500'
              }`}>{company.plan.toUpperCase()}</span>
            )}
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              role === 'master' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}>{role === 'master' ? '관리자' : '직원'}</span>
            {position && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-100 text-green-700">{position.name}</span>
            )}
          </div>
        </div>
      </div>

      {/* KPI 카드 영역 */}
      {(showCars || showCustomers || showInvest) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {showCars && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">보유 차량</span>
                <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm">🚗</span>
              </div>
              <p className="text-3xl font-black text-gray-900">{loading ? '-' : stats.totalCars}<span className="text-base font-bold text-gray-400 ml-1">대</span></p>
              <div className="mt-2 flex gap-2 text-[11px] font-medium">
                <span className="text-green-600">대기 {stats.availableCars}</span>
                <span className="text-blue-600">대여 {stats.rentedCars}</span>
                <span className="text-red-500">정비 {stats.maintenanceCars}</span>
              </div>
            </div>
          )}
          {showCustomers && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">고객 수</span>
                <span className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-sm">👥</span>
              </div>
              <p className="text-3xl font-black text-gray-900">{loading ? '-' : stats.totalCustomers}<span className="text-base font-bold text-gray-400 ml-1">명</span></p>
              <p className="mt-2 text-[11px] text-gray-400">등록된 전체 고객</p>
            </div>
          )}
          {showInvest && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">투자 유치</span>
                <span className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center text-sm">💰</span>
              </div>
              <p className="text-3xl font-black text-gray-900">{loading ? '-' : formatMoney(stats.totalInvestAmount)}<span className="text-base font-bold text-gray-400 ml-1">원</span></p>
              <p className="mt-2 text-[11px] text-gray-400">일반투자 {stats.activeInvestments}건 / 지입 {stats.jiipContracts}건</p>
            </div>
          )}
          {showCars && (
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">가동률</span>
                <span className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center text-sm">📊</span>
              </div>
              <p className="text-3xl font-black text-gray-900">
                {loading || stats.totalCars === 0 ? '-' : Math.round((stats.rentedCars / stats.totalCars) * 100)}
                <span className="text-base font-bold text-gray-400 ml-1">%</span>
              </p>
              <p className="mt-2 text-[11px] text-gray-400">대여 중 / 전체 차량 비율</p>
            </div>
          )}
        </div>
      )}

      {/* 경영 현황판 */}
      {showFinance && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">월 예상 매출</span>
              <span className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-sm">💵</span>
            </div>
            <p className="text-2xl font-black text-blue-600">{loading ? '-' : formatMoney(stats.monthlyRevenue)}<span className="text-sm font-bold text-gray-400 ml-1">원</span></p>
            <p className="mt-2 text-[11px] text-gray-400">활성 렌트 계약 기준</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">월 고정 지출</span>
              <span className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center text-sm">💸</span>
            </div>
            <p className="text-2xl font-black text-red-500">{loading ? '-' : formatMoney(stats.monthlyExpense)}<span className="text-sm font-bold text-gray-400 ml-1">원</span></p>
            <p className="mt-2 text-[11px] text-gray-400">할부금 + 보험료 (월 환산)</p>
          </div>
          <div className="bg-gray-900 rounded-2xl p-5 shadow-lg ring-2 ring-gray-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-yellow-400 uppercase tracking-wide">월 순수익</span>
              <span className="w-8 h-8 rounded-lg bg-yellow-900/30 flex items-center justify-center text-sm">🏆</span>
            </div>
            <p className={`text-2xl font-black ${stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {loading ? '-' : formatMoney(stats.netProfit)}<span className="text-sm font-bold text-gray-500 ml-1">원</span>
            </p>
            <p className="mt-2 text-[11px] text-gray-500">매출 - 고정지출</p>
          </div>
        </div>
      )}

      {/* 빠른 액션 + 최근 차량 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {quickActions.length > 0 && (
          <div className="lg:col-span-1">
            <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">빠른 이동</h2>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map(action => (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all hover:scale-[1.02]"
                >
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-lg shadow-sm mb-3`}>
                    {action.icon}
                  </div>
                  <p className="text-gray-900 font-bold text-sm">{action.label}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{action.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        )}

        {showCars && (
          <div className={quickActions.length > 0 ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">최근 등록 차량</h2>
              <Link href="/cars" className="text-xs text-indigo-500 hover:text-indigo-700 font-bold">전체 보기 →</Link>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {loading ? (
                <div className="p-12 text-center text-gray-400">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                  로딩 중...
                </div>
              ) : recentCars.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-4xl mb-3">🚗</p>
                  <p className="text-gray-500 font-bold">등록된 차량이 없습니다</p>
                  <p className="text-gray-400 text-sm mt-1">차량 관리에서 첫 번째 차량을 등록해보세요</p>
                  <Link href="/cars" className="inline-block mt-4 px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700">
                    차량 등록하기
                  </Link>
                </div>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-4">차량번호</th>
                      <th className="p-4">차종</th>
                      <th className="p-4 text-center">상태</th>
                      <th className="p-4 text-right">등록일</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recentCars.map(car => (
                      <tr key={car.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => router.push(`/cars/${car.id}`)}>
                        <td className="p-4 font-black text-gray-900">{car.number}</td>
                        <td className="p-4">
                          <span className="font-bold text-gray-700 text-sm">{car.brand}</span>
                          <span className="text-gray-400 text-xs ml-1">{car.model}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            car.status === 'available' ? 'bg-green-100 text-green-700' :
                            car.status === 'rented' ? 'bg-blue-100 text-blue-700' :
                            'bg-red-100 text-red-600'
                          }`}>
                            {car.status === 'available' ? '대기' : car.status === 'rented' ? '대여' : car.status}
                          </span>
                        </td>
                        <td className="p-4 text-right text-xs text-gray-400">{car.created_at?.split('T')[0]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
