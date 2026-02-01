'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../utils/supabase'
import ContractPaper from '../../components/ContractPaper'
import { useDaumPostcodePopup } from 'react-daum-postcode'
import SignatureCanvas from 'react-signature-canvas' // 👈 서명 라이브러리 (npm install react-signature-canvas 필요)

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
    tax_type: '세금계산서',
    investor_name: '', investor_phone: '', investor_reg_number: '', investor_email: '',
    investor_address_main: '', investor_address_detail: '',
    bank_name: 'KB국민은행', account_number: '', account_holder: '',
    contract_start_date: '', contract_end_date: '',
    invest_amount: 0,
    admin_fee: 200000,
    share_ratio: 70,
    payout_day: 10,
    mortgage_setup: false,
    memo: '',
    signed_file_url: '' // 서명 파일 경로
  })

  // UI 상태
  const [showPreview, setShowPreview] = useState(false)
  const [showSignPad, setShowSignPad] = useState(false) // ✍️ 서명 패드 모달 상태
  const [uploading, setUploading] = useState(false)

  const sigCanvas = useRef<any>({}) // 서명 캔버스 참조
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

  const handleSearchAddress = () => { open({ onComplete: handleAddressComplete }) }

  useEffect(() => {
    fetchCars()
    if (!isNew && jiipId) fetchDetail()
  }, [])

  // 🗓️ 3년 자동 설정
  useEffect(() => {
    if (item.contract_start_date) {
      const start = new Date(item.contract_start_date)
      start.setFullYear(start.getFullYear() + 3)
      start.setDate(start.getDate() - 1)
      const endDateStr = start.toISOString().split('T')[0]
      setItem((prev: any) => ({ ...prev, contract_end_date: endDateStr }))
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
        investor_address_main: data.investor_address || '',
        investor_address_detail: '',
        investor_email: data.investor_email || '',
        account_holder: data.account_holder || '',
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
    if (!item.car_id || !item.investor_name) return alert('차량과 투자자 정보는 필수입니다.')

    const fullAddress = `${item.investor_address_main} ${item.investor_address_detail}`.trim()

    const payload = {
      car_id: item.car_id,
      investor_name: item.investor_name,
      investor_phone: item.investor_phone,
      investor_reg_number: item.investor_reg_number,
      investor_email: item.investor_email,
      investor_address: fullAddress,
      bank_name: item.bank_name,
      account_number: item.account_number,
      account_holder: item.account_holder,
      contract_start_date: item.contract_start_date || null,
      contract_end_date: item.contract_end_date || null,
      invest_amount: item.invest_amount,
      admin_fee: item.admin_fee,
      share_ratio: item.share_ratio,
      payout_day: item.payout_day,
      tax_type: item.tax_type,
      mortgage_setup: item.mortgage_setup,
      memo: item.memo,
      signed_file_url: item.signed_file_url
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

  // 📋 [기능 2] 문자 전송용 링크 복사
  const copySignLink = () => {
    // 현재 접속 주소 기반으로 서명 페이지 URL 생성
    const url = `${window.location.origin}/jiip/${jiipId}/sign`
    navigator.clipboard.writeText(url)
    alert('✅ 서명 페이지 주소가 복사되었습니다!\n\n문자 메시지나 카톡에 붙여넣기(Ctrl+V)해서 전송하세요.\n\n' + url)
  }

  // ✍️ [기능 1] 화면 직접 서명 저장
  const saveSignature = async () => {
    if (sigCanvas.current.isEmpty()) {
        alert("서명을 해주세요!"); return;
    }
    setUploading(true);

    // 1. 이미지 데이터 추출
    const dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png');
    const res = await fetch(dataURL);
    const blob = await res.blob();
    const fileName = `signature_${jiipId}_direct_${Date.now()}.png`;

    // 2. 업로드
    const { error: uploadError } = await supabase.storage.from('contracts').upload(fileName, blob);
    if (uploadError) {
        alert('업로드 실패: ' + uploadError.message); setUploading(false); return;
    }

    // 3. DB 업데이트
    const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(fileName);
    await supabase.from('jiip_contracts').update({ signed_file_url: publicUrl }).eq('id', jiipId);

    alert("서명이 저장되었습니다!");
    setItem((prev: any) => ({ ...prev, signed_file_url: publicUrl }));
    setShowSignPad(false);
    setUploading(false);
  }

  // 포맷팅 함수들
  const formatPhone = (v: string) => {
    const n = v.replace(/[^0-9]/g, "")
    if (n.length <= 3) return n
    if (n.length <= 7) return `${n.slice(0, 3)}-${n.slice(3)}`
    return `${n.slice(0, 3)}-${n.slice(3, 7)}-${n.slice(7, 11)}`
  }
  const formatRegNum = (v: string) => {
    const n = v.replace(/[^0-9]/g, "")
    if (item.tax_type === '세금계산서') {
        if (n.length > 5) return `${n.slice(0, 3)}-${n.slice(3, 5)}-${n.slice(5, 10)}`
        if (n.length > 3) return `${n.slice(0, 3)}-${n.slice(3)}`
        return n
    } else {
        if (n.length > 6) return `${n.slice(0, 6)}-${n.slice(6, 13)}`
        return n
    }
  }
  const formatBankAccount = (b: string, v: string) => {
    const n = v.replace(/[^0-9]/g, "")
    if (!n) return ""
    if (b === 'KB국민은행') {
        if (n.length > 8) return `${n.slice(0, 6)}-${n.slice(6, 8)}-${n.slice(8, 14)}`
        if (n.length > 6) return `${n.slice(0, 6)}-${n.slice(6)}`
        return n
    }
    return n
  }
  const handleMoneyChange = (f: string, v: string) => {
    const n = Number(v.replace(/,/g, ''))
    if (!isNaN(n)) setItem((p: any) => ({ ...p, [f]: n }))
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
          <p className="text-gray-500 mt-1">지급 유형을 먼저 선택하고 정보를 입력해주세요.</p>
        </div>
        {!isNew && (
            <div className="flex gap-2">
                {/* 🔗 [기능 2] 링크 복사 버튼 */}
                <button onClick={copySignLink} className="bg-yellow-400 text-black border border-yellow-500 px-4 py-2 rounded-xl font-bold hover:bg-yellow-500 shadow-sm flex items-center gap-2">
                    🔗 서명 링크 복사
                </button>
                <button onClick={handleDelete} className="bg-white border border-red-200 text-red-500 px-4 py-2 rounded-xl font-bold hover:bg-red-50">🗑️ 삭제</button>
            </div>
        )}
      </div>

      {!isNew && (
         <div className="mb-8 bg-indigo-900 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center animate-fade-in-down">
            <div>
                <h3 className="font-bold text-lg">📄 계약서 및 서명 관리</h3>
                <p className="text-indigo-200 text-sm">계약서를 출력하거나, 화면에서 바로 서명을 받을 수 있습니다.</p>
            </div>
            <div className="flex gap-2">
                {/* ✍️ [기능 1] 직접 서명 버튼 */}
                <button onClick={() => setShowSignPad(true)} className="bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600 shadow-md flex items-center gap-2">
                    ✍️ 화면에 서명하기
                </button>
                <button onClick={() => setShowPreview(true)} className="bg-white text-indigo-900 px-4 py-3 rounded-xl font-bold hover:bg-indigo-50 shadow-md">
                    🖨️ 미리보기/출력
                </button>
            </div>
         </div>
       )}

      <div className="space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
          {/* 입력 폼 영역 (기존 코드 유지) */}
          <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
             <h3 className="font-bold text-lg text-blue-900 mb-4">1. 지급 및 세금 유형 선택</h3>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {['세금계산서', '사업소득(3.3%)', '이자소득(27.5%)'].map(type => (
                    <label key={type} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-all ${item.tax_type === type ? 'bg-white border-blue-500 shadow-md ring-2 ring-blue-200' : 'bg-blue-50/50 border-blue-200 hover:bg-white'}`}>
                        <input type="radio" name="tax" value={type} checked={item.tax_type === type} onChange={e => setItem({...item, tax_type: e.target.value})} className="w-5 h-5 text-blue-600" />
                        <span className="font-bold text-gray-900">{type}</span>
                    </label>
                ))}
             </div>
          </div>

          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">2. 투자자(을) 상세 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">대상 차량</label>
                    <select className="w-full border p-3 rounded-xl font-bold bg-gray-50" value={item.car_id} onChange={e => setItem({...item, car_id: e.target.value})}>
                      <option value="">차량을 선택하세요</option>
                      {cars.map(c => <option key={c.id} value={c.id}>{c.number} ({c.model})</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">연락처 (자동 -)</label>
                    <input className="w-full border p-3 rounded-xl" placeholder="010-0000-0000" maxLength={13}
                        value={item.investor_phone} onChange={e => setItem({...item, investor_phone: formatPhone(e.target.value)})} />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                        {item.tax_type === '세금계산서' ? '상호(법인명)' : '성명(실명)'}
                    </label>
                    <input className="w-full border p-2 rounded-lg bg-white font-bold"
                        value={item.investor_name} onChange={e => setItem({...item, investor_name: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">
                        {item.tax_type === '세금계산서' ? '사업자등록번호' : '주민등록번호'}
                    </label>
                    <input className="w-full border p-2 rounded-lg bg-white" maxLength={14}
                        value={item.investor_reg_number} onChange={e => setItem({...item, investor_reg_number: formatRegNum(e.target.value)})} />
                 </div>
                 {item.tax_type === '세금계산서' && (
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-blue-600 mb-1">전자세금계산서 수신 이메일</label>
                        <input className="w-full border p-2 rounded-lg bg-white border-blue-200" placeholder="example@email.com"
                            value={item.investor_email} onChange={e => setItem({...item, investor_email: e.target.value})} />
                     </div>
                 )}
                 <div className="md:col-span-2">
                     <label className="block text-xs font-bold text-gray-500 mb-1">주소</label>
                     <div className="flex gap-2 mb-2">
                        <input className="w-full border p-2 rounded-lg bg-white" placeholder="주소 검색 클릭" value={item.investor_address_main} readOnly />
                        <button onClick={handleSearchAddress} className="bg-gray-700 text-white px-3 rounded-lg text-xs font-bold hover:bg-black">주소검색</button>
                     </div>
                     <input className="w-full border p-2 rounded-lg bg-white" placeholder="상세 주소 입력" value={item.investor_address_detail} onChange={e => setItem({...item, investor_address_detail: e.target.value})} />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">입금 은행</label>
                    <select className="w-full border p-3 rounded-xl bg-white" value={item.bank_name} onChange={e => setItem({...item, bank_name: e.target.value})}>
                        {KOREAN_BANKS.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                    </select>
                 </div>
                 <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 mb-1">계좌 번호 (자동 -)</label>
                    <input className="w-full border p-3 rounded-xl bg-white font-bold text-blue-600" placeholder="숫자만 입력"
                        value={item.account_number} onChange={e => setItem({...item, account_number: formatBankAccount(item.bank_name, e.target.value)})} />
                 </div>
                 <div className="col-span-1">
                    <label className="block text-xs font-bold text-gray-500 mb-1">예금주</label>
                    <input className="w-full border p-3 rounded-xl bg-white" placeholder="예금주"
                        value={item.account_holder} onChange={e => setItem({...item, account_holder: e.target.value})} />
                 </div>
              </div>
          </div>

          <hr className="border-gray-100" />
          {/* 3. 계약 및 비용 */}
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">3. 계약 및 수익 배분</h3>
              <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">계약 시작일</label>
                    <input type="date" max="9999-12-31" className="w-full border p-3 rounded-xl" value={item.contract_start_date} onChange={e => setItem({...item, contract_start_date: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">계약 종료일 (3년 자동)</label>
                    <input type="date" max="9999-12-31" className="w-full border p-3 rounded-xl" value={item.contract_end_date} onChange={e => setItem({...item, contract_end_date: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">투자 원금</label>
                    <input type="text" className="w-full border p-3 rounded-xl text-right font-bold" placeholder="0"
                      value={item.invest_amount > 0 ? item.invest_amount.toLocaleString() : ''} onChange={e => handleMoneyChange('invest_amount', e.target.value)} />
                 </div>
              </div>
              <div className="bg-green-50 p-6 rounded-2xl border border-green-100 grid grid-cols-3 gap-6">
                 <div>
                    <label className="block text-xs font-bold text-green-800 mb-1">① 위탁 관리비 (선공제)</label>
                    <input type="text" className="w-full border border-green-200 p-2 rounded-lg text-right font-bold bg-white text-green-800"
                        value={item.admin_fee > 0 ? item.admin_fee.toLocaleString() : ''} onChange={e => handleMoneyChange('admin_fee', e.target.value)} />
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-blue-800 mb-1">② 투자자(을) 배분율</label>
                     <div className="flex items-center gap-2">
                        <input type="number" className="w-full border border-blue-200 p-2 rounded-lg text-right font-bold bg-white text-blue-800"
                            value={item.share_ratio} onChange={e => setItem({...item, share_ratio: Number(e.target.value)})} />
                        <span className="font-bold text-blue-800">%</span>
                     </div>
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">수익금 지급일 (일)</label>
                    <input type="number" className="w-full border p-2 rounded-lg text-right bg-white" placeholder="10"
                    value={item.payout_day} onChange={e => setItem({...item, payout_day: Number(e.target.value)})} />
                 </div>
              </div>
          </div>
          <hr className="border-gray-100" />
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">4. 기타 사항</h3>
              <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                  <input type="checkbox" id="mortgage" className="w-5 h-5" checked={item.mortgage_setup} onChange={e => setItem({...item, mortgage_setup: e.target.checked})} />
                  <label htmlFor="mortgage" className="font-bold text-gray-700 cursor-pointer">근저당권 설정 완료 (제7조)</label>
              </div>
              <textarea className="w-full border p-3 rounded-xl h-24 resize-none" placeholder="특약 사항 입력" value={item.memo} onChange={e => setItem({...item, memo: e.target.value})}></textarea>
          </div>
      </div>

      {/* 🌟 서명/파일 보관 영역 */}
      {!isNew && (
        <div className="mt-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-lg text-gray-900 mb-4">📂 서명 및 계약서 파일</h3>
            {item.signed_file_url ? (
                <div className="flex flex-col items-center justify-center bg-gray-50 p-6 rounded-xl border border-gray-200">
                    {/* 이미지 파일이면 미리 보여줌 */}
                    {item.signed_file_url.includes('.png') || item.signed_file_url.includes('.jpg') ? (
                        <img src={item.signed_file_url} alt="서명" className="max-h-40 mb-4 border rounded bg-white" />
                    ) : (
                        <div className="text-4xl mb-2">📄</div>
                    )}
                    <div className="flex gap-4">
                        <a href={item.signed_file_url} target="_blank" className="text-blue-600 font-bold underline">파일 보기/다운로드</a>
                        <button onClick={() => setItem({...item, signed_file_url: ''})} className="text-red-500 text-sm underline">삭제</button>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500 p-8 border-2 border-dashed rounded-xl">
                    아직 등록된 서명이나 계약서 파일이 없습니다.<br/>
                    '화면에 서명하기'를 누르거나 링크를 보내서 서명을 요청하세요.
                </div>
            )}
        </div>
      )}

      <div className="mt-8 flex gap-4">
         <button onClick={handleSave} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-green-700 transition-all shadow-xl transform hover:-translate-y-1">
            {isNew ? '✨ 투자 계약 등록 완료' : '💾 수정 내용 저장'}
         </button>
      </div>

     {/* 🖥️ 계약서 미리보기 모달 */}
           {showPreview && (
              <div className="fixed inset-0 bg-black/80 z-[9999] flex flex-col items-center justify-center p-4">
                 <div className="bg-gray-100 w-full max-w-5xl rounded-xl overflow-hidden flex flex-col h-[90vh] shadow-2xl">
                     <div className="p-4 bg-white border-b flex justify-between items-center flex-none">
                         <h3 className="font-bold text-lg">계약서 미리보기</h3>
                         <div className="flex gap-2">
                             <button onClick={() => window.print()} className="bg-black text-white px-4 py-2 rounded-lg font-bold hover:bg-gray-800">🖨️ 인쇄하기</button>
                             <button onClick={() => setShowPreview(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold hover:bg-gray-300">닫기</button>
                         </div>
                     </div>
                     <div className="flex-1 overflow-y-auto p-8 pb-32 bg-gray-500 flex justify-center">
                         <ContractPaper data={item} car={cars.find((c:any) => c.id === item.car_id)} />
                     </div>
                 </div>
              </div>
            )}

      {/* ✍️ [신규] 전자 서명 패드 모달 */}
       {showSignPad && (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex flex-col items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
                <h3 className="text-xl font-bold mb-2 text-center">여기에 서명해 주세요</h3>
                <p className="text-gray-500 text-sm text-center mb-4">터치스크린이나 마우스로 서명하세요.</p>

                <div className="border-2 border-gray-300 rounded-xl bg-gray-50 mb-4 overflow-hidden">
                    <SignatureCanvas
                        ref={sigCanvas}
                        penColor="black"
                        canvasProps={{width: 500, height: 300, className: 'sigCanvas w-full h-64'}}
                    />
                </div>

                <div className="flex gap-3">
                    <button onClick={() => sigCanvas.current.clear()} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold">지우기</button>
                    <button onClick={() => setShowSignPad(false)} className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-xl font-bold">취소</button>
                    <button onClick={saveSignature} className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700">
                        {uploading ? '저장 중...' : '서명 완료'}
                    </button>
                </div>
            </div>
        </div>
       )}

            <style jsx global>{`
              @media print {
                @page { size: A4; margin: 0; }
                body * { visibility: hidden; }
                #printable-area, #printable-area * { visibility: visible; }
                #printable-area { position: absolute; left: 0; top: 0; width: 210mm; min-height: 297mm; margin: 0; padding: 15mm; background: white; }
                .fixed { display: none; }
              }
            `}</style>
    </div>
  )
}