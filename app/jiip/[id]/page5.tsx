'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../utils/supabase'
import ContractPaper from '../../components/ContractPaper'
import { useDaumPostcodePopup } from 'react-daum-postcode' // 👈 주소 검색 라이브러리

// 🏦 한국 주요 은행 리스트
const KOREAN_BANKS = [
  'KB국민은행', '신한은행', '우리은행', '하나은행', 'NH농협은행',
  'IBK기업은행', 'SC제일은행', '씨티은행', 'KDB산업은행',
  '카카오뱅크', '케이뱅크', '토스뱅크',
  '우체국', '새마을금고', '신협', '수협', '산림조합',
  '대구은행', '부산은행', '경남은행', '광주은행', '전북은행', '제주은행'
]

export default function JiipDetailPage() {
  const router = useRouter()
  const params = useParams()
  const isNew = params.id === 'new'
  const jiipId = isNew ? null : params.id

  const [loading, setLoading] = useState(!isNew)
  const [cars, setCars] = useState<any[]>([])

  // 📝 데이터 상태
  const [item, setItem] = useState<any>({
    car_id: '',
    investor_name: '', investor_phone: '', investor_reg_number: '',
    investor_address_main: '', investor_address_detail: '', // 주소 분리
    bank_name: 'KB국민은행', account_number: '', account_holder: '',
    contract_start_date: '', contract_end_date: '',
    invest_amount: 0,
    admin_fee: 200000,
    share_ratio: 70,
    payout_day: 10,
    tax_type: '세금계산서',
    mortgage_setup: false,
    memo: '',
    signed_file_url: ''
  })

  // ✨ 인쇄 및 업로드 상태
  const [showPreview, setShowPreview] = useState(false)
  const [uploading, setUploading] = useState(false)

  // 🏠 주소 검색 팝업 훅
  const open = useDaumPostcodePopup()

  const handleAddressComplete = (data: any) => {
    let fullAddress = data.address
    let extraAddress = ''

    if (data.addressType === 'R') {
      if (data.bname !== '') extraAddress += data.bname
      if (data.buildingName !== '') extraAddress += (extraAddress !== '' ? `, ${data.buildingName}` : data.buildingName)
      fullAddress += (extraAddress !== '' ? ` (${extraAddress})` : '')
    }

    setItem((prev: any) => ({ ...prev, investor_address_main: fullAddress }))
  }

  const handleSearchAddress = () => {
    open({ onComplete: handleAddressComplete })
  }

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
      setItem((prev: any) => ({ ...prev, contract_end_date: start.toISOString().split('T')[0] }))
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
      // 주소 분리 처리 (기존 데이터 호환)
      const fullAddr = data.investor_address || ''
      // 간단하게 첫번째 부분을 메인주소로 간주 (실제로는 저장할 때 합쳐서 저장함)

      setItem({
        ...data,
        // DB에는 합쳐서 저장되어 있으니 불러올 때 그대로 세팅 (상세주소 수정 필요 시 직접 입력)
        investor_address_main: fullAddr,
        investor_address_detail: '',
        invest_amount: data.invest_amount || 0,
        admin_fee: data.admin_fee || 200000,
        share_ratio: data.share_ratio || 70,
        payout_day: data.payout_day || 10,
        tax_type: data.tax_type || '세금계산서',
        signed_file_url: data.signed_file_url || ''
      })
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!item.car_id || !item.investor_name) return alert('차량과 투자자 성명은 필수입니다.')

    // 주소 합치기
    const fullAddress = `${item.investor_address_main} ${item.investor_address_detail}`.trim()

    const payload = {
      ...item,
      investor_address: fullAddress, // DB 컬럼명에 맞춰 합쳐서 저장
      contract_start_date: item.contract_start_date || null,
      contract_end_date: item.contract_end_date || null,
      // 임시 필드 제거
      investor_address_main: undefined,
      investor_address_detail: undefined
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

  // 📞 자동 하이픈 (전화번호)
  const formatPhone = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "")
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 7) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`
  }

  // 🆔 자동 하이픈 (사업자/주민 번호)
  const formatRegNum = (value: string) => {
    const numbers = value.replace(/[^0-9]/g, "")
    // 주민번호 (6-7)
    if (numbers.length === 13) {
        return `${numbers.slice(0, 6)}-${numbers.slice(6)}`
    }
    // 사업자 (3-2-5)
    if (numbers.length === 10) {
        return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5)}`
    }
    return numbers // 그 외엔 숫자만
  }

  const handleMoneyChange = (field: string, value: string) => {
    const rawValue = value.replace(/,/g, '')
    const numValue = Number(rawValue)
    if (isNaN(numValue)) return
    setItem((prev: any) => ({ ...prev, [field]: numValue }))
  }

  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `contract_${jiipId}_${Date.now()}.${fileExt}`
    const { error: uploadError } = await supabase.storage.from('contracts').upload(fileName, file)
    if (uploadError) { alert('업로드 실패'); setUploading(false); return }
    const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(fileName)
    await supabase.from('jiip_contracts').update({ signed_file_url: publicUrl }).eq('id', jiipId)
    alert('계약서가 성공적으로 업로드되었습니다!')
    setItem((prev: any) => ({ ...prev, signed_file_url: publicUrl }))
    setUploading(false)
  }

  if (loading) return <div className="p-20 text-center font-bold text-gray-500">데이터 불러오는 중... ⏳</div>

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 animate-fade-in-up pb-32">
      <div className="flex justify-between items-center mb-8 border-b pb-6">
        <div>
          <button onClick={() => router.back()} className="text-gray-500 font-bold mb-2 hover:text-black">← 목록으로 돌아가기</button>
          <h1 className="text-3xl font-black text-gray-900">
            {isNew ? '📄 투자 계약 등록' : '🤝 투자 계약 상세 정보'}
          </h1>
          <p className="text-gray-500 mt-1">차량 운영 투자 및 수익 배분 계약서를 기반으로 입력하세요.</p>
        </div>
        {!isNew && (
           <button onClick={handleDelete} className="bg-white border border-red-200 text-red-500 px-4 py-2 rounded-xl font-bold hover:bg-red-50">🗑️ 삭제</button>
        )}
      </div>

      {/* 계약서 관리 (수정 모드일 때만) */}
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
                        <label className="block text-xs font-bold text-gray-500 mb-1">연락처 (자동 -)</label>
                        <input className="w-full border p-3 rounded-xl" placeholder="010-0000-0000"
                            maxLength={13}
                            value={item.investor_phone}
                            onChange={e => setItem({...item, investor_phone: formatPhone(e.target.value)})}
                        />
                    </div>
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">사업자/주민 번호 (자동 -)</label>
                    <input className="w-full border p-2 rounded-lg bg-white" placeholder="000-00-00000"
                        maxLength={14}
                        value={item.investor_reg_number}
                        onChange={e => setItem({...item, investor_reg_number: formatRegNum(e.target.value)})}
                    />
                 </div>

                 {/* 🏠 주소 검색 기능 추가 */}
                 <div>
                     <label className="block text-xs font-bold text-gray-500 mb-1">주소</label>
                     <div className="flex gap-2 mb-2">
                        <input className="w-full border p-2 rounded-lg bg-white" placeholder="주소 검색 클릭" value={item.investor_address_main} readOnly />
                        <button onClick={handleSearchAddress} className="bg-gray-700 text-white px-3 rounded-lg text-xs font-bold whitespace-nowrap">검색</button>
                     </div>
                     <input className="w-full border p-2 rounded-lg bg-white" placeholder="상세 주소 입력 (예: 101호)" value={item.investor_address_detail} onChange={e => setItem({...item, investor_address_detail: e.target.value})} />
                 </div>

                 <div className="md:col-span-2 grid grid-cols-3 gap-2">
                     <div className="col-span-1">
                        <label className="block text-xs font-bold text-gray-500 mb-1">입금 은행</label>
                        {/* 🏦 은행 드롭다운 */}
                        <select className="w-full border p-2 rounded-lg bg-white" value={item.bank_name} onChange={e => setItem({...item, bank_name: e.target.value})}>
                            {KOREAN_BANKS.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                        </select>
                     </div>
                     <div className="col-span-2">
                        <label className="block text-xs font-bold text-gray-500 mb-1">계좌 번호</label>
                        <input className="w-full border p-2 rounded-lg bg-white" placeholder="계좌번호 입력 (하이픈 없이)" value={item.account_number} onChange={e => setItem({...item, account_number: e.target.value})} />
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
                    {/* 👇 지급 구분 (3가지 옵션) */}
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">지급/세금 구분</label>
                        <div className="flex flex-col gap-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="tax" value="세금계산서" checked={item.tax_type === '세금계산서'} onChange={e => setItem({...item, tax_type: e.target.value})} className="w-4 h-4 text-green-600" />
                                <span className="text-sm">세금계산서 발행 (사업자)</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="tax" value="사업소득(3.3%)" checked={item.tax_type === '사업소득(3.3%)'} onChange={e => setItem({...item, tax_type: e.target.value})} className="w-4 h-4 text-green-600" />
                                <span className="text-sm">사업소득 3.3% 공제</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="tax" value="이자소득(27.5%)" checked={item.tax_type === '이자소득(27.5%)'} onChange={e => setItem({...item, tax_type: e.target.value})} className="w-4 h-4 text-green-600" />
                                <span className="text-sm">이자소득 27.5% 공제</span>
                            </label>
                        </div>
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

      {/* 하단 버튼 */}
      <div className="mt-8 flex gap-4">
         <button onClick={handleSave} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-green-700 transition-all shadow-xl transform hover:-translate-y-1">
            {isNew ? '✨ 투자 계약 등록 완료' : '💾 수정 내용 저장'}
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