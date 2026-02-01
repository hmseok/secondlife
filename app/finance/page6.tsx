'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

export default function FinancePage() {
  const [loans, setLoans] = useState<any[]>([])
  const [cars, setCars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // 신규 등록 데이터
  const [newLoan, setNewLoan] = useState({
    car_id: '', finance_name: '', type: '할부',
    vehicle_price: 0, acquisition_tax: 0, deposit: 0,
    total_amount: 0, interest_rate: 0, months: 60,
    monthly_payment: 0, payment_date: 0,
    start_date: '', end_date: '',
    guarantor_name: '', guarantor_limit: 0
  })

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data: loanData } = await supabase.from('loans').select('*, cars(number, brand, model)').order('created_at', { ascending: false })
    const { data: carData } = await supabase.from('cars').select('id, number, model').order('number', { ascending: true })
    setLoans(loanData || [])
    setCars(carData || [])
    setLoading(false)
  }

  const handleSave = async () => {
    if (!newLoan.car_id || !newLoan.finance_name) return alert('차량과 금융사명은 필수입니다.')

    // 빈 날짜는 null 처리
    const payload = {
      ...newLoan,
      start_date: newLoan.start_date || null,
      end_date: newLoan.end_date || null
    }

    const { error } = await supabase.from('loans').insert(payload)
    if (error) alert('등록 실패: ' + error.message)
    else { alert('금융 정보가 등록되었습니다.'); setShowModal(false); fetchData(); resetForm(); }
  }

  const handleDelete = async (id: number) => {
    if(!confirm('삭제하시겠습니까?')) return
    await supabase.from('loans').delete().eq('id', id)
    fetchData()
  }

  const resetForm = () => setNewLoan({
    car_id: '', finance_name: '', type: '할부',
    vehicle_price: 0, acquisition_tax: 0, deposit: 0,
    total_amount: 0, interest_rate: 0, months: 60,
    monthly_payment: 0, payment_date: 0,
    start_date: '', end_date: '',
    guarantor_name: '', guarantor_limit: 0
  })

  const handleMoneyChange = (field: string, value: string) => {
    const rawValue = value.replace(/,/g, '')
    const numValue = Number(rawValue)
    if (isNaN(numValue)) return

    setNewLoan(prev => {
      const updated = { ...prev, [field]: numValue }
      if (field === 'vehicle_price' || field === 'deposit') {
        updated.total_amount = updated.vehicle_price - updated.deposit
      }
      return updated
    })
  }

  // 합계 계산
  const totalDebt = loans.reduce((acc, cur) => acc + (cur.total_amount || 0), 0)
  const monthlyOut = loans.reduce((acc, cur) => acc + (cur.monthly_payment || 0), 0)

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">💰 금융/여신 관리</h1>
          <p className="text-gray-500 mt-2">전체 차량의 할부, 리스, 대출 현황을 통합 관리합니다.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg">+ 신규 금융 등록</button>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-bold mb-1">총 대출 잔액</p>
          <p className="text-3xl font-black text-indigo-900">{totalDebt.toLocaleString()}원</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-bold mb-1">월 고정 지출액</p>
          <p className="text-3xl font-black text-red-500">{monthlyOut.toLocaleString()}원</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <p className="text-gray-500 text-xs font-bold mb-1">관리 중인 계약</p>
          <p className="text-3xl font-black text-gray-800">{loans.length}건</p>
        </div>
      </div>

      {/* 리스트 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500">대상 차량</th>
              <th className="p-4 text-xs font-bold text-gray-500">금융사/구분</th>
              <th className="p-4 text-xs font-bold text-gray-500">대출 원금</th>
              <th className="p-4 text-xs font-bold text-gray-500">월 납입금</th>
              <th className="p-4 text-xs font-bold text-gray-500">기간/만기</th>
              <th className="p-4 text-xs font-bold text-gray-500 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="p-10 text-center">로딩 중...</td></tr> :
             loans.map((loan) => (
              <tr key={loan.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <div className="font-bold text-gray-900">{loan.cars?.number}</div>
                  <div className="text-xs text-gray-500">{loan.cars?.model}</div>
                </td>
                <td className="p-4">
                  <span className="font-bold">{loan.finance_name}</span>
                  <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">{loan.type}</span>
                </td>
                <td className="p-4 font-medium">{loan.total_amount?.toLocaleString()}원</td>
                <td className="p-4 font-bold text-red-500">{loan.monthly_payment?.toLocaleString()}원</td>
                <td className="p-4 text-sm">
                    <div className="font-bold">{loan.months}개월</div>
                    <div className="text-xs text-gray-400">{loan.start_date ? `~ ${loan.end_date || '미정'}` : '-'}</div>
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleDelete(loan.id)} className="text-gray-400 hover:text-red-500 text-sm underline">삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ➕ 모달 (팝업) */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 rounded-3xl shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                📄 금융 견적서 등록
            </h3>

            <div className="space-y-6">
              {/* 1. 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">대상 차량</label>
                    <select className="w-full border p-3 rounded-xl font-bold bg-gray-50" value={newLoan.car_id} onChange={e => setNewLoan({...newLoan, car_id: e.target.value})}>
                      <option value="">차량을 선택하세요</option>
                      {cars.map(c => <option key={c.id} value={c.id}>{c.number} ({c.model})</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">금융사</label>
                        <input className="w-full border p-3 rounded-xl" placeholder="예: KB캐피탈" value={newLoan.finance_name} onChange={e => setNewLoan({...newLoan, finance_name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">상품 구분</label>
                        <select className="w-full border p-3 rounded-xl" value={newLoan.type} onChange={e => setNewLoan({...newLoan, type: e.target.value})}>
                            <option>할부</option><option>리스</option><option>렌트</option><option>담보대출</option>
                        </select>
                    </div>
                 </div>
              </div>

              <div className="border-t border-gray-100 my-4"></div>

              {/* 2. 견적 상세 금액 */}
              <div>
                  <h4 className="font-bold text-gray-800 mb-3 text-sm">💰 견적 상세 금액</h4>
                  <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">차량 가격 (옵션포함)</label>
                        <input type="text" className="w-full border p-2 rounded-lg text-right font-bold" placeholder="0"
                          value={newLoan.vehicle_price > 0 ? newLoan.vehicle_price.toLocaleString() : ''} onChange={e => handleMoneyChange('vehicle_price', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">취등록세/부대비용</label>
                        <input type="text" className="w-full border p-2 rounded-lg text-right" placeholder="0"
                          value={newLoan.acquisition_tax > 0 ? newLoan.acquisition_tax.toLocaleString() : ''} onChange={e => handleMoneyChange('acquisition_tax', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-blue-600 mb-1">(-) 선수금/보증금</label>
                        <input type="text" className="w-full border p-2 rounded-lg border-blue-200 text-right text-blue-600" placeholder="0"
                          value={newLoan.deposit > 0 ? newLoan.deposit.toLocaleString() : ''} onChange={e => handleMoneyChange('deposit', e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-red-600 mb-1">(=) 할부/대출 원금</label>
                        <input type="text" className="w-full border p-2 rounded-lg border-red-200 font-bold bg-white text-right text-red-600" placeholder="자동계산" readOnly
                          value={newLoan.total_amount > 0 ? newLoan.total_amount.toLocaleString() : ''} />
                    </div>
                  </div>
              </div>

              {/* 3. 상환 조건 */}
              <div>
                 <h4 className="font-bold text-gray-800 mb-3 text-sm mt-4">📅 계약 및 상환 조건</h4>
                 <div className="grid grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">대출 실행일</label>
                        {/* 👇 [수정됨] max="9999-12-31" 추가하여 4자리 연도 제한 */}
                        <input type="date" max="9999-12-31" className="w-full border p-3 rounded-xl text-sm" value={newLoan.start_date} onChange={e => setNewLoan({...newLoan, start_date: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">만기일</label>
                        {/* 👇 [수정됨] max="9999-12-31" 추가 */}
                        <input type="date" max="9999-12-31" className="w-full border p-3 rounded-xl text-sm" value={newLoan.end_date} onChange={e => setNewLoan({...newLoan, end_date: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">매월 납입일</label>
                        <input type="text" className="w-full border p-3 rounded-xl text-right" placeholder="예: 25"
                          value={newLoan.payment_date > 0 ? newLoan.payment_date : ''} onChange={e => handleMoneyChange('payment_date', e.target.value)} />
                    </div>
                 </div>

                 <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">금리 (%)</label>
                        <input type="number" className="w-full border p-3 rounded-xl text-right" placeholder="0.0"
                          value={newLoan.interest_rate === 0 ? '' : newLoan.interest_rate} onChange={e => setNewLoan({...newLoan, interest_rate: e.target.value === '' ? 0 : Number(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">계약 기간 (개월)</label>
                        <select className="w-full border p-3 rounded-xl" value={newLoan.months} onChange={e => setNewLoan({...newLoan, months: Number(e.target.value)})}>
                            <option value="12">12개월</option><option value="24">24개월</option><option value="36">36개월</option>
                            <option value="48">48개월</option><option value="60">60개월</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">월 납입금</label>
                        <input type="text" className="w-full border p-3 rounded-xl font-bold text-red-500 text-right" placeholder="0"
                          value={newLoan.monthly_payment > 0 ? newLoan.monthly_payment.toLocaleString() : ''} onChange={e => handleMoneyChange('monthly_payment', e.target.value)} />
                    </div>
                 </div>
              </div>

              {/* 4. 보증인 정보 */}
              <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                  <h4 className="font-bold text-indigo-900 mb-3 text-sm flex items-center gap-2">🤝 연대보증인 (근보증)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <input className="w-full border p-2 rounded-lg text-sm" placeholder="보증인 성명" value={newLoan.guarantor_name} onChange={e => setNewLoan({...newLoan, guarantor_name: e.target.value})} />
                    <input type="text" className="w-full border p-2 rounded-lg text-sm text-right" placeholder="보증 한도액"
                      value={newLoan.guarantor_limit > 0 ? newLoan.guarantor_limit.toLocaleString() : ''} onChange={e => handleMoneyChange('guarantor_limit', e.target.value)} />
                  </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-4 border-t">
              <button onClick={handleSave} className="flex-1 bg-indigo-900 text-white py-4 rounded-xl font-bold hover:bg-black text-lg">저장하기</button>
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-4 rounded-xl font-bold hover:bg-gray-200">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}