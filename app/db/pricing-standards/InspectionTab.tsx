'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

// ── 타입 ──
interface InspectionCostRow {
  id: number; vehicle_class: string; fuel_type: string; inspection_type: string; region: string
  safety_check_cost: number; emission_test_cost: number; precision_emission_cost: number
  noise_test_cost: number; total_cost: number; retest_cost: number; agency_fee: number
  interval_months: number; notes: string; source: string; effective_date: string; is_active: boolean
}
interface InspectionScheduleRow {
  id: number; vehicle_usage: string; fuel_type: string; age_from: number; age_to: number
  interval_months: number; first_inspection_months: number; inspection_type: string
  legal_basis: string; notes: string; is_active: boolean
}
interface PenaltyRow {
  id: number; penalty_type: string; vehicle_usage: string
  base_penalty: number; daily_penalty: number; max_penalty: number
  additional_action: string; legal_basis: string; notes: string; is_active: boolean
}
interface EmissionRow {
  id: number; fuel_type: string; vehicle_class: string; year_from: number; year_to: number
  co_limit: number; co_unit: string; hc_limit: number; hc_unit: string
  nox_limit: number; nox_unit: string; smoke_limit: number; smoke_unit: string
  pm_limit: number; pm_unit: string; test_method: string; notes: string; is_active: boolean
}

const f = (n: number) => Math.round(n || 0).toLocaleString()

const FUEL_TYPES = ['전체', '가솔린', '디젤', 'LPG', '하이브리드', '전기', '수소']
const VEHICLE_CLASSES = ['경형', '소형', '중형', '대형', '대형SUV', '승합_소형', '승합_대형', '전체']
const INSPECTION_TYPES = ['종합검사', '종합검사_정밀', '정기검사', '신규검사', '구조변경검사', '튜닝검사']
const REGIONS = ['전국', '서울', '경기', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주']

// 유종별 배지 색상
const fuelBadge = (fuel: string) => {
  const m: Record<string, string> = {
    '가솔린': 'bg-blue-100 text-blue-700', '디젤': 'bg-gray-700 text-white',
    'LPG': 'bg-orange-100 text-orange-700', '하이브리드': 'bg-green-100 text-green-700',
    '전기': 'bg-cyan-100 text-cyan-700', '수소': 'bg-purple-100 text-purple-700',
    '전체': 'bg-gray-100 text-gray-600',
  }
  return m[fuel] || 'bg-gray-100 text-gray-600'
}
const classBadge = (cls: string) => {
  const m: Record<string, string> = {
    '경형': 'bg-green-100 text-green-700', '소형': 'bg-blue-100 text-blue-700',
    '중형': 'bg-purple-100 text-purple-700', '대형': 'bg-red-100 text-red-700',
    '대형SUV': 'bg-red-50 text-red-600', '승합_소형': 'bg-amber-100 text-amber-700',
    '승합_대형': 'bg-amber-200 text-amber-800', '전체': 'bg-gray-100 text-gray-600',
  }
  return m[cls] || 'bg-gray-100 text-gray-600'
}

// 차종 분류 가이드
const VEHICLE_CLASS_GUIDE = [
  { cls: '경형', cc: '1,000cc 이하', size: '3.6m 이하', ex: '모닝, 레이, 스파크' },
  { cls: '소형', cc: '1,600cc 이하', size: '4.7m 이하', ex: '아반떼, K3, 악센트' },
  { cls: '중형', cc: '2,000cc 이하', size: '소형 초과', ex: '쏘나타, K5, 캠리' },
  { cls: '대형', cc: '2,000cc 초과', size: '-', ex: '그랜저, K8, 제네시스' },
  { cls: '대형SUV', cc: '2,000cc 초과', size: 'SUV/RV', ex: '팰리세이드, GV80, 쏘렌토' },
  { cls: '승합_소형', cc: '-', size: '15인 이하', ex: '카니발, 스타리아 9인승' },
  { cls: '승합_대형', cc: '-', size: '16인 이상', ex: '카운티, 스타리아 11인승' },
]

export default function InspectionTab() {
  const supabase = createClientComponentClient()
  const [costs, setCosts] = useState<InspectionCostRow[]>([])
  const [schedules, setSchedules] = useState<InspectionScheduleRow[]>([])
  const [penalties, setPenalties] = useState<PenaltyRow[]>([])
  const [emissions, setEmissions] = useState<EmissionRow[]>([])
  const [loading, setLoading] = useState(true)

  const [editingCell, setEditingCell] = useState<{ rowId: number; field: string; table: string } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [showGuide, setShowGuide] = useState(false)
  const [activeSubTab, setActiveSubTab] = useState<'costs' | 'schedule' | 'penalty' | 'emission'>('costs')

  // 필터
  const [filterFuel, setFilterFuel] = useState('')
  const [filterType, setFilterType] = useState('')
  const [filterRegion, setFilterRegion] = useState('')
  const [filterUsage, setFilterUsage] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    setLoading(true)
    const [costRes, schedRes, penRes, emitRes] = await Promise.all([
      supabase.from('inspection_cost_table').select('*').eq('is_active', true).order('vehicle_class').order('fuel_type'),
      supabase.from('inspection_schedule_table').select('*').eq('is_active', true).order('vehicle_usage').order('fuel_type').order('age_from'),
      supabase.from('inspection_penalty_table').select('*').eq('is_active', true).order('penalty_type'),
      supabase.from('emission_standard_table').select('*').eq('is_active', true).order('fuel_type').order('year_from'),
    ])
    setCosts(costRes.data || [])
    setSchedules(schedRes.data || [])
    setPenalties(penRes.data || [])
    setEmissions(emitRes.data || [])
    setLoading(false)
  }

  // 셀 편집
  const handleSave = async () => {
    if (!editingCell) return
    const { rowId, field, table } = editingCell
    const numericFields = ['safety_check_cost', 'emission_test_cost', 'precision_emission_cost', 'noise_test_cost',
      'total_cost', 'retest_cost', 'agency_fee', 'interval_months', 'base_penalty', 'daily_penalty', 'max_penalty',
      'age_from', 'age_to', 'first_inspection_months', 'co_limit', 'hc_limit', 'nox_limit', 'smoke_limit', 'pm_limit', 'year_from', 'year_to']
    const value = numericFields.includes(field) ? Number(editValue) : editValue
    const updateData: Record<string, any> = { [field]: value, updated_at: new Date().toISOString() }

    // total_cost 자동 계산
    if (table === 'inspection_cost_table' && ['safety_check_cost', 'emission_test_cost', 'precision_emission_cost', 'noise_test_cost'].includes(field)) {
      const row = costs.find(r => r.id === rowId)
      if (row) {
        const vals = { safety_check_cost: row.safety_check_cost, emission_test_cost: row.emission_test_cost,
          precision_emission_cost: row.precision_emission_cost, noise_test_cost: row.noise_test_cost, [field]: Number(editValue) }
        updateData.total_cost = vals.safety_check_cost + vals.emission_test_cost + vals.precision_emission_cost + vals.noise_test_cost
      }
    }

    await supabase.from(table).update(updateData).eq('id', rowId)
    await loadData()
    setEditingCell(null)
  }

  // 편집 가능한 셀
  const EC = ({ row, field, table, display, className = '' }: {
    row: any; field: string; table: string; display: string; className?: string
  }) => {
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field && editingCell?.table === table
    if (isEditing) {
      return (
        <td className={`px-2 py-1 ${className}`}>
          <input type="text" value={editValue} onChange={e => setEditValue(e.target.value)}
            onBlur={handleSave} onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') setEditingCell(null) }}
            className="w-full border border-steel-300 rounded px-1.5 py-0.5 text-xs focus:outline-none focus:ring-2 focus:ring-steel-500" autoFocus />
        </td>
      )
    }
    return (
      <td className={`px-2 py-1 cursor-pointer hover:bg-steel-50 ${className}`}
        onClick={() => { setEditingCell({ rowId: row.id, field, table }); setEditValue(String(row[field] ?? '')) }}>
        {display}
      </td>
    )
  }

  // Badge 컴포넌트
  const Badge = ({ text, color }: { text: string; color: string }) => (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>{text}</span>
  )

  const filteredCosts = costs.filter(r => {
    if (filterFuel && r.fuel_type !== filterFuel) return false
    if (filterType && r.inspection_type !== filterType) return false
    if (filterRegion && r.region !== filterRegion) return false
    return true
  })

  const filteredSchedules = schedules.filter(r => {
    if (filterUsage && r.vehicle_usage !== filterUsage) return false
    if (filterFuel && r.fuel_type !== filterFuel) return false
    return true
  })

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-400 text-sm">로딩 중...</div></div>

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900">자동차 검사 기준 관리</h2>
          <p className="text-xs text-gray-500 mt-0.5">한국교통안전공단 기준 — 검사비용·주기·과태료·배출가스 기준 종합</p>
        </div>
        <button onClick={() => setShowGuide(!showGuide)}
          className="text-xs font-bold text-steel-600 hover:text-steel-800 px-3 py-1.5 border border-steel-200 rounded-lg hover:bg-steel-50">
          {showGuide ? '가이드 닫기' : '📋 차종 분류 기준'}
        </button>
      </div>

      {/* 차종 분류 가이드 */}
      {showGuide && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <h3 className="font-bold text-amber-700 text-sm mb-2">자동차관리법 시행규칙 별표1 — 차종 분류 기준</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
            {VEHICLE_CLASS_GUIDE.map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-xs py-0.5">
                <Badge text={v.cls} color={classBadge(v.cls)} />
                <span className="text-gray-500">{v.cc}</span>
                {v.size !== '-' && <span className="text-gray-400">({v.size})</span>}
                <span className="text-amber-600 font-bold">{v.ex}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 서브탭 */}
      <div className="flex gap-1 border-b border-gray-200 pb-1 overflow-x-auto">
        {([
          { id: 'costs' as const, label: '검사비용', icon: '💰', count: costs.length },
          { id: 'schedule' as const, label: '검사주기', icon: '📅', count: schedules.length },
          { id: 'penalty' as const, label: '과태료', icon: '⚠️', count: penalties.length },
          { id: 'emission' as const, label: '배출가스 기준', icon: '💨', count: emissions.length },
        ]).map(tab => (
          <button key={tab.id} onClick={() => setActiveSubTab(tab.id)}
            className={`px-3 py-2 rounded-t-lg text-xs font-bold transition-colors whitespace-nowrap ${
              activeSubTab === tab.id ? 'bg-steel-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}>
            {tab.icon} {tab.label} <span className="text-[10px] opacity-70">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* ═══════════ 검사비용표 ═══════════ */}
      {activeSubTab === 'costs' && (
        <div className="space-y-3">
          <div className="flex gap-2 items-center flex-wrap">
            <select value={filterFuel} onChange={e => setFilterFuel(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 font-bold">
              <option value="">전체 유종</option>
              {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 font-bold">
              <option value="">전체 검사유형</option>
              {INSPECTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterRegion} onChange={e => setFilterRegion(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 font-bold">
              <option value="">전체 지역</option>
              {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="text-xs text-gray-400">{filteredCosts.length}건</span>
          </div>

          {/* 유종별 특이사항 안내 */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-700 text-white rounded-lg p-2 text-[10px]">
              <p className="font-bold mb-0.5">🛢️ 디젤</p>
              <p className="text-gray-300">정밀배출가스검사 추가 (배출가스+매연+PM). 비용 약 2배↑</p>
            </div>
            <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-2 text-[10px]">
              <p className="font-bold text-cyan-700 mb-0.5">⚡ 전기/수소</p>
              <p className="text-cyan-600">배출가스 면제 → 안전도검사만. 비용 최저</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-2 text-[10px]">
              <p className="font-bold text-green-700 mb-0.5">🌱 하이브리드</p>
              <p className="text-green-600">가솔린 기준 적용 (무부하검사). 정밀검사 면제</p>
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-x-auto">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">차종</th>
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">유종</th>
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">검사유형</th>
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">지역</th>
                  <th className="px-2 py-1.5 text-right font-bold text-gray-500">안전도</th>
                  <th className="px-2 py-1.5 text-right font-bold text-gray-500">배출가스</th>
                  <th className="px-2 py-1.5 text-right font-bold text-gray-500">정밀검사</th>
                  <th className="px-2 py-1.5 text-right font-bold text-steel-600">총 검사비</th>
                  <th className="px-2 py-1.5 text-right font-bold text-gray-500">재검사비</th>
                  <th className="px-2 py-1.5 text-right font-bold text-gray-500">대행비</th>
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500 max-w-[120px]">비고</th>
                </tr>
              </thead>
              <tbody>
                {filteredCosts.map(row => (
                  <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-2 py-1"><Badge text={row.vehicle_class} color={classBadge(row.vehicle_class)} /></td>
                    <td className="px-2 py-1"><Badge text={row.fuel_type} color={fuelBadge(row.fuel_type)} /></td>
                    <td className="px-2 py-1 text-[10px]">
                      <span className={`font-bold ${row.inspection_type.includes('정밀') ? 'text-red-600' : 'text-gray-700'}`}>{row.inspection_type}</span>
                    </td>
                    <td className="px-2 py-1 text-gray-500 text-[10px]">{row.region}</td>
                    <EC row={row} field="safety_check_cost" table="inspection_cost_table" display={f(row.safety_check_cost)} className="text-right" />
                    <EC row={row} field="emission_test_cost" table="inspection_cost_table" display={row.emission_test_cost > 0 ? f(row.emission_test_cost) : '-'} className="text-right text-gray-500" />
                    <EC row={row} field="precision_emission_cost" table="inspection_cost_table"
                      display={row.precision_emission_cost > 0 ? f(row.precision_emission_cost) : '-'}
                      className={`text-right ${row.precision_emission_cost > 0 ? 'text-red-600 font-bold' : 'text-gray-300'}`} />
                    <td className="px-2 py-1 text-right font-black text-steel-700">{f(row.total_cost)}</td>
                    <EC row={row} field="retest_cost" table="inspection_cost_table" display={row.retest_cost > 0 ? f(row.retest_cost) : '-'} className="text-right text-gray-400" />
                    <EC row={row} field="agency_fee" table="inspection_cost_table" display={row.agency_fee > 0 ? f(row.agency_fee) : '-'} className="text-right text-gray-400" />
                    <td className="px-2 py-1 text-[10px] text-gray-400 max-w-[120px] truncate" title={row.notes || ''}>{row.notes || '-'}</td>
                  </tr>
                ))}
                {filteredCosts.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-8 text-gray-400">데이터가 없습니다. SQL 마이그레이션을 실행해주세요.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ═══════════ 검사주기표 ═══════════ */}
      {activeSubTab === 'schedule' && (
        <div className="space-y-3">
          <div className="flex gap-2 items-center flex-wrap">
            <select value={filterUsage} onChange={e => setFilterUsage(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 font-bold">
              <option value="">전체 용도</option>
              {['사업용_승용', '사업용_승합', '비사업용_승용', '비사업용_승합', '이륜차'].map(u => <option key={u} value={u}>{u}</option>)}
            </select>
            <select value={filterFuel} onChange={e => setFilterFuel(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 font-bold">
              <option value="">전체 유종</option>
              {FUEL_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="text-xs text-gray-400">{filteredSchedules.length}건</span>
          </div>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">차량 용도</th>
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">유종</th>
                  <th className="px-2 py-1.5 text-center font-bold text-gray-500">차령 (년)</th>
                  <th className="px-2 py-1.5 text-center font-bold text-steel-600">검사 주기</th>
                  <th className="px-2 py-1.5 text-center font-bold text-gray-500">첫 검사</th>
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">검사유형</th>
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">법적근거</th>
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">비고</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchedules.map(row => {
                  const isBiz = row.vehicle_usage.startsWith('사업용')
                  return (
                    <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isBiz ? 'bg-red-50/30' : ''}`}>
                      <td className="px-2 py-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          isBiz ? 'bg-red-100 text-red-700' : row.vehicle_usage === '이륜차' ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-700'
                        }`}>{row.vehicle_usage}</span>
                      </td>
                      <td className="px-2 py-1"><Badge text={row.fuel_type} color={fuelBadge(row.fuel_type)} /></td>
                      <td className="px-2 py-1 text-center font-bold">{row.age_from}~{row.age_to === 99 ? '∞' : row.age_to}년</td>
                      <td className="px-2 py-1 text-center">
                        {row.interval_months === 0 ? (
                          <span className="text-green-600 font-bold">면제</span>
                        ) : (
                          <span className={`font-black ${row.interval_months <= 6 ? 'text-red-600' : row.interval_months <= 12 ? 'text-amber-600' : 'text-steel-700'}`}>
                            {row.interval_months}개월
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1 text-center text-gray-500">{row.first_inspection_months}개월 후</td>
                      <td className="px-2 py-1">
                        <span className={`text-[10px] font-bold ${row.inspection_type.includes('정밀') ? 'text-red-600' : 'text-gray-700'}`}>
                          {row.inspection_type}
                        </span>
                      </td>
                      <td className="px-2 py-1 text-[10px] text-gray-400">{row.legal_basis || '-'}</td>
                      <td className="px-2 py-1 text-[10px] text-gray-400 max-w-[150px] truncate">{row.notes || '-'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 렌터카 핵심 요약 */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <h3 className="font-bold text-red-700 text-sm mb-2">🚗 렌터카(사업용 승용) 검사 주기 요약</h3>
            <div className="grid grid-cols-4 gap-3">
              {[
                { age: '신차~1년', period: '2년마다', color: 'text-green-600', note: '출고 후 2년에 첫 검사' },
                { age: '2~4년', period: '매년', color: 'text-amber-600', note: '' },
                { age: '5~7년', period: '매년', color: 'text-amber-600', note: '' },
                { age: '8년 이상', period: '6개월', color: 'text-red-600', note: '집중 관리 필요' },
              ].map((item, i) => (
                <div key={i} className="bg-white rounded-lg p-2 text-center border border-red-100">
                  <p className="text-[10px] text-gray-500">{item.age}</p>
                  <p className={`text-base font-black ${item.color}`}>{item.period}</p>
                  {item.note && <p className="text-[9px] text-gray-400 mt-0.5">{item.note}</p>}
                </div>
              ))}
            </div>
            <p className="text-[10px] text-red-500 mt-2">※ 디젤 사업용 차량은 "종합검사_정밀"(배출가스 정밀검사 포함)이 적용되어 검사비가 더 높습니다.</p>
          </div>
        </div>
      )}

      {/* ═══════════ 과태료 ═══════════ */}
      {activeSubTab === 'penalty' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">자동차관리법 제81조 기준 — 검사 미이행 시 과태료 및 행정처분</p>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left font-bold text-gray-500">위반 유형</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-500">적용 대상</th>
                  <th className="px-3 py-2 text-right font-bold text-gray-500">기본 과태료</th>
                  <th className="px-3 py-2 text-right font-bold text-gray-500">일당 추가</th>
                  <th className="px-3 py-2 text-right font-bold text-red-600">최대 과태료</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-500">추가 처분</th>
                  <th className="px-3 py-2 text-left font-bold text-gray-500">법적 근거</th>
                </tr>
              </thead>
              <tbody>
                {penalties.map(row => (
                  <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${
                    row.penalty_type.includes('최대') || row.penalty_type === '무검사운행' ? 'bg-red-50' : ''
                  }`}>
                    <td className="px-3 py-2 font-bold text-gray-700">{row.penalty_type.replace(/_/g, ' ')}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        row.vehicle_usage === '사업용' ? 'bg-red-100 text-red-700' :
                        row.vehicle_usage === '비사업용' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{row.vehicle_usage}</span>
                    </td>
                    <td className="px-3 py-2 text-right font-bold">{row.base_penalty > 0 ? `${f(row.base_penalty)}원` : '-'}</td>
                    <td className="px-3 py-2 text-right text-amber-600 font-bold">
                      {row.daily_penalty > 0 ? `+${f(row.daily_penalty)}원/일` : '-'}
                    </td>
                    <td className="px-3 py-2 text-right font-black text-red-600">
                      {row.max_penalty > 0 ? `${f(row.max_penalty)}원` : '-'}
                    </td>
                    <td className="px-3 py-2 text-[10px] text-red-500 font-bold">{row.additional_action || '-'}</td>
                    <td className="px-3 py-2 text-[10px] text-gray-400">{row.legal_basis || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 과태료 시뮬레이션 */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-bold text-amber-700 text-sm mb-2">⚠️ 렌터카 사업용 과태료 시뮬레이션</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-gray-500 mb-1">검사 30일 지연</p>
                <p className="text-xl font-black text-amber-600">40,000원</p>
                <p className="text-[10px] text-gray-400">기본 과태료</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-amber-100">
                <p className="text-gray-500 mb-1">검사 60일 지연 (30일 초과)</p>
                <p className="text-xl font-black text-red-600">640,000원</p>
                <p className="text-[10px] text-gray-400">4만 + (2만 × 30일) = 64만</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-red-200">
                <p className="text-gray-500 mb-1">무검사 운행 적발</p>
                <p className="text-xl font-black text-red-700">500,000원</p>
                <p className="text-[10px] text-gray-400">즉시 부과 + 사용정지 가능</p>
              </div>
            </div>
            <p className="text-[10px] text-amber-600 mt-2 font-bold">💡 렌터카 사업자는 차량별 검사 일정을 체계적으로 관리하여 과태료 리스크를 방지해야 합니다.</p>
          </div>
        </div>
      )}

      {/* ═══════════ 배출가스 기준 ═══════════ */}
      {activeSubTab === 'emission' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-500">대기환경보전법 시행규칙 — 유종·제작연도별 배출가스 허용 기준치</p>

          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-[11px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">유종</th>
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">차종</th>
                  <th className="px-2 py-1.5 text-center font-bold text-gray-500">제작연도</th>
                  <th className="px-2 py-1.5 text-center font-bold text-gray-500">CO</th>
                  <th className="px-2 py-1.5 text-center font-bold text-gray-500">HC</th>
                  <th className="px-2 py-1.5 text-center font-bold text-gray-500">매연</th>
                  <th className="px-2 py-1.5 text-center font-bold text-gray-500">PM</th>
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">검사방법</th>
                  <th className="px-2 py-1.5 text-left font-bold text-gray-500">비고</th>
                </tr>
              </thead>
              <tbody>
                {emissions.map(row => (
                  <tr key={row.id} className={`border-b border-gray-100 hover:bg-gray-50 ${
                    row.test_method === '면제' ? 'bg-green-50' : row.fuel_type === '디젤' ? 'bg-gray-50' : ''
                  }`}>
                    <td className="px-2 py-1"><Badge text={row.fuel_type} color={fuelBadge(row.fuel_type)} /></td>
                    <td className="px-2 py-1"><Badge text={row.vehicle_class} color={classBadge(row.vehicle_class)} /></td>
                    <td className="px-2 py-1 text-center text-gray-600">{row.year_from}~{row.year_to === 2099 ? '현재' : row.year_to}</td>
                    <td className="px-2 py-1 text-center">{row.co_limit != null ? `${row.co_limit}${row.co_unit}` : <span className="text-gray-300">-</span>}</td>
                    <td className="px-2 py-1 text-center">{row.hc_limit != null ? `${row.hc_limit}${row.hc_unit}` : <span className="text-gray-300">-</span>}</td>
                    <td className="px-2 py-1 text-center">{row.smoke_limit != null ? `${row.smoke_limit}${row.smoke_unit}` : <span className="text-gray-300">-</span>}</td>
                    <td className="px-2 py-1 text-center">{row.pm_limit != null ? `${row.pm_limit}${row.pm_unit}` : <span className="text-gray-300">-</span>}</td>
                    <td className="px-2 py-1">
                      <span className={`text-[10px] font-bold ${row.test_method === '면제' ? 'text-green-600' : 'text-gray-600'}`}>{row.test_method}</span>
                    </td>
                    <td className="px-2 py-1 text-[10px] text-gray-400 max-w-[150px] truncate">{row.notes || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 검사방법 설명 */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <h3 className="font-bold text-blue-700 text-xs mb-1">🔬 검사 방법 안내</h3>
              <div className="text-[10px] text-blue-600 space-y-0.5">
                <p><span className="font-bold">무부하검사</span> — 가솔린/LPG/하이브리드: 공회전 상태 CO·HC 측정</p>
                <p><span className="font-bold">KD147 (부하검사)</span> — 디젤: 다이나모 위 주행 모사, PM·매연 정밀 측정</p>
                <p><span className="font-bold">ASM2525</span> — 시속 25km 25% 부하 조건 배출가스 측정</p>
                <p><span className="font-bold">면제</span> — 전기/수소 차량은 배출가스 검사 면제 (안전도검사만)</p>
              </div>
            </div>
            <div className="bg-gray-700 text-white rounded-xl p-3">
              <h3 className="font-bold text-xs mb-1">🛢️ 디젤차 정밀검사 비용 영향</h3>
              <div className="text-[10px] text-gray-300 space-y-0.5">
                <p>디젤 차량은 <span className="text-red-400 font-bold">정밀배출가스검사</span> 비용이 추가됩니다.</p>
                <p>소형 디젤: +28,000원 / 중형: +32,000원 / 대형: +35,000원</p>
                <p>총 검사비가 가솔린 대비 <span className="text-amber-400 font-bold">약 2배</span> 수준</p>
                <p className="pt-1 text-yellow-400 font-bold">→ 디젤 렌터카 렌탈료 산정 시 검사비 차등 반영 필수</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
