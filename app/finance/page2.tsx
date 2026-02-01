'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

export default function FinancePage() {
  const [loans, setLoans] = useState<any[]>([])
  const [cars, setCars] = useState<any[]>([]) // 차량 선택용 리스트
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // 신규 등록 데이터
  const [newLoan, setNewLoan] = useState({
    car_id: '', finance_name: '', type: '할부',
    total_amount: 0, monthly_payment: 0, payment_date: 25,
    start_date: '', end_date: ''
  })

  // 데이터 불러오기 (대출 목록 + 차량 목록)
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    // 1. 모든 대출 정보 가져오기 (어떤 차인지 알기 위해 cars 테이블과 조인)
    const { data: loanData, error } = await supabase
      .from('loans')
      .select('*, cars(number, brand, model)')
      .order('created_at', { ascending: false })

    // 2. 차량 목록 가져오기 (등록 시 선택용)
    const { data: carData } = await supabase.from('cars').select('id, number, model').order('number', { ascending: true })

    if (error) console.error(error)
    else {
      setLoans(loanData || [])
      setCars(carData || [])
    }
    setLoading(false)
  }

  // 저장 핸들러
  const handleSave = async () => {
    if (!newLoan.car_id) return alert('차량을 선택해주세요.')
    if (!newLoan.finance_name) return alert('금융사명을 입력해주세요.')

    const { error } = await supabase.from('loans').insert(newLoan)
    if (error) alert('등록 실패: ' + error.message)
    else {
      alert('금융 정보가 등록되었습니다.')
      setShowModal(false)
      fetchData() // 목록 새로고침
      // 초기화
      setNewLoan({ car_id: '', finance_name: '', type: '할부', total_amount: 0, monthly_payment: 0, payment_date: 25, start_date: '', end_date: '' })
    }
  }

  // 삭제 핸들러
  const handleDelete = async (id: number) => {
    if(!confirm('삭제하시겠습니까?')) return
    await supabase.from('loans').delete().eq('id', id)
    fetchData()
  }

  // 합계 계산용
  const totalDebt = loans.reduce((acc, cur) => acc + (cur.total_amount || 0), 0)
  const monthlyOut = loans.reduce((acc, cur) => acc + (cur.monthly_payment || 0), 0)

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">💰 금융/여신 관리</h1>
          <p className="text-gray-500 mt-2">전체 차량의 할부, 리스, 대출 현황을 통합 관리합니다.</p>
        </div>
        <button onClick={() => setShowModal(true)} className="bg-indigo-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg">
          + 신규 금융 등록
        </button>
      </div>

      {/* 📊 상단 요약 카드 */}
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

      {/* 📋 리스트 테이블 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="p-4 text-xs font-bold text-gray-500">대상 차량</th>
              <th className="p-4 text-xs font-bold text-gray-500">금융사/구분</th>
              <th className="p-4 text-xs font-bold text-gray-500">대출 원금</th>
              <th className="p-4 text-xs font-bold text-gray-500">월 납입금</th>
              <th className="p-4 text-xs font-bold text-gray-500">납입일</th>
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
                <td className="p-4 text-sm">매월 {loan.payment_date}일</td>
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg p-8 rounded-3xl shadow-2xl animate-fade-in-up">
            <h3 className="text-xl font-bold text-gray-900 mb-6">➕ 신규 금융 계약 등록</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">대상 차량 선택</label>
                <select className="w-full border p-3 rounded-xl font-bold" value={newLoan.car_id} onChange={e => setNewLoan({...newLoan, car_id: e.target.value})}>
                  <option value="">차량을 선택하세요</option>
                  {cars.map(c => <option key={c.id} value={c.id}>{c.number} ({c.model})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">금융사명</label>
                  <input className="w-full border p-3 rounded-xl" placeholder="예: 현대캐피탈" value={newLoan.finance_name} onChange={e => setNewLoan({...newLoan, finance_name: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">구분</label>
                  <select className="w-full border p-3 rounded-xl" value={newLoan.type} onChange={e => setNewLoan({...newLoan, type: e.target.value})}>
                    <option>할부</option><option>리스</option><option>담보대출</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">대출 원금</label>
                  <input type="number" className="w-full border p-3 rounded-xl" value={newLoan.total_amount} onChange={e => setNewLoan({...newLoan, total_amount: Number(e.target.value)})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">월 납입금</label>
                  <input type="number" className="w-full border p-3 rounded-xl" value={newLoan.monthly_payment} onChange={e => setNewLoan({...newLoan, monthly_payment: Number(e.target.value)})} />
                </div>
              </div>
              <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">매월 납입일 (일)</label>
                  <input type="number" className="w-full border p-3 rounded-xl" placeholder="25" value={newLoan.payment_date} onChange={e => setNewLoan({...newLoan, payment_date: Number(e.target.value)})} />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={handleSave} className="flex-1 bg-indigo-900 text-white py-3 rounded-xl font-bold hover:bg-black">등록 완료</button>
              <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-100 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-200">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}