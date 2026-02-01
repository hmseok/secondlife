'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../utils/supabase'
import ContractPaper from '../../components/ContractPaper' // 👈 이 파일이 꼭 있어야 합니다!

export default function JiipDetailPage() {
  const router = useRouter()
  const params = useParams()
  const isNew = params.id === 'new'
  const jiipId = isNew ? null : params.id

  const [loading, setLoading] = useState(!isNew)
  const [cars, setCars] = useState<any[]>([])

  // 📝 계약서 데이터
  const [item, setItem] = useState({
    car_id: '',
    investor_name: '', investor_phone: '', investor_reg_number: '', investor_address: '',
    bank_name: '', account_number: '', account_holder: '',
    contract_start_date: '', contract_end_date: '',
    invest_amount: 0,
    admin_fee: 200000,
    share_ratio: 70,
    payout_day: 10,
    tax_type: '세금계산서',
    mortgage_setup: false,
    memo: '',
    signed_file_url: '' // 파일 경로
  })

  // ✨ 인쇄 및 업로드 상태
  const [showPreview, setShowPreview] = useState(false)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchCars()
    if (!isNew && jiipId) fetchDetail()
  }, [])

  // 자동 종료일 계산
  useEffect(() => {
    if (isNew && item.contract_start_date && !item.contract_end_date) {
      const start = new Date(item.contract_start_date)
      start.setFullYear(start.getFullYear() + 3)
      start.setDate(start.getDate() - 1)
      setItem(prev => ({ ...prev, contract_end_date: start.toISOString().split('T')[0] }))
    }
  }, [item.contract_start_date])

  const fetchCars = async () => {
    const { data } = await supabase.from('cars').select('id, number, brand, model').order('number', { ascending: true })
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
        memo: data.memo || '',
        signed_file_url: data.signed_file_url || ''
      })
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!item.car_id || !item.investor_name) return alert('차량과 투자자 성명은 필수입니다.')

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
    else { alert('저장되었습니다!'); router.push('/jiip'); }
  }

  const handleDelete = async () => {
    if(!confirm('삭제하시겠습니까?')) return
    await supabase.from('jiip_contracts').delete().eq('id', jiipId)
    router.push('/jiip')
  }

  const handleMoneyChange = (field: string, value: string) => {
    const rawValue = value.replace(/,/g, '')
    const numValue = Number(rawValue)
    if (isNaN(numValue)) return
    setItem(prev => ({ ...prev, [field]: numValue }))
  }

  // 📂 파일 업로드
  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `contract_${jiipId}_${Date.now()}.${fileExt}`

    // 1. 스토리지 업로드
    const { error: uploadError } = await supabase.storage.from('contracts').upload(fileName, file)

    if (uploadError) {
        alert('업로드 실패: ' + uploadError.message);
        setUploading(false);
        return
    }

    // 2. URL 가져오기
    const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(fileName)

    // 3. DB 업데이트
    const { error: dbError } = await supabase
      .from('jiip_contracts')
      .update({ signed_file_url: publicUrl })
      .eq('id', jiipId)

    if (dbError) alert('DB 저장 실패')
    else {
        alert('계약서가 성공적으로 업로드되었습니다!')
        setItem(prev => ({ ...prev, signed_file_url: publicUrl }))
    }
    setUploading(false)
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
          <p className="text-gray-500 mt-1">차량 운영 투자 및 수익 배분 계약서를 기반으로 입력하세요.</p>
        </div>
        {!isNew && (
           <button onClick={handleDelete} className="bg-white border border-red-200 text-red-500 px-4 py-2 rounded-xl font-bold hover:bg-red-50">🗑️ 삭제</button>
        )}
      </div>

      {/* 🌟 계약서 관리 (수정 모드일 때만) */}
      {!isNew && (
         <div className="mb-8 bg-indigo-900 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center animate-fade-in-down">
            <div>
                <h3 className="font-bold text-lg">📄 계약서 자동 생성</h3>
                <p className="text-indigo-200 text-sm">입력된 정보로 계약서를 출력하고, 서명된 파일을 보관하세요.</p>
            </div>
            <button onClick={() => setShowPreview(true)} className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 shadow-md">
                🖨️ 계약서 미리보기/출력
            </button>
         </div>
       )}

      <div className="space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-200">

          {/* 1. 기본 정보 */}
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">1. 투자자(을) 및 차량 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">대상 차량</label>
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
                        <label className="block text-xs font-bold text-gray-500 mb-1">계좌 번호</label>
                        <input className="w-full border p-2 rounded-lg bg-white" placeholder="계좌번호 입력" value={item.account_number} onChange={e => setItem({...item, account_number: e.target.value})} />
                     </div>
                 </div>
              </div>
          </div>

          <hr className="border-gray-100" />

          {/* 2. 계약 기간 및 투자금 */}
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">2. 계약 기간 및 투자금</h3>
              <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">계약 시작일</label>
                    <input type="date" max="9999-12-31" className="w-full border p-3 rounded-xl" value={item.contract_start_date} onChange={e => setItem({...item, contract_start_date: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">계약 종료일</label>
                    <input type="date" max="9999-12-31" className="w-full border p-3 rounded-xl" value={item.contract_end_date} onChange={e => setItem({...item, contract_end_date: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">투자 원금</label>
                    <input type="text" className="w-full border p-3 rounded-xl text-right font-bold" placeholder="0"
                      value={item.invest_amount > 0 ? item.invest_amount.toLocaleString() : ''} onChange={e => handleMoneyChange('invest_amount', e.target.value)} />
                 </div>
              </div>
          </div>

          <hr className="border-gray-100" />

          {/* 3. 수익 배분 조건 */}
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">3. 수익 정산 및 배분 조건</h3>
              <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                 <p className="text-xs text-green-700 font-bold mb-4 bg-white inline-block px-2 py-1 rounded">💰 [수익 산정] 총 매출액 - 실비 = 순수익</p>

                 <div className="grid grid-cols-2 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-green-800 mb-1">① 위탁 관리비 (선공제)</label>
                        <input type="text" className="w-full border border-green-200 p-2 rounded-lg text-right font-bold bg-white text-green-800" placeholder="200,000"
                          value={item.admin_fee > 0 ? item.admin_fee.toLocaleString() : ''} onChange={e => handleMoneyChange('admin_fee', e.target.value)} />
                    </div>
                    <div>
                         <label className="block text-xs font-bold text-blue-800 mb-1">② 투자자(을) 배분율</label>
                         <div className="flex items-center gap-2">
                            <input type="number" className="w-full border border-blue-200 p-2 rounded-lg text-right font-bold bg-white text-blue-800" placeholder="70"
                              value={item.share_ratio} onChange={e => setItem({...item, share_ratio: Number(e.target.value)})} />
                            <span className="font-bold text-blue-800">%</span>
                         </div>
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
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">세금 처리</label>
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

           {/* 4. 채권 보전 및 메모 */}
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">4. 기타 사항</h3>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                  <input type="checkbox" id="mortgage" className="w-5 h-5" checked={item.mortgage_setup} onChange={e => setItem({...item, mortgage_setup: e.target.checked})} />
                  <label htmlFor="mortgage" className="font-bold text-gray-700 cursor-pointer">근저당권 설정 완료 (제7조)</label>
              </div>
              <textarea className="w-full border p-3 rounded-xl h-24 resize-none" placeholder="특약 사항 입력" value={item.memo} onChange={e => setItem({...item, memo: e.target.value})}></textarea>
          </div>
      </div>

      {/* 🌟 서명된 파일 업로드 (수정 모드일 때만) */}
      {!isNew && (
        <div className="mt-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-lg text-gray-900 mb-4">📂 서명된 계약서 파일 보관</h3>
            {item.signed_file_url ? (
                <div className="flex items-center justify-between bg-green-50 p-4 rounded-xl border border-green-100">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">✅</span>
                        <div>
                            <p className="font-bold text-green-800">파일 등록됨</p>
                            <a href={item.signed_file_url} target="_blank" className="text-xs text-green-600 underline hover:text-green-800">파일 다운로드 / 보기</a>
                        </div>
                    </div>
                    <label className="cursor-pointer bg-white border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-50">
                        재업로드
                        <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={handleFileUpload} />
                    </label>
                </div>
            ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                    <p className="text-gray-500 mb-2">스캔한 계약서 파일(PDF, JPG)을 올려주세요.</p>
                    <label className="cursor-pointer bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 inline-block">
                        {uploading ? '업로드 중...' : '파일 선택'}
                        <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={handleFileUpload} />
                    </label>
                </div>
            )}
        </div>
      )}

      <div className="mt-8 flex gap-4">
         <button onClick={handleSave} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-green-700 transition-all shadow-xl transform hover:-translate-y-1">
            {isNew ? '✨ 지입 계약 등록 완료' : '💾 수정 내용 저장'}
         </button>
      </div>

      {/* 🖥️ 계약서 미리보기 모달 */}
      {showPreview && (
         <div className="fixed inset-0 bg-black/80 z-[9999] flex flex-col items-center justify-center p-4">
            <div className="bg-gray-100 w-full max-w-5xl rounded-xl overflow-hidden flex flex-col max-h-screen">
                <div className="p-4 bg-white border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg">계약서 미리보기</h3>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="bg-black text-white px-4 py-2 rounded-lg font-bold">인쇄하기</button>
                        <button onClick={() => setShowPreview(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold">닫기</button>
                    </div>
                </div>
                <div className="overflow-y-auto p-8 bg-gray-500 flex justify-center">
                    {/* 👇 여기서 컴포넌트 호출 */}
                    <ContractPaper data={item} car={cars.find((c:any) => c.id === item.car_id)} />
                </div>
            </div>
         </div>
       )}

       {/* 인쇄 스타일 */}
       <style jsx global>{`
         @media print {
           body * { visibility: hidden; }
           #printable-area, #printable-area * { visibility: visible; }
           #printable-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20mm; }
           .fixed { position: static; background: white; }
         }
       `}</style>
    </div>
  )
}