'use client'

import { useState } from 'react'
import dynamicImport from 'next/dynamic'
import { useApp } from '../../context/AppContext'

const tabs = [
  { id: 'codes', label: '공통 코드', icon: '🏷️', desc: '드롭다운/상태값 관리' },
  { id: 'company', label: '회사 설정', icon: '🏢', desc: '회사 기본 정보' },
  { id: 'modules', label: '모듈 관리', icon: '🧩', desc: '기능 활성화 설정' },
]

function TabPlaceholder() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
      <div className="text-6xl mb-4">⚙️</div>
      <h3 className="text-lg font-bold text-gray-700 mb-2">로딩 중...</h3>
    </div>
  )
}

const TabComponents: Record<string, React.ComponentType<any>> = {
  codes: dynamicImport(() => import('./CommonCodesTab').catch(() => TabPlaceholder), { ssr: false }),
  company: dynamicImport(() => import('./CompanySettingsTab').catch(() => TabPlaceholder), { ssr: false }),
  modules: dynamicImport(() => import('./SystemModulesTab').catch(() => TabPlaceholder), { ssr: false }),
}

export default function SettingsPage() {
  const { role } = useApp()
  const [activeTab, setActiveTab] = useState<string>('codes')
  const [showGuide, setShowGuide] = useState(true)

  const visibleTabs = role === 'god_admin' ? tabs : tabs.filter(t => t.id !== 'modules')

  const getCurrentTabComponent = () => {
    const TabComponent = TabComponents[activeTab] || TabPlaceholder
    return <TabComponent />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-gray-900">환경설정</h1>
              <p className="text-xs text-gray-500 mt-1">
                시스템 공통 코드, 회사 정보, 모듈 관리를 한 곳에서 설정합니다
              </p>
            </div>
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              {showGuide ? '가이드 숨기기' : '가이드 보기'}
              <span className="text-blue-500">💡</span>
            </button>
          </div>
        </div>
      </div>

      {/* 가이드 배너 */}
      {showGuide && (
        <div className="bg-gradient-to-r from-gray-50 to-blue-50 border-b border-gray-200">
          <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="flex items-start gap-3 p-3 bg-white/70 rounded-xl">
                <span className="text-xl flex-shrink-0">🏷️</span>
                <div>
                  <p className="font-bold text-gray-800 mb-1">공통 코드</p>
                  <p className="text-gray-600 leading-relaxed">
                    시스템 전반에서 사용하는 드롭다운 항목, 상태값, 분류 코드를 관리합니다.
                    그룹별로 정리된 코드를 추가/수정/삭제할 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/70 rounded-xl">
                <span className="text-xl flex-shrink-0">🏢</span>
                <div>
                  <p className="font-bold text-gray-800 mb-1">회사 설정</p>
                  <p className="text-gray-600 leading-relaxed">
                    회사 기본 정보(상호, 사업자번호, 대표자 등)를 확인하고 수정합니다.
                    렌터카 운영에 필요한 기본 파라미터도 이곳에서 설정합니다.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 bg-white/70 rounded-xl">
                <span className="text-xl flex-shrink-0">🧩</span>
                <div>
                  <p className="font-bold text-gray-800 mb-1">모듈 관리</p>
                  <p className="text-gray-600 leading-relaxed">
                    {role === 'god_admin'
                      ? '각 회사에 활성화된 시스템 모듈을 관리합니다. 모듈을 켜거나 끌 수 있습니다.'
                      : '현재 활성화된 시스템 모듈 목록을 확인합니다.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 탭 네비게이션 */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6">
          <div className="flex gap-1 overflow-x-auto py-2">
            {visibleTabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-gray-900 text-white shadow-md'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                <span className={`text-[10px] font-normal hidden sm:inline ${
                  activeTab === tab.id ? 'text-gray-300' : 'text-gray-400'
                }`}>
                  {tab.desc}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-6">
        {getCurrentTabComponent()}
      </div>
    </div>
  )
}
