'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'
import { useApp } from '../context/AppContext'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// ============================================
// 관리자 대시보드
// god_admin: 전체 플랫폼 관리
// master: 자기 회사 관리
// ============================================

type Company = {
  id: string
  name: string
  business_number: string | null
  plan: string
  created_at: string
  owner_id: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user, company, role } = useApp()

  const [companies, setCompanies] = useState<Company[]>([])
  const [employeeCount, setEmployeeCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) fetchDashboardData()
  }, [user, company, role])

  const fetchDashboardData = async () => {
    try {
      setLoading(true)

      // god_admin: 전체 회사, master: 자기 회사만
      if (role === 'god_admin') {
        const { data } = await supabase
          .from('companies')
          .select('*')
          .order('created_at', { ascending: false })
        setCompanies(data || [])

        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
        setEmployeeCount(count || 0)
      } else if (company) {
        setCompanies([company])
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id)
        setEmployeeCount(count || 0)
      }
    } catch (error) {
      console.error('Dashboard Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin text-4xl">&#9203;</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans text-slate-900">
      {/* 헤더 */}
      <div className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
            {role === 'god_admin' ? 'Platform Dashboard' : 'Company Dashboard'}
          </h1>
          <p className="text-slate-500">
            환영합니다, <span className="font-bold text-blue-600">{user?.email}</span>님.
          </p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-100"
        >
          새로고침
        </button>
      </div>

      {/* KPI + 관리 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {role === 'god_admin' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="text-sm font-bold text-slate-400 uppercase mb-1">Total Companies</div>
            <div className="text-4xl font-extrabold text-slate-900">{companies.length}</div>
          </div>
        )}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-sm font-bold text-slate-400 uppercase mb-1">직원 수</div>
          <div className="text-4xl font-extrabold text-blue-600">{employeeCount}</div>
        </div>

        {/* 빠른 관리 링크 */}
        <Link href="/admin/employees" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group">
          <div className="text-sm font-bold text-slate-400 uppercase mb-2">조직 관리</div>
          <div className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">직원/직급/부서 &rarr;</div>
          <p className="text-xs text-slate-400 mt-1">직원 정보, 직급 배정, 부서 관리</p>
        </Link>

        <Link href="/admin/permissions" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-blue-300 hover:shadow-md transition-all group">
          <div className="text-sm font-bold text-slate-400 uppercase mb-2">권한 설정</div>
          <div className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">페이지 권한 &rarr;</div>
          <p className="text-xs text-slate-400 mt-1">직급별 페이지 접근 권한 매트릭스</p>
        </Link>
      </div>

      {/* 회사 목록 (god_admin만) */}
      {role === 'god_admin' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-800">Registered Companies</h2>
            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-1 rounded-full">
              {companies.length}개 사
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-5 text-xs font-bold text-slate-500 uppercase">Company Name</th>
                  <th className="p-5 text-xs font-bold text-slate-500 uppercase">Business No.</th>
                  <th className="p-5 text-xs font-bold text-slate-500 uppercase">Plan</th>
                  <th className="p-5 text-xs font-bold text-slate-500 uppercase">Registered</th>
                  <th className="p-5 text-xs font-bold text-slate-500 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((comp) => (
                  <tr key={comp.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="p-5">
                      <div className="font-bold text-slate-900">{comp.name}</div>
                      <div className="text-xs text-slate-400 font-mono mt-0.5">{comp.id.slice(0, 8)}...</div>
                    </td>
                    <td className="p-5 text-sm text-slate-600">{comp.business_number || '-'}</td>
                    <td className="p-5">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                        comp.plan === 'free' ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'
                      }`}>{comp.plan}</span>
                    </td>
                    <td className="p-5 text-sm text-slate-600">{formatDate(comp.created_at)}</td>
                    <td className="p-5 text-right">
                      <Link href={`/admin/${comp.id}`} className="text-sm font-bold text-blue-600 hover:underline">
                        Manage
                      </Link>
                    </td>
                  </tr>
                ))}
                {companies.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">등록된 회사가 없습니다.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
