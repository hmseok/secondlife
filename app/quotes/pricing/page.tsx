'use client'
import { Suspense, useState } from "react";
import RentPricingBuilder from "./RentPricingBuilder";
import ShortTermReplacementBuilder from "./ShortTermReplacementBuilder";

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-steel-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 font-bold">페이지 로드 중...</p>
      </div>
    </div>
  );
}

const TABS = [
  { key: 'longterm', label: '장기렌트 견적', icon: '🚗' },
  { key: 'shortterm', label: '단기대차 견적', icon: '🔧' },
] as const

type TabKey = typeof TABS[number]['key']

export default function Page() {
  const [activeTab, setActiveTab] = useState<TabKey>('longterm')

  return (
    <div>
      {/* 최상위 탭 바 */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex gap-0">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-steel-600 text-steel-700'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <Suspense fallback={<LoadingFallback />}>
        {activeTab === 'longterm' ? (
          <RentPricingBuilder />
        ) : (
          <ShortTermReplacementBuilder />
        )}
      </Suspense>
    </div>
  );
}
