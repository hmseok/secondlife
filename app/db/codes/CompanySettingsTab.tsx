'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useApp } from '../../context/AppContext'

// ============================================
// 회사 설정 탭
// companies 테이블 기본 정보 확인/수정
// ============================================

interface CompanyInfo {
  id: string
  name: string
  business_number: string | null
  business_registration_url: string | null
  plan: string
  is_active: boolean
  created_at: string
  owner_id: string | null
}

const PLAN_LABELS: Record<string, { label: string; color: string; desc: string }> = {
  free: { label: '무료', color: 'bg-slate-100 text-slate-600', desc: '기본 기능만 제공' },
  basic: { label: '베이직', color: 'bg-green-100 text-green-700', desc: '핵심 업무 기능 포함' },
  pro: { label: '프로', color: 'bg-blue-100 text-blue-700', desc: '전체 업무 + 분석 기능' },
  max: { label: '맥스', color: 'bg-amber-100 text-amber-700', desc: '전체 기능 + 프리미엄 지원' },
}

export default function CompanySettingsTab() {
  const supabase = createClientComponentClient()
  const { role, company, adminSelectedCompanyId } = useApp()

  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showGuide, setShowGuide] = useState(true)

  // 편집 모드
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    business_number: '',
  })

  // 대상 회사 ID
  const targetCompanyId = role === 'god_admin' && adminSelectedCompanyId
    ? adminSelectedCompanyId
    : company?.id

  const fetchCompany = async () => {
    if (!targetCompanyId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', targetCompanyId)
        .single()

      if (error) throw error
      setCompanyInfo(data)
      setEditForm({
        name: data.name || '',
        business_number: data.business_number || '',
      })
    } catch (error) {
      console.error('회사 정보 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCompany() }, [targetCompanyId])

  const handleSave = async () => {
    if (!companyInfo || !editForm.name.trim()) {
      alert('회사명은 필수입니다.')
      return
    }

    try {
      setSaving(true)
      const { error } = await supabase
        .from('companies')
        .update({
          name: editForm.name.trim(),
          business_number: editForm.business_number.trim() || null,
        })
        .eq('id', companyInfo.id)

      if (error) throw error

      setCompanyInfo({
        ...companyInfo,
        name: editForm.name.trim(),
        business_number: editForm.business_number.trim() || null,
      })
      setIsEditing(false)
    } catch (error) {
      console.error('회사 정보 수정 실패:', error)
      alert('회사 정보 수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const isAdmin = role === 'god_admin' || role === 'master'

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
        <p className="text-gray-500 text-sm mt-4">회사 정보를 불러오는 중...</p>
      </div>
    )
  }

  if (!companyInfo) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="text-4xl mb-3">🏢</div>
        <p className="text-sm text-gray-500">회사 정보를 찾을 수 없습니다</p>
        <p className="text-xs text-gray-400 mt-1">관리자에게 문의하세요</p>
      </div>
    )
  }

  const planInfo = PLAN_LABELS[companyInfo.plan] || PLAN_LABELS.free
  const createdDate = new Date(companyInfo.created_at).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div className="space-y-4">
      {/* 가이드 */}
      {showGuide && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-5 border border-emerald-100">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🏢</span>
              <div>
                <h3 className="text-sm font-bold text-emerald-900 mb-1">회사 설정</h3>
                <p className="text-xs text-emerald-700 leading-relaxed">
                  회사 기본 정보(상호, 사업자번호 등)를 확인하고 수정합니다.
                  구독 플랜 정보와 가입일도 여기서 확인할 수 있습니다.
                  {role === 'god_admin' && ' (플랫폼 관리자: 상단에서 회사를 선택하여 다른 회사 정보도 확인 가능)'}
                </p>
              </div>
            </div>
            <button onClick={() => setShowGuide(false)} className="text-emerald-400 hover:text-emerald-600 text-xs flex-shrink-0 ml-4">닫기</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 왼쪽: 회사 정보 카드 */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">기본 정보</h3>
                {isAdmin && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    수정
                  </button>
                )}
              </div>
            </div>

            <div className="p-5">
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1.5">회사명 *</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1.5">사업자등록번호</label>
                    <input
                      type="text"
                      value={editForm.business_number}
                      onChange={e => setEditForm({ ...editForm, business_number: e.target.value })}
                      placeholder="123-45-67890"
                      className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {saving ? '저장 중...' : '저장'}
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false)
                        setEditForm({
                          name: companyInfo.name || '',
                          business_number: companyInfo.business_number || '',
                        })
                      }}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">회사명</p>
                      <p className="text-sm font-bold text-gray-900">{companyInfo.name}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">사업자등록번호</p>
                      <p className="text-sm font-bold text-gray-900">{companyInfo.business_number || '미등록'}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">가입일</p>
                      <p className="text-sm font-bold text-gray-900">{createdDate}</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">상태</p>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${
                        companyInfo.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-600'
                      }`}>
                        {companyInfo.is_active ? '운영 중' : '비활성'}
                      </span>
                    </div>
                  </div>

                  {companyInfo.business_registration_url && (
                    <div className="p-3 bg-gray-50 rounded-xl">
                      <p className="text-[10px] font-bold text-gray-400 mb-1">사업자등록증</p>
                      <a
                        href={companyInfo.business_registration_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        등록증 보기
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 오른쪽: 구독 정보 */}
        <div className="lg:col-span-4">
          <div className="bg-slate-900 rounded-2xl shadow-sm p-5 text-white sticky top-32">
            <h4 className="text-xs font-bold text-slate-400 mb-4">구독 플랜</h4>

            <div className="text-center mb-4">
              <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-black ${planInfo.color}`}>
                {planInfo.label}
              </span>
              <p className="text-xs text-slate-400 mt-2">{planInfo.desc}</p>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-700">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">플랜</span>
                <span className="text-xs font-bold text-white">{planInfo.label}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">상태</span>
                <span className={`text-xs font-bold ${companyInfo.is_active ? 'text-green-400' : 'text-red-400'}`}>
                  {companyInfo.is_active ? '활성' : '비활성'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-slate-400">가입일</span>
                <span className="text-xs font-bold text-white">{createdDate}</span>
              </div>
            </div>

            {role !== 'god_admin' && (
              <div className="mt-4 pt-3 border-t border-slate-700">
                <p className="text-[10px] text-slate-500 leading-relaxed">
                  플랜 변경은 플랫폼 관리자에게 문의하세요.
                </p>
              </div>
            )}

            {role === 'god_admin' && (
              <div className="mt-4 pt-3 border-t border-slate-700">
                <p className="text-[10px] text-slate-500 leading-relaxed mb-2">
                  플랜 변경은 구독/모듈 관리 페이지에서 진행하세요.
                </p>
                <a
                  href="/system-admin"
                  className="block w-full text-center px-3 py-2 bg-slate-700 text-white text-xs font-semibold rounded-lg hover:bg-slate-600 transition-colors"
                >
                  구독/모듈 관리
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
