'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { supabase } from '../utils/supabase'
import Link from 'next/link'

type Accident = {
  id: string
  company_id: string
  car_id: string
  customer_id: string | null
  accident_date: string
  accident_time: string
  location: string
  accident_type: 'collision' | 'self_damage' | 'hit_and_run' | 'theft' | 'natural_disaster' | 'vandalism' | 'fire' | 'other'
  fault_percentage: number
  description: string
  driver_name: string
  driver_phone: string
  driver_relationship: string
  other_party_name: string
  other_party_phone: string
  other_party_vehicle: string
  other_party_insurance_company: string
  insurance_company: string
  insurance_claim_number: string
  insurance_status: 'none' | 'filed' | 'processing' | 'approved' | 'denied' | 'partial'
  police_reported: boolean
  police_claim_number: string
  repair_shop_name: string
  repair_shop_phone: string
  repair_shop_address: string
  repair_start_date: string | null
  repair_end_date: string | null
  estimated_repair_cost: number
  actual_repair_cost: number
  insurance_payout_amount: number
  self_payment_amount: number
  company_payment_amount: number
  vehicle_condition: 'repairable' | 'total_loss' | 'minor'
  replacement_car_id: string | null
  replacement_start_date: string | null
  replacement_end_date: string | null
  replacement_cost: number
  notes: string
  status: 'reported' | 'insurance_filed' | 'repairing' | 'settled' | 'closed' | 'cancelled'
  settled_date: string | null
  closed_date: string | null
  created_at: string
  created_by: string | null
  car?: {
    id: string
    number: string
    brand: string
    model: string
    trim?: string
    year?: string
  }
  customer?: {
    id: string
    name: string
    phone: string
  }
  replacement_car?: {
    id: string
    number: string
    brand: string
    model: string
  }
}

type Car = {
  id: string
  number: string
  brand: string
  model: string
}

const ACC_STATUS: Record<string, { label: string; color: string }> = {
  reported: { label: '접수', color: 'bg-blue-100 text-blue-700' },
  insurance_filed: { label: '보험접수', color: 'bg-amber-100 text-amber-700' },
  repairing: { label: '수리중', color: 'bg-purple-100 text-purple-700' },
  settled: { label: '정산', color: 'bg-cyan-100 text-cyan-700' },
  closed: { label: '종료', color: 'bg-green-100 text-green-700' },
  cancelled: { label: '취소', color: 'bg-gray-100 text-gray-700' },
}

const ACC_TYPE: Record<string, string> = {
  collision: '충돌사고',
  self_damage: '자손사고',
  hit_and_run: '뺑소니',
  theft: '도난',
  natural_disaster: '자연재해',
  vandalism: '파손',
  fire: '화재',
  other: '기타',
}

const INS_STATUS: Record<string, { label: string; color: string }> = {
  none: { label: '미접수', color: 'bg-gray-100 text-gray-600' },
  filed: { label: '접수', color: 'bg-blue-100 text-blue-700' },
  processing: { label: '처리중', color: 'bg-amber-100 text-amber-700' },
  approved: { label: '승인', color: 'bg-green-100 text-green-700' },
  denied: { label: '거절', color: 'bg-red-100 text-red-700' },
  partial: { label: '부분승인', color: 'bg-orange-100 text-orange-700' },
}

const VEHICLE_CONDITIONS: Record<string, string> = {
  repairable: '수리가능',
  total_loss: '전손',
  minor: '경미',
}

export default function AccidentsMainPage() {
  const { company, role, adminSelectedCompanyId, user } = useApp()

  // Data
  const [accidents, setAccidents] = useState<Accident[]>([])
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [carFilter, setCarFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingAccident, setEditingAccident] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [modalSection, setModalSection] = useState(1)

  // Form state
  const [formData, setFormData] = useState({
    car_id: '',
    accident_date: new Date().toISOString().split('T')[0],
    accident_time: '12:00',
    location: '',
    accident_type: 'collision' as any,
    fault_percentage: 50,
    description: '',
    driver_name: '',
    driver_phone: '',
    driver_relationship: '',
    other_party_name: '',
    other_party_phone: '',
    other_party_vehicle: '',
    other_party_insurance_company: '',
    insurance_company: '',
    insurance_claim_number: '',
    insurance_status: 'none' as any,
    police_reported: false,
    police_claim_number: '',
    repair_shop_name: '',
    repair_shop_phone: '',
    repair_shop_address: '',
    repair_start_date: '',
    repair_end_date: '',
    estimated_repair_cost: 0,
    actual_repair_cost: 0,
    insurance_payout_amount: 0,
    self_payment_amount: 0,
    company_payment_amount: 0,
    vehicle_condition: 'repairable' as any,
    replacement_car_id: '',
    replacement_start_date: '',
    replacement_end_date: '',
    replacement_cost: 0,
    notes: '',
  })

  const effectiveCompanyId = role === 'god_admin' ? adminSelectedCompanyId : company?.id

  // Helper functions for lookups
  const getCar = (id: any) => cars.find(c => c.id === Number(id) || c.id === id)

  // Fetch accidents
  const fetchAccidents = useCallback(async () => {
    if (!effectiveCompanyId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('accident_records')
      .select('*')
      .eq('company_id', effectiveCompanyId)
      .order('accident_date', { ascending: false })

    if (error) {
      console.error('사고 기록 로딩 실패 - message:', error.message, 'code:', error.code, 'details:', error.details, 'hint:', error.hint)
    }
    setAccidents(data || [])
    setLoading(false)
  }, [effectiveCompanyId])

  // Fetch cars
  const fetchCars = useCallback(async () => {
    if (!effectiveCompanyId) return
    const { data, error } = await supabase
      .from('cars')
      .select('id,number,brand,model')
      .eq('company_id', effectiveCompanyId)

    if (error) {
      console.error('차량 로딩 실패:', error)
    } else {
      setCars(data || [])
    }
  }, [effectiveCompanyId])

  useEffect(() => {
    if (effectiveCompanyId) {
      fetchAccidents()
      fetchCars()
    }
  }, [effectiveCompanyId, fetchAccidents, fetchCars])

  // KPI Cards
  const thisMonth = new Date()
  const monthStart = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0).toISOString().split('T')[0]

  const stats = useMemo(() => {
    return {
      reported: accidents.filter(a => a.status === 'reported').length,
      insuranceFiled: accidents.filter(a => a.status === 'insurance_filed').length,
      repairing: accidents.filter(a => a.status === 'repairing').length,
      settledThisMonth: accidents.filter(
        a => (a.status === 'settled' || a.status === 'closed') && a.settled_date && a.settled_date >= monthStart && a.settled_date <= monthEnd
      ).length,
    }
  }, [accidents, monthStart, monthEnd])

  // Filtered accidents
  const filteredAccidents = useMemo(() => {
    return accidents.filter(acc => {
      const statusMatch = statusFilter === 'all' || acc.status === statusFilter
      const typeMatch = typeFilter === 'all' || acc.accident_type === typeFilter
      const carMatch = carFilter === 'all' || acc.car_id === carFilter
      const searchLower = searchQuery.toLowerCase()
      const carInfo = getCar(acc.car_id)
      const searchMatch =
        (carInfo?.number || '').toLowerCase().includes(searchLower) ||
        (acc.driver_name || '').toLowerCase().includes(searchLower) ||
        (acc.location || '').toLowerCase().includes(searchLower)

      return statusMatch && typeMatch && carMatch && searchMatch
    })
  }, [accidents, statusFilter, typeFilter, carFilter, searchQuery])

  // Status transition
  const handleStatusChange = async (accId: string, newStatus: string) => {
    const acc = accidents.find(a => a.id === accId)
    if (!acc) return

    try {
      const updates: any = {
        status: newStatus,
      }
      if (newStatus === 'settled') {
        updates.settled_date = new Date().toISOString().split('T')[0]
      }
      if (newStatus === 'closed') {
        updates.closed_date = new Date().toISOString().split('T')[0]
      }

      await supabase.from('accident_records').update(updates).eq('id', accId)

      // Insert status log
      await supabase.from('vehicle_status_log').insert({
        company_id: effectiveCompanyId,
        car_id: acc.car_id,
        old_status: acc.status,
        new_status: newStatus,
        related_type: 'accident',
        related_id: accId,
        changed_by: user?.id,
      })

      fetchAccidents()
    } catch (error) {
      console.error('상태 변경 실패:', error)
    }
  }

  // Modal handlers
  const resetForm = () => {
    setFormData({
      car_id: '',
      accident_date: new Date().toISOString().split('T')[0],
      accident_time: '12:00',
      location: '',
      accident_type: 'collision',
      fault_percentage: 50,
      description: '',
      driver_name: '',
      driver_phone: '',
      driver_relationship: '',
      other_party_name: '',
      other_party_phone: '',
      other_party_vehicle: '',
      other_party_insurance_company: '',
      insurance_company: '',
      insurance_claim_number: '',
      insurance_status: 'none',
      police_reported: false,
      police_claim_number: '',
      repair_shop_name: '',
      repair_shop_phone: '',
      repair_shop_address: '',
      repair_start_date: '',
      repair_end_date: '',
      estimated_repair_cost: 0,
      actual_repair_cost: 0,
      insurance_payout_amount: 0,
      self_payment_amount: 0,
      company_payment_amount: 0,
      vehicle_condition: 'repairable',
      replacement_car_id: '',
      replacement_start_date: '',
      replacement_end_date: '',
      replacement_cost: 0,
      notes: '',
    })
    setEditingAccident(null)
    setModalSection(1)
  }

  const openCreateModal = () => {
    resetForm()
    setShowModal(true)
  }

  const openEditModal = (accident: Accident) => {
    setEditingAccident(accident)
    setFormData({
      car_id: accident.car_id || '',
      accident_date: accident.accident_date || '',
      accident_time: accident.accident_time || '12:00',
      location: accident.location || '',
      accident_type: accident.accident_type || 'collision',
      fault_percentage: accident.fault_percentage || 50,
      description: accident.description || '',
      driver_name: accident.driver_name || '',
      driver_phone: accident.driver_phone || '',
      driver_relationship: accident.driver_relationship || '',
      other_party_name: accident.other_party_name || '',
      other_party_phone: accident.other_party_phone || '',
      other_party_vehicle: accident.other_party_vehicle || '',
      other_party_insurance_company: accident.other_party_insurance_company || '',
      insurance_company: accident.insurance_company || '',
      insurance_claim_number: accident.insurance_claim_number || '',
      insurance_status: accident.insurance_status || 'none',
      police_reported: accident.police_reported || false,
      police_claim_number: accident.police_claim_number || '',
      repair_shop_name: accident.repair_shop_name || '',
      repair_shop_phone: accident.repair_shop_phone || '',
      repair_shop_address: accident.repair_shop_address || '',
      repair_start_date: accident.repair_start_date || '',
      repair_end_date: accident.repair_end_date || '',
      estimated_repair_cost: accident.estimated_repair_cost || 0,
      actual_repair_cost: accident.actual_repair_cost || 0,
      insurance_payout_amount: accident.insurance_payout_amount || 0,
      self_payment_amount: accident.self_payment_amount || 0,
      company_payment_amount: accident.company_payment_amount || 0,
      vehicle_condition: accident.vehicle_condition || 'repairable',
      replacement_car_id: accident.replacement_car_id || '',
      replacement_start_date: accident.replacement_start_date || '',
      replacement_end_date: accident.replacement_end_date || '',
      replacement_cost: accident.replacement_cost || 0,
      notes: accident.notes || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!effectiveCompanyId || !user) return
    setSaving(true)

    try {
      const payload = {
        ...formData,
        company_id: effectiveCompanyId,
        status: editingAccident ? editingAccident.status : 'reported',
        created_by: editingAccident ? editingAccident.created_by : user.id,
      }

      if (editingAccident) {
        await supabase.from('accident_records').update(payload).eq('id', editingAccident.id)
      } else {
        await supabase.from('accident_records').insert([payload])
      }

      setShowModal(false)
      resetForm()
      fetchAccidents()
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  if (role === 'god_admin' && !adminSelectedCompanyId) {
    return (
      <div className="max-w-7xl mx-auto py-6 px-4 md:py-10 md:px-6 min-h-screen bg-gray-50">
        <div className="p-12 md:p-20 text-center text-gray-400 text-sm bg-white rounded-2xl">
          <span className="text-4xl block mb-3">🏢</span>
          <p className="font-bold text-gray-600">좌측 상단에서 회사를 먼저 선택해주세요</p>
          <p className="text-xs mt-1">슈퍼어드민은 회사를 선택한 후 데이터를 조회/등록할 수 있습니다.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto py-6 px-4 md:py-10 md:px-6 min-h-screen bg-gray-50/50 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-6 md:mb-8 gap-3 md:gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight">
            ⚠️ 사고 관리
          </h1>
          <p className="text-gray-500 mt-1 md:mt-2 text-sm">
            총 사고: <span className="font-bold text-steel-600">{accidents.length}</span>건 /
            검색됨: {filteredAccidents.length}건
          </p>
        </div>

        <div className="flex gap-2 md:gap-3 w-full md:w-auto items-center">
          <input
            type="text"
            placeholder="🔍 검색..."
            className="px-3 md:px-4 py-2.5 md:py-3 border border-gray-300 rounded-xl flex-1 md:flex-none md:min-w-[250px] focus:outline-none focus:border-steel-500 shadow-sm text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <button
            onClick={openCreateModal}
            className="bg-steel-600 text-white px-4 md:px-6 py-2.5 md:py-3 rounded-xl font-bold hover:bg-steel-700 shadow-lg text-center whitespace-nowrap text-sm flex-shrink-0"
          >
            + 신규
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {accidents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 font-bold">접수</p>
            <p className="text-xl font-black text-gray-900 mt-1">
              {stats.reported}
              <span className="text-sm text-gray-400 ml-0.5">건</span>
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 font-bold">보험처리중</p>
            <p className="text-xl font-black text-gray-900 mt-1">
              {stats.insuranceFiled}
              <span className="text-sm text-gray-400 ml-0.5">건</span>
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 font-bold">수리중</p>
            <p className="text-xl font-black text-gray-900 mt-1">
              {stats.repairing}
              <span className="text-sm text-gray-400 ml-0.5">건</span>
            </p>
          </div>
          <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <p className="text-xs text-gray-400 font-bold">처리완료 (이번달)</p>
            <p className="text-xl font-black text-gray-900 mt-1">
              {stats.settledThisMonth}
              <span className="text-sm text-gray-400 ml-0.5">건</span>
            </p>
          </div>
        </div>
      )}

      {/* Status Filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {['all', 'reported', 'insurance_filed', 'repairing', 'settled', 'closed'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              statusFilter === status
                ? 'bg-steel-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {status === 'all' ? '전체' : ACC_STATUS[status]?.label || status}
          </button>
        ))}
      </div>

      {/* Type Filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        {['all', 'collision', 'self_damage', 'hit_and_run', 'theft', 'natural_disaster', 'vandalism', 'fire', 'other'].map(type => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              typeFilter === type
                ? 'bg-steel-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {type === 'all' ? '전체' : ACC_TYPE[type]}
          </button>
        ))}
      </div>

      {/* Car Filter */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => setCarFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
            carFilter === 'all'
              ? 'bg-steel-600 text-white'
              : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}
        >
          전체 차량
        </button>
        {cars.map(car => (
          <button
            key={car.id}
            onClick={() => setCarFilter(car.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
              carFilter === car.id
                ? 'bg-steel-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {car.number}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-20 text-center text-gray-400 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-steel-600 mb-2"></div>
            사고 데이터를 불러오는 중...
          </div>
        ) : filteredAccidents.length === 0 ? (
          <div className="p-12 md:p-20 text-center text-gray-400 text-sm">
            {searchQuery ? '검색 결과가 없습니다.' : '등록된 사고가 없습니다.'}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500 font-bold text-xs uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="p-4">사고일</th>
                    <th className="p-4">차량</th>
                    <th className="p-4">유형</th>
                    <th className="p-4">과실비율</th>
                    <th className="p-4">예상비용</th>
                    <th className="p-4">보험상태</th>
                    <th className="p-4">처리상태</th>
                    <th className="p-4 text-center">액션</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredAccidents.map(acc => (
                    <>
                      <tr key={acc.id} className="hover:bg-steel-50 transition-colors group cursor-pointer" onClick={() => setExpandedRowId(expandedRowId === acc.id ? null : acc.id)}>
                        <td className="p-4 font-bold text-gray-900 text-sm">
                          {acc.accident_date}
                          <div className="text-xs text-gray-500 font-normal mt-1">{acc.accident_time}</div>
                        </td>
                        <td className="p-4 text-sm">
                          <div className="font-bold text-gray-800">{getCar(acc.car_id)?.number}</div>
                          <div className="text-xs text-gray-500">
                            {getCar(acc.car_id)?.brand} {getCar(acc.car_id)?.model}
                          </div>
                        </td>
                        <td className="p-4 text-sm">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            {ACC_TYPE[acc.accident_type]}
                          </span>
                        </td>
                        <td className="p-4 text-sm font-bold text-gray-800">{acc.fault_percentage}%</td>
                        <td className="p-4 text-sm font-bold text-gray-800">
                          {acc.estimated_repair_cost.toLocaleString()}원
                        </td>
                        <td className="p-4 text-sm">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${INS_STATUS[acc.insurance_status]?.color}`}>
                            {INS_STATUS[acc.insurance_status]?.label}
                          </span>
                        </td>
                        <td className="p-4 text-sm">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ACC_STATUS[acc.status]?.color}`}>
                            {ACC_STATUS[acc.status]?.label}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex gap-2 justify-center flex-wrap">
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                openEditModal(acc)
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200"
                            >
                              수정
                            </button>
                            {acc.status === 'reported' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(acc.id, 'insurance_filed')
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200"
                              >
                                보험접수
                              </button>
                            )}
                            {acc.status === 'insurance_filed' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(acc.id, 'repairing')
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700 hover:bg-purple-200"
                              >
                                수리시작
                              </button>
                            )}
                            {acc.status === 'repairing' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(acc.id, 'settled')
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-100 text-cyan-700 hover:bg-cyan-200"
                              >
                                정산
                              </button>
                            )}
                            {acc.status === 'settled' && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleStatusChange(acc.id, 'closed')
                                }}
                                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200"
                              >
                                종료
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Expanded Row Detail */}
                      {expandedRowId === acc.id && (
                        <tr className="bg-gray-50 border-t-2 border-steel-200">
                          <td colSpan={8} className="p-6">
                            <div className="grid grid-cols-2 gap-6">
                              {/* 운전자 정보 */}
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-bold text-gray-900 mb-3 text-sm">운전자 정보</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">이름</span>
                                    <span className="font-bold text-gray-900">{acc.driver_name || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">연락처</span>
                                    <span className="font-bold text-gray-900">{acc.driver_phone || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">관계</span>
                                    <span className="font-bold text-gray-900">{acc.driver_relationship || '-'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* 상대방 정보 */}
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-bold text-gray-900 mb-3 text-sm">상대방 정보</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">이름</span>
                                    <span className="font-bold text-gray-900">{acc.other_party_name || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">연락처</span>
                                    <span className="font-bold text-gray-900">{acc.other_party_phone || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">차량</span>
                                    <span className="font-bold text-gray-900">{acc.other_party_vehicle || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">보험사</span>
                                    <span className="font-bold text-gray-900">{acc.other_party_insurance_company || '-'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* 보험 처리 */}
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-bold text-gray-900 mb-3 text-sm">보험 처리</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">보험사</span>
                                    <span className="font-bold text-gray-900">{acc.insurance_company || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">접수번호</span>
                                    <span className="font-bold text-gray-900">{acc.insurance_claim_number || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">상태</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${INS_STATUS[acc.insurance_status]?.color}`}>
                                      {INS_STATUS[acc.insurance_status]?.label}
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">경찰신고</span>
                                    <span className="font-bold text-gray-900">{acc.police_reported ? '예' : '아니오'}</span>
                                  </div>
                                  {acc.police_reported && (
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">경찰 번호</span>
                                      <span className="font-bold text-gray-900">{acc.police_claim_number || '-'}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 비용 내역 */}
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-bold text-gray-900 mb-3 text-sm">비용 내역</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">예상 수리비</span>
                                    <span className="font-bold text-gray-900">{acc.estimated_repair_cost.toLocaleString()}원</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">실제 수리비</span>
                                    <span className="font-bold text-gray-900">{acc.actual_repair_cost.toLocaleString()}원</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">보험금</span>
                                    <span className="font-bold text-gray-900">{acc.insurance_payout_amount.toLocaleString()}원</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">자기부담금</span>
                                    <span className="font-bold text-gray-900">{acc.self_payment_amount.toLocaleString()}원</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">회사부담금</span>
                                    <span className="font-bold text-gray-900">{acc.company_payment_amount.toLocaleString()}원</span>
                                  </div>
                                </div>
                              </div>

                              {/* 수리 현황 */}
                              <div className="bg-white p-4 rounded-lg border border-gray-200">
                                <h4 className="font-bold text-gray-900 mb-3 text-sm">수리 현황</h4>
                                <div className="space-y-2 text-sm">
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">정비소</span>
                                    <span className="font-bold text-gray-900">{acc.repair_shop_name || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">전화</span>
                                    <span className="font-bold text-gray-900">{acc.repair_shop_phone || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">주소</span>
                                    <span className="font-bold text-gray-900 text-right">{acc.repair_shop_address || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">시작일</span>
                                    <span className="font-bold text-gray-900">{acc.repair_start_date || '-'}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-gray-500">종료일</span>
                                    <span className="font-bold text-gray-900">{acc.repair_end_date || '-'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* 대차 정보 */}
                              {acc.replacement_car_id && (
                                <div className="bg-white p-4 rounded-lg border border-gray-200">
                                  <h4 className="font-bold text-gray-900 mb-3 text-sm">대차 정보</h4>
                                  <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">차량</span>
                                      <span className="font-bold text-gray-900">
                                        {getCar(acc.replacement_car_id)?.number}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">시작일</span>
                                      <span className="font-bold text-gray-900">{acc.replacement_start_date || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">종료일</span>
                                      <span className="font-bold text-gray-900">{acc.replacement_end_date || '-'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-500">비용</span>
                                      <span className="font-bold text-gray-900">{acc.replacement_cost.toLocaleString()}원</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredAccidents.map(acc => (
                <div key={acc.id}>
                  <div
                    className="p-4 active:bg-steel-50 cursor-pointer"
                    onClick={() => setExpandedRowId(expandedRowId === acc.id ? null : acc.id)}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-black text-gray-900">
                          {acc.accident_date} {acc.accident_time}
                        </div>
                        <div className="text-sm text-gray-500 mt-1">{getCar(acc.car_id)?.number}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${ACC_STATUS[acc.status]?.color}`}>
                        {ACC_STATUS[acc.status]?.label}
                      </span>
                    </div>
                    <div className="text-sm mb-3">
                      <div className="font-bold text-gray-800">
                        {getCar(acc.car_id)?.brand} {getCar(acc.car_id)?.model}
                      </div>
                      <div className="text-xs text-gray-500">
                        {ACC_TYPE[acc.accident_type]} - {acc.location}
                      </div>
                    </div>
                    <div className="flex gap-2 overflow-x-auto">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          openEditModal(acc)
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 flex-shrink-0"
                      >
                        수정
                      </button>
                      {acc.status === 'reported' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStatusChange(acc.id, 'insurance_filed')
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-700 hover:bg-amber-200 flex-shrink-0"
                        >
                          보험접수
                        </button>
                      )}
                      {acc.status === 'insurance_filed' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStatusChange(acc.id, 'repairing')
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-100 text-purple-700 hover:bg-purple-200 flex-shrink-0"
                        >
                          수리시작
                        </button>
                      )}
                      {acc.status === 'repairing' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStatusChange(acc.id, 'settled')
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-100 text-cyan-700 hover:bg-cyan-200 flex-shrink-0"
                        >
                          정산
                        </button>
                      )}
                      {acc.status === 'settled' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleStatusChange(acc.id, 'closed')
                          }}
                          className="px-2.5 py-1 rounded-lg text-xs font-bold bg-green-100 text-green-700 hover:bg-green-200 flex-shrink-0"
                        >
                          종료
                        </button>
                      )}
                    </div>
                  </div>
                  {/* Mobile Expanded Detail */}
                  {expandedRowId === acc.id && (
                    <div className="p-4 bg-gray-50 border-t-2 border-steel-200 space-y-3">
                      <div className="bg-white p-3 rounded-lg">
                        <p className="font-bold text-gray-900 text-xs mb-2">운전자</p>
                        <p className="text-sm text-gray-800">{acc.driver_name || '-'} / {acc.driver_phone || '-'}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="font-bold text-gray-900 text-xs mb-2">상대방</p>
                        <p className="text-sm text-gray-800">{acc.other_party_name || '-'} / {acc.other_party_phone || '-'}</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="font-bold text-gray-900 text-xs mb-2">보험</p>
                        <p className="text-sm text-gray-800">{acc.insurance_company || '-'} ({acc.insurance_claim_number || '-'})</p>
                      </div>
                      <div className="bg-white p-3 rounded-lg">
                        <p className="font-bold text-gray-900 text-xs mb-2">비용</p>
                        <p className="text-sm text-gray-800">예상: {acc.estimated_repair_cost.toLocaleString()}원</p>
                        <p className="text-sm text-gray-800">실제: {acc.actual_repair_cost.toLocaleString()}원</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-4 md:p-6 flex justify-between items-center">
              <h2 className="text-xl md:text-2xl font-bold text-gray-900">
                {editingAccident ? '사고 수정' : '새 사고 등록'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            {/* Modal Section Tabs */}
            <div className="sticky top-16 bg-white border-b border-gray-200 flex gap-2 overflow-x-auto px-4 md:px-6">
              {[
                { num: 1, label: '사고 정보' },
                { num: 2, label: '상대방' },
                { num: 3, label: '보험/경찰' },
                { num: 4, label: '수리/비용' },
                { num: 5, label: '대차' },
                { num: 6, label: '메모' },
              ].map(section => (
                <button
                  key={section.num}
                  onClick={() => setModalSection(section.num)}
                  className={`px-4 py-3 font-bold text-xs border-b-2 transition-colors whitespace-nowrap ${
                    modalSection === section.num
                      ? 'border-steel-600 text-steel-600'
                      : 'border-transparent text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>

            <div className="p-4 md:p-6 space-y-4">
              {/* Section 1: 사고 정보 */}
              {modalSection === 1 && (
                <>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">차량</label>
                    <select
                      value={formData.car_id}
                      onChange={e => setFormData({ ...formData, car_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                    >
                      <option value="">차량 선택</option>
                      {cars.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.number} - {c.brand} {c.model}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-gray-700 mb-2">사고일</label>
                      <input
                        type="date"
                        value={formData.accident_date}
                        onChange={e => setFormData({ ...formData, accident_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-2">시간</label>
                      <input
                        type="time"
                        value={formData.accident_time}
                        onChange={e => setFormData({ ...formData, accident_time: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-2">장소</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={e => setFormData({ ...formData, location: e.target.value })}
                      placeholder="사고 발생 장소"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-2">사고유형</label>
                    <select
                      value={formData.accident_type}
                      onChange={e => setFormData({ ...formData, accident_type: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                    >
                      {Object.entries(ACC_TYPE).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-2">과실비율: {formData.fault_percentage}%</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={formData.fault_percentage}
                      onChange={e => setFormData({ ...formData, fault_percentage: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <div className="flex gap-2 mt-2">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={formData.fault_percentage}
                        onChange={e => setFormData({ ...formData, fault_percentage: parseInt(e.target.value) || 0 })}
                        className="w-24 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-steel-500"
                      />
                      <span className="text-gray-500 py-2">%</span>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-2">설명</label>
                    <textarea
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                      placeholder="사고에 대한 상세 설명"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500 resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-bold text-gray-900 mb-4">운전자 정보</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-700 mb-2">이름</label>
                        <input
                          type="text"
                          value={formData.driver_name}
                          onChange={e => setFormData({ ...formData, driver_name: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-2">연락처</label>
                        <input
                          type="tel"
                          value={formData.driver_phone}
                          onChange={e => setFormData({ ...formData, driver_phone: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                        />
                      </div>
                    </div>
                    <div className="mt-3">
                      <label className="block font-bold text-gray-700 mb-2">관계</label>
                      <input
                        type="text"
                        value={formData.driver_relationship}
                        onChange={e => setFormData({ ...formData, driver_relationship: e.target.value })}
                        placeholder="직원, 고객 등"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Section 2: 상대방 정보 */}
              {modalSection === 2 && (
                <>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">상대방 이름</label>
                    <input
                      type="text"
                      value={formData.other_party_name}
                      onChange={e => setFormData({ ...formData, other_party_name: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-2">상대방 연락처</label>
                    <input
                      type="tel"
                      value={formData.other_party_phone}
                      onChange={e => setFormData({ ...formData, other_party_phone: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-2">상대방 차량</label>
                    <input
                      type="text"
                      value={formData.other_party_vehicle}
                      onChange={e => setFormData({ ...formData, other_party_vehicle: e.target.value })}
                      placeholder="차량번호, 모델 등"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-2">상대방 보험사</label>
                    <input
                      type="text"
                      value={formData.other_party_insurance_company}
                      onChange={e => setFormData({ ...formData, other_party_insurance_company: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                    />
                  </div>
                </>
              )}

              {/* Section 3: 보험/경찰 */}
              {modalSection === 3 && (
                <>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">보험사</label>
                    <input
                      type="text"
                      value={formData.insurance_company}
                      onChange={e => setFormData({ ...formData, insurance_company: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-2">접수번호</label>
                    <input
                      type="text"
                      value={formData.insurance_claim_number}
                      onChange={e => setFormData({ ...formData, insurance_claim_number: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-gray-700 mb-2">보험상태</label>
                    <select
                      value={formData.insurance_status}
                      onChange={e => setFormData({ ...formData, insurance_status: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                    >
                      {Object.entries(INS_STATUS).map(([key, value]) => (
                        <option key={key} value={key}>
                          {value.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t pt-4">
                    <label className="flex items-center gap-2 cursor-pointer mb-3">
                      <input
                        type="checkbox"
                        checked={formData.police_reported}
                        onChange={e => setFormData({ ...formData, police_reported: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 cursor-pointer"
                      />
                      <span className="font-bold text-gray-700">경찰 신고</span>
                    </label>
                  </div>

                  {formData.police_reported && (
                    <div>
                      <label className="block font-bold text-gray-700 mb-2">경찰 접수번호</label>
                      <input
                        type="text"
                        value={formData.police_claim_number}
                        onChange={e => setFormData({ ...formData, police_claim_number: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Section 4: 수리/비용 */}
              {modalSection === 4 && (
                <>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">차량 상태</label>
                    <select
                      value={formData.vehicle_condition}
                      onChange={e => setFormData({ ...formData, vehicle_condition: e.target.value as any })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                    >
                      {Object.entries(VEHICLE_CONDITIONS).map(([key, label]) => (
                        <option key={key} value={key}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-bold text-gray-900 mb-4">정비소 정보</h4>
                    <div>
                      <label className="block font-bold text-gray-700 mb-2">정비소명</label>
                      <input
                        type="text"
                        value={formData.repair_shop_name}
                        onChange={e => setFormData({ ...formData, repair_shop_name: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500 mb-3"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-2">전화</label>
                      <input
                        type="tel"
                        value={formData.repair_shop_phone}
                        onChange={e => setFormData({ ...formData, repair_shop_phone: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500 mb-3"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-gray-700 mb-2">주소</label>
                      <input
                        type="text"
                        value={formData.repair_shop_address}
                        onChange={e => setFormData({ ...formData, repair_shop_address: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                      />
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-bold text-gray-900 mb-4">수리 기간</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-700 mb-2">시작일</label>
                        <input
                          type="date"
                          value={formData.repair_start_date}
                          onChange={e => setFormData({ ...formData, repair_start_date: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-2">종료일</label>
                        <input
                          type="date"
                          value={formData.repair_end_date}
                          onChange={e => setFormData({ ...formData, repair_end_date: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <h4 className="font-bold text-gray-900 mb-4">비용 내역</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block font-bold text-gray-700 mb-2">예상 수리비 (원)</label>
                        <input
                          type="number"
                          value={formData.estimated_repair_cost}
                          onChange={e => setFormData({ ...formData, estimated_repair_cost: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-2">실제 수리비 (원)</label>
                        <input
                          type="number"
                          value={formData.actual_repair_cost}
                          onChange={e => setFormData({ ...formData, actual_repair_cost: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-2">보험금 수령액 (원)</label>
                        <input
                          type="number"
                          value={formData.insurance_payout_amount}
                          onChange={e => setFormData({ ...formData, insurance_payout_amount: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-2">자기부담금 (원)</label>
                        <input
                          type="number"
                          value={formData.self_payment_amount}
                          onChange={e => setFormData({ ...formData, self_payment_amount: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-gray-700 mb-2">회사부담금 (원)</label>
                        <input
                          type="number"
                          value={formData.company_payment_amount}
                          onChange={e => setFormData({ ...formData, company_payment_amount: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Section 5: 대차 */}
              {modalSection === 5 && (
                <>
                  <div>
                    <label className="block font-bold text-gray-700 mb-2">대차 차량</label>
                    <select
                      value={formData.replacement_car_id}
                      onChange={e => setFormData({ ...formData, replacement_car_id: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                    >
                      <option value="">대차 차량 선택</option>
                      {cars.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.number} - {c.brand} {c.model}
                        </option>
                      ))}
                    </select>
                  </div>

                  {formData.replacement_car_id && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block font-bold text-gray-700 mb-2">시작일</label>
                          <input
                            type="date"
                            value={formData.replacement_start_date}
                            onChange={e => setFormData({ ...formData, replacement_start_date: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-gray-700 mb-2">종료일</label>
                          <input
                            type="date"
                            value={formData.replacement_end_date}
                            onChange={e => setFormData({ ...formData, replacement_end_date: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-bold text-gray-700 mb-2">대차 비용 (원)</label>
                        <input
                          type="number"
                          value={formData.replacement_cost}
                          onChange={e => setFormData({ ...formData, replacement_cost: parseInt(e.target.value) || 0 })}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Section 6: 메모 */}
              {modalSection === 6 && (
                <div>
                  <label className="block font-bold text-gray-700 mb-2">메모</label>
                  <textarea
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="사고 처리에 관련된 추가 메모"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 focus:outline-none focus:border-steel-500 resize-none"
                    rows={8}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 md:p-6 flex gap-3 justify-between">
              <div className="flex gap-2">
                {modalSection > 1 && (
                  <button
                    onClick={() => setModalSection(modalSection - 1)}
                    className="px-6 py-2.5 rounded-lg font-bold border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    이전
                  </button>
                )}
                {modalSection < 6 && (
                  <button
                    onClick={() => setModalSection(modalSection + 1)}
                    className="px-6 py-2.5 rounded-lg font-bold border border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    다음
                  </button>
                )}
              </div>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 rounded-lg font-bold border border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-lg font-bold bg-steel-600 text-white hover:bg-steel-700 disabled:bg-gray-400"
                >
                  {saving ? '저장중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
