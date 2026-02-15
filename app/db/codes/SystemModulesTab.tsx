'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useApp } from '../../context/AppContext'

// ============================================
// 모듈 관리 탭 (god_admin 전용)
// system_modules + company_modules 조회/토글
// ============================================

interface SystemModule {
  id: string
  name: string
  path: string
  icon_key: string | null
  description: string | null
  plan_group: string
}

interface CompanyModule {
  company_id: string
  module_id: string
  is_active: boolean
}

interface CompanyInfo {
  id: string
  name: string
  plan: string
  is_active: boolean
}

const PLAN_COLORS: Record<string, string> = {
  free: 'bg-slate-100 text-slate-600 border-slate-200',
  basic: 'bg-green-100 text-green-700 border-green-200',
  pro: 'bg-blue-100 text-blue-700 border-blue-200',
  max: 'bg-amber-100 text-amber-700 border-amber-200',
}

const PLAN_LABELS: Record<string, string> = {
  free: '무료', basic: '베이직', pro: '프로', max: '맥스',
}

const ICON_MAP: Record<string, string> = {
  Doc: '📄', Car: '🚗', Truck: '🚛', Shield: '🛡️', Money: '💰',
  Clipboard: '📋', Building: '🏢', Chart: '📊', Wrench: '🔧',
  Database: '🗄️', Users: '👥', Setting: '⚙️',
}

export default function SystemModulesTab() {
  const supabase = createClientComponentClient()
  const { role, adminSelectedCompanyId, allCompanies } = useApp()

  const [modules, setModules] = useState<SystemModule[]>([])
  const [companyModules, setCompanyModules] = useState<CompanyModule[]>([])
  const [loading, setLoading] = useState(true)
  const [showGuide, setShowGuide] = useState(true)
  const [viewMode, setViewMode] = useState<'modules' | 'company'>('modules')

  // 현재 보고 있는 회사
  const selectedCompanyId = adminSelectedCompanyId || (allCompanies && allCompanies.length > 0 ? allCompanies[0].id : null)

  const fetchData = async () => {
    try {
      setLoading(true)

      const { data: modData, error: modErr } = await supabase
        .from('system_modules')
        .select('*')
        .order('path')

      if (modErr) throw modErr

      // company_modules 전체 조회
      const { data: cmData, error: cmErr } = await supabase
        .from('company_modules')
        .select('*')

      if (cmErr) throw cmErr

      setModules(modData || [])
      setCompanyModules(cmData || [])
    } catch (error) {
      console.error('모듈 데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (role === 'god_admin') fetchData()
  }, [role])

  const toggleModule = async (companyId: string, moduleId: string, currentState: boolean) => {
    try {
      if (currentState) {
        // 비활성화
        const { error } = await supabase
          .from('company_modules')
          .update({ is_active: false })
          .eq('company_id', companyId)
          .eq('module_id', moduleId)

        if (error) throw error
      } else {
        // 활성화 — upsert
        const { error } = await supabase
          .from('company_modules')
          .upsert({
            company_id: companyId,
            module_id: moduleId,
            is_active: true,
          }, { onConflict: 'company_id,module_id' })

        if (error) throw error
      }

      // 로컬 상태 업데이트
      setCompanyModules(prev => {
        const exists = prev.find(cm => cm.company_id === companyId && cm.module_id === moduleId)
        if (exists) {
          return prev.map(cm =>
            cm.company_id === companyId && cm.module_id === moduleId
              ? { ...cm, is_active: !currentState }
              : cm
          )
        }
        return [...prev, { company_id: companyId, module_id: moduleId, is_active: true }]
      })
    } catch (error) {
      console.error('모듈 토글 실패:', error)
      alert('모듈 상태 변경에 실패했습니다.')
    }
  }

  const isModuleActive = (companyId: string, moduleId: string): boolean => {
    const cm = companyModules.find(c => c.company_id === companyId && c.module_id === moduleId)
    return cm?.is_active ?? false
  }

  if (role !== 'god_admin') {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-4xl mb-3">🔒</div>
        <p className="text-sm text-gray-500">플랫폼 관리자만 접근 가능합니다</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
        <p className="text-gray-500 text-sm mt-4">모듈 정보를 불러오는 중...</p>
      </div>
    )
  }

  // 선택된 회사의 모듈 현황
  const selectedCompany = allCompanies?.find((c: any) => c.id === selectedCompanyId)
  const activeCompanies = allCompanies?.filter((c: any) => c.is_active) || []

  return (
    <div className="space-y-4">
      {/* 가이드 */}
      {showGuide && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-5 border border-purple-100">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🧩</span>
              <div>
                <h3 className="text-sm font-bold text-purple-900 mb-1">모듈 관리</h3>
                <p className="text-xs text-purple-700 leading-relaxed">
                  시스템에 등록된 모듈을 확인하고, 각 회사별로 모듈 활성화/비활성화를 관리합니다.
                  모듈 상세 설정(생성/수정/삭제, 플랜 그룹 변경)은 구독/모듈 관리 페이지에서 진행하세요.
                </p>
              </div>
            </div>
            <button onClick={() => setShowGuide(false)} className="text-purple-400 hover:text-purple-600 text-xs flex-shrink-0 ml-4">닫기</button>
          </div>
        </div>
      )}

      {/* 뷰 모드 전환 */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setViewMode('modules')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            viewMode === 'modules'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          전체 모듈 현황
        </button>
        <button
          onClick={() => setViewMode('company')}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
            viewMode === 'company'
              ? 'bg-gray-900 text-white'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          회사별 모듈
        </button>
        <div className="flex-1" />
        <a
          href="/system-admin"
          className="px-3 py-1.5 text-xs font-semibold text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
        >
          상세 관리 →
        </a>
      </div>

      {viewMode === 'modules' ? (
        /* 전체 모듈 목록 */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">전체 시스템 모듈</h3>
              <span className="text-xs text-gray-400">{modules.length}개 등록</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-bold text-gray-500 w-8"></th>
                  <th className="text-left px-4 py-2.5 font-bold text-gray-500">모듈명</th>
                  <th className="text-left px-4 py-2.5 font-bold text-gray-500">경로</th>
                  <th className="text-left px-4 py-2.5 font-bold text-gray-500">설명</th>
                  <th className="text-center px-4 py-2.5 font-bold text-gray-500">플랜</th>
                  <th className="text-center px-4 py-2.5 font-bold text-gray-500">사용 회사</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {modules.map(mod => {
                  const activeCount = companyModules.filter(cm => cm.module_id === mod.id && cm.is_active).length
                  const icon = ICON_MAP[mod.icon_key || ''] || '📦'
                  const planColor = PLAN_COLORS[mod.plan_group] || PLAN_COLORS.free

                  return (
                    <tr key={mod.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-center">{icon}</td>
                      <td className="px-4 py-2.5 font-bold text-gray-800">{mod.name}</td>
                      <td className="px-4 py-2.5">
                        <code className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-600">
                          {mod.path}
                        </code>
                      </td>
                      <td className="px-4 py-2.5 text-gray-500 max-w-[200px] truncate">
                        {mod.description || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${planColor}`}>
                          {PLAN_LABELS[mod.plan_group] || mod.plan_group}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`text-xs font-bold ${activeCount > 0 ? 'text-green-600' : 'text-gray-300'}`}>
                          {activeCount}
                        </span>
                        <span className="text-[10px] text-gray-400">/{activeCompanies.length}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* 회사별 모듈 토글 */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 회사 선택 */}
          <div className="lg:col-span-4">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="text-sm font-bold text-gray-900">회사 선택</h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                {activeCompanies.map((comp: any) => {
                  const activeModCount = companyModules.filter(cm => cm.company_id === comp.id && cm.is_active).length
                  return (
                    <button
                      key={comp.id}
                      onClick={() => {/* selectedCompanyId는 adminSelectedCompanyId로 제어 */}}
                      className={`w-full text-left p-3 transition-all ${
                        selectedCompanyId === comp.id
                          ? 'bg-purple-50 border-l-4 border-purple-500'
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-gray-700">{comp.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            {PLAN_LABELS[comp.plan] || comp.plan} | {activeModCount}개 모듈
                          </p>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${PLAN_COLORS[comp.plan] || PLAN_COLORS.free}`}>
                          {PLAN_LABELS[comp.plan] || comp.plan}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* 모듈 토글 */}
          <div className="lg:col-span-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">
                      {selectedCompany?.name || '회사를 선택하세요'}
                    </h3>
                    {selectedCompanyId && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        모듈을 켜거나 꺼서 이 회사에서 사용할 기능을 제어합니다
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {selectedCompanyId ? (
                <div className="divide-y divide-gray-50">
                  {modules.map(mod => {
                    const isActive = isModuleActive(selectedCompanyId, mod.id)
                    const icon = ICON_MAP[mod.icon_key || ''] || '📦'

                    return (
                      <div key={mod.id} className="flex items-center justify-between p-3 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-lg">{icon}</span>
                          <div>
                            <p className="text-xs font-bold text-gray-800">{mod.name}</p>
                            <p className="text-[10px] text-gray-400">{mod.path}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => toggleModule(selectedCompanyId, mod.id, isActive)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            isActive ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${
                            isActive ? 'left-5' : 'left-0.5'
                          }`} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-3">🏢</div>
                  <p className="text-sm text-gray-500">왼쪽에서 회사를 선택하세요</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
          <p className="text-2xl font-black text-gray-900">{modules.length}</p>
          <p className="text-[10px] text-gray-400 mt-1">전체 모듈</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
          <p className="text-2xl font-black text-green-600">{activeCompanies.length}</p>
          <p className="text-[10px] text-gray-400 mt-1">활성 회사</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
          <p className="text-2xl font-black text-purple-600">{companyModules.filter(cm => cm.is_active).length}</p>
          <p className="text-[10px] text-gray-400 mt-1">활성 연결</p>
        </div>
      </div>
    </div>
  )
}
