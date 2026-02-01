'use client'
import { useEffect, useState, useRef } from 'react'
import { useParams } from 'next/navigation'
import { supabase } from '../../../utils/supabase'
import ContractPaper from '../../../components/ContractPaper'
import SignatureCanvas from 'react-signature-canvas'

export default function GuestSignPage() {
  const params = useParams()
  const id = params.id
  const [loading, setLoading] = useState(true)
  const [item, setItem] = useState<any>(null)
  const [car, setCar] = useState<any>(null)
  const [completed, setCompleted] = useState(false)
  const sigCanvas = useRef<any>({})

  useEffect(() => {
    const fetchData = async () => {
      // 계약 정보 가져오기
      const { data: contract } = await supabase.from('jiip_contracts').select('*').eq('id', id).single()
      if (contract) {
        setItem(contract)
        // 차량 정보 가져오기
        const { data: carData } = await supabase.from('cars').select('*').eq('id', contract.car_id).single()
        setCar(carData)
      }
      setLoading(false)
    }
    fetchData()
  }, [id])

  const handleSaveSignature = async () => {
    if (sigCanvas.current.isEmpty()) return alert("서명을 해주세요!")

    const dataURL = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
    const res = await fetch(dataURL)
    const blob = await res.blob()
    const fileName = `signature_${id}_guest_${Date.now()}.png`

    // 스토리지 업로드
    const { error: uploadError } = await supabase.storage.from('contracts').upload(fileName, blob)
    if (uploadError) return alert('업로드 실패')

    // DB 업데이트
    const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(fileName)
    await supabase.from('jiip_contracts').update({ signed_file_url: publicUrl }).eq('id', id)

    setCompleted(true)
  }

  if (loading) return <div className="p-10 text-center">계약서 불러오는 중...</div>
  if (completed) return (
    <div className="h-screen flex flex-col items-center justify-center bg-green-50 p-4">
        <div className="text-6xl mb-4">✅</div>
        <h1 className="text-2xl font-bold text-green-800 mb-2">서명이 완료되었습니다.</h1>
        <p className="text-gray-600 text-center">계약서가 안전하게 전송되었습니다.<br/>창을 닫으셔도 됩니다.</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-100 py-10 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden">
        <div className="bg-indigo-900 text-white p-4 text-center">
            <h1 className="font-bold text-lg">전자 서명 요청</h1>
            <p className="text-xs text-indigo-200">내용을 확인하시고 하단에 서명해 주세요.</p>
        </div>

        {/* 계약서 미리보기 (스크롤) */}
        <div className="h-[60vh] overflow-y-auto bg-gray-50 border-b">
            {item && car && <ContractPaper data={item} car={car} />}
        </div>

        {/* 서명 패드 */}
        <div className="p-6 bg-white">
            <p className="font-bold text-gray-900 mb-2 text-center">👇 아래 박스에 서명해 주세요</p>
            <div className="border-2 border-gray-300 rounded-xl bg-gray-50 mb-4 overflow-hidden h-48">
                <SignatureCanvas
                    ref={sigCanvas}
                    penColor="black"
                    canvasProps={{className: 'sigCanvas w-full h-full'}}
                />
            </div>
            <div className="flex gap-3">
                <button onClick={() => sigCanvas.current.clear()} className="flex-1 bg-gray-200 py-4 rounded-xl font-bold text-gray-700">지우기</button>
                <button onClick={handleSaveSignature} className="flex-1 bg-indigo-600 py-4 rounded-xl font-bold text-white">서명 제출하기</button>
            </div>
        </div>
      </div>
    </div>
  )
}