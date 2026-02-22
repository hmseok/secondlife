'use client'

import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../utils/supabase'

type Props = {
  editingOp: any | null
  cars: any[]
  contracts: any[]
  customers: any[]
  effectiveCompanyId: string | undefined
  userId: string | undefined
  companyData: any
  onClose: () => void
  onCreated: () => void
}

const FUEL_LEVELS = ['empty', 'quarter', 'half', 'three_quarter', 'full']
const FUEL_LABELS: Record<string, string> = { empty: 'E', quarter: '1/4', half: '반', three_quarter: '3/4', full: '가득' }

const DISPATCH_CATEGORY_LABELS: Record<string, { label: string; desc: string; color: string }> = {
  insurance_victim:   { label: '피해자대차', desc: '상대 과실로 사고 → 상대 보험사 청구', color: 'text-blue-700' },
  insurance_at_fault: { label: '가해자대차', desc: '당사 고객 과실 → 당사 보험사 또는 자비', color: 'text-red-700' },
  insurance_own:      { label: '자차대차',   desc: '자차사고(단독) → 당사 보험 자차담보 청구', color: 'text-amber-700' },
  maintenance:        { label: '정비대차',   desc: '정비/검사 기간 동안 대체 차량 제공', color: 'text-gray-700' },
}

const BILLING_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  none:     { label: '-', color: '' },
  pending:  { label: '청구대기', color: 'bg-gray-100 text-gray-600' },
  billed:   { label: '청구완료', color: 'bg-blue-100 text-blue-700' },
  approved: { label: '승인', color: 'bg-cyan-100 text-cyan-700' },
  paid:     { label: '입금완료', color: 'bg-green-100 text-green-700' },
  partial:  { label: '부분입금', color: 'bg-amber-100 text-amber-700' },
  denied:   { label: '거부', color: 'bg-red-100 text-red-700' },
}

export default function DispatchModal({
  editingOp, cars, contracts, customers,
  effectiveCompanyId, userId, companyData,
  onClose, onCreated,
}: Props) {
  const [dispatchType, setDispatchType] = useState<'long_term' | 'short_term' | 'replacement'>('long_term')
  const [saving, setSaving] = useState(false)
  const [shortTermQuotes, setShortTermQuotes] = useState<any[]>([])
  const [useExistingQuote, setUseExistingQuote] = useState(false)
  const [accidents, setAccidents] = useState<any[]>([])

  // Common form
  const [form, setForm] = useState({
    operation_type: 'delivery' as 'delivery' | 'return',
    contract_id: '',
    car_id: '',
    customer_id: '',
    scheduled_date: new Date().toISOString().split('T')[0],
    scheduled_time: '10:00',
    location: '',
    location_address: '',
    handler_name: '',
    driver_name: '',
    driver_phone: '',
    mileage_at_op: 0,
    fuel_level: 'full',
    notes: '',
    damage_found: false,
    damage_description: '',
    excess_mileage: 0,
    settlement_amount: 0,
  })

  // Short-term specific
  const [shortTermForm, setShortTermForm] = useState({
    customer_name: '',
    customer_phone: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d.toISOString().split('T')[0] })(),
    daily_rate: 0,
    deposit: 0,
    selected_quote_id: '',
  })

  // Insurance/replacement specific
  const [insuranceForm, setInsuranceForm] = useState({
    dispatch_category: 'insurance_victim' as 'insurance_victim' | 'insurance_at_fault' | 'insurance_own' | 'maintenance',
    accident_id: '',
    damaged_car_id: '',           // 사고/수리 중인 원래 차량
    insurance_company_billing: '', // 청구 대상 보험사
    insurance_claim_no: '',        // 보험 접수번호
    insurance_daily_rate: 0,       // 보험사 인정 일일 대차료
    fault_ratio: 0,                // 과실비율 (0-100)
    replacement_start_date: new Date().toISOString().split('T')[0],
    replacement_end_date: '',      // 예상 반납일
    repair_shop_name: '',          // 수리업체
    customer_name: '',             // 대차 이용 고객
    customer_phone: '',
  })

  // Load editing op
  useEffect(() => {
    if (editingOp) {
      setForm({
        operation_type: editingOp.operation_type || 'delivery',
        contract_id: editingOp.contract_id || '',
        car_id: editingOp.car_id ? String(editingOp.car_id) : '',
        customer_id: editingOp.customer_id ? String(editingOp.customer_id) : '',
        scheduled_date: editingOp.scheduled_date || new Date().toISOString().split('T')[0],
        scheduled_time: editingOp.scheduled_time || '10:00',
        location: editingOp.location || '',
        location_address: editingOp.location_address || '',
        handler_name: editingOp.handler_name || '',
        driver_name: editingOp.driver_name || '',
        driver_phone: editingOp.driver_phone || '',
        mileage_at_op: editingOp.mileage_at_op || 0,
        fuel_level: editingOp.fuel_level || 'full',
        notes: editingOp.notes || '',
        damage_found: editingOp.damage_found || false,
        damage_description: editingOp.damage_description || '',
        excess_mileage: editingOp.excess_mileage || 0,
        settlement_amount: editingOp.settlement_amount || 0,
      })
      // If editing an insurance dispatch
      if (editingOp.dispatch_category && editingOp.dispatch_category !== 'regular') {
        setDispatchType('replacement')
        setInsuranceForm(prev => ({
          ...prev,
          dispatch_category: editingOp.dispatch_category,
          accident_id: editingOp.accident_id ? String(editingOp.accident_id) : '',
          damaged_car_id: editingOp.damaged_car_id ? String(editingOp.damaged_car_id) : '',
          insurance_company_billing: editingOp.insurance_company_billing || '',
          insurance_claim_no: editingOp.insurance_claim_no || '',
          insurance_daily_rate: editingOp.insurance_daily_rate || 0,
          fault_ratio: editingOp.fault_ratio || 0,
          replacement_start_date: editingOp.replacement_start_date || '',
          replacement_end_date: editingOp.replacement_end_date || '',
          repair_shop_name: editingOp.repair_shop_name || '',
        }))
      }
    }
  }, [editingOp])

  // Fetch accidents (for replacement tab)
  useEffect(() => {
    if (effectiveCompanyId && dispatchType === 'replacement') {
      supabase.from('accident_records').select('*')
        .eq('company_id', effectiveCompanyId)
        .in('status', ['reported', 'insurance_filed', 'repairing'])
        .order('accident_date', { ascending: false })
        .then(({ data }) => setAccidents(data || []))
    }
  }, [effectiveCompanyId, dispatchType])

  // Fetch short term quotes
  useEffect(() => {
    if (effectiveCompanyId && dispatchType === 'short_term') {
      supabase.from('short_term_quotes').select('*')
        .eq('company_id', effectiveCompanyId)
        .eq('status', 'active')
        .then(({ data }) => setShortTermQuotes(data || []))
    }
  }, [effectiveCompanyId, dispatchType])

  // Available cars
  const availableCars = useMemo(() => {
    return cars.filter(c => c.status === 'available' || c.status === undefined || String(c.id) === String(form.car_id))
  }, [cars, form.car_id])

  // Short-term computed
  const shortTermDays = useMemo(() => {
    const start = new Date(shortTermForm.start_date)
    const end = new Date(shortTermForm.end_date)
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  }, [shortTermForm.start_date, shortTermForm.end_date])
  const shortTermTotal = shortTermForm.daily_rate * shortTermDays

  // Insurance computed
  const insuranceDays = useMemo(() => {
    if (!insuranceForm.replacement_start_date || !insuranceForm.replacement_end_date) return 0
    const start = new Date(insuranceForm.replacement_start_date)
    const end = new Date(insuranceForm.replacement_end_date)
    return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)))
  }, [insuranceForm.replacement_start_date, insuranceForm.replacement_end_date])

  const insuranceTotalCost = insuranceForm.insurance_daily_rate * insuranceDays
  const insuranceCompanyShare = useMemo(() => {
    // 피해자대차: 상대과실 비율만큼 상대보험사 부담
    // 가해자대차: 당사과실이므로 당사보험 or 자비
    // 자차대차: 당사보험 자차담보
    if (insuranceForm.dispatch_category === 'insurance_victim') {
      return Math.round(insuranceTotalCost * (100 - insuranceForm.fault_ratio) / 100)
    }
    if (insuranceForm.dispatch_category === 'insurance_at_fault') {
      return Math.round(insuranceTotalCost * insuranceForm.fault_ratio / 100)
    }
    return insuranceTotalCost // 자차/정비: 전액
  }, [insuranceTotalCost, insuranceForm.fault_ratio, insuranceForm.dispatch_category])

  const customerShare = insuranceTotalCost - insuranceCompanyShare

  // ============================================
  // Load accident into form
  // ============================================
  const handleAccidentSelect = (accidentId: string) => {
    setInsuranceForm(prev => ({ ...prev, accident_id: accidentId }))
    const acc = accidents.find(a => String(a.id) === accidentId)
    if (!acc) return

    const car = cars.find(c => String(c.id) === String(acc.car_id))

    // Auto-determine dispatch category based on fault
    let category: typeof insuranceForm.dispatch_category = 'insurance_victim'
    if (acc.accident_type === 'self_damage') category = 'insurance_own'
    else if ((acc.fault_ratio || 0) > 50) category = 'insurance_at_fault'
    else category = 'insurance_victim'

    // Auto-fill from accident record
    setInsuranceForm(prev => ({
      ...prev,
      dispatch_category: category,
      damaged_car_id: acc.car_id ? String(acc.car_id) : '',
      fault_ratio: acc.fault_ratio || 0,
      insurance_company_billing: category === 'insurance_victim'
        ? (acc.counterpart_insurance || acc.insurance_company || '')
        : (acc.insurance_company || ''),
      insurance_claim_no: acc.insurance_claim_no || '',
      repair_shop_name: acc.repair_shop_name || '',
      replacement_start_date: acc.repair_start_date || new Date().toISOString().split('T')[0],
      replacement_end_date: acc.repair_end_date || '',
      customer_name: '',
      customer_phone: '',
    }))

    // Set schedule date = replacement start
    setForm(prev => ({
      ...prev,
      scheduled_date: acc.repair_start_date || new Date().toISOString().split('T')[0],
    }))
  }

  const loadQuote = (quoteId: string) => {
    const quote = shortTermQuotes.find(q => q.id === quoteId)
    if (!quote) return
    const detail = quote.quote_detail || {}
    setShortTermForm(prev => ({
      ...prev,
      customer_name: quote.customer_name || '',
      customer_phone: quote.customer_phone || '',
      daily_rate: detail.daily_rate || detail.dailyRate || 0,
      selected_quote_id: quoteId,
    }))
    if (detail.car_id) setForm(prev => ({ ...prev, car_id: String(detail.car_id) }))
  }

  // ============================================
  // Save - Long Term / basic dispatch
  // ============================================
  const handleSaveOperation = async () => {
    if (!effectiveCompanyId || !userId) return
    if (!form.car_id) return alert('차량을 선택해주세요.')
    setSaving(true)

    try {
      const payload: any = {
        ...form,
        company_id: effectiveCompanyId,
        status: editingOp ? editingOp.status : 'scheduled',
        created_by: editingOp ? editingOp.created_by : userId,
        dispatch_category: 'regular',
      }

      if (editingOp) {
        await supabase.from('vehicle_operations').update(payload).eq('id', editingOp.id)
      } else {
        const { data: inserted } = await supabase.from('vehicle_operations').insert([payload]).select()
        if (inserted?.[0]) {
          const contract = contracts.find(c => c.id === form.contract_id)
          const customer = customers.find(c => String(c.id) === String(form.customer_id))
          const title = `${form.operation_type === 'delivery' ? '출고' : '반납'} - ${customer?.name || contract?.customer_name || '미정'}`
          await supabase.from('vehicle_schedules').insert({
            company_id: effectiveCompanyId,
            car_id: form.car_id,
            schedule_type: form.operation_type,
            start_date: form.scheduled_date,
            end_date: form.scheduled_date,
            title,
            color: form.operation_type === 'delivery' ? '#3b82f6' : '#f59e0b',
            contract_id: form.contract_id || null,
            operation_id: inserted[0].id,
            created_by: userId,
          })
        }
      }
      onCreated()
    } catch (error) {
      console.error('저장 실패:', error)
      alert('저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // Save - Insurance/Replacement dispatch
  // ============================================
  const handleSaveInsuranceDispatch = async () => {
    if (!effectiveCompanyId || !userId) return
    if (!form.car_id) return alert('대차 차량을 선택해주세요.')
    if (!insuranceForm.replacement_start_date) return alert('대차 시작일을 입력해주세요.')
    if (insuranceForm.dispatch_category !== 'maintenance' && !insuranceForm.insurance_company_billing) {
      return alert('청구 대상 보험사를 입력해주세요.')
    }

    setSaving(true)
    try {
      const payload: any = {
        company_id: effectiveCompanyId,
        operation_type: 'delivery', // 대차 출고
        car_id: Number(form.car_id),
        customer_id: form.customer_id || null,
        scheduled_date: insuranceForm.replacement_start_date,
        scheduled_time: form.scheduled_time || '10:00',
        location: form.location || '',
        location_address: form.location_address || '',
        handler_name: form.handler_name || '',
        driver_name: form.driver_name || '',
        driver_phone: form.driver_phone || '',
        fuel_level: form.fuel_level || 'full',
        mileage_at_op: form.mileage_at_op || 0,
        notes: form.notes || '',
        status: editingOp ? editingOp.status : 'scheduled',
        created_by: editingOp ? editingOp.created_by : userId,
        // Insurance fields
        dispatch_category: insuranceForm.dispatch_category,
        accident_id: insuranceForm.accident_id ? Number(insuranceForm.accident_id) : null,
        damaged_car_id: insuranceForm.damaged_car_id ? Number(insuranceForm.damaged_car_id) : null,
        insurance_company_billing: insuranceForm.insurance_company_billing || null,
        insurance_claim_no: insuranceForm.insurance_claim_no || null,
        insurance_daily_rate: insuranceForm.insurance_daily_rate || 0,
        fault_ratio: insuranceForm.fault_ratio || 0,
        replacement_start_date: insuranceForm.replacement_start_date,
        replacement_end_date: insuranceForm.replacement_end_date || null,
        repair_shop_name: insuranceForm.repair_shop_name || null,
        insurance_billing_status: 'pending',
        insurance_billed_amount: insuranceCompanyShare,
        customer_charge: customerShare,
      }

      if (editingOp) {
        await supabase.from('vehicle_operations').update(payload).eq('id', editingOp.id)
      } else {
        const { data: inserted } = await supabase.from('vehicle_operations').insert([payload]).select()

        if (inserted?.[0]) {
          const car = cars.find(c => String(c.id) === String(form.car_id))
          const catLabel = DISPATCH_CATEGORY_LABELS[insuranceForm.dispatch_category]?.label || '대차'

          // Create schedule for the replacement period
          await supabase.from('vehicle_schedules').insert({
            company_id: effectiveCompanyId,
            car_id: Number(form.car_id),
            schedule_type: 'accident_repair',
            start_date: insuranceForm.replacement_start_date,
            end_date: insuranceForm.replacement_end_date || insuranceForm.replacement_start_date,
            title: `${catLabel} - ${insuranceForm.customer_name || '고객'}`,
            color: '#f59e0b', // amber for replacement
            accident_id: insuranceForm.accident_id ? Number(insuranceForm.accident_id) : null,
            operation_id: inserted[0].id,
            created_by: userId,
          })

          // Update accident record's replacement info
          if (insuranceForm.accident_id) {
            await supabase.from('accident_records').update({
              replacement_car_id: Number(form.car_id),
              replacement_start: insuranceForm.replacement_start_date,
              replacement_end: insuranceForm.replacement_end_date || null,
              replacement_cost: insuranceCompanyShare,
            }).eq('id', Number(insuranceForm.accident_id))
          }

          // Update car status
          await supabase.from('cars').update({ status: 'rented' }).eq('id', Number(form.car_id))
        }
      }

      onCreated()
    } catch (error: any) {
      console.error('보험배차 저장 실패:', error)
      alert('저장 중 오류: ' + (error.message || JSON.stringify(error)))
    } finally {
      setSaving(false)
    }
  }

  // ============================================
  // Save - Short Term
  // ============================================
  const handleCreateShortTermContract = async () => {
    if (!effectiveCompanyId || !userId) return
    if (!form.car_id) return alert('차량을 선택해주세요.')
    if (!shortTermForm.customer_name) return alert('고객명을 입력해주세요.')
    if (!shortTermForm.daily_rate) return alert('일일 요금을 입력해주세요.')

    setSaving(true)
    try {
      const { data: contract, error: cErr } = await supabase.from('contracts').insert([{
        company_id: effectiveCompanyId,
        car_id: Number(form.car_id),
        customer_name: shortTermForm.customer_name,
        customer_phone: shortTermForm.customer_phone,
        contract_type: 'rent',
        dispatch_type: 'short_term',
        start_date: shortTermForm.start_date,
        end_date: shortTermForm.end_date,
        daily_rate: shortTermForm.daily_rate,
        total_amount: shortTermTotal,
        deposit: shortTermForm.deposit,
        monthly_rent: shortTermForm.daily_rate * 30,
        short_term_quote_id: shortTermForm.selected_quote_id || null,
        status: 'active',
        created_by: userId,
      }]).select().single()
      if (cErr) throw cErr

      await supabase.from('vehicle_operations').insert([{
        company_id: effectiveCompanyId,
        contract_id: contract.id,
        car_id: Number(form.car_id),
        operation_type: 'delivery',
        scheduled_date: shortTermForm.start_date,
        scheduled_time: form.scheduled_time || '10:00',
        location: form.location || '',
        location_address: form.location_address || '',
        handler_name: form.handler_name || '',
        status: 'scheduled',
        created_by: userId,
        dispatch_category: 'regular',
      }]).select()

      await supabase.from('vehicle_schedules').insert({
        company_id: effectiveCompanyId,
        car_id: Number(form.car_id),
        schedule_type: 'rental',
        start_date: shortTermForm.start_date,
        end_date: shortTermForm.end_date,
        title: `단기 - ${shortTermForm.customer_name}`,
        color: '#8b5cf6',
        contract_id: contract.id,
        created_by: userId,
      })

      await supabase.from('cars').update({ status: 'rented' }).eq('id', Number(form.car_id))

      alert(`단기대차 계약이 생성되었습니다.\n기간: ${shortTermForm.start_date} ~ ${shortTermForm.end_date}\n총액: ${shortTermTotal.toLocaleString()}원`)
      onCreated()
    } catch (error: any) {
      console.error('단기계약 생성 실패:', error)
      alert('계약 생성 중 오류: ' + (error.message || JSON.stringify(error)))
    } finally {
      setSaving(false)
    }
  }

  const handleContractSelect = (contractId: string) => {
    setForm(prev => ({ ...prev, contract_id: contractId }))
    const contract = contracts.find(c => c.id === contractId)
    if (contract) {
      if (contract.car_id) setForm(prev => ({ ...prev, car_id: String(contract.car_id) }))
      if (contract.customer_id) setForm(prev => ({ ...prev, customer_id: String(contract.customer_id) }))
    }
  }

  // ============================================
  // Render
  // ============================================
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-black text-gray-900">
            {editingOp ? '배차 수정' : '새 배차 등록'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        {/* Dispatch Type Tabs */}
        {!editingOp && (
          <div className="flex gap-2 p-4 pb-0">
            {[
              { key: 'long_term', label: '📋 장기계약', color: 'blue' },
              { key: 'short_term', label: '⚡ 단기대차', color: 'purple' },
              { key: 'replacement', label: '🛡️ 보험/대차', color: 'amber' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setDispatchType(tab.key as any)}
                className={`flex-1 py-2.5 rounded-lg font-bold text-sm border-2 transition-all ${
                  dispatchType === tab.key
                    ? tab.color === 'blue' ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : tab.color === 'purple' ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-amber-500 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                }`}>
                {tab.label}
              </button>
            ))}
          </div>
        )}

        <div className="p-4 space-y-4">

          {/* ============================================
              LONG-TERM: Standard Operation Form
              ============================================ */}
          {(dispatchType === 'long_term' || (editingOp && (!editingOp.dispatch_category || editingOp.dispatch_category === 'regular'))) && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">작업 유형</label>
                <div className="flex gap-2">
                  <button onClick={() => setForm({ ...form, operation_type: 'delivery' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm ${form.operation_type === 'delivery' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>출고</button>
                  <button onClick={() => setForm({ ...form, operation_type: 'return' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm ${form.operation_type === 'return' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>반납</button>
                </div>
              </div>

              {!editingOp && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">연동 계약</label>
                  <select value={form.contract_id} onChange={e => handleContractSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-steel-500">
                    <option value="">계약 선택 (선택사항)</option>
                    {contracts.map(c => {
                      const car = cars.find(cr => String(cr.id) === String(c.car_id))
                      return (<option key={c.id} value={c.id}>{c.customer_name || '고객'} - {car?.number || '차량'} ({c.start_date} ~ {c.end_date})</option>)
                    })}
                  </select>
                </div>
              )}

              {renderCommonFields()}

              {form.operation_type === 'return' && renderReturnFields()}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">메모</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-steel-500" rows={2} />
              </div>
            </>
          )}

          {/* ============================================
              REPLACEMENT / INSURANCE DISPATCH
              ============================================ */}
          {(dispatchType === 'replacement' || (editingOp && editingOp.dispatch_category && editingOp.dispatch_category !== 'regular')) && !editingOp?.dispatch_category?.startsWith('regular') && dispatchType === 'replacement' && (
            <>
              {/* Dispatch Category */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">배차 유형</label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(DISPATCH_CATEGORY_LABELS) as Array<'insurance_victim' | 'insurance_at_fault' | 'insurance_own' | 'maintenance'>).map(key => (
                    <button key={key} onClick={() => setInsuranceForm({ ...insuranceForm, dispatch_category: key })}
                      className={`p-2.5 rounded-lg text-left border-2 transition-all ${
                        insuranceForm.dispatch_category === key
                          ? 'border-amber-500 bg-amber-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}>
                      <div className={`font-bold text-sm ${DISPATCH_CATEGORY_LABELS[key].color}`}>
                        {DISPATCH_CATEGORY_LABELS[key].label}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{DISPATCH_CATEGORY_LABELS[key].desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Link to Accident Record */}
              {insuranceForm.dispatch_category !== 'maintenance' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">사고 기록 연동</label>
                  <select value={insuranceForm.accident_id} onChange={e => handleAccidentSelect(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500">
                    <option value="">사고 기록 선택 (선택사항)</option>
                    {accidents.map(acc => {
                      const car = cars.find(c => String(c.id) === String(acc.car_id))
                      return (
                        <option key={acc.id} value={acc.id}>
                          [{acc.accident_date}] {car?.number || '차량'} - {acc.accident_type === 'collision' ? '충돌' : acc.accident_type === 'self_damage' ? '자손' : acc.accident_type} (과실 {acc.fault_ratio || 0}%)
                        </option>
                      )
                    })}
                  </select>
                </div>
              )}

              {/* Damaged Car (the car being repaired) */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">수리중 차량 (사고 차량)</label>
                <select value={insuranceForm.damaged_car_id} onChange={e => setInsuranceForm({ ...insuranceForm, damaged_car_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500">
                  <option value="">수리중 차량 선택</option>
                  {cars.map(c => <option key={c.id} value={c.id}>{c.number} - {c.brand} {c.model}</option>)}
                </select>
              </div>

              {/* Customer Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">이용 고객명</label>
                  <input type="text" value={insuranceForm.customer_name} onChange={e => setInsuranceForm({ ...insuranceForm, customer_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500" placeholder="대차 이용 고객" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">고객 연락처</label>
                  <input type="tel" value={insuranceForm.customer_phone} onChange={e => setInsuranceForm({ ...insuranceForm, customer_phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500" placeholder="010-0000-0000" />
                </div>
              </div>

              {/* Insurance Info Section */}
              {insuranceForm.dispatch_category !== 'maintenance' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
                  <h3 className="font-bold text-amber-800 text-sm flex items-center gap-1">
                    🛡️ 보험 정보
                  </h3>

                  {/* Fault Ratio */}
                  <div>
                    <label className="block text-xs font-bold text-amber-700 mb-1">
                      과실비율 (당사고객 기준: 0% = 완전 피해, 100% = 완전 가해)
                    </label>
                    <div className="flex items-center gap-3">
                      <input type="range" min="0" max="100" step="5" value={insuranceForm.fault_ratio}
                        onChange={e => setInsuranceForm({ ...insuranceForm, fault_ratio: Number(e.target.value) })}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                      <div className="bg-white border border-amber-300 rounded-lg px-3 py-1.5 min-w-[80px] text-center">
                        <span className="font-black text-amber-800">{insuranceForm.fault_ratio}%</span>
                      </div>
                    </div>
                    <div className="flex justify-between text-[10px] text-amber-600 mt-1">
                      <span>피해자 (0%)</span>
                      <span>쌍방 (50%)</span>
                      <span>가해자 (100%)</span>
                    </div>
                  </div>

                  {/* Insurance Company & Claim */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-amber-700 mb-1">청구 대상 보험사</label>
                      <input type="text" value={insuranceForm.insurance_company_billing}
                        onChange={e => setInsuranceForm({ ...insuranceForm, insurance_company_billing: e.target.value })}
                        className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm" placeholder="삼성화재, 현대해상 등" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-amber-700 mb-1">보험 접수번호</label>
                      <input type="text" value={insuranceForm.insurance_claim_no}
                        onChange={e => setInsuranceForm({ ...insuranceForm, insurance_claim_no: e.target.value })}
                        className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm" placeholder="접수번호" />
                    </div>
                  </div>

                  {/* Daily Rate */}
                  <div>
                    <label className="block text-xs font-bold text-amber-700 mb-1">보험사 인정 일일 대차료 (원)</label>
                    <input type="text" value={insuranceForm.insurance_daily_rate ? insuranceForm.insurance_daily_rate.toLocaleString() : ''}
                      onChange={e => setInsuranceForm({ ...insuranceForm, insurance_daily_rate: Number(e.target.value.replace(/,/g, '')) || 0 })}
                      className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm text-right font-bold" placeholder="50,000" />
                  </div>
                </div>
              )}

              {/* Replacement Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">대차 시작일</label>
                  <input type="date" value={insuranceForm.replacement_start_date}
                    onChange={e => {
                      setInsuranceForm({ ...insuranceForm, replacement_start_date: e.target.value })
                      setForm(prev => ({ ...prev, scheduled_date: e.target.value }))
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">예상 반납일 (수리완료일)</label>
                  <input type="date" value={insuranceForm.replacement_end_date}
                    onChange={e => setInsuranceForm({ ...insuranceForm, replacement_end_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500" />
                </div>
              </div>

              {/* Repair Shop */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">수리업체</label>
                <input type="text" value={insuranceForm.repair_shop_name}
                  onChange={e => setInsuranceForm({ ...insuranceForm, repair_shop_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500" placeholder="수리업체명" />
              </div>

              {/* Replacement Car Selection */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">대차 차량 (제공할 차량)</label>
                <select value={form.car_id} onChange={e => setForm({ ...form, car_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500">
                  <option value="">대차 차량 선택</option>
                  {availableCars.map(c => (
                    <option key={c.id} value={c.id}>{c.number} - {c.brand} {c.model} {c.status === 'available' ? '(가용)' : ''}</option>
                  ))}
                </select>
              </div>

              {/* Delivery time/location/handler */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">출고 시간</label>
                  <input type="time" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">출고 장소</label>
                  <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="장소"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">담당자</label>
                  <input type="text" value={form.handler_name} onChange={e => setForm({ ...form, handler_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-amber-500" />
                </div>
              </div>

              {/* Cost Summary */}
              {insuranceForm.dispatch_category !== 'maintenance' && insuranceForm.insurance_daily_rate > 0 && (
                <div className="bg-gray-900 text-white rounded-xl p-4">
                  <h3 className="font-bold text-sm mb-3 text-gray-300">비용 정산 요약</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">일일 대차료</span>
                      <span className="font-bold">{insuranceForm.insurance_daily_rate.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">예상 대차일수</span>
                      <span className="font-bold">{insuranceDays}일</span>
                    </div>
                    <div className="border-t border-gray-700 my-1"></div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">총 대차비</span>
                      <span className="font-bold text-base">{insuranceTotalCost.toLocaleString()}원</span>
                    </div>
                    <div className="flex justify-between text-blue-400">
                      <span>보험사 부담 ({insuranceForm.dispatch_category === 'insurance_victim' ? `${100 - insuranceForm.fault_ratio}%` : insuranceForm.dispatch_category === 'insurance_at_fault' ? `${insuranceForm.fault_ratio}%` : '100%'})</span>
                      <span className="font-black">{insuranceCompanyShare.toLocaleString()}원</span>
                    </div>
                    {customerShare > 0 && (
                      <div className="flex justify-between text-red-400">
                        <span>고객 부담 ({insuranceForm.dispatch_category === 'insurance_victim' ? `${insuranceForm.fault_ratio}%` : `${100 - insuranceForm.fault_ratio}%`})</span>
                        <span className="font-bold">{customerShare.toLocaleString()}원</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">메모</label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-amber-500" rows={2} />
              </div>
            </>
          )}

          {/* ============================================
              SHORT-TERM
              ============================================ */}
          {dispatchType === 'short_term' && !editingOp && (
            <>
              <div className="flex gap-2">
                <button onClick={() => setUseExistingQuote(false)}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 ${!useExistingQuote ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}>새로 작성</button>
                <button onClick={() => setUseExistingQuote(true)}
                  className={`flex-1 py-2 rounded-lg font-bold text-sm border-2 ${useExistingQuote ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-500'}`}>견적 불러오기</button>
              </div>

              {useExistingQuote && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">단기 견적 선택</label>
                  <select value={shortTermForm.selected_quote_id} onChange={e => loadQuote(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500">
                    <option value="">견적 선택</option>
                    {shortTermQuotes.map(q => (
                      <option key={q.id} value={q.id}>{q.customer_name} - {q.quote_detail?.daily_rate?.toLocaleString() || 0}원/일 ({q.created_at?.split('T')[0]})</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">고객명</label>
                  <input type="text" value={shortTermForm.customer_name} onChange={e => setShortTermForm({ ...shortTermForm, customer_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" placeholder="홍길동" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">연락처</label>
                  <input type="tel" value={shortTermForm.customer_phone} onChange={e => setShortTermForm({ ...shortTermForm, customer_phone: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" placeholder="010-0000-0000" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">차량</label>
                <select value={form.car_id} onChange={e => setForm({ ...form, car_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500">
                  <option value="">차량 선택</option>
                  {availableCars.map(c => (
                    <option key={c.id} value={c.id}>{c.number} - {c.brand} {c.model} {c.status === 'available' ? '(가용)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">시작일</label>
                  <input type="date" value={shortTermForm.start_date} onChange={e => setShortTermForm({ ...shortTermForm, start_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">종료일</label>
                  <input type="date" value={shortTermForm.end_date} onChange={e => setShortTermForm({ ...shortTermForm, end_date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">일일 요금 (원)</label>
                  <input type="text" value={shortTermForm.daily_rate ? shortTermForm.daily_rate.toLocaleString() : ''}
                    onChange={e => setShortTermForm({ ...shortTermForm, daily_rate: Number(e.target.value.replace(/,/g, '')) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-right font-bold focus:outline-none focus:border-purple-500" placeholder="50,000" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">보증금 (원)</label>
                  <input type="text" value={shortTermForm.deposit ? shortTermForm.deposit.toLocaleString() : ''}
                    onChange={e => setShortTermForm({ ...shortTermForm, deposit: Number(e.target.value.replace(/,/g, '')) || 0 })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-right font-bold focus:outline-none focus:border-purple-500" placeholder="0" />
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-bold text-purple-700">계약 요약</span>
                  <span className="text-xs text-purple-500">{shortTermDays}일간</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-purple-600">일일 요금</span><span className="font-bold">{shortTermForm.daily_rate.toLocaleString()}원</span></div>
                  <div className="border-t border-purple-200 my-1"></div>
                  <div className="flex justify-between"><span className="text-purple-700 font-bold">총 금액</span><span className="font-black text-purple-800 text-lg">{shortTermTotal.toLocaleString()}원</span></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">출고 시간</label>
                  <input type="time" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">출고 장소</label>
                  <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="출고 장소"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">담당자</label>
                <input type="text" value={form.handler_name} onChange={e => setForm({ ...form, handler_name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-purple-500" />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3 justify-end">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg font-bold border border-gray-300 text-gray-700 hover:bg-gray-50 text-sm">취소</button>
          {dispatchType === 'short_term' && !editingOp ? (
            <button onClick={handleCreateShortTermContract} disabled={saving}
              className="px-6 py-2.5 rounded-lg font-bold bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-400 text-sm shadow-lg">
              {saving ? '처리중...' : '계약 확정 + 출고 등록'}
            </button>
          ) : dispatchType === 'replacement' && !editingOp ? (
            <button onClick={handleSaveInsuranceDispatch} disabled={saving}
              className="px-6 py-2.5 rounded-lg font-bold bg-amber-600 text-white hover:bg-amber-700 disabled:bg-gray-400 text-sm shadow-lg">
              {saving ? '처리중...' : '보험배차 등록'}
            </button>
          ) : (
            <button onClick={handleSaveOperation} disabled={saving}
              className="px-6 py-2.5 rounded-lg font-bold bg-steel-600 text-white hover:bg-steel-700 disabled:bg-gray-400 text-sm shadow-lg">
              {saving ? '저장중...' : editingOp ? '수정 완료' : '배차 등록'}
            </button>
          )}
        </div>
      </div>
    </div>
  )

  // ============================================
  // Shared form sections
  // ============================================
  function renderCommonFields() {
    return (
      <>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">차량</label>
            <select value={form.car_id} onChange={e => setForm({ ...form, car_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-steel-500">
              <option value="">차량 선택</option>
              {cars.map(c => (<option key={c.id} value={c.id}>{c.number} - {c.brand} {c.model}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">일정 날짜</label>
            <input type="date" value={form.scheduled_date} onChange={e => setForm({ ...form, scheduled_date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-steel-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">시간</label>
            <input type="time" value={form.scheduled_time} onChange={e => setForm({ ...form, scheduled_time: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-steel-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">장소</label>
            <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} placeholder="출고/반납 장소"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-steel-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">담당자</label>
            <input type="text" value={form.handler_name} onChange={e => setForm({ ...form, handler_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-steel-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">운전자</label>
            <input type="text" value={form.driver_name} onChange={e => setForm({ ...form, driver_name: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-steel-500" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">주행거리 (km)</label>
            <input type="number" value={form.mileage_at_op} onChange={e => setForm({ ...form, mileage_at_op: parseInt(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-steel-500" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1.5">연료</label>
            <select value={form.fuel_level} onChange={e => setForm({ ...form, fuel_level: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-steel-500">
              {FUEL_LEVELS.map(f => <option key={f} value={f}>{FUEL_LABELS[f]}</option>)}
            </select>
          </div>
        </div>
      </>
    )
  }

  function renderReturnFields() {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={form.damage_found} onChange={e => setForm({ ...form, damage_found: e.target.checked })} className="w-4 h-4 rounded" />
          <span className="font-bold text-amber-700 text-sm">손상 발견</span>
        </label>
        {form.damage_found && (
          <textarea value={form.damage_description} onChange={e => setForm({ ...form, damage_description: e.target.value })} placeholder="손상 내용 기술..."
            className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm resize-none" rows={2} />
        )}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-amber-700 mb-1">초과 주행 (km)</label>
            <input type="number" value={form.excess_mileage} onChange={e => setForm({ ...form, excess_mileage: parseInt(e.target.value) || 0 })}
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-amber-700 mb-1">정산 금액 (원)</label>
            <input type="number" value={form.settlement_amount} onChange={e => setForm({ ...form, settlement_amount: parseInt(e.target.value) || 0 })}
              className="w-full border border-amber-300 rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
      </div>
    )
  }
}
