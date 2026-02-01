'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../utils/supabase'

export default function FinanceDetailPage() {
  const router = useRouter()
  const params = useParams()
  const isNew = params.id === 'new'
  const loanId = isNew ? null : params.id

  const [loading, setLoading] = useState(!isNew)
  const [cars, setCars] = useState<any[]>([])

  // 폼 데이터 상태
  const [loan, setLoan] = useState({
    car_id: '', finance_name: '', type: '할부',
    vehicle_price: 0, acquisition_tax: 0, deposit: 0,
    total_amount: 0, interest_rate: 0, months: 60,
    monthly_payment: 0,
    first_payment: 0, // 👈 [신규] 첫 회 납입금
    payment_date: 0,
    start_date: '', end_date: '',
    guarantor_name: '', guarantor_limit: 0
  })

  // 🧮 [정밀 자동 계산] 총 상환액 및 이자 비용 분석
  // 첫 달 금액이 있으면: 첫달 + (월납입금 * (개월수-1))
  // 첫 달 금액이 없으면: 월납입금 * 개월수
  const actualFirstPayment = loan.first_payment > 0 ? loan.first_payment : loan.monthly_payment
  const remainingMonths = loan.months > 0 ? loan.months - 1 : 0
  const totalRepay = actualFirstPayment + (loan.monthly_payment * remainingMonths)

  const totalInterest = totalRepay - loan.total_amount
  const finalInterest = totalInterest > 0 ? totalInterest : 0

  useEffect(() => {
    fetchCars()
    if (!isNew && loanId) fetchLoanDetail()
  }, [])

  // 🗓️ [자동 계산] 실행일 or 개월수 바뀌면 -> 만기일 자동 세팅
  useEffect(() => {
    if (loan.start_date && loan.months > 0) {
      const start = new Date(loan.start_date)
      start.setMonth(start.getMonth() + loan.months)
      const end = start.toISOString().split('T')[0]
      setLoan(prev => ({ ...prev, end_date: end }))
    }
  }, [loan.start_date, loan.months])

  const fetchCars = async () => {
    const { data } = await supabase.from('cars').select('id, number, model').order('number', { ascending: true })
    setCars(data || [])
  }

  const fetchLoanDetail = async () => {
    const { data, error } = await supabase.from('loans').select('*').eq('id', loanId).single()
    if (error) { alert('데이터를 불러오지 못했습니다.'); router.push('/finance'); }
    else {
      setLoan({
        ...data,
        vehicle_price: data.vehicle_price || 0,
        acquisition_tax: data.acquisition_tax || 0,
        deposit: data.deposit || 0,
        total_amount: data.total_amount || 0,
        interest_rate: data.interest_rate || 0,
        monthly_payment: data.monthly_payment || 0,
        first_payment: data.first_payment || 0, // 👈 데이터 매핑
        payment_date: data.payment_date || 0,
        guarantor_limit: data.guarantor_limit || 0,
        start_date: data.start_date || '',
        end_date: data.end_date || '',
        guarantor_name: data.guarantor_name || '',
      })
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!loan.car_id || !loan.finance_name) return alert('차량과 금융사명은 필수입니다.')

    const payload = {
      ...loan,
      start_date: loan.start_date || null,
      end_date: loan.end_date || null
    }

    let error
    if (isNew) {
      const { error: insertError } = await supabase.from('loans').insert(payload)
      error = insertError
    } else {
      const { error: updateError } = await supabase.from('loans').update(payload).eq('id', loanId)
      error = updateError
    }

    if (error) alert('저장 실패: ' + error.message)
    else {
      alert('저장되었습니다!')
      router.push('/finance')
    }
  }

  const handleDelete = async () => {
    if(!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return
    await supabase.from('loans').delete().eq('id', loanId)
    alert('삭제되었습니다.')
    router.push('/finance')
  }

  const handleMoneyChange = (field: string, value: string) => {
    const rawValue = value.replace(/,/g, '')
    const numValue = Number(rawValue)
    if (isNaN(numValue)) return

    setLoan(prev => {
      const updated = { ...prev, [field]: numValue }
      if (field === 'vehicle_price' || field === 'deposit') {
        updated.total_amount = updated.vehicle_price - updated.deposit
      }
      return updated
    })
  }

  if (loading) return <div className="p-20 text-center font-bold text-gray-500">데이터 불러오는 중... ⏳</div>

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 animate-fade-in-up pb-32">
      <div className="flex justify-between items-center mb-8 border-b pb-6">
        <div>
          <button onClick={() => router.back()} className="text-gray-500 font-bold mb-2 hover:text-black">← 목록으로 돌아가기</button>
          <h1 className="text-3xl font-black text-gray-900">
            {isNew ? '📄 신규 금융 견적 등록' : '✏️ 금융 계약 상세 정보'}
          </h1>
          <p className="text-gray-500 mt-1">견적서 및 근보증서 내용을 정확히 입력해주세요.</p>
        </div>
        {!isNew && (
           <button onClick={handleDelete} className="bg-white border border-red-200 text-red-500 px-4 py-2 rounded-xl font-bold hover:bg-red-50">🗑️ 삭제</button>
        )}
      </div>

      <div className="space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-200">

          {/* 1. 기본 정보 */}
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">1. 기본 계약 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">대상 차량</label>
                    <select className="w-full border p-3 rounded-xl font-bold bg-gray-50" value={loan.car_id} onChange={e => setLoan({...loan, car_id: e.target.value})}>
                      <option value="">차량을 선택하세요</option>
                      {cars.map(c => <option key={c.id} value={c.id}>{c.number} ({c.model})</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">금융사</label>
                        <input className="w-full border p-3 rounded-xl" placeholder="예: KB캐피탈" value={loan.finance_name} onChange={e => setLoan({...loan, finance_name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">상품 구분</label>
                        <select className="w-full border p-3 rounded-xl" value={loan.type} onChange={e => setLoan({...loan, type: e.target.value})}>
                            <option>할부</option><option>리스</option><option>렌트</option><option>담보대출</option>
                        </select>
                    </div>
                 </div>
              </div>
          </div>

          <hr className="border-gray-100" />

          {/* 2. 금액 정보 */}
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">2. 견적 금액 상세</h3>
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">차량 가격 (옵션포함)</label>
                    <input type="text" className="w-full border p-2 rounded-lg text-right font-bold text-lg bg-white" placeholder="0"
                      value={loan.vehicle_price > 0 ? loan.vehicle_price.toLocaleString() : ''} onChange={e => handleMoneyChange('vehicle_price', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">취등록세/부대비용</label>
                    <input type="text" className="w-full border p-2 rounded-lg text-right font-bold text-lg bg-white" placeholder="0"
                      value={loan.acquisition_tax > 0 ? loan.acquisition_tax.toLocaleString() : ''} onChange={e => handleMoneyChange('acquisition_tax', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-blue-600 mb-1">(-) 선수금/보증금</label>
                    <input type="text" className="w-full border p-2 rounded-lg border-blue-200 text-right text-blue-600 font-bold text-lg bg-white" placeholder="0"
                      value={loan.deposit > 0 ? loan.deposit.toLocaleString() : ''} onChange={e => handleMoneyChange('deposit', e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-red-600 mb-1">(=) 할부/대출 원금</label>
                    <input type="text" className="w-full border p-2 rounded-lg border-red-200 font-black bg-white text-right text-red-600 text-lg" placeholder="자동계산" readOnly
                      value={loan.total_amount > 0 ? loan.total_amount.toLocaleString() : ''} />
                </div>
              </div>
          </div>

          <hr className="border-gray-100" />

          {/* 3. 상환 조건 */}
          <div className="space-y-4">
             <div className="flex justify-between items-end">
                <h3 className="font-bold text-lg text-gray-900">3. 상환 일정 및 조건</h3>

                {/* 💰 이자 분석 (첫 회 납입금 반영됨) */}
                <div className="text-right text-xs bg-gray-100 px-3 py-2 rounded-lg">
                    <span className="text-gray-500 mr-2">총 이자 비용:</span>
                    <span className="font-bold text-red-600 text-sm">+{finalInterest.toLocaleString()}원</span>
                    <span className="text-gray-300 mx-2">|</span>
                    <span className="text-gray-500 mr-2">총 상환액:</span>
                    <span className="font-bold text-gray-800 text-sm">{totalRepay.toLocaleString()}원</span>
                </div>
             </div>

             {/* 날짜 행 */}
             <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">대출 실행일</label>
                    <input type="date" max="9999-12-31" className="w-full border p-3 rounded-xl text-sm" value={loan.start_date} onChange={e => setLoan({...loan, start_date: e.target.value})} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">만기일 (자동계산)</label>
                    <input type="date" max="9999-12-31" className="w-full border p-3 rounded-xl text-sm bg-gray-50" readOnly value={loan.end_date} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">매월 납입일</label>
                    <input type="text" className="w-full border p-3 rounded-xl text-right" placeholder="예: 25"
                      value={loan.payment_date > 0 ? loan.payment_date : ''} onChange={e => handleMoneyChange('payment_date', e.target.value)} />
                </div>
             </div>

             {/* 금액 행 (첫 회차 추가됨 ✨) */}
             <div className="grid grid-cols-2 gap-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">금리 (%)</label>
                        <input type="number" className="w-full border p-3 rounded-xl text-right" placeholder="0.0"
                          value={loan.interest_rate === 0 ? '' : loan.interest_rate} onChange={e => setLoan({...loan, interest_rate: e.target.value === '' ? 0 : Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">계약 기간</label>
                        <select className="w-full border p-3 rounded-xl" value={loan.months} onChange={e => setLoan({...loan, months: Number(e.target.value)})}>
                            <option value="12">12개월</option><option value="24">24개월</option><option value="36">36개월</option>
                            <option value="48">48개월</option><option value="60">60개월</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 p-2 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div>
                        {/* 👇 [핵심 기능] 첫 회 납입금 */}
                        <label className="block text-xs font-bold text-indigo-800 mb-1">📌 1회차 납입금</label>
                        <input type="text" className="w-full border border-indigo-200 p-2 rounded-lg font-bold text-indigo-700 text-right bg-white"
                          placeholder="월 납입과 다를 경우"
                          value={loan.first_payment > 0 ? loan.first_payment.toLocaleString() : ''} onChange={e => handleMoneyChange('first_payment', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">2회차 ~ 월 납입금</label>
                        <input type="text" className="w-full border p-2 rounded-lg font-bold text-red-500 text-right" placeholder="0"
                          value={loan.monthly_payment > 0 ? loan.monthly_payment.toLocaleString() : ''} onChange={e => handleMoneyChange('monthly_payment', e.target.value)} />
                    </div>
                </div>
             </div>
          </div>

          <hr className="border-gray-100" />

          {/* 4. 보증인 정보 */}
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">4. 연대보증인 정보</h3>
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">보증인 성명</label>
                  <input className="w-full border p-3 rounded-xl bg-white" placeholder="성명 입력" value={loan.guarantor_name} onChange={e => setLoan({...loan, guarantor_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">보증 한도액</label>
                  <input type="text" className="w-full border p-3 rounded-xl text-right bg-white" placeholder="금액 입력"
                    value={loan.guarantor_limit > 0 ? loan.guarantor_limit.toLocaleString() : ''} onChange={e => handleMoneyChange('guarantor_limit', e.target.value)} />
                </div>
              </div>
          </div>

      </div>

      <div className="mt-8 flex gap-4">
         <button onClick={handleSave} className="flex-1 bg-indigo-900 text-white py-4 rounded-2xl font-black text-xl hover:bg-black transition-all shadow-xl transform hover:-translate-y-1">
            {isNew ? '✨ 금융 정보 등록 완료' : '💾 수정 내용 저장'}
         </button>
      </div>
    </div>
  )
}