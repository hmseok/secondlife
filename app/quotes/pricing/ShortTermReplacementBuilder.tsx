'use client'
import { supabase } from '../../utils/supabase'
import { useApp } from '../../context/AppContext'
import { useEffect, useState, useMemo } from 'react'

interface RateRow {
  id?: string
  service_group: string
  vehicle_class: string
  displacement_range: string
  daily_rate: number
  sort_order: number
  is_active: boolean
}

// 기본 정비군 템플릿
const DEFAULT_GROUPS: Omit<RateRow, 'id'>[] = [
  { service_group: '1군', vehicle_class: '승용', displacement_range: '2000cc 미만', daily_rate: 40000, sort_order: 1, is_active: true },
  { service_group: '2군', vehicle_class: '승용', displacement_range: '2000cc 이상', daily_rate: 50000, sort_order: 2, is_active: true },
  { service_group: '3군', vehicle_class: 'RV·SUV', displacement_range: '2000cc 미만', daily_rate: 55000, sort_order: 3, is_active: true },
  { service_group: '4군', vehicle_class: 'RV·SUV', displacement_range: '2000cc 이상', daily_rate: 65000, sort_order: 4, is_active: true },
  { service_group: '5군', vehicle_class: '승합', displacement_range: '전체', daily_rate: 75000, sort_order: 5, is_active: true },
]

// 제공일수 프리셋
const DAY_PRESETS = [5, 10, 15, 20]

export default function ShortTermReplacementBuilder() {
  const { company, role, adminSelectedCompanyId } = useApp()
  const effectiveCompanyId = role === 'god_admin' ? adminSelectedCompanyId : company?.id

  const [rates, setRates] = useState<RateRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editMode, setEditMode] = useState(false)

  // 견적 산출 상태
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [customDays, setCustomDays] = useState<number[]>(DAY_PRESETS)
  const [showCustomDayInput, setShowCustomDayInput] = useState(false)
  const [newDayValue, setNewDayValue] = useState('')

  // 견적서 상태
  const [customerName, setCustomerName] = useState('')
  const [contractPeriod, setContractPeriod] = useState('1년')
  const [showPreview, setShowPreview] = useState(false)
  const [selectedPackages, setSelectedPackages] = useState<{ group: string; days: number }[]>([])

  useEffect(() => { fetchRates() }, [effectiveCompanyId])

  const fetchRates = async () => {
    if (!effectiveCompanyId) return
    setLoading(true)
    const { data } = await supabase
      .from('short_term_rates')
      .select('*')
      .eq('company_id', effectiveCompanyId)
      .eq('is_active', true)
      .order('sort_order')
    if (data && data.length > 0) {
      setRates(data)
    } else {
      // 기본 템플릿 표시 (저장 전)
      setRates(DEFAULT_GROUPS.map((g, i) => ({ ...g, id: `temp_${i}` })))
    }
    setLoading(false)
  }

  const handleRateChange = (index: number, value: number) => {
    setRates(prev => {
      const next = [...prev]
      next[index] = { ...next[index], daily_rate: value }
      return next
    })
  }

  const handleFieldChange = (index: number, field: keyof RateRow, value: any) => {
    setRates(prev => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  const addRow = () => {
    setRates(prev => [...prev, {
      id: `temp_new_${Date.now()}`,
      service_group: `${prev.length + 1}군`,
      vehicle_class: '승용',
      displacement_range: '전체',
      daily_rate: 50000,
      sort_order: prev.length + 1,
      is_active: true
    }])
  }

  const removeRow = (index: number) => {
    setRates(prev => prev.filter((_, i) => i !== index))
  }

  const saveRates = async () => {
    if (!effectiveCompanyId) return
    setSaving(true)
    try {
      // 기존 데이터 삭제 후 재삽입
      await supabase.from('short_term_rates').delete().eq('company_id', effectiveCompanyId)
      const payload = rates.map((r, i) => ({
        company_id: effectiveCompanyId,
        service_group: r.service_group,
        vehicle_class: r.vehicle_class,
        displacement_range: r.displacement_range,
        daily_rate: r.daily_rate,
        sort_order: i + 1,
        is_active: true
      }))
      const { error } = await supabase.from('short_term_rates').insert(payload)
      if (error) throw error
      alert('요율표가 저장되었습니다!')
      setEditMode(false)
      fetchRates()
    } catch (err: any) {
      alert('저장 실패: ' + err.message)
    }
    setSaving(false)
  }

  const addCustomDay = () => {
    const v = parseInt(newDayValue)
    if (v > 0 && !customDays.includes(v)) {
      setCustomDays(prev => [...prev, v].sort((a, b) => a - b))
      setNewDayValue('')
      setShowCustomDayInput(false)
    }
  }

  const removeDay = (day: number) => {
    if (customDays.length <= 1) return
    setCustomDays(prev => prev.filter(d => d !== day))
  }

  const togglePackage = (group: string, days: number) => {
    setSelectedPackages(prev => {
      const exists = prev.find(p => p.group === group && p.days === days)
      if (exists) return prev.filter(p => !(p.group === group && p.days === days))
      return [...prev, { group, days }]
    })
  }

  const isPackageSelected = (group: string, days: number) => {
    return selectedPackages.some(p => p.group === group && p.days === days)
  }

  const f = (n: number) => (n || 0).toLocaleString()

  // 견적 합계 계산
  const quoteTotals = useMemo(() => {
    let total = 0
    const items = selectedPackages.map(pkg => {
      const rate = rates.find(r => r.service_group === pkg.group)
      if (!rate) return null
      const amount = rate.daily_rate * pkg.days
      total += amount
      return { ...pkg, dailyRate: rate.daily_rate, amount, vehicleClass: rate.vehicle_class, displacement: rate.displacement_range }
    }).filter(Boolean)
    return { items, total, vat: Math.round(total * 0.1), totalWithVat: Math.round(total * 1.1) }
  }, [selectedPackages, rates])

  if (loading) return <div className="p-20 text-center font-bold text-gray-500">데이터 불러오는 중...</div>

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 md:py-10 md:px-6">

      {/* 견적 산출 메인 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* 좌측: 요율표 */}
        <div className="lg:col-span-8 space-y-6">

          {/* 요율표 카드 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 bg-steel-600 rounded-full"></span>
                <h2 className="text-lg font-bold text-gray-800">단기대차 요율표</h2>
                <span className="text-xs text-gray-400 font-bold ml-1">정비군별 1일 대차 단가</span>
              </div>
              <div className="flex gap-2">
                {editMode ? (
                  <>
                    <button onClick={addRow} className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-200 transition-colors">
                      + 행 추가
                    </button>
                    <button onClick={() => { setEditMode(false); fetchRates() }} className="text-xs bg-white border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-50 transition-colors">
                      취소
                    </button>
                    <button onClick={saveRates} disabled={saving} className="text-xs bg-steel-600 text-white px-4 py-1.5 rounded-lg font-bold hover:bg-steel-700 transition-colors disabled:opacity-50">
                      {saving ? '저장 중...' : '저장'}
                    </button>
                  </>
                ) : (
                  <button onClick={() => setEditMode(true)} className="text-xs bg-white border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg font-bold hover:bg-gray-50 transition-colors">
                    요율 편집
                  </button>
                )}
              </div>
            </div>

            {/* 제공일수 설정 */}
            <div className="px-5 py-3 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-gray-400 mr-1">제공일수:</span>
              {customDays.map(day => (
                <span key={day} className="inline-flex items-center gap-1 bg-white border border-gray-200 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-700">
                  연 {day}일
                  {customDays.length > 1 && (
                    <button onClick={() => removeDay(day)} className="text-gray-300 hover:text-red-500 ml-0.5">&times;</button>
                  )}
                </span>
              ))}
              {showCustomDayInput ? (
                <div className="inline-flex items-center gap-1">
                  <input
                    autoFocus
                    type="number"
                    className="w-16 border border-gray-200 px-2 py-1 rounded-lg text-xs font-bold text-center focus:border-steel-500 outline-none"
                    placeholder="일수"
                    value={newDayValue}
                    onChange={e => setNewDayValue(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && addCustomDay()}
                  />
                  <button onClick={addCustomDay} className="text-xs text-steel-600 font-bold">확인</button>
                  <button onClick={() => setShowCustomDayInput(false)} className="text-xs text-gray-400 font-bold">취소</button>
                </div>
              ) : (
                <button onClick={() => setShowCustomDayInput(true)} className="text-xs text-steel-600 font-bold bg-steel-50 px-2 py-1 rounded-lg hover:bg-steel-100 transition-colors">
                  + 추가
                </button>
              )}
            </div>

            {/* 요율 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="p-3 pl-5 text-left text-xs font-bold text-gray-500 uppercase w-20">정비군</th>
                    <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase">차종</th>
                    <th className="p-3 text-left text-xs font-bold text-gray-500 uppercase">배기량</th>
                    <th className="p-3 text-right text-xs font-bold text-gray-500 uppercase w-28">1일 단가</th>
                    {customDays.map(day => (
                      <th key={day} className="p-3 text-right text-xs font-bold text-steel-600 uppercase w-32">
                        연 {day}일
                      </th>
                    ))}
                    {editMode && <th className="p-3 w-12"></th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rates.map((rate, idx) => (
                    <tr
                      key={rate.id || idx}
                      className={`hover:bg-steel-50/30 transition-colors ${selectedGroup === rate.service_group ? 'bg-steel-50' : ''}`}
                      onClick={() => !editMode && setSelectedGroup(rate.service_group)}
                    >
                      <td className="p-3 pl-5">
                        {editMode ? (
                          <input className="w-16 border border-gray-200 px-2 py-1 rounded text-xs font-bold text-center" value={rate.service_group} onChange={e => handleFieldChange(idx, 'service_group', e.target.value)} />
                        ) : (
                          <span className="inline-block bg-steel-100 text-steel-700 px-2 py-0.5 rounded text-xs font-bold">{rate.service_group}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {editMode ? (
                          <select className="border border-gray-200 px-2 py-1 rounded text-xs font-bold" value={rate.vehicle_class} onChange={e => handleFieldChange(idx, 'vehicle_class', e.target.value)}>
                            <option>승용</option><option>RV·SUV</option><option>승합</option><option>특수</option><option>경차</option>
                          </select>
                        ) : (
                          <span className="text-sm font-bold text-gray-800">{rate.vehicle_class}</span>
                        )}
                      </td>
                      <td className="p-3">
                        {editMode ? (
                          <select className="border border-gray-200 px-2 py-1 rounded text-xs font-bold" value={rate.displacement_range} onChange={e => handleFieldChange(idx, 'displacement_range', e.target.value)}>
                            <option>2000cc 미만</option><option>2000cc 이상</option><option>1600cc 미만</option><option>1600cc 이상</option><option>전체</option>
                          </select>
                        ) : (
                          <span className="text-xs text-gray-500 font-bold">{rate.displacement_range}</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        {editMode ? (
                          <input
                            type="text"
                            className="w-24 border border-gray-200 px-2 py-1 rounded text-xs font-bold text-right"
                            value={f(rate.daily_rate)}
                            onChange={e => handleRateChange(idx, Number(e.target.value.replace(/,/g, '')))}
                          />
                        ) : (
                          <span className="text-sm font-bold text-gray-900">{f(rate.daily_rate)}원</span>
                        )}
                      </td>
                      {customDays.map(day => {
                        const packagePrice = rate.daily_rate * day
                        const selected = isPackageSelected(rate.service_group, day)
                        return (
                          <td key={day} className="p-3 text-right">
                            <button
                              onClick={(e) => { e.stopPropagation(); togglePackage(rate.service_group, day) }}
                              className={`text-right w-full px-2 py-1 rounded-lg transition-all text-xs font-bold ${
                                selected
                                  ? 'bg-steel-600 text-white shadow-sm'
                                  : 'hover:bg-steel-50 text-gray-700'
                              }`}
                            >
                              {f(packagePrice)}원
                            </button>
                          </td>
                        )
                      })}
                      {editMode && (
                        <td className="p-3 text-center">
                          <button onClick={() => removeRow(idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 안내 문구 */}
            {!editMode && (
              <div className="p-4 bg-gray-50/50 border-t border-gray-100 text-xs text-gray-400 text-center">
                금액을 클릭하여 견적에 추가 · 행을 클릭하여 상세 보기 · <button onClick={() => setEditMode(true)} className="text-steel-600 font-bold hover:underline">요율 편집</button>
              </div>
            )}
          </div>

          {/* 견적서 프리뷰 */}
          {showPreview && selectedPackages.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 print:shadow-none print:border-0" id="quote-print">
              <div className="text-center mb-8">
                <h1 className="text-2xl font-black text-gray-900">단기대차 서비스 견적서</h1>
                <p className="text-sm text-gray-500 mt-1">{new Date().toLocaleDateString('ko-KR')}</p>
              </div>

              {customerName && (
                <div className="mb-6 pb-4 border-b border-gray-200">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-gray-400 font-bold">고객명:</span> <span className="font-bold text-gray-800 ml-2">{customerName}</span></div>
                    <div><span className="text-gray-400 font-bold">계약기간:</span> <span className="font-bold text-gray-800 ml-2">{contractPeriod}</span></div>
                  </div>
                </div>
              )}

              <table className="w-full text-sm mb-6">
                <thead>
                  <tr className="border-b-2 border-gray-300">
                    <th className="p-2 text-left font-bold text-gray-600">정비군</th>
                    <th className="p-2 text-left font-bold text-gray-600">차종 / 배기량</th>
                    <th className="p-2 text-right font-bold text-gray-600">1일 단가</th>
                    <th className="p-2 text-center font-bold text-gray-600">제공일수</th>
                    <th className="p-2 text-right font-bold text-gray-600">연간 금액</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quoteTotals.items.map((item: any, i: number) => (
                    <tr key={i}>
                      <td className="p-2 font-bold text-gray-800">{item.group}</td>
                      <td className="p-2 text-gray-600">{item.vehicleClass} / {item.displacement}</td>
                      <td className="p-2 text-right text-gray-700">{f(item.dailyRate)}원</td>
                      <td className="p-2 text-center text-gray-700">{item.days}일</td>
                      <td className="p-2 text-right font-bold text-gray-900">{f(item.amount)}원</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-gray-300">
                    <td colSpan={4} className="p-2 text-right font-bold text-gray-600">합계 (VAT 별도)</td>
                    <td className="p-2 text-right font-black text-gray-900 text-lg">{f(quoteTotals.total)}원</td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="p-2 text-right font-bold text-gray-400">VAT (10%)</td>
                    <td className="p-2 text-right font-bold text-gray-500">{f(quoteTotals.vat)}원</td>
                  </tr>
                  <tr className="bg-steel-50">
                    <td colSpan={4} className="p-3 text-right font-black text-steel-800">합계 (VAT 포함)</td>
                    <td className="p-3 text-right font-black text-steel-900 text-xl">{f(quoteTotals.totalWithVat)}원</td>
                  </tr>
                </tfoot>
              </table>

              <div className="mt-8 pt-6 border-t border-gray-200 text-xs text-gray-400">
                <p>* 상기 금액은 연간 기준이며, 계약 조건에 따라 변동될 수 있습니다.</p>
                <p>* 대차 차량은 동급 이상 차량으로 제공됩니다.</p>
              </div>
            </div>
          )}
        </div>

        {/* 우측: 견적 사이드바 */}
        <div className="lg:col-span-4 space-y-6">

          {/* 선택된 패키지 요약 */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 sticky top-6">
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="w-1 h-5 bg-emerald-600 rounded-full"></span>
                <h2 className="text-lg font-bold text-gray-800">견적 구성</h2>
              </div>
            </div>

            {/* 고객 정보 */}
            <div className="p-5 border-b border-gray-100">
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase">고객명</label>
              <input
                className="w-full border border-gray-200 p-2.5 rounded-xl font-bold text-sm bg-white focus:border-steel-500 outline-none"
                placeholder="고객명 입력"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
              />
              <label className="block text-xs font-bold text-gray-400 mb-1.5 uppercase mt-3">계약 기간</label>
              <div className="flex gap-2">
                {['1년', '2년', '3년'].map(p => (
                  <button
                    key={p}
                    onClick={() => setContractPeriod(p)}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      contractPeriod === p ? 'bg-steel-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* 선택 항목 */}
            <div className="p-5">
              {selectedPackages.length === 0 ? (
                <div className="text-center py-6 text-gray-400 text-sm">
                  <p className="text-2xl mb-2">📋</p>
                  <p className="font-bold">요율표에서 금액을 클릭하여</p>
                  <p>견적 항목을 추가하세요</p>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {quoteTotals.items.map((item: any, i: number) => (
                    <div key={i} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <div>
                        <span className="text-xs font-bold text-steel-700 bg-steel-50 px-1.5 py-0.5 rounded">{item.group}</span>
                        <span className="text-xs text-gray-400 ml-1.5">연 {item.days}일</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-800">{f(item.amount)}원</span>
                        <button
                          onClick={() => togglePackage(item.group, item.days)}
                          className="text-gray-300 hover:text-red-500 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 합계 */}
              {selectedPackages.length > 0 && (
                <div className="space-y-2 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase">합계 (VAT 별도)</span>
                    <span className="text-sm font-bold text-gray-700">{f(quoteTotals.total)}원</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-400 uppercase">VAT</span>
                    <span className="text-sm font-bold text-gray-500">{f(quoteTotals.vat)}원</span>
                  </div>
                  <div className="flex justify-between items-center py-2 bg-steel-50 -mx-5 px-5 rounded-xl">
                    <span className="text-xs font-bold text-steel-800 uppercase">연간 총액 (VAT 포함)</span>
                    <span className="text-xl font-black text-steel-900">{f(quoteTotals.totalWithVat)}원</span>
                  </div>

                  {/* 월 환산 */}
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-bold text-gray-400">월 환산</span>
                    <span className="text-sm font-bold text-gray-600">{f(Math.round(quoteTotals.totalWithVat / 12))}원/월</span>
                  </div>
                </div>
              )}
            </div>

            {/* 액션 버튼 */}
            {selectedPackages.length > 0 && (
              <div className="p-5 border-t border-gray-100 space-y-2">
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full py-3 bg-steel-700 text-white rounded-xl font-bold hover:bg-steel-800 shadow-lg hover:shadow-xl transition-all"
                >
                  {showPreview ? '견적서 닫기' : '견적서 미리보기'}
                </button>
                {showPreview && (
                  <button
                    onClick={() => window.print()}
                    className="w-full py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all"
                  >
                    인쇄
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 선택된 정비군 상세 */}
          {selectedGroup && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-5 bg-blue-600 rounded-full"></span>
                <h3 className="text-lg font-bold text-gray-800">{selectedGroup} 상세</h3>
              </div>

              {(() => {
                const rate = rates.find(r => r.service_group === selectedGroup)
                if (!rate) return null
                return (
                  <div className="space-y-3">
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-gray-400 font-bold block mb-1">차종</span>
                          <span className="text-sm font-bold text-gray-800">{rate.vehicle_class}</span>
                        </div>
                        <div>
                          <span className="text-gray-400 font-bold block mb-1">배기량</span>
                          <span className="text-sm font-bold text-gray-800">{rate.displacement_range}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center py-2 border-b border-gray-100">
                      <span className="text-xs font-bold text-gray-400">1일 단가</span>
                      <span className="text-lg font-black text-gray-900">{f(rate.daily_rate)}원</span>
                    </div>

                    {customDays.map(day => (
                      <div key={day} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-xs font-bold text-gray-400">연 {day}일 패키지</span>
                        <div className="text-right">
                          <div className="text-sm font-bold text-gray-800">{f(rate.daily_rate * day)}원</div>
                          <div className="text-[10px] text-gray-400">VAT 포함 {f(Math.round(rate.daily_rate * day * 1.1))}원</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
