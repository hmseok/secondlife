'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { supabase } from '../../utils/supabase'
import ContractPaper from '../../components/ContractPaper' // 👈 컴포넌트 불러오기
import { useReactToPrint } from 'react-to-print' // (설치 필요: npm install react-to-print)

export default function JiipDetailPage() {
  const router = useRouter()
  const params = useParams()
  // ... (기존 변수들: isNew, jiipId, loading, cars 등) ...
  const jiipId = params.id === 'new' ? null : params.id
  const isNew = params.id === 'new'
  const [loading, setLoading] = useState(!isNew)
  const [cars, setCars] = useState<any[]>([])

  const [item, setItem] = useState<any>({ /* ...기존 초기값... */ })

  // ✨ [추가] 인쇄 및 파일 업로드 관련 상태
  const [showPreview, setShowPreview] = useState(false)
  const [uploading, setUploading] = useState(false)
  const componentRef = useRef(null) // 인쇄할 영역 참조

  // 🖨️ 인쇄 기능 (react-to-print 사용 권장 또는 window.print)
  const handlePrint = () => {
    window.print()
  }

  // 📂 파일 업로드 핸들러
  const handleFileUpload = async (e: any) => {
    const file = e.target.files[0]
    if (!file) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `contract_${jiipId}_${Date.now()}.${fileExt}`
    const filePath = `${fileName}`

    // 1. 스토리지에 업로드
    const { error: uploadError } = await supabase.storage.from('contracts').upload(filePath, file)
    if (uploadError) { alert('업로드 실패'); setUploading(false); return }

    // 2. DB에 경로 저장
    const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(filePath)

    const { error: dbError } = await supabase
      .from('jiip_contracts')
      .update({ signed_file_url: publicUrl })
      .eq('id', jiipId)

    if (dbError) alert('DB 저장 실패')
    else {
        alert('계약서가 성공적으로 업로드되었습니다!')
        setItem((prev: any) => ({ ...prev, signed_file_url: publicUrl }))
    }
    setUploading(false)
  }

  // ... (기존 fetchCars, fetchDetail, handleSave 등은 그대로 유지) ...
  // (중략: 기존 코드와 동일)

  return (
    <div className="max-w-4xl mx-auto py-10 px-6 animate-fade-in-up pb-32">
       {/* ... 기존 헤더 ... */}

       {/* 🌟 [신규] 계약서 관리 섹션 (수정 모드일 때만 보임) */}
       {!isNew && (
         <div className="mb-8 bg-indigo-900 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center">
            <div>
                <h3 className="font-bold text-lg">📄 계약서 자동 생성 및 관리</h3>
                <p className="text-indigo-200 text-sm">입력된 정보를 바탕으로 계약서를 생성하고, 서명된 파일을 보관합니다.</p>
            </div>
            <div className="flex gap-3">
                <button onClick={() => setShowPreview(true)} className="bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold hover:bg-gray-100">
                    🖨️ 계약서 미리보기/출력
                </button>
            </div>
         </div>
       )}

       {/* ... 기존 입력 폼들 ... */}

       {/* 🌟 [신규] 서명된 계약서 업로드 영역 */}
       {!isNew && (
           <div className="mt-8 bg-white p-8 rounded-3xl shadow-sm border border-gray-200">
               <h3 className="font-bold text-lg text-gray-900 mb-4">📂 서명된 계약서 보관</h3>

               {item.signed_file_url ? (
                   <div className="flex items-center justify-between bg-green-50 p-4 rounded-xl border border-green-100">
                       <div className="flex items-center gap-3">
                           <span className="text-2xl">✅</span>
                           <div>
                               <p className="font-bold text-green-800">계약서 등록 완료</p>
                               <a href={item.signed_file_url} target="_blank" className="text-xs text-green-600 underline hover:text-green-800">파일 보기 / 다운로드</a>
                           </div>
                       </div>
                       <label className="cursor-pointer bg-white border border-green-200 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-green-50">
                           재업로드
                           <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={handleFileUpload} />
                       </label>
                   </div>
               ) : (
                   <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors">
                       <p className="text-gray-500 mb-2">스캔한 계약서 파일(PDF, 이미지)을 이곳에 올려주세요.</p>
                       <label className="cursor-pointer bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-indigo-700 inline-block">
                           {uploading ? '업로드 중...' : '파일 선택 및 업로드'}
                           <input type="file" className="hidden" accept=".pdf,.jpg,.png" onChange={handleFileUpload} />
                       </label>
                   </div>
               )}
           </div>
       )}

       {/* ... 기존 버튼들 ... */}

       {/* 🖥️ 계약서 미리보기 모달 (Print Mode) */}
       {showPreview && (
         <div className="fixed inset-0 bg-black/80 z-[9999] flex flex-col items-center justify-center p-4 overflow-y-auto">
            <div className="bg-gray-100 w-full max-w-5xl rounded-xl overflow-hidden flex flex-col max-h-screen">
                <div className="p-4 bg-white border-b flex justify-between items-center">
                    <h3 className="font-bold text-lg">계약서 미리보기</h3>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="bg-black text-white px-4 py-2 rounded-lg font-bold">인쇄하기</button>
                        <button onClick={() => setShowPreview(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-bold">닫기</button>
                    </div>
                </div>
                <div className="overflow-y-auto p-8 bg-gray-500 flex justify-center">
                    {/* 실제 계약서 종이 컴포넌트 */}
                    <ContractPaper data={item} car={cars.find((c:any) => c.id === item.car_id)} />
                </div>
            </div>
         </div>
       )}

       {/* 🖨️ 인쇄용 CSS (화면에는 안 보이고 인쇄할 때만 적용됨) */}
       <style jsx global>{`
         @media print {
           body * { visibility: hidden; }
           #printable-area, #printable-area * { visibility: visible; }
           #printable-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20mm; box-shadow: none; }
           /* 모달 배경 등 숨김 */
           .fixed { position: static; background: white; }
         }
       `}</style>
    </div>
  )
}