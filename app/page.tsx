'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './utils/supabase'
// 👇 방금 만든 모달 불러오기
import LoginModal from './components/auth/LoginModal'

export default function LandingPage() {
  const router = useRouter()
  // 👇 로그인 창을 띄울지 말지 결정하는 스위치
  const [isLoginOpen, setIsLoginOpen] = useState(false)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.replace('/admin')
      }
    }
    checkSession()
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center text-white p-4">
      <div className="text-center space-y-6 max-w-lg">
        <h1 className="text-5xl font-black tracking-tight mb-2">
          SECONDLIFE <span className="text-blue-500">ERP</span>
        </h1>
        <p className="text-gray-400 text-lg">
          차량 자산 관리부터 정산까지,<br/>
          모빌리티 비즈니스를 위한 통합 솔루션
        </p>

        <div className="pt-8 flex flex-col gap-4">
          {/* 👇 Link 대신 button으로 변경하고 onClick 이벤트 추가! */}
          <button
            onClick={() => setIsLoginOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 px-8 rounded-xl transition-all transform hover:scale-105 shadow-lg shadow-blue-900/50"
          >
            관리자 로그인 / 시작하기
          </button>

          <div className="text-sm text-gray-500 mt-4">
            시스템 이용 문의: help@hmseok.com
          </div>
        </div>
      </div>

      {/* 👇 로그인 모달 컴포넌트 배치 */}
      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
      />
    </div>
  )
}