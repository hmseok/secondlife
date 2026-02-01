'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../utils/supabase'

export default function JiipDetailPage() {
  const router = useRouter()
  const params = useParams()
  const isNew = params.id === 'new'
  const jiipId = isNew ? null : params.id

  const [loading, setLoading] = useState(!isNew)
  const [cars, setCars] = useState<any[]>([])

  // 📝 계약서 조항에 맞춘 데이터 구조
  const [item, setItem] = useState({
    car_id: '',
    investor_name: '', investor_phone: '', investor_reg_number: '', investor_address: '',
    bank_name: '', account_number: '', account_holder: '',
    contract_start_date: '', contract_end_date: '',
    invest_amount: 0,
    admin_fee: 200000,  // [제4조] 위탁 관리비 20만원 기본 세팅
    share_ratio: 70,    // [제4조] 배분율 70% 기본 세팅
    payout_day: 10,     // [제4조] 지급일 10일 기본 세팅
    tax_type: '세금계산서', // [제5조] 기본 세금처리
    mortgage_setup: false, // [제7조] 근저당 설정 여부
    memo: ''
  })

  useEffect(() => {
    fetchCars()
    if (!isNew && jiipId) fetchDetail()
  }, [])

  // 🗓️ [자동 계산] 계약 시작일 입력 시 -> 종료일 36개월 뒤 자동 세팅 (제6조)
  useEffect(() => {
    if (isNew && item.contract_start_date && !item.contract_end_date) {
      const start = new Date(item.contract_start_date)
      start.setFullYear(start.getFullYear() + 3) // 36개월
      start.setDate(start.getDate() - 1) // 하루 빼기
      setItem(prev => ({ ...prev, contract_end_date: start.toISOString().split('T')[0] }))
    }
  }, [item.contract_start_date])

  const fetchCars = async () => {
    const { data } = await supabase.from('cars').select('id, number, model').order('number', { ascending: true })
    setCars(data || [])
  }

  const fetchDetail = async () => {
    const { data, error } = await supabase.from('jiip_contracts').select('*').eq('id', jiipId).single()
    if (error) { alert('데이터 로드 실패'); router.push('/jiip'); }
    else {
      setItem({
        ...data,
        investor_name: data.investor_name || '',
        investor_phone: data.investor_phone || '',
        investor_reg_number: data.investor_reg_number || '',
        investor_address: data.investor_address || '',
        bank_name: data.bank_name || '',
        account_number: data.account_number || '',
        account_holder: data.account_holder || '',
        invest_amount: data.invest_amount || 0,
        admin_fee: data.admin_fee || 200000,
        share_ratio: data.share_ratio || 70,
        payout_day: data.payout_day || 10,
        tax_type: data.tax_type || '세금계산서',
        mortgage_setup: data.mortgage_setup || false,
        contract_start_date: data.contract_start_date || '',
        contract_end_date: data.contract_end_date || '',
        memo: data.memo || ''
      })
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!item.car_id || !item.investor_name) return alert('차량과 투자자(을) 성명은 필수입니다.')

    const payload = {
      ...item,
      contract_start_date: item.contract_start_date || null,
      contract_end_date: item.contract_end_date || null
    }

    let error
    if (isNew) {
      const { error: insertError } = await supabase.from('jiip_contracts').insert(payload)
      error = insertError
    } else {
      const { error: updateError } = await supabase.from('jiip_contracts').update(payload).eq('id', jiipId)
      error = updateError
    }

    if (error) alert('저장 실패: ' + error.message)
    else { alert('계약 정보가 저장되었습니다!'); router.push('/jiip'); }
  }

  const handleDelete = async () => {
    if(!confirm('정말 삭제하시겠습니까?')) return
    await supabase.from('jiip_contracts').delete().eq('id', jiipId)
    router.push('/jiip')
  }

  const handleMoneyChange = (field: string, value: string) => {
    const rawValue = value.replace(/,/g, '')
    const numValue = Number(rawValue)
    if (isNaN(numValue)) return
    setItem(prev => ({ ...prev, [field]: numValue }))
  }

  if (loading) return <div className="p-20 text-center font-bold text-gray-500">데이터 불러오는 중... ⏳</div>

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 animate-fade-in-up pb-32">
      <div className="flex justify-between items-center mb-8 border-b pb-6">
        <div>
          <button onClick={() => router.back()} className="text-gray-500 font-bold mb-2 hover:text-black">← 목록으로 돌아가기</button>
          <h1 className="text-3xl font-black text-gray-900">
            {isNew ? '📄 지입 계약 등록' : '🤝 지입 계약 상세 정보'}
          </h1>
          <p className="text-gray-500 mt-1">차량 운영 투자 및 수익 배분 계약서 기준</p>
        </div>
        {!isNew && (
           <button onClick={handleDelete} className="bg-white border border-red-200 text-red-500 px-4 py-2 rounded-xl font-bold hover:bg-red-50">🗑️ 삭제</button>
        )}
      </div>

      <div className="space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-200">

          {/* 1. 투자자 정보 */}
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">1. 투자자(을) 및 차량 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">대상 차량 (제2조)</label>
                    <select className="w-full border p-3 rounded-xl font-bold bg-green-50" value={item.car_id} onChange={e => setItem({...item, car_id: e.target.value})}>
                      <option value="">차량을 선택하세요</option>
                      {cars.map(c => <option key={c.id} value={c.id}>{c.number} ({c.model})</option>)}
                    </select>
                 </div>
                 <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">성명/상호</label>
                        <input className="w-full border p-3 rounded-xl" placeholder="이름" value={item.investor_name} onChange={e => setItem({...item, investor_name: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">연락처</label>
                        <input className="w-full border p-3 rounded-xl" placeholder="010-0000-0000" value={item.investor_phone} onChange={e => setItem({...item, investor_phone: e.target.value})} />
                    </div>
                 </div>
              </div>

              {/* 사업자/주소/계좌 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">사업자/주민 번호</label>
                    <input className="w-full border p-2 rounded-lg bg-white" placeholder="세금처리용" value={item.investor_reg_number} onChange={e => setItem({...item, investor_reg_number: e.target.value})} />
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-gray-500 mb-1">주소</label>
                     <input className="w-full border p-2 rounded-lg bg-white" placeholder="주소 입력" value={item.investor_address} onChange={e => setItem({...item, investor_address: e.target.value})} />
                 </div>
                 <div className="md:col-span-2 grid grid-cols-3 gap-2">
                     <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-500 mb-1">입금 은행</label>
                        <input className="w-full border p-2 rounded-lg bg-white" placeholder="은행명" value={item.bank_name} onChange={e => setItem({...item, bank_name: e.target.value})} />
                     </div>
                     <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1">계좌 번호 (수익금 지급처)</label>
                        <input className="w-full border p-2 rounded-lg bg-white" placeholder="계좌번호 입력" value={item.account_number} onChange={e => setItem({...item, account_number: e.target.value})} />
                     </div>
                 </div>
              </div>
          </div>

          <hr className="border-gray-100" />

          {/* 2. 계약 기간 및 투자금 */}
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">2. 계약 기간 및 투자금 (제2조, 제6조)</h3>
              <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">계약 시작일</label>
                    <input type="date" max="9999-12-31" className="w-full border p-3 rounded-xl" value={item.contract_start_date} onChange={e => setItem({...item, contract_start_date: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">계약 종료일 (36개월)</label>
                    <input type="date" max="9999-12-31" className="w-full border p-3 rounded-xl" value={item.contract_end_date} onChange={e => setItem({...item, contract_end_date: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">투자 원금 (일금)</label>
                    <input type="text" className="w-full border p-3 rounded-xl text-right font-bold" placeholder="0"
                      value={item.invest_amount > 0 ? item.invest_amount.toLocaleString() : ''} onChange={e => handleMoneyChange('invest_amount', e.target.value)} />
                 </div>
              </div>
          </div>

          <hr className="border-gray-100" />

          {/* 3. 수익 배분 조건 (핵심) */}
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">3. 수익 정산 및 배분 조건 (제4조)</h3>
              <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                 <p className="text-xs text-green-700 font-bold mb-4 bg-white inline-block px-2 py-1 rounded">💰 [수익 산정] 총 매출액 - 실비(보험,정비,유류 등) = 순수익</p>

                 <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-green-800 mb-1">① 위탁 관리비 (선공제)</label>
                        <input type="text" className="w-full border border-green-200 p-2 rounded-lg text-right font-bold bg-white text-green-800" placeholder="200,000"
                          value={item.admin_fee > 0 ? item.admin_fee.toLocaleString() : ''} onChange={e => handleMoneyChange('admin_fee', e.target.value)} />
                        <p className="text-xs text-green-600 mt-1">* 순수익에서 1순위로 공제 (기본 20만원)</p>
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-blue-800 mb-1">② 투자자(을) 배분율</label>
                         <div className="flex items-center gap-2">
                            <input type="number" className="w-full border border-blue-200 p-2 rounded-lg text-right font-bold bg-white text-blue-800" placeholder="70"
                              value={item.share_ratio} onChange={e => setItem({...item, share_ratio: Number(e.target.value)})} />
                            <span className="font-bold text-blue-800">%</span>
                         </div>
                         <p className="text-xs text-blue-600 mt-1">* 관리비 공제 후 잔액의 70% (기본)</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">수익금 지급일</label>
                        <div className="relative">
                            <input type="number" className="w-full border p-2 rounded-lg text-right bg-white pr-8" placeholder="10"
                            value={item.payout_day} onChange={e => setItem({...item, payout_day: Number(e.target.value)})} />
                            <span className="absolute right-3 top-2.5 text-xs text-gray-400 font-bold">일</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">* 매월 말일 정산 후 익월 지급</p>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">세금 처리 (제5조)</label>
                        <select className="w-full border p-2 rounded-lg bg-white" value={item.tax_type} onChange={e => setItem({...item, tax_type: e.target.value})}>
                            <option>세금계산서</option>
                            <option>사업소득(3.3%)</option>
                            <option>이자소득(27.5%)</option>
                            <option>기타소득</option>
                        </select>
                    </div>
                 </div>
              </div>
          </div>

          <hr className="border-gray-100" />

          {/* 4. 채권 보전 */}
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">4. 채권 보전 (제7조)</h3>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <input type="checkbox" id="mortgage" className="w-6 h-6 rounded border-gray-300 text-green-600 focus:ring-green-500"
                    checked={item.mortgage_setup} onChange={e => setItem({...item, mortgage_setup: e.target.checked})} />
                  <label htmlFor="mortgage" className="font-bold text-gray-700">
                      근저당권 설정 완료 (투자금 보호)
                      <span className="block text-xs text-gray-400 font-normal mt-1">체크 시, 투자자 명의로 근저당이 설정되었음을 표시합니다.</span>
                  </label>
              </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">메모 / 특약사항</label>
            <textarea className="w-full border p-3 rounded-xl h-24 resize-none" placeholder="특약 사항 입력" value={item.memo} onChange={e => setItem({...item, memo: e.target.value})}></textarea>
          </div>

      </div>

      <div className="mt-8 flex gap-4">
         <button onClick={handleSave} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-green-700 transition-all shadow-xl transform hover:-translate-y-1">
            {isNew ? '✨ 지입 계약 등록 완료' : '💾 수정 내용 저장'}
         </button>
      </div>
    </div>
  )
}