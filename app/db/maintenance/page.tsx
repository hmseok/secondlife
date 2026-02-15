'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useApp } from '../../context/AppContext'

// ============================================
// 정비 단가 DB — 항목별 부품비·공임·교체주기 상세 관리
// maintenance_db (항목별) + maintenance_cost_table (월정비 합산) 연동
// ============================================

interface MaintenanceItem {
  id: number
  item_name: string
  unit_price: number
  labor_cost: number
  cycle_km: number
  cycle_month: number
}

interface MonthlyCostRow {
  id: number
  vehicle_type: string
  fuel_type: string
  age_min: number
  age_max: number
  monthly_cost: number
  includes: string | null
  notes: string | null
}

// 정비 항목 카테고리 분류
const CATEGORIES: Record<string, string[]> = {
  '엔진/오일': ['엔진오일', '오일필터', '에어필터', '연료필터', '점화플러그'],
  '브레이크': ['브레이크패드', '브레이크디스크', '브레이크오일'],
  '타이어/서스': ['타이어', '얼라인먼트', '쇼바', '부싱'],
  '냉각/에어컨': ['냉각수', '에어컨필터', '에어컨가스', '라디에이터'],
  '전장': ['배터리', '와이퍼', '전구', '퓨즈'],
  '변속기': ['미션오일', 'CVT오일', '클러치'],
  '기타': [],
}

const f = (n: number) => n?.toLocaleString('ko-KR') || '0'

function categorizeItem(itemName: string): string {
  for (const [category, keywords] of Object.entries(CATEGORIES)) {
    if (category === '기타') continue
    if (keywords.some(kw => itemName.includes(kw))) return category
  }
  return '기타'
}

export default function MaintenanceDbPage() {
  const supabase = createClientComponentClient()
  const { role } = useApp()

  const [items, setItems] = useState<MaintenanceItem[]>([])
  const [monthlyCosts, setMonthlyCosts] = useState<MonthlyCostRow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [showGuide, setShowGuide] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  // CRUD
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    item_name: '', unit_price: 0, labor_cost: 0, cycle_km: 10000, cycle_month: 12
  })

  // 시뮬레이션
  const [simYears, setSimYears] = useState(3)
  const [simKmPerYear, setSimKmPerYear] = useState(20000)

  const isAdmin = role === 'god_admin' || role === 'master'

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [itemRes, costRes] = await Promise.all([
        supabase.from('maintenance_db').select('*').order('item_name'),
        supabase.from('maintenance_cost_table').select('*').order('vehicle_type'),
      ])
      setItems(itemRes.data || [])
      setMonthlyCosts(costRes.data || [])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // 카테고리별 분류
  const categorizedItems = items.reduce<Record<string, MaintenanceItem[]>>((acc, item) => {
    const cat = categorizeItem(item.item_name)
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const filteredItems = items.filter(item => {
    const matchCat = !selectedCategory || categorizeItem(item.item_name) === selectedCategory
    const matchSearch = !searchTerm || item.item_name.includes(searchTerm)
    return matchCat && matchSearch
  })

  // 정비비 시뮬레이션 계산
  const calcSimulation = () => {
    const totalKm = simYears * simKmPerYear
    const totalMonths = simYears * 12
    let totalCost = 0

    items.forEach(item => {
      const costPerOccurrence = item.unit_price + item.labor_cost
      // km 기준과 월 기준 중 먼저 도래하는 것 기준으로 교체 횟수 계산
      const kmOccurrences = item.cycle_km > 0 ? Math.floor(totalKm / item.cycle_km) : 0
      const monthOccurrences = item.cycle_month > 0 ? Math.floor(totalMonths / item.cycle_month) : 0
      const occurrences = Math.max(kmOccurrences, monthOccurrences)
      totalCost += costPerOccurrence * occurrences
    })

    return {
      totalCost,
      monthlyCost: Math.round(totalCost / totalMonths),
      perKmCost: totalKm > 0 ? Math.round(totalCost / totalKm * 1000) : 0,
    }
  }

  // CRUD 핸들러
  const handleAdd = async () => {
    if (!formData.item_name) { alert('항목명을 입력하세요.'); return }
    const { error } = await supabase.from('maintenance_db').insert([formData])
    if (error) { alert('저장 실패: ' + error.message); return }
    setShowAddForm(false)
    setFormData({ item_name: '', unit_price: 0, labor_cost: 0, cycle_km: 10000, cycle_month: 12 })
    fetchData()
  }

  const handleUpdate = async (id: number) => {
    const { error } = await supabase.from('maintenance_db').update(formData).eq('id', id)
    if (error) { alert('수정 실패: ' + error.message); return }
    setEditingId(null)
    fetchData()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 항목을 삭제하시겠습니까?')) return
    await supabase.from('maintenance_db').delete().eq('id', id)
    fetchData()
  }

  const startEdit = (item: MaintenanceItem) => {
    setEditingId(item.id)
    setFormData({
      item_name: item.item_name, unit_price: item.unit_price,
      labor_cost: item.labor_cost, cycle_km: item.cycle_km, cycle_month: item.cycle_month
    })
  }

  const sim = calcSimulation()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm mt-4">정비 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900">정비 단가 DB</h1>
              <p className="text-xs text-gray-500 mt-1">
                정비 항목별 부품비·공임·교체주기 관리 | 산출 기준표 월정비와 연동 검증
              </p>
            </div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              {showGuide ? '가이드 숨기기' : '가이드 보기'}
            </button>
          </div>
        </div>
      </div>

      {/* 가이드 */}
      {showGuide && (
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2 p-3 bg-white/70 rounded-xl">
                <span className="text-lg flex-shrink-0">🔧</span>
                <div>
                  <p className="font-bold text-gray-800 mb-0.5">항목별 단가</p>
                  <p className="text-gray-600">정비/소모품 항목의 부품비, 공임비, 교체 주기를 개별 관리합니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-white/70 rounded-xl">
                <span className="text-lg flex-shrink-0">📊</span>
                <div>
                  <p className="font-bold text-gray-800 mb-0.5">월정비 검증</p>
                  <p className="text-gray-600">산출 기준표의 월정비 합산표와 비교하여 기준값의 적정성을 검증합니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-white/70 rounded-xl">
                <span className="text-lg flex-shrink-0">🧮</span>
                <div>
                  <p className="font-bold text-gray-800 mb-0.5">비용 시뮬레이션</p>
                  <p className="text-gray-600">운행 기간·주행거리에 따른 총 정비비를 예측합니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 왼쪽: 항목 목록 */}
          <div className="lg:col-span-8">
            {/* 검색 + 추가 */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="항목명 검색..."
                className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white"
              />
              {isAdmin && (
                <button
                  onClick={() => { setShowAddForm(!showAddForm); setEditingId(null) }}
                  className="px-3 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700 whitespace-nowrap"
                >
                  + 항목 등록
                </button>
              )}
            </div>

            {/* 카테고리 필터 */}
            <div className="flex flex-wrap gap-1 mb-3">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-colors ${
                  !selectedCategory ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                전체 ({items.length})
              </button>
              {Object.keys(CATEGORIES).map(cat => {
                const count = (categorizedItems[cat] || []).length
                if (count === 0 && cat !== '기타') return null
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat === selectedCategory ? null : cat)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-colors ${
                      selectedCategory === cat ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                    }`}
                  >
                    {cat} ({count})
                  </button>
                )
              })}
            </div>

            {/* 추가 폼 */}
            {showAddForm && isAdmin && (
              <div className="bg-orange-50 rounded-xl border border-orange-100 p-4 mb-3">
                <h4 className="text-xs font-bold text-orange-800 mb-3">정비 항목 등록</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <input value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})}
                    placeholder="항목명" className="px-2 py-1.5 text-xs border rounded-lg col-span-2 sm:col-span-1" />
                  <input type="number" value={formData.unit_price || ''} onChange={e => setFormData({...formData, unit_price: Number(e.target.value)})}
                    placeholder="부품비(원)" className="px-2 py-1.5 text-xs border rounded-lg text-right" />
                  <input type="number" value={formData.labor_cost || ''} onChange={e => setFormData({...formData, labor_cost: Number(e.target.value)})}
                    placeholder="공임비(원)" className="px-2 py-1.5 text-xs border rounded-lg text-right" />
                  <input type="number" value={formData.cycle_km} onChange={e => setFormData({...formData, cycle_km: Number(e.target.value)})}
                    placeholder="주기(km)" className="px-2 py-1.5 text-xs border rounded-lg text-right" />
                  <input type="number" value={formData.cycle_month} onChange={e => setFormData({...formData, cycle_month: Number(e.target.value)})}
                    placeholder="주기(개월)" className="px-2 py-1.5 text-xs border rounded-lg text-right" />
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={handleAdd} className="px-3 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700">등록</button>
                  <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50">취소</button>
                </div>
              </div>
            )}

            {/* 항목 테이블 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-bold text-gray-500">카테고리</th>
                      <th className="text-left px-4 py-2.5 font-bold text-gray-500">항목명</th>
                      <th className="text-right px-4 py-2.5 font-bold text-gray-500">부품비</th>
                      <th className="text-right px-4 py-2.5 font-bold text-gray-500">공임비</th>
                      <th className="text-right px-4 py-2.5 font-bold text-gray-500">합계</th>
                      <th className="text-center px-4 py-2.5 font-bold text-gray-500">교체주기</th>
                      {isAdmin && <th className="text-center px-4 py-2.5 font-bold text-gray-500 w-20">관리</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredItems.map(item => {
                      const cat = categorizeItem(item.item_name)
                      return (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-2.5">
                            <span className="px-1.5 py-0.5 bg-orange-50 text-orange-600 rounded text-[10px] font-bold">{cat}</span>
                          </td>
                          <td className="px-4 py-2.5 font-bold text-gray-800">{item.item_name}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{f(item.unit_price)}원</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{f(item.labor_cost)}원</td>
                          <td className="px-4 py-2.5 text-right font-black text-orange-600">
                            {f(item.unit_price + item.labor_cost)}원
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className="text-[10px] text-gray-500">
                              {f(item.cycle_km)}km / {item.cycle_month}개월
                            </span>
                          </td>
                          {isAdmin && (
                            <td className="px-4 py-2.5 text-center">
                              <div className="flex gap-1 justify-center">
                                <button onClick={() => startEdit(item)} className="px-1.5 py-0.5 border border-gray-200 text-gray-500 rounded text-[10px] hover:bg-gray-50">편집</button>
                                <button onClick={() => handleDelete(item.id)} className="px-1.5 py-0.5 border border-red-200 text-red-500 rounded text-[10px] hover:bg-red-50">삭제</button>
                              </div>
                            </td>
                          )}
                        </tr>
                      )
                    })}
                    {filteredItems.length === 0 && (
                      <tr><td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-gray-400">등록된 정비 항목이 없습니다</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 편집 모달 */}
            {editingId && isAdmin && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingId(null)}>
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-3" onClick={e => e.stopPropagation()}>
                  <h3 className="text-sm font-bold text-gray-900">정비 항목 수정</h3>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">항목명</label>
                    <input value={formData.item_name} onChange={e => setFormData({...formData, item_name: e.target.value})}
                      className="w-full px-3 py-2 text-xs border rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">부품비(원)</label>
                      <input type="number" value={formData.unit_price} onChange={e => setFormData({...formData, unit_price: Number(e.target.value)})}
                        className="w-full px-3 py-2 text-xs border rounded-lg text-right" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">공임비(원)</label>
                      <input type="number" value={formData.labor_cost} onChange={e => setFormData({...formData, labor_cost: Number(e.target.value)})}
                        className="w-full px-3 py-2 text-xs border rounded-lg text-right" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">교체주기(km)</label>
                      <input type="number" value={formData.cycle_km} onChange={e => setFormData({...formData, cycle_km: Number(e.target.value)})}
                        className="w-full px-3 py-2 text-xs border rounded-lg text-right" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">교체주기(개월)</label>
                      <input type="number" value={formData.cycle_month} onChange={e => setFormData({...formData, cycle_month: Number(e.target.value)})}
                        className="w-full px-3 py-2 text-xs border rounded-lg text-right" />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleUpdate(editingId)} className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-lg hover:bg-orange-700">저장</button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50">취소</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽: 시뮬레이션 + 월정비 비교 */}
          <div className="lg:col-span-4 space-y-4">
            {/* 정비비 시뮬레이션 */}
            <div className="bg-slate-900 rounded-2xl shadow-sm p-5 text-white sticky top-32">
              <h4 className="text-xs font-bold text-slate-400 mb-3">정비비 시뮬레이션</h4>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">운행 기간</label>
                  <select
                    value={simYears}
                    onChange={e => setSimYears(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    {[1, 2, 3, 4, 5].map(y => (
                      <option key={y} value={y}>{y}년</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 block mb-1">연간 주행</label>
                  <select
                    value={simKmPerYear}
                    onChange={e => setSimKmPerYear(Number(e.target.value))}
                    className="w-full px-2 py-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    {[10000, 15000, 20000, 25000, 30000].map(km => (
                      <option key={km} value={km}>{f(km)}km</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="bg-slate-800 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400">총 예상 정비비 ({simYears}년)</p>
                  <p className="text-xl font-black text-orange-400">{f(sim.totalCost)}원</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-slate-800 rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-400">월 평균</p>
                    <p className="text-sm font-black text-white">{f(sim.monthlyCost)}원</p>
                  </div>
                  <div className="bg-slate-800 rounded-lg p-2.5">
                    <p className="text-[10px] text-slate-400">1,000km당</p>
                    <p className="text-sm font-black text-white">{f(sim.perKmCost)}원</p>
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-500 mt-3">
                * 등록된 {items.length}개 항목 기준 산출
              </p>
            </div>

            {/* 산출 기준표 월정비 비교 */}
            {monthlyCosts.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <h4 className="text-xs font-bold text-gray-900 mb-3">
                  산출 기준표 월정비 비교
                </h4>
                <p className="text-[10px] text-gray-400 mb-2">
                  pricing-standards &gt; 정비비 탭의 기준값
                </p>

                <div className="space-y-1.5">
                  {monthlyCosts.slice(0, 6).map(row => (
                    <div key={row.id} className="flex items-center justify-between py-1 border-b border-gray-50">
                      <div>
                        <p className="text-[10px] font-bold text-gray-700">{row.vehicle_type}</p>
                        <p className="text-[10px] text-gray-400">{row.fuel_type} | {row.age_min}~{row.age_max}년</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-gray-800">{f(row.monthly_cost)}원/월</p>
                        <p className={`text-[10px] font-bold ${
                          sim.monthlyCost > row.monthly_cost ? 'text-red-500' : 'text-green-500'
                        }`}>
                          {sim.monthlyCost > row.monthly_cost ? '▲' : '▼'}
                          {f(Math.abs(sim.monthlyCost - row.monthly_cost))}원 차이
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <a
                  href="/db/pricing-standards"
                  className="block w-full text-center mt-3 px-3 py-1.5 text-xs font-semibold text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50"
                >
                  산출 기준표에서 상세 확인 →
                </a>
              </div>
            )}

            {/* 통계 */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className="text-xl font-black text-gray-900">{items.length}</p>
                <p className="text-[10px] text-gray-400">항목수</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className="text-xl font-black text-orange-600">{Object.keys(categorizedItems).length}</p>
                <p className="text-[10px] text-gray-400">카테고리</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className="text-xl font-black text-blue-600">{f(sim.monthlyCost)}</p>
                <p className="text-[10px] text-gray-400">월평균(원)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
