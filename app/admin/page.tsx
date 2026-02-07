'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// 데이터 타입 정의
type Company = {
  id: string
  name: string
  business_number: string | null
  plan: string
  created_at: string
  owner_id: string
}

export default function AdminDashboard() {
  const supabase = createClientComponentClient()
  const router = useRouter()

  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // 1. 현재 로그인한 사용자 확인
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/')
        return
      }
      setUserEmail(session.user.email || '')

      // 2. 모든 회사 데이터 가져오기 (슈퍼 관리자 권한으로 전체 조회)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching companies:', error)
      } else {
        setCompanies(data || [])
      }
    } catch (error) {
      console.error('Dashboard Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 날짜 포맷팅 함수
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">

      {/* 1. 상단 헤더 & 환영 메시지 */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Dashboard</h1>
          <p className="text-slate-500">
            환영합니다, <span className="font-bold text-blue-600">{userEmail}</span>님.
            전체 플랫폼 현황입니다.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100 transition-colors"
        >
          🔄 새로고침
        </button>
      </div>

      {/* 2. KPI 요약 카드 (Stats) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {/* Total Companies */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1">Total Companies</div>
          <div className="text-4xl font-extrabold text-slate-900">{companies.length}</div>
          <div className="mt-4 text-xs font-medium text-green-600 bg-green-50 inline-block px-2 py-1 rounded">
            +100% Growth
          </div>
        </div>

        {/* Active Plans (Dummy Logic for now) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1">Free Plan Users</div>
          <div className="text-4xl font-extrabold text-slate-900">
            {companies.filter(c => c.plan === 'free').length}
          </div>
          <div className="mt-4 text-xs font-medium text-slate-500">
            잠재적 유료 전환 고객
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-1">New This Month</div>
          <div className="text-4xl font-extrabold text-blue-600">
            {companies.length}
          </div>
          <div className="mt-4 text-xs font-medium text-slate-500">
            신규 가입 기업
          </div>
        </div>
      </div>

      {/* 3. 전체 기업 리스트 테이블 */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-800">Registered Companies</h2>
          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
            All Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="p-5 text-xs font-bold text-slate-500 uppercase">Company Name</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase">Business No.</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase">Plan Status</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase">Registered Date</th>
                <th className="p-5 text-xs font-bold text-slate-500 uppercase text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {companies.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    등록된 회사가 없습니다.
                  </td>
                </tr>
              ) : (
                companies.map((company) => (
                  <tr key={company.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="p-5">
                      <div className="font-bold text-slate-900">{company.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{company.id.slice(0, 8)}...</div>
                    </td>
                    <td className="p-5 text-sm text-slate-600">
                      {company.business_number || <span className="text-slate-300">-</span>}
                    </td>
                    <td className="p-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${company.plan === 'free' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}>
                        {company.plan}
                      </span>
                    </td>
                    <td className="p-5 text-sm text-slate-600">
                      {formatDate(company.created_at)}
                    </td>
                    <td className="p-5 text-right">
                      <button className="text-sm font-bold text-blue-600 hover:text-blue-800 hover:underline">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}