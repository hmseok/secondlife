'use client'

import { useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs' // 👈 추가
import { useRouter } from 'next/navigation' // 👈 추가

const TabButton = ({ active, label, onClick }: any) => (
  <button
    onClick={onClick}
    className={`px-6 py-3 font-bold rounded-xl transition-all ${
      active
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200'
        : 'bg-white text-gray-500 hover:bg-gray-50'
    }`}
  >
    {label}
  </button>
)

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'company' | 'menu' | 'org'>('company')
  const supabase = createClientComponentClient() // 👈 추가
  const router = useRouter() // 👈 추가

  // 👋 로그아웃 함수
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.replace('/login') // 로그인 페이지로 튕겨내기
    router.refresh() // 화면 새로고침
  }

  const [features, setFeatures] = useState([
    { id: 1, name: '차량 관리 모듈', enabled: true },
    { id: 2, name: '전자 결재 시스템', enabled: false },
    { id: 3, name: '재무/회계 관리', enabled: true },
    { id: 4, name: 'AI 자동 배차', enabled: false },
  ])

  const toggleFeature = (id: number) => {
    setFeatures(features.map(f => f.id === id ? { ...f, enabled: !f.enabled } : f))
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* 👑 헤더 영역 */}
      <div className="mb-8 flex flex-col md:flex-row justify-between items-end gap-4">
        <div>
          <span className="bg-indigo-100 text-indigo-700 text-xs font-black px-2 py-1 rounded uppercase tracking-wider">System Admin</span>
          <h1 className="text-3xl font-black text-gray-900 mt-2">시스템 중앙 통제실</h1>
          <p className="text-gray-500 font-medium">모든 회사의 기능과 권한을 여기에서 제어합니다.</p>
        </div>

        <div className="flex items-center gap-4">
           {/* 탭 버튼들 */}
           <div className="flex gap-2">
             <TabButton active={activeTab === 'company'} label="🏢 기능 관리" onClick={() => setActiveTab('company')} />
             <TabButton active={activeTab === 'menu'} label="🔒 권한" onClick={() => setActiveTab('menu')} />
             <TabButton active={activeTab === 'org'} label="👥 조직" onClick={() => setActiveTab('org')} />
           </div>

           {/* 🚪 로그아웃 버튼 (여기 추가됨!) */}
           <button
             onClick={handleLogout}
             className="px-4 py-3 bg-white border border-gray-200 text-red-500 font-bold rounded-xl hover:bg-red-50 hover:border-red-100 transition shadow-sm h-full"
           >
             로그아웃
           </button>
        </div>
      </div>

      {/* 1. 회사/기능 관리 탭 */}
      {activeTab === 'company' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in-up">
          {features.map((feature) => (
            <div key={feature.id} className={`p-6 rounded-2xl border-2 transition-all ${feature.enabled ? 'bg-white border-indigo-100 shadow-sm' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${feature.enabled ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-200 text-gray-400'}`}>
                  {feature.enabled ? '⚡' : '💤'}
                </div>
                <button
                  onClick={() => toggleFeature(feature.id)}
                  className={`w-12 h-7 rounded-full transition-colors relative ${feature.enabled ? 'bg-indigo-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-1 transition-transform ${feature.enabled ? 'left-6' : 'left-1'}`}></div>
                </button>
              </div>
              <h3 className="text-lg font-bold text-gray-900">{feature.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{feature.enabled ? '활성화됨 (사용 중)' : '비활성화됨 (숨김 처리)'}</p>
            </div>
          ))}
          <div className="p-6 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-400 hover:text-indigo-500 hover:bg-indigo-50 transition cursor-pointer h-full min-h-[180px]">
            <span className="text-4xl mb-2">+</span>
            <span className="font-bold">새 모듈 추가</span>
          </div>
        </div>
      )}

      {/* 2. 메뉴 권한 관리 탭 */}
      {activeTab === 'menu' && (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm animate-fade-in-up">
          <h3 className="text-xl font-bold mb-6">직급별 페이지 접근 권한</h3>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-sm">
                <th className="py-3 font-medium">메뉴명</th>
                <th className="py-3 font-medium text-center">사원</th>
                <th className="py-3 font-medium text-center">팀장</th>
                <th className="py-3 font-medium text-center">관리자(Admin)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-gray-700 font-medium">
              {['차량 조회', '배차 신청', '정비 관리', '재무 보고서', '시스템 설정'].map((menu, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="py-4">{menu}</td>
                  <td className="text-center"><input type="checkbox" defaultChecked={idx < 2} className="accent-indigo-600 w-5 h-5" /></td>
                  <td className="text-center"><input type="checkbox" defaultChecked={idx < 4} className="accent-indigo-600 w-5 h-5" /></td>
                  <td className="text-center"><input type="checkbox" checked disabled className="accent-gray-400 w-5 h-5" /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-6 flex justify-end">
            <button className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition">권한 설정 저장</button>
          </div>
        </div>
      )}

      {/* 3. 조직 관리 탭 */}
      {activeTab === 'org' && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold">새 관리자 초대</h3>
              <p className="text-sm text-gray-500">이메일로 초대장을 발송합니다.</p>
            </div>
            <div className="flex gap-2">
              <input type="email" placeholder="email@company.com" className="bg-gray-50 px-4 py-2 rounded-lg border border-gray-200 outline-none focus:border-indigo-500" />
              <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold">초대하기</button>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
             <div className="p-6 border-b border-gray-100 bg-gray-50 font-bold text-gray-700">현재 조직원 목록</div>
             <div className="p-6 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">S</div>
                  <div>
                    <div className="font-bold">Seok Homin</div>
                    <div className="text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-full w-fit">System Admin</div>
                  </div>
                </div>
                <button className="text-gray-400 hover:text-red-600 text-sm font-bold">관리</button>
             </div>
          </div>
        </div>
      )}
    </div>
  )
}