'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../utils/supabase'

export default function FinanceListPage() {
  const router = useRouter()
  const [loans, setLoans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  const fetchData = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('loans')
      .select('*, cars(number, brand, model)')
      .order('created_at', { ascending: false })

    if (!error) setLoans(data || [])
    setLoading(false)
  }

  // 합계 계산
  const totalDebt = loans.reduce((acc, cur) => acc + (cur.total_amount || 0), 0)
  const monthlyOut = loans.reduce((acc, cur) => acc + (cur.monthly_payment || 0), 0)

  return (
    <div className="max-w-7xl mx-auto py-10 px-6 animate-fade-in-up">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-gray-900">💰 금융/여신 관리</h1>
          <p className="text-gray-500 mt-2">전체 차량의 할부, 리스, 대출 현황을 리스트로 관리합니다.</p>
        </div>
        {/* 👇 [핵심] 버튼 누르면 'new' 페이지로 이동 */}
        <button
          onClick={() => router.push('/finance/new')}
          className="bg-indigo-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-black transition-all shadow-lg"
        >
          + 신규 금융 등록
        </button>
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
              <th className="p-4 text-xs font-bold text-gray-500 text-right">상태</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={6} className="p-10 text-center">로딩 중...</td></tr> :
             loans.map((loan) => (
              // 👇 [핵심] 클릭하면 상세 페이지([id])로 이동
              <tr key={loan.id} onClick={() => router.push(`/finance/${loan.id}`)} className="border-b border-gray-50 hover:bg-indigo-50 transition-colors cursor-pointer group">
                <td className="p-4">
                  <div className="font-bold text-gray-900 group-hover:text-indigo-700">{loan.cars?.number}</div>
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
                   <span className="text-gray-400 text-xs font-bold group-hover:text-indigo-500">상세보기 &gt;</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}