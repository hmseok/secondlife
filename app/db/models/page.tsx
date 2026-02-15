'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useApp } from '../../context/AppContext'

// ============================================
// 차량 시세 DB — 차종별 출고가·시세 + 감가 시뮬레이션
// market_price_db + depreciation_db 연동
// ============================================

interface MarketPrice {
  id: number
  brand: string
  model: string
  trim: string | null
  year: number
  standard_price: number
}

interface DepreciationRate {
  id: number
  category: string
  rate_1yr: number
  rate_2yr: number
  rate_3yr: number
  rate_4yr: number
  rate_5yr: number
}

const BRAND_GROUPS: Record<string, string[]> = {
  '국산': ['현대', '기아', '제네시스', 'KG모빌리티', '쉐보레', '르노코리아'],
  '수입(독일)': ['BMW', '벤츠', '아우디', '폭스바겐', '포르쉐', '미니'],
  '수입(기타)': ['볼보', '토요타', '렉서스', '혼다', '닛산', '테슬라', '폴스타', '랜드로버', '재규어'],
}

const f = (n: number) => n?.toLocaleString('ko-KR') || '0'

export default function ModelDbPage() {
  const supabase = createClientComponentClient()
  const { role } = useApp()

  const [list, setList] = useState<MarketPrice[]>([])
  const [depRates, setDepRates] = useState<DepreciationRate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null)
  const [selectedItem, setSelectedItem] = useState<MarketPrice | null>(null)
  const [showGuide, setShowGuide] = useState(true)

  // CRUD
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formData, setFormData] = useState({
    brand: '', model: '', trim: '', year: new Date().getFullYear(), standard_price: 0
  })

  // AI 조회
  const [aiLoading, setAiLoading] = useState(false)
  const [aiQuery, setAiQuery] = useState({ brand: '', model: '' })
  const [aiResults, setAiResults] = useState<any[]>([])
  const [showAiPanel, setShowAiPanel] = useState(false)

  const isAdmin = role === 'god_admin' || role === 'master'

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [priceRes, depRes] = await Promise.all([
        supabase.from('market_price_db').select('*').order('brand').order('model').order('year', { ascending: false }),
        supabase.from('depreciation_db').select('*').order('category'),
      ])
      setList(priceRes.data || [])
      setDepRates(depRes.data || [])
    } catch (error) {
      console.error('데이터 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  // 브랜드별 그룹핑
  const brands = [...new Set(list.map(item => item.brand))].sort()
  const filteredList = list.filter(item => {
    const matchBrand = !selectedBrand || item.brand === selectedBrand
    const matchSearch = !searchTerm ||
      item.brand.includes(searchTerm) ||
      item.model.includes(searchTerm) ||
      item.trim?.includes(searchTerm)
    return matchBrand && matchSearch
  })

  // 감가 카테고리 자동 매핑
  const mapToDepCategory = (item: MarketPrice): DepreciationRate | null => {
    const brand = item.brand.toLowerCase()
    const isImported = !['현대', '기아', '제네시스', 'KG모빌리티', '쉐보레', '르노코리아'].includes(item.brand)
    const isEV = item.trim?.includes('전기') || item.trim?.includes('EV') || item.brand === '테슬라'

    let categoryKeyword = isImported ? '수입' : '국산'
    if (isEV) categoryKeyword = '전기'

    const matched = depRates.find(d =>
      d.category.includes(categoryKeyword)
    )
    return matched || depRates[0] || null
  }

  // 잔가 계산
  const calcResidualValues = (price: number, dep: DepreciationRate | null) => {
    if (!dep) return []
    return [
      { year: 1, rate: dep.rate_1yr, value: Math.round(price * dep.rate_1yr / 100) },
      { year: 2, rate: dep.rate_2yr, value: Math.round(price * dep.rate_2yr / 100) },
      { year: 3, rate: dep.rate_3yr, value: Math.round(price * dep.rate_3yr / 100) },
      { year: 4, rate: dep.rate_4yr, value: Math.round(price * dep.rate_4yr / 100) },
      { year: 5, rate: dep.rate_5yr, value: Math.round(price * dep.rate_5yr / 100) },
    ]
  }

  // CRUD 핸들러
  const handleAdd = async () => {
    if (!formData.brand || !formData.model || !formData.standard_price) {
      return alert('제조사, 모델명, 기준가는 필수입니다.')
    }
    const { error } = await supabase.from('market_price_db').insert([{
      brand: formData.brand, model: formData.model,
      trim: formData.trim || null, year: formData.year,
      standard_price: formData.standard_price,
    }])
    if (error) { alert('저장 실패: ' + error.message); return }
    setShowAddForm(false)
    setFormData({ brand: '', model: '', trim: '', year: new Date().getFullYear(), standard_price: 0 })
    fetchData()
  }

  const handleUpdate = async (id: number) => {
    const { error } = await supabase.from('market_price_db').update({
      brand: formData.brand, model: formData.model,
      trim: formData.trim || null, year: formData.year,
      standard_price: formData.standard_price,
    }).eq('id', id)
    if (error) { alert('수정 실패: ' + error.message); return }
    setEditingId(null)
    fetchData()
  }

  const handleDelete = async (id: number) => {
    if (!confirm('이 시세 데이터를 삭제하시겠습니까?')) return
    await supabase.from('market_price_db').delete().eq('id', id)
    if (selectedItem?.id === id) setSelectedItem(null)
    fetchData()
  }

  const startEdit = (item: MarketPrice) => {
    setEditingId(item.id)
    setFormData({ brand: item.brand, model: item.model, trim: item.trim || '', year: item.year, standard_price: item.standard_price })
  }

  // AI 신차 조회
  const handleAiLookup = async () => {
    if (!aiQuery.brand || !aiQuery.model) { alert('브랜드와 모델명을 입력하세요.'); return }
    setAiLoading(true)
    setAiResults([])
    try {
      const res = await fetch('/api/lookup-new-car', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(aiQuery),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setAiResults(data.trims || [])
    } catch (error: any) {
      alert('AI 조회 실패: ' + error.message)
    } finally {
      setAiLoading(false)
    }
  }

  const registerFromAi = async (trim: any) => {
    const newItem = {
      brand: aiQuery.brand,
      model: aiQuery.model,
      trim: trim.name,
      year: new Date().getFullYear(),
      standard_price: trim.price,
    }
    const { error } = await supabase.from('market_price_db').insert([newItem])
    if (error) { alert('등록 실패: ' + error.message); return }
    fetchData()
    alert(`${aiQuery.brand} ${aiQuery.model} ${trim.name} 등록 완료`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-48 mx-auto" />
            <div className="h-4 bg-gray-200 rounded w-64 mx-auto" />
          </div>
          <p className="text-gray-500 text-sm mt-4">차량 시세 데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  const selectedDep = selectedItem ? mapToDepCategory(selectedItem) : null
  const residualValues = selectedItem ? calcResidualValues(selectedItem.standard_price, selectedDep) : []

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900">차량 시세 DB</h1>
              <p className="text-xs text-gray-500 mt-1">
                차종별 출고가·시세 관리 | 감가율 연동 잔가 시뮬레이션 | 신차 AI 조회
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAiPanel(!showAiPanel)}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
                  showAiPanel ? 'bg-purple-600 text-white' : 'border border-purple-200 text-purple-600 hover:bg-purple-50'
                }`}
              >
                AI 신차 조회
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
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-blue-100">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="flex items-start gap-2 p-3 bg-white/70 rounded-xl">
                <span className="text-lg flex-shrink-0">🚗</span>
                <div>
                  <p className="font-bold text-gray-800 mb-0.5">시세 카탈로그</p>
                  <p className="text-gray-600">브랜드/모델/트림별 출고가와 시세를 체계적으로 관리합니다. 견적 산출의 기준 가격입니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-white/70 rounded-xl">
                <span className="text-lg flex-shrink-0">📉</span>
                <div>
                  <p className="font-bold text-gray-800 mb-0.5">감가 시뮬레이션</p>
                  <p className="text-gray-600">산출 기준표의 감가율과 연동하여 연식별 잔존가치를 자동 계산합니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-white/70 rounded-xl">
                <span className="text-lg flex-shrink-0">🤖</span>
                <div>
                  <p className="font-bold text-gray-800 mb-0.5">AI 신차 조회</p>
                  <p className="text-gray-600">Gemini AI로 최신 트림별 출고가를 자동 조회하고 바로 DB에 등록합니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI 신차 조회 패널 */}
      {showAiPanel && (
        <div className="bg-purple-50 border-b border-purple-100">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
            <div className="flex items-end gap-3">
              <div>
                <label className="text-[10px] font-bold text-purple-700 block mb-1">브랜드</label>
                <input
                  type="text"
                  value={aiQuery.brand}
                  onChange={e => setAiQuery({ ...aiQuery, brand: e.target.value })}
                  placeholder="예: 기아"
                  className="px-3 py-2 text-xs border border-purple-200 rounded-lg bg-white w-32"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-purple-700 block mb-1">모델명</label>
                <input
                  type="text"
                  value={aiQuery.model}
                  onChange={e => setAiQuery({ ...aiQuery, model: e.target.value })}
                  placeholder="예: K5"
                  className="px-3 py-2 text-xs border border-purple-200 rounded-lg bg-white w-40"
                />
              </div>
              <button
                onClick={handleAiLookup}
                disabled={aiLoading}
                className="px-4 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {aiLoading ? '조회 중...' : 'AI 조회'}
              </button>
            </div>

            {aiResults.length > 0 && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {aiResults.map((trim: any, i: number) => (
                  <div key={i} className="bg-white rounded-lg border border-purple-100 p-3 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{trim.name}</p>
                      <p className="text-[10px] text-purple-600 font-bold">{f(trim.price)}원</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => registerFromAi(trim)}
                        className="px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold rounded hover:bg-purple-200"
                      >
                        등록
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* 왼쪽: 브랜드 필터 + 차량 목록 */}
          <div className="lg:col-span-8">
            {/* 검색 + 추가 */}
            <div className="flex items-center gap-2 mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="제조사, 모델명, 트림 검색..."
                className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white"
              />
              {isAdmin && (
                <button
                  onClick={() => { setShowAddForm(!showAddForm); setEditingId(null) }}
                  className="px-3 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 whitespace-nowrap"
                >
                  + 시세 등록
                </button>
              )}
            </div>

            {/* 브랜드 필터 칩 */}
            <div className="flex flex-wrap gap-1 mb-3">
              <button
                onClick={() => setSelectedBrand(null)}
                className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-colors ${
                  !selectedBrand ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                전체 ({list.length})
              </button>
              {brands.map(brand => (
                <button
                  key={brand}
                  onClick={() => setSelectedBrand(brand === selectedBrand ? null : brand)}
                  className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-colors ${
                    selectedBrand === brand ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {brand} ({list.filter(i => i.brand === brand).length})
                </button>
              ))}
            </div>

            {/* 추가 폼 */}
            {showAddForm && isAdmin && (
              <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 mb-3">
                <h4 className="text-xs font-bold text-blue-800 mb-3">신규 시세 등록</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})}
                    placeholder="제조사" className="px-2 py-1.5 text-xs border rounded-lg" />
                  <input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})}
                    placeholder="모델명" className="px-2 py-1.5 text-xs border rounded-lg" />
                  <input value={formData.trim} onChange={e => setFormData({...formData, trim: e.target.value})}
                    placeholder="트림 (선택)" className="px-2 py-1.5 text-xs border rounded-lg" />
                  <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})}
                    placeholder="연식" className="px-2 py-1.5 text-xs border rounded-lg" />
                  <input type="text" value={formData.standard_price ? f(formData.standard_price) : ''}
                    onChange={e => setFormData({...formData, standard_price: Number(e.target.value.replace(/,/g, ''))})}
                    placeholder="출고가(원)" className="px-2 py-1.5 text-xs border rounded-lg text-right" />
                </div>
                <div className="flex gap-2 mt-2">
                  <button onClick={handleAdd} className="px-3 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">등록</button>
                  <button onClick={() => setShowAddForm(false)} className="px-3 py-1.5 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50">취소</button>
                </div>
              </div>
            )}

            {/* 차량 목록 테이블 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-bold text-gray-500">제조사</th>
                      <th className="text-left px-4 py-2.5 font-bold text-gray-500">모델명</th>
                      <th className="text-left px-4 py-2.5 font-bold text-gray-500">트림</th>
                      <th className="text-center px-4 py-2.5 font-bold text-gray-500">연식</th>
                      <th className="text-right px-4 py-2.5 font-bold text-gray-500">출고가(신차가)</th>
                      {isAdmin && <th className="text-center px-4 py-2.5 font-bold text-gray-500 w-20">관리</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredList.map(item => (
                      <tr
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`cursor-pointer transition-colors ${
                          selectedItem?.id === item.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                        }`}
                      >
                        <td className="px-4 py-2.5 font-bold text-gray-800">{item.brand}</td>
                        <td className="px-4 py-2.5 font-bold text-gray-700">{item.model}</td>
                        <td className="px-4 py-2.5 text-gray-500">{item.trim || '-'}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{item.year}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-blue-600">{f(item.standard_price)}원</td>
                        {isAdmin && (
                          <td className="px-4 py-2.5 text-center" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-1 justify-center">
                              <button onClick={() => startEdit(item)} className="px-1.5 py-0.5 border border-gray-200 text-gray-500 rounded text-[10px] hover:bg-gray-50">편집</button>
                              <button onClick={() => handleDelete(item.id)} className="px-1.5 py-0.5 border border-red-200 text-red-500 rounded text-[10px] hover:bg-red-50">삭제</button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                    {filteredList.length === 0 && (
                      <tr><td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-gray-400">등록된 시세 데이터가 없습니다</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 편집 모달 */}
            {editingId && isAdmin && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setEditingId(null)}>
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-3" onClick={e => e.stopPropagation()}>
                  <h3 className="text-sm font-bold text-gray-900">시세 데이터 수정</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">제조사</label>
                      <input value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})}
                        className="w-full px-3 py-2 text-xs border rounded-lg" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-500 block mb-1">연식</label>
                      <input type="number" value={formData.year} onChange={e => setFormData({...formData, year: Number(e.target.value)})}
                        className="w-full px-3 py-2 text-xs border rounded-lg" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">모델명</label>
                    <input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})}
                      className="w-full px-3 py-2 text-xs border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">트림</label>
                    <input value={formData.trim} onChange={e => setFormData({...formData, trim: e.target.value})}
                      className="w-full px-3 py-2 text-xs border rounded-lg" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 block mb-1">출고가</label>
                    <input type="text" value={f(formData.standard_price)}
                      onChange={e => setFormData({...formData, standard_price: Number(e.target.value.replace(/,/g, ''))})}
                      className="w-full px-3 py-2 text-xs border rounded-lg text-right font-bold" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={() => handleUpdate(editingId)} className="px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">저장</button>
                    <button onClick={() => setEditingId(null)} className="px-4 py-2 border border-gray-200 text-gray-500 text-xs rounded-lg hover:bg-gray-50">취소</button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 오른쪽: 감가 시뮬레이션 패널 */}
          <div className="lg:col-span-4">
            <div className="bg-slate-900 rounded-2xl shadow-sm p-5 text-white sticky top-32">
              <h4 className="text-xs font-bold text-slate-400 mb-3">감가 시뮬레이션</h4>

              {selectedItem ? (
                <div className="space-y-4">
                  {/* 선택 차량 정보 */}
                  <div className="bg-slate-800 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400">선택 차량</p>
                    <p className="text-sm font-black text-white">{selectedItem.brand} {selectedItem.model}</p>
                    <p className="text-[10px] text-slate-400">{selectedItem.trim || '기본'} | {selectedItem.year}년식</p>
                    <p className="text-lg font-black text-blue-400 mt-1">{f(selectedItem.standard_price)}원</p>
                  </div>

                  {/* 적용 감가 카테고리 */}
                  <div className="bg-slate-800 rounded-xl p-3">
                    <p className="text-[10px] text-slate-400">적용 감가 카테고리</p>
                    <p className="text-xs font-bold text-amber-400">{selectedDep?.category || '매핑 없음'}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      산출 기준 관리 &gt; 감가기준 탭에서 설정
                    </p>
                  </div>

                  {/* 연식별 잔존가치 */}
                  {residualValues.length > 0 && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 mb-2">연식별 잔존가치</p>
                      <div className="space-y-1.5">
                        {residualValues.map(rv => (
                          <div key={rv.year} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-500 w-10">{rv.year}년차</span>
                              <div className="w-24 h-2 bg-slate-700 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-green-400 to-blue-400 rounded-full"
                                  style={{ width: `${rv.rate}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-bold text-slate-300">{rv.rate}%</span>
                            </div>
                            <span className="text-xs font-bold text-white">{f(rv.value)}원</span>
                          </div>
                        ))}
                      </div>

                      {/* 월감가액 */}
                      <div className="mt-3 pt-3 border-t border-slate-700">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-slate-400">1년차 월감가액</span>
                          <span className="font-bold text-red-400">
                            {f(Math.round((selectedItem.standard_price - residualValues[0].value) / 12))}원/월
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] mt-1">
                          <span className="text-slate-400">3년차 월감가액</span>
                          <span className="font-bold text-red-400">
                            {f(Math.round((selectedItem.standard_price - residualValues[2].value) / 36))}원/월
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] mt-1">
                          <span className="text-slate-400">5년차 월감가액</span>
                          <span className="font-bold text-red-400">
                            {f(Math.round((selectedItem.standard_price - residualValues[4].value) / 60))}원/월
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!selectedDep && (
                    <p className="text-[10px] text-slate-500">
                      매칭되는 감가 카테고리가 없습니다. 산출 기준 관리에서 감가기준을 설정하세요.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-3xl mb-2">📊</div>
                  <p className="text-xs text-slate-400">왼쪽 목록에서 차량을 선택하면</p>
                  <p className="text-xs text-slate-400">감가 시뮬레이션이 표시됩니다</p>
                </div>
              )}
            </div>

            {/* 통계 */}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className="text-xl font-black text-gray-900">{brands.length}</p>
                <p className="text-[10px] text-gray-400">브랜드</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
                <p className="text-xl font-black text-blue-600">{list.length}</p>
                <p className="text-[10px] text-gray-400">차량 시세</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
