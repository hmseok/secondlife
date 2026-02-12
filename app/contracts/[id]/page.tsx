'use client'
import { supabase } from '../../utils/supabase'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

export default function ContractDetailPage() {
  const { id } = useParams()
  const contractId = Array.isArray(id) ? id[0] : id
  const router = useRouter()

  const [contract, setContract] = useState<any>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // 데이터 불러오기
  const fetchData = async () => {
    if(!contractId) return
    const { data: cData } = await supabase.from('contracts').select('*, car:cars(*)').eq('id', contractId).single()
    setContract(cData)

    const { data: sData } = await supabase.from('payment_schedules').select('*').eq('contract_id', contractId).order('round_number', { ascending: true })
    setSchedules(sData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [contractId])

  // 💰 수납 처리 (토글)
  const togglePayment = async (scheduleId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'paid' ? 'unpaid' : 'paid'
    const paidDate = newStatus === 'paid' ? new Date().toISOString().split('T')[0] : null

    const { error } = await supabase
      .from('payment_schedules')
      .update({ status: newStatus, paid_date: paidDate })
      .eq('id', scheduleId)

    if (error) alert('오류: ' + error.message)
    else fetchData()
  }

  const f = (n: number) => n?.toLocaleString() || '0'

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-steel-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-bold">계약서 불러오는 중...</p>
      </div>
    </div>
  )

  const paidCount = schedules.filter(s => s.status === 'paid').length
  const totalCount = schedules.length
  const paidPercent = totalCount > 0 ? (paidCount / totalCount * 100) : 0
  const unpaidTotal = schedules.filter(s => s.status === 'unpaid').reduce((a, c) => a + c.amount, 0)
  const overdueCount = schedules.filter(s => new Date(s.due_date) < new Date() && s.status === 'unpaid').length

  return (
    <div className="max-w-[1400px] mx-auto py-6 px-4 md:py-10 md:px-6 bg-gray-50/50 min-h-screen">

      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/quotes" className="text-gray-400 hover:text-gray-600 text-sm">견적/계약 관리</Link>
            <span className="text-gray-300">/</span>
            <span className="text-steel-600 font-bold text-sm">계약 상세</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">
            {contract.customer_name}님 계약 현황
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            {contract.car?.brand} {contract.car?.model} · {contract.car?.number}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/quotes" className="px-4 py-2 text-sm border border-gray-300 rounded-xl font-bold text-gray-600 hover:bg-gray-50">
            ← 목록으로
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ===== 왼쪽: 요약 카드 ===== */}
        <div className="lg:col-span-4 space-y-6">

          {/* 계약 정보 카드 */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <span>📋</span> 계약 정보
              </h3>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">고객명</span>
                <span className="font-bold text-gray-900">{contract.customer_name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">계약기간</span>
                <span className="text-gray-700 text-sm font-medium">{contract.start_date} ~ {contract.end_date}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">계약기간</span>
                <span className="px-3 py-1 bg-steel-50 text-steel-600 rounded-lg text-sm font-bold">{contract.term_months || 36}개월</span>
              </div>
              <div className="border-t border-gray-100 pt-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">보증금</span>
                  <span className="font-bold text-gray-800">{f(contract.deposit)}원</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">월 렌트료</span>
                <span className="font-bold text-gray-800">{f(contract.monthly_rent)}원</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500 text-sm">납입금(VAT포함)</span>
                <span className="font-black text-xl text-steel-600">{f(Math.round(contract.monthly_rent * 1.1))}원</span>
              </div>
            </div>
          </div>

          {/* 차량 정보 */}
          {contract.car && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <span>🚗</span> 차량 정보
                </h3>
              </div>
              <div className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden border flex-shrink-0">
                    {contract.car.image_url ? (
                      <img src={contract.car.image_url} className="w-full h-full object-cover" alt="car" />
                    ) : (
                      <span className="text-gray-300 text-xs flex items-center justify-center h-full">No Img</span>
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{contract.car.brand} {contract.car.model}</p>
                    <p className="text-sm text-gray-500">{contract.car.number}</p>
                    {contract.car.year && <p className="text-xs text-gray-400">{contract.car.year}년식</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 수납 현황판 */}
          <div className="bg-gray-900 text-white rounded-2xl shadow-xl p-6">
            <div className="border-b border-gray-700 pb-3 mb-4">
              <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Collection Status</p>
              <h3 className="text-lg font-black mt-1">수납 현황</h3>
            </div>
            <div className="flex justify-between items-end mb-3">
              <span className="text-4xl font-black text-green-400">
                {paidCount}<span className="text-lg text-gray-400">회</span>
              </span>
              <span className="text-gray-400 text-sm">/ 총 {totalCount}회</span>
            </div>
            <div className="w-full bg-gray-700 h-3 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full rounded-full transition-all duration-500"
                   style={{ width: `${paidPercent}%` }} />
            </div>
            <div className="mt-4 flex justify-between text-xs">
              <span className="text-gray-400">진행률 <span className="text-white font-bold">{paidPercent.toFixed(0)}%</span></span>
              <span className="text-gray-400">미수금 <span className="text-red-400 font-bold">{f(unpaidTotal)}원</span></span>
            </div>
            {overdueCount > 0 && (
              <div className="mt-3 px-3 py-2 bg-red-500/20 rounded-xl text-red-300 text-xs font-bold">
                ⚠️ 연체 {overdueCount}건 발생
              </div>
            )}
          </div>
        </div>

        {/* ===== 오른쪽: 수납 스케줄 테이블 ===== */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <span>📅</span> 월별 수납 장부
              </h3>
              <span className="text-xs text-gray-400">* 클릭하여 수납처리</span>
            </div>

            {/* Desktop Table */}
            <div className="hidden md:block max-h-[700px] overflow-y-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs sticky top-0 z-10 border-b">
                  <tr>
                    <th className="p-4 pl-6">회차</th>
                    <th className="p-4">예정일</th>
                    <th className="p-4 text-right">금액</th>
                    <th className="p-4 text-center">상태</th>
                    <th className="p-4 text-right pr-6">처리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {schedules.map((item) => {
                    const isOverdue = new Date(item.due_date) < new Date() && item.status === 'unpaid'
                    return (
                      <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${item.status === 'paid' ? 'bg-green-50/30' : isOverdue ? 'bg-red-50/30' : ''}`}>
                        <td className="p-4 pl-6 font-bold text-gray-600">
                          {item.round_number === 0
                            ? <span className="px-2 py-0.5 bg-steel-100 text-steel-600 rounded text-xs font-black">보증금</span>
                            : `${item.round_number}회차`}
                        </td>
                        <td className={`p-4 ${isOverdue ? 'text-red-500 font-bold' : 'text-gray-600'}`}>
                          {item.due_date}
                          {isOverdue && <span className="text-[10px] ml-1 px-1.5 py-0.5 bg-red-100 text-red-600 rounded font-bold">연체</span>}
                        </td>
                        <td className="p-4 text-right font-bold text-gray-800">{f(item.amount)}원</td>
                        <td className="p-4 text-center">
                          {item.status === 'paid'
                            ? <span className="px-2.5 py-1 rounded-lg bg-green-100 text-green-700 text-xs font-bold">완납 {item.paid_date}</span>
                            : <span className="px-2.5 py-1 rounded-lg bg-red-100 text-red-600 text-xs font-bold">미납</span>}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <button
                            onClick={() => togglePayment(item.id, item.status)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              item.status === 'paid'
                                ? 'border border-gray-200 text-gray-400 hover:bg-gray-100'
                                : 'bg-steel-600 text-white hover:bg-steel-700 shadow-md'
                            }`}
                          >
                            {item.status === 'paid' ? '취소' : '수납확인'}
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {schedules.map((item) => {
                const isOverdue = new Date(item.due_date) < new Date() && item.status === 'unpaid'
                return (
                  <div key={item.id} className={`p-4 ${item.status === 'paid' ? 'bg-green-50/30' : isOverdue ? 'bg-red-50/30' : ''}`}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-700 text-sm">
                          {item.round_number === 0 ? '보증금' : `${item.round_number}회차`}
                        </span>
                        {item.status === 'paid'
                          ? <span className="px-2 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-bold">완납</span>
                          : isOverdue
                            ? <span className="px-2 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-bold">연체</span>
                            : <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-bold">미납</span>}
                      </div>
                      <span className="text-xs text-gray-400">{item.due_date}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-gray-800">{f(item.amount)}원</span>
                      <button
                        onClick={() => togglePayment(item.id, item.status)}
                        className={`px-3 py-1 rounded-lg text-xs font-bold ${
                          item.status === 'paid'
                            ? 'border border-gray-200 text-gray-400'
                            : 'bg-steel-600 text-white shadow-sm'
                        }`}
                      >
                        {item.status === 'paid' ? '취소' : '수납확인'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
