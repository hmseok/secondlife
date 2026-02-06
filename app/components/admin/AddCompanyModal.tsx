'use client'

import { useState } from 'react'
import { supabase } from '../../utils/supabase'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void // 등록 성공하면 목록 새로고침 하라고 알려줌
}

export default function AddCompanyModal({ isOpen, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    business_number: '',
    plan: 'free', // 기본값
  })

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // 1. 회사 정보 insert
      const { error } = await supabase
        .from('companies')
        .insert({
          name: formData.name,
          business_number: formData.business_number,
          plan: formData.plan,
          is_active: true
        })

      if (error) throw error

      alert('회사가 성공적으로 등록되었습니다!')
      onSuccess() // 부모 컴포넌트(대시보드)에게 "새로고침해!" 신호 보냄
      onClose()   // 모달 닫기

      // 폼 초기화
      setFormData({ name: '', business_number: '', plan: 'free' })

    } catch (error: any) {
      alert('등록 실패: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">

        {/* 헤더 */}
        <div className="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
          <h3 className="font-bold text-lg text-gray-800">새 회사 등록</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">회사명 <span className="text-red-500">*</span></label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="(주)라이드"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사업자 등록번호</label>
            <input
              type="text"
              value={formData.business_number}
              onChange={(e) => setFormData({...formData, business_number: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="000-00-00000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">구독 플랜</label>
            <select
              value={formData.plan}
              onChange={(e) => setFormData({...formData, plan: e.target.value})}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
            >
              <option value="free">Free (무료)</option>
              <option value="pro">Pro (유료)</option>
              <option value="master">Master (최고등급)</option>
            </select>
          </div>

          <div className="pt-4 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}