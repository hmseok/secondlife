'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useApp } from '../../context/AppContext'

// ============================================
// 통합 견적 DB — 경쟁사 벤치마크 + 견적 결과 비교
// lotte_rentcar_db (일렌트/월렌트/장기렌트 통합)
// ============================================

const f = (n: number) => n?.toLocaleString('ko-KR') || '0'

const RENTAL_TYPES = [
  { key: 'all', label: '전체', color: 'bg-gray-900 text-white' },
  { key: 'daily', label: '단기(일)', color: 'bg-orange-100 text-orange-700' },
  { key: 'monthly', label: '월간', color: 'bg-green-100 text-green-700' },
  { key: 'long', label: '장기', color: 'bg-blue-100 text-blue-700' },
]

export default function LotteDbPage() {
  const supabase = createClientComponentClient()
  const { role } = useApp()

  const [list, setList] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [showGuide, setShowGuide] = useState(true)
  const [selectedContract, setSelectedContract] = useState<any>(null)
  const [checkedIds, setCheckedIds] = useState<number[]>([])

  // AI 견적
  const [showAiModal, setShowAiModal] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [rentalType, setRentalType] = useState<'daily' | 'monthly' | 'long'>('long')
  const [targetBrand, setTargetBrand] = useState('')
  const [targetModel, setTargetModel] = useState('')
  const [targetTerm, setTargetTerm] = useState('48')
  const [conditions, setConditions] = useState({
    mileage: '2만km', age: '만 26세 이상', deposit: '보증금 0%', maintenance: false, type: 'buyout'
  })

  const isAdmin = role === 'god_admin' || role === 'master'

  useEffect(() => { fetchList() }, [])

  useEffect(() => {
    if (rentalType === 'daily') setTargetTerm('1')
    else if (rentalType === 'monthly') setTargetTerm('1')
    else setTargetTerm('48')
  }, [rentalType])

  const fetchList = async () => {
    const { data } = await supabase.from('lotte_rentcar_db').select('*').order('created_at', { ascending: false })
    setList(data || [])
  }

  const parseContract = (item: any) => {
    try { return JSON.parse(item.memo) } catch { return {} }
  }

  const getRentalType = (item: any) => {
    const d = parseContract(item)
    return d.rental_type || 'long'
  }

  const filteredList = list.filter(item => {
    const matchSearch = !searchTerm || item.model?.includes(searchTerm) || item.brand?.includes(searchTerm)
    const matchType = filterType === 'all' || getRentalType(item) === filterType
    return matchSearch && matchType
  })

  // 통계
  const stats = {
    total: list.length,
    daily: list.filter(i => getRentalType(i) === 'daily').length,
    monthly: list.filter(i => getRentalType(i) === 'monthly').length,
    long: list.filter(i => getRentalType(i) === 'long').length,
    avgPrice: list.length > 0 ? Math.round(list.reduce((s, i) => s + (i.monthly_price || 0), 0) / list.length) : 0,
  }

  const toggleCheck = (id: number) => {
    setCheckedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id])
  }

  const handleDeleteSelected = async () => {
    if (!confirm(`${checkedIds.length}개 견적을 삭제하시겠습니까?`)) return
    await supabase.from('lotte_rentcar_db').delete().in('id', checkedIds)
    setCheckedIds([])
    fetchList()
  }

  // AI 견적 요청
  const handleAiEstimate = async () => {
    if (!targetBrand || !targetModel) { alert('브랜드와 차종을 입력하세요.'); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/car-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'estimate_price', rental_type: rentalType,
          brand: targetBrand, model: targetModel, term: Number(targetTerm),
          conditions,
        }),
      })
      const result = await res.json()
      if (result.error) throw new Error(result.error)

      const metaData = JSON.stringify({
        ...result.contract_details, rental_type: rentalType, conditions_input: conditions,
      })

      let typeTag = ''
      if (rentalType === 'daily') typeTag = '[단기] '
      else if (rentalType === 'monthly') typeTag = '[월간] '

      await supabase.from('lotte_rentcar_db').insert([{
        brand: targetBrand, model: targetModel,
        trim: typeTag + (conditions.mileage || '기본'),
        term: Number(targetTerm), deposit_rate: 0,
        monthly_price: result.estimated_price || 0, memo: metaData,
      }])

      setShowAiModal(false)
      fetchList()
    } catch (e: any) {
      alert('견적 산출 실패: ' + e.message)
    } finally {
      setAiLoading(false)
    }
  }

  const getTypeInfo = (type: string) => {
    if (type === 'daily') return { label: '단기', color: 'bg-orange-100 text-orange-700 border-orange-200', unit: '일' }
    if (type === 'monthly') return { label: '월간', color: 'bg-green-100 text-green-700 border-green-200', unit: '개월' }
    return { label: '장기', color: 'bg-blue-100 text-blue-700 border-blue-200', unit: '개월' }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900">통합 견적 DB</h1>
              <p className="text-xs text-gray-500 mt-1">
                단기/월간/장기 렌트 견적 결과 통합 관리 | 경쟁사 벤치마크 비교
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAiModal(true)}
                className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700"
              >
                AI 견적 산출
              </button>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                {showGuide ? '가이드 숨기기' : '가이드 보기'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      {showGuide && (
        <div className="bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2 p-3 bg-white/70 rounded-xl">
                <span className="text-lg flex-shrink-0">📋</span>
                <div>
                  <p className="font-bold text-gray-800 mb-0.5">견적 아카이브</p>
                  <p className="text-gray-600">AI 산출 견적과 경쟁사 견적을 저장하고 이력을 관리합니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-white/70 rounded-xl">
                <span className="text-lg flex-shrink-0">📊</span>
                <div>
                  <p className="font-bold text-gray-800 mb-0.5">가격 비교</p>
                  <p className="text-gray-600">같은 차종의 단기·월간·장기 견적을 비교하여 최적 상품을 설계합니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-white/70 rounded-xl">
                <span className="text-lg flex-shrink-0">🤖</span>
                <div>
                  <p className="font-bold text-gray-800 mb-0.5">AI 견적 산출</p>
                  <p className="text-gray-600">Gemini AI가 시장 데이터를 분석하여 경쟁력 있는 렌트가를 산출합니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 왼쪽: 견적 목록 */}
          <div className="lg:col-span-8">
            {/* 검색 + 필터 */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="브랜드, 모델명 검색..."
                className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white"
              />
              {checkedIds.length > 0 && isAdmin && (
                <button onClick={handleDeleteSelected} className="px-3 py-2 bg-red-100 text-red-600 text-xs font-bold rounded-lg hover:bg-red-200">
                  {checkedIds.length}개 삭제
                </button>
              )}
            </div>

            {/* 렌트 유형 필터 */}
            <div className="flex flex-wrap gap-1 mb-3">
              {RENTAL_TYPES.map(rt => (
                <button
                  key={rt.key}
                  onClick={() => setFilterType(rt.key)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-colors ${
                    filterType === rt.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {rt.label} ({rt.key === 'all' ? stats.total : rt.key === 'daily' ? stats.daily : rt.key === 'monthly' ? stats.monthly : stats.long})
                </button>
              ))}
            </div>

            {/* 견적 테이블 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-center px-3 py-2.5 w-8">
                        <input type="checkbox" className="w-3 h-3"
                          checked={checkedIds.length === filteredList.length && filteredList.length > 0}
                          onChange={() => setCheckedIds(checkedIds.length === filteredList.length ? [] : filteredList.map(i => i.id))}
                        />
                      </th>
                      <th className="text-left px-4 py-2.5 font-bold text-gray-500">구분</th>
                      <th className="text-left px-4 py-2.5 font-bold text-gray-500">차종</th>
                      <th className="text-center px-4 py-2.5 font-bold text-gray-500">기간</th>
                      <th className="text-right px-4 py-2.5 font-bold text-gray-500">견적가</th>
                      <th className="text-center px-4 py-2.5 font-bold text-gray-500 w-16">상세</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredList.map(item => {
                      const rType = getRentalType(item)
                      const typeInfo = getTypeInfo(rType)
                      const d = parseContract(item)
                      return (
                        <tr key={item.id} className={`transition-colors ${checkedIds.includes(item.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                          <td className="text-center px-3 py-2.5">
                            <input type="checkbox" className="w-3 h-3"
                              checked={checkedIds.includes(item.id)}
                              onChange={() => toggleCheck(item.id)}
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${typeInfo.color}`}>
                              {typeInfo.label}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <p className="font-bold text-gray-800">{item.brand} {item.model}</p>
                            <p className="text-[10px] text-gray-400">{item.trim}</p>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] font-bold text-gray-600">
                              {item.term}{typeInfo.unit}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className="font-black text-red-600">{f(item.monthly_price)}원</span>
                            <span className="text-[10px] text-gray-400">/{rType === 'daily' ? '일' : '월'}</span>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <button
                              onClick={() => setSelectedContract({ ...item, rType })}
                              className="px-2 py-0.5 border border-gray-200 rounded text-[10px] font-bold text-gray-500 hover:bg-gray-50"
                            >
                              보기
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {filteredList.length === 0 && (
                      <tr><td colSpan={6} className="p-8 text-center text-gray-400">견적 데이터가 없습니다</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 오른쪽: 통계 + 상세 */}
          <div className="lg:col-span-4 space-y-4">
            {/* 통계 */}
            <div className="bg-slate-900 rounded-2xl shadow-sm p-5 text-white sticky top-32">
              <h4 className="text-xs font-bold text-slate-400 mb-3">견적 현황</h4>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-slate-800 rounded-lg p-2.5 text-center">
                  <p className="text-xl font-black text-white">{stats.total}</p>
                  <p className="text-[10px] text-slate-400">전체 견적</p>
                </div>
                <div className="bg-slate-800 rounded-lg p-2.5 text-center">
                  <p className="text-xl font-black text-red-400">{f(stats.avgPrice)}</p>
                  <p className="text-[10px] text-slate-400">평균 견적가</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">단기(일)</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-orange-400 rounded-full" style={{ width: `${stats.total > 0 ? stats.daily / stats.total * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs font-bold text-white w-6 text-right">{stats.daily}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">월간</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-green-400 rounded-full" style={{ width: `${stats.total > 0 ? stats.monthly / stats.total * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs font-bold text-white w-6 text-right">{stats.monthly}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">장기</span>
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{ width: `${stats.total > 0 ? stats.long / stats.total * 100 : 0}%` }} />
                    </div>
                    <span className="text-xs font-bold text-white w-6 text-right">{stats.long}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 선택된 견적 상세 */}
            {selectedContract && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gray-900 text-white p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-xs text-gray-400">견적서</p>
                      <p className="text-sm font-black">{selectedContract.brand} {selectedContract.model}</p>
                    </div>
                    <button onClick={() => setSelectedContract(null)} className="text-gray-400 hover:text-white text-xs">닫기</button>
                  </div>
                  <p className="text-2xl font-black text-red-400 mt-2">{f(selectedContract.monthly_price)}원<span className="text-xs text-gray-400">/{selectedContract.rType === 'daily' ? '일' : '월'}</span></p>
                </div>
                <div className="p-4 space-y-2 text-xs">
                  {(() => {
                    const d = parseContract(selectedContract)
                    const ti = getTypeInfo(selectedContract.rType)
                    return (
                      <>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-gray-400">유형</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${ti.color}`}>{ti.label}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-gray-50">
                          <span className="text-gray-400">기간</span>
                          <span className="font-bold">{selectedContract.term}{ti.unit}</span>
                        </div>
                        {d.conditions_input?.mileage && (
                          <div className="flex justify-between py-1 border-b border-gray-50">
                            <span className="text-gray-400">주행거리</span>
                            <span className="font-bold">{d.conditions_input.mileage}</span>
                          </div>
                        )}
                        {d.maintenance_info && (
                          <div className="flex justify-between py-1 border-b border-gray-50">
                            <span className="text-gray-400">정비/보험</span>
                            <span className="font-bold">{d.maintenance_info}</span>
                          </div>
                        )}
                        {d.market_comment && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-lg">
                            <p className="text-[10px] font-bold text-gray-400 mb-1">AI 분석</p>
                            <p className="text-[10px] text-gray-600 leading-relaxed">{d.market_comment}</p>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>
              </div>
            )}

            {/* 연동 링크 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h4 className="text-xs font-bold text-gray-900 mb-2">관련 페이지</h4>
              <div className="space-y-1.5">
                <a href="/quotes/pricing" className="block px-3 py-2 bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100">
                  렌트가 산출기 →
                </a>
                <a href="/db/pricing-standards" className="block px-3 py-2 bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100">
                  산출 기준 관리 →
                </a>
                <a href="/db/models" className="block px-3 py-2 bg-gray-50 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100">
                  차량 시세 DB →
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI 견적 모달 */}
      {showAiModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAiModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-purple-600 text-white p-4 flex justify-between items-center">
              <h3 className="text-sm font-bold">AI 통합 견적 산출</h3>
              <button onClick={() => setShowAiModal(false)} className="text-white/70 hover:text-white">×</button>
            </div>

            {/* 렌트 유형 탭 */}
            <div className="flex border-b bg-gray-50">
              {[
                { key: 'daily' as const, label: '단기(일)', activeColor: 'text-orange-600 border-orange-500' },
                { key: 'monthly' as const, label: '월간', activeColor: 'text-green-600 border-green-500' },
                { key: 'long' as const, label: '장기', activeColor: 'text-blue-600 border-blue-500' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setRentalType(t.key)}
                  className={`flex-1 py-2.5 text-xs font-bold transition-all ${
                    rentalType === t.key ? `bg-white ${t.activeColor} border-b-2` : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">브랜드</label>
                  <input className="w-full px-2 py-1.5 text-xs border rounded-lg" value={targetBrand} onChange={e => setTargetBrand(e.target.value)} placeholder="현대" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">모델명</label>
                  <input className="w-full px-2 py-1.5 text-xs border rounded-lg" value={targetModel} onChange={e => setTargetModel(e.target.value)} placeholder="그랜저" />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3 border space-y-2">
                <div>
                  <label className="text-[10px] font-bold text-gray-500 block mb-1">
                    {rentalType === 'daily' ? '대여일수' : rentalType === 'monthly' ? '대여개월' : '계약기간'}
                  </label>
                  <select className="w-full px-2 py-1.5 text-xs border rounded-lg bg-white" value={targetTerm} onChange={e => setTargetTerm(e.target.value)}>
                    {rentalType === 'daily' && [1,2,3,5,7,10,15,30].map(d => <option key={d} value={d}>{d}일</option>)}
                    {rentalType === 'monthly' && [1,2,3,6,11].map(m => <option key={m} value={m}>{m}개월</option>)}
                    {rentalType === 'long' && [24,36,48,60].map(y => <option key={y} value={y}>{y}개월</option>)}
                  </select>
                </div>

                {rentalType === 'long' && (
                  <>
                    <div className="flex gap-2">
                      <select className="flex-1 px-2 py-1.5 text-[10px] border rounded-lg" value={conditions.mileage} onChange={e => setConditions({...conditions, mileage: e.target.value})}>
                        <option>2만km/년</option><option>3만km/년</option><option>무제한</option>
                      </select>
                      <select className="flex-1 px-2 py-1.5 text-[10px] border rounded-lg" value={conditions.deposit} onChange={e => setConditions({...conditions, deposit: e.target.value})}>
                        <option>보증금 0%</option><option>보증금 30%</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={conditions.maintenance} onChange={e => setConditions({...conditions, maintenance: e.target.checked})} className="w-3 h-3" />
                      <span className="text-[10px] font-bold text-gray-700">정비포함</span>
                    </label>
                  </>
                )}
                {rentalType !== 'long' && (
                  <p className="text-[10px] text-gray-400 text-center">* 단기/월간은 정비·보험 기본 포함</p>
                )}
              </div>

              <button
                onClick={handleAiEstimate}
                disabled={aiLoading}
                className="w-full py-2.5 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {aiLoading ? '시장 분석 중...' : 'AI 견적 산출'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
