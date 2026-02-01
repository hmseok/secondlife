'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../utils/supabase'
import ContractPaper from '../../components/ContractPaper'
import { useDaumPostcodePopup } from 'react-daum-postcode'
import SignatureCanvas from 'react-signature-canvas'
import { toPng } from 'html-to-image' // 최신 캡처 도구
import jsPDF from 'jspdf'

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
    signed_file_url: ''
  })

  // UI 상태
  const [showPreview, setShowPreview] = useState(false)
  const [showSignPad, setShowSignPad] = useState(false)
  const [uploading, setUploading] = useState(false)

  // PDF 생성 Refs
  const sigCanvas = useRef<any>({})
  const hiddenContractRef = useRef<HTMLDivElement>(null)
  const [tempSignature, setTempSignature] = useState<string>('')

  const open = useDaumPostcodePopup()

  // --- 기존 로직 ---
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

  // 📋 [신규] 계약서 다운로드 링크 복사 (1부 전송용)
  const shareContractLink = () => {
    if (!item.signed_file_url) return alert('저장된 계약서가 없습니다.')
    navigator.clipboard.writeText(item.signed_file_url)
    alert('✅ 계약서 파일 주소가 복사되었습니다!\n\n문자나 카톡 채팅방에 "붙여넣기" 해서 전송해주세요.\n\n차주분이 링크를 누르면 바로 계약서를 볼 수 있습니다.')
  }

  const copySignLink = () => {
    const url = `${window.location.origin}/jiip/${jiipId}/sign`
    navigator.clipboard.writeText(url)
    alert('✅ 서명 페이지 주소가 복사되었습니다!\n\n문자 메시지나 카톡에 붙여넣기(Ctrl+V)해서 전송하세요.\n\n' + url)
  }

  // ✍️ [수정됨] 비율 유지 PDF 저장 (찌그러짐 해결!)
  const saveSignature = async () => {
    if (sigCanvas.current.isEmpty()) return alert("서명을 해주세요!")
    setUploading(true)

    try {
        const signatureDataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
        setTempSignature(signatureDataUrl)

        await new Promise(resolve => setTimeout(resolve, 500))

        if (!hiddenContractRef.current) throw new Error("계약서 로드 실패")

        // 1. 캡처 (흰색 배경)
        const imgData = await toPng(hiddenContractRef.current, { cacheBust: true, backgroundColor: '#ffffff' })

        // 2. PDF 생성 (비율 자동 계산 로직 적용)
        const pdf = new jsPDF('p', 'mm', 'a4')
        const pdfWidth = 210 // A4 너비 고정
        const imgProps = pdf.getImageProperties(imgData)
        // 👇 여기가 핵심! 이미지 높이를 비율대로 계산해서 넣습니다.
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)

        // 3. 업로드
        const pdfBlob = pdf.output('blob')
        const fileName = `contract_${jiipId}_admin_${Date.now()}.pdf`

        const { error: uploadError } = await supabase.storage.from('contracts').upload(fileName, pdfBlob, { contentType: 'application/pdf' })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(fileName)
        await supabase.from('jiip_contracts').update({ signed_file_url: publicUrl }).eq('id', jiipId)

        alert("✅ 서명 완료! PDF 계약서가 저장되었습니다.")
        setItem((prev: any) => ({ ...prev, signed_file_url: publicUrl }))
        setShowSignPad(false)

    } catch (e: any) {
        alert('저장 실패: ' + e.message)
    } finally {
        setUploading(false)
    }
  }

  // 포맷팅 함수들
  const formatPhone = (v: string) => v.replace(/[^0-9]/g, "").replace(/^(\d{2,3})(\d{3,4})(\d{4})$/, `$1-$2-$3`);
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

      {/* 숨겨진 계약서 (캡처용) */}
      <div style={{ position: 'absolute', top: '-10000px', left: '-10000px' }}>
          <div ref={hiddenContractRef}>
              {item && cars.length > 0 && <ContractPaper data={item} car={cars.find((c:any) => c.id === item.car_id)} signatureUrl={tempSignature} />}
          </div>
      </div>

      <div className="flex justify-between items-center mb-8 border-b pb-6">
        <div>
          <button onClick={() => router.back()} className="text-gray-500 font-bold mb-2 hover:text-black">← 목록으로 돌아가기</button>
          <h1 className="text-3xl font-black text-gray-900">
            {isNew ? '📄 투자 계약 등록' : '🤝 투자 계약 상세 정보'}
          </h1>
        </div>
        {!isNew && (
            <div className="flex gap-2">
                <button onClick={copySignLink} className="bg-yellow-400 text-black border border-yellow-500 px-4 py-2 rounded-xl font-bold hover:bg-yellow-500 shadow-sm flex items-center gap-2">
                    🔗 서명 링크 복사
                </button>
                <button onClick={handleDelete} className="bg-white border border-red-200 text-red-500 px-4 py-2 rounded-xl font-bold hover:bg-red-50">🗑️ 삭제</button>
            </div>
        )}
      </div>

      {!isNew && (
         <div className="mb-8 bg-indigo-900 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center">
            <div>
                <h3 className="font-bold text-lg">📄 계약서 및 서명 관리</h3>
                <p className="text-indigo-200 text-sm">계약서를 출력하거나, 화면에서 바로 서명을 받을 수 있습니다.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => setShowSignPad(true)} className="bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600 shadow-md flex items-center gap-2">
                    ✍️ 화면에 서명하기
                </button>
                <button onClick={() => setShowPreview(true)} className="bg-white text-indigo-900 px-4 py-3 rounded-xl font-bold hover:bg-indigo-50 shadow-md">
                    🖨️ 미리보기/출력
                </button>
            </div>
         </div>
       )}

      {/* 입력 폼 */}
      <div className="space-y-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
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
                    <label className="block text-xs font-bold text-gray-500 mb-1">연락처</label>
                    <input className="w-full border p-3 rounded-xl" placeholder="010-0000-0000" maxLength={13}
                        value={item.investor_phone} onChange={e => setItem({...item, investor_phone: formatPhone(e.target.value)})} />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">성명/상호</label>
                    <input className="w-full border p-2 rounded-lg bg-white font-bold"
                        value={item.investor_name} onChange={e => setItem({...item, investor_name: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">등록번호</label>
                    <input className="w-full border p-2 rounded-lg bg-white" maxLength={14}
                        value={item.investor_reg_number} onChange={e => setItem({...item, investor_reg_number: formatRegNum(e.target.value)})} />
                 </div>
                 {item.tax_type === '세금계산서' && (
                     <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-blue-600 mb-1">이메일</label>
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
                    <label className="block text-xs font-bold text-gray-500 mb-1">계좌 번호</label>
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
          <div className="space-y-4">
              <h3 className="font-bold text-lg text-gray-900">3. 계약 및 수익 배분</h3>
              <div className="grid grid-cols-3 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">계약 시작일</label>
                    <input type="date" className="w-full border p-3 rounded-xl" value={item.contract_start_date} onChange={e => setItem({...item, contract_start_date: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">계약 종료일</label>
                    <input type="date" className="w-full border p-3 rounded-xl" value={item.contract_end_date} onChange={e => setItem({...item, contract_end_date: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">투자 원금</label>
                    <input type="text" className="w-full border p-3 rounded-xl text-right font-bold" placeholder="0"
                      value={item.invest_amount > 0 ? item.invest_amount.toLocaleString() : ''} onChange={e => handleMoneyChange('invest_amount', e.target.value)} />
                 </div>
              </div>
              <div className="bg-green-50 p-6 rounded-2xl border border-green-100 grid grid-cols-3 gap-6">
                 <div>
                    <label className="block text-xs font-bold text-green-800 mb-1">위탁 관리비</label>
                    <input type="text" className="w-full border border-green-200 p-2 rounded-lg text-right font-bold bg-white text-green-800"
                        value={item.admin_fee > 0 ? item.admin_fee.toLocaleString() : ''} onChange={e => handleMoneyChange('admin_fee', e.target.value)} />
                 </div>
                 <div>
                     <label className="block text-xs font-bold text-blue-800 mb-1">배분율 (%)</label>
                     <input type="number" className="w-full border border-blue-200 p-2 rounded-lg text-right font-bold bg-white text-blue-800"
                            value={item.share_ratio} onChange={e => setItem({...item, share_ratio: Number(e.target.value)})} />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">지급일</label>
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
                  <label htmlFor="mortgage" className="font-bold text-gray-700 cursor-pointer">근저당권 설정 완료</label>
              </div>
              <textarea className="w-full border p-3 rounded-xl h-24 resize-none" placeholder="특약 사항 입력" value={item.memo} onChange={e => setItem({...item, memo: e.target.value})}></textarea>
          </div>
      </div>

      {/* 🌟 [수정됨] 서명 파일 뷰어 & 전송 버튼 */}
      {!isNew && (
        <div className="mt-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-lg text-gray-900 mb-4">📂 서명 및 계약서 파일</h3>
            {item.signed_file_url ? (
                <div className="flex flex-col md:flex-row gap-6 items-start">

                    {/* PDF 미리보기 */}
                    <div className="w-full md:w-1/2 h-80 bg-gray-100 rounded-xl overflow-hidden border border-gray-300 shadow-inner relative group">
                        <iframe
                            src={`${item.signed_file_url}#toolbar=0&navpanes=0&scrollbar=0`}
                            className="w-full h-full pointer-events-none"
                            title="PDF Preview"
                        />
                        <a href={item.signed_file_url} target="_blank" className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <span className="bg-white/90 px-4 py-2 rounded-full font-bold shadow-lg">🔍 크게 보기</span>
                        </a>
                    </div>

                    <div className="flex-1 flex flex-col justify-center h-full pt-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">📄</span>
                            <div>
                                <p className="font-bold text-gray-900">전자 계약서 (PDF)</p>
                                <p className="text-xs text-green-600 font-bold">● 서명 완료 & 저장됨</p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 mb-6">
                            계약서가 안전하게 저장되었습니다.<br/>
                            차주분께 이 파일을 전달하려면 아래 버튼을 누르세요.
                        </p>

                        <div className="space-y-3">
                            {/* 👇 [신규] 문자/카톡 전송용 버튼 */}
                            <button onClick={shareContractLink} className="w-full bg-yellow-400 text-black py-3 rounded-xl font-bold shadow-md hover:bg-yellow-500 flex items-center justify-center gap-2">
                                📩 문자/카톡으로 보내기 (주소복사)
                            </button>

                            <div className="flex gap-2">
                                <a href={item.signed_file_url} target="_blank" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-bold text-center hover:bg-indigo-700 shadow-md">
                                    ⬇️ 다운로드
                                </a>
                                <button onClick={() => { if(confirm('삭제하시겠습니까?')) setItem({...item, signed_file_url: ''}) }} className="px-4 border border-red-200 text-red-500 rounded-xl font-bold hover:bg-red-50">
                                    삭제
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-gray-500 p-10 border-2 border-dashed border-gray-300 rounded-xl bg-gray-50">
                    <p className="font-bold text-gray-600">아직 서명된 파일이 없습니다.</p>
                </div>
            )}
        </div>
      )}

      <div className="mt-8 flex gap-4">
         <button onClick={handleSave} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-xl hover:bg-green-700 transition-all shadow-xl">
            {isNew ? '✨ 투자 계약 등록 완료' : '💾 수정 내용 저장'}
         </button>
      </div>

     {/* 미리보기 모달 */}
     {showPreview && (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex flex-col items-center justify-center p-4">
            <div className="bg-gray-100 w-full max-w-5xl rounded-xl overflow-hidden flex flex-col h-[90vh] shadow-2xl">
                <div className="p-4 bg-white border-b flex justify-between items-none">
                    <h3 className="font-bold text-lg">계약서 미리보기</h3>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="bg-black text-white px-4 py-2 rounded-lg font-bold">인쇄하기</button>
                        <button onClick={() => setShowPreview(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold">닫기</button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-gray-500 flex justify-center">
                    <ContractPaper data={item} car={cars.find((c:any) => c.id === item.car_id)} />
                </div>
            </div>
        </div>
      )}

      {/* 서명 모달 (DocuSign 스타일) */}
       {showSignPad && (
        <div className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-2 md:p-6">
            <div className="bg-gray-700 w-full max-w-6xl h-full md:h-[95vh] rounded-xl overflow-hidden flex flex-col shadow-2xl relative">

                <div className="bg-gray-800 text-white px-6 py-4 flex justify-between items-center shadow-md z-20 flex-none">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl">📝</span>
                        <div>
                            <h3 className="font-bold text-lg leading-none">전자 서명</h3>
                            <p className="text-xs text-gray-400 mt-1">계약 내용을 확인 후 하단에 서명해 주세요.</p>
                        </div>
                    </div>
                    <button onClick={() => setShowSignPad(false)} className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors">닫기 ✕</button>
                </div>

                <div className="flex-1 overflow-y-auto bg-gray-600 p-8 flex justify-center relative scroll-smooth">
                    <div className="shadow-[0_0_50px_rgba(0,0,0,0.5)] transform transition-transform origin-top">
                        <ContractPaper data={item} car={cars.find((c:any) => c.id === item.car_id)} />
                    </div>
                </div>

                <div className="bg-white border-t border-gray-200 p-4 z-30 flex-none shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
                    <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-6">
                        <div className="hidden md:block w-48 text-right">
                            <p className="font-bold text-gray-900">서명란 👉</p>
                            <p className="text-xs text-gray-500">마우스나 손가락으로<br/>정자 서명해 주세요.</p>
                        </div>
                        <div className="flex-1 w-full relative">
                            <div className="border-2 border-gray-300 rounded-xl bg-gray-50 overflow-hidden h-32 md:h-28 w-full relative group hover:border-indigo-400 transition-colors">
                                <SignatureCanvas
                                    ref={sigCanvas}
                                    penColor="black"
                                    canvasProps={{className: 'w-full h-full cursor-crosshair absolute inset-0'}}
                                />
                                <div className="absolute top-2 left-3 text-xs text-gray-400 pointer-events-none font-bold group-hover:text-indigo-400">SIGN HERE (서명)</div>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button onClick={() => sigCanvas.current.clear()} className="px-6 py-3 rounded-xl border border-gray-300 text-gray-600 font-bold hover:bg-gray-100 transition-colors">지우기</button>
                            <button onClick={saveSignature} disabled={uploading} className="flex-1 md:flex-none px-8 py-3 rounded-xl bg-indigo-600 text-white font-bold shadow-lg hover:bg-indigo-700 hover:shadow-xl transition-all disabled:bg-gray-400 whitespace-nowrap">
                                {uploading ? '처리 중...' : '서명 완료'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
       )}
    </div>
  )
}