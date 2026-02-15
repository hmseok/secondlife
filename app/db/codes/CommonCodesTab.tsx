'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useApp } from '../../context/AppContext'

// ============================================
// 공통 코드 관리 탭
// common_codes 테이블 CRUD (group_code → code → name)
// ============================================

interface CommonCode {
  id: string
  group_code: string
  code: string
  name: string
  sort_order: number
  is_active: boolean
  created_at: string
}

interface GroupInfo {
  group_code: string
  count: number
  activeCount: number
}

const PRESET_GROUPS = [
  { group_code: 'CAR_STATUS', label: '차량 상태', desc: '보유/임대/매각/폐차 등' },
  { group_code: 'CONTRACT_STATUS', label: '계약 상태', desc: '진행중/완료/취소 등' },
  { group_code: 'FUEL_TYPE', label: '연료 유형', desc: '가솔린/디젤/전기/하이브리드 등' },
  { group_code: 'PAYMENT_METHOD', label: '결제 방법', desc: '현금/카드/계좌이체 등' },
  { group_code: 'MAINTENANCE_TYPE', label: '정비 유형', desc: '정기정비/사고수리/소모품 등' },
  { group_code: 'INSURANCE_TYPE', label: '보험 유형', desc: '자차/대인/대물/종합 등' },
]

export default function CommonCodesTab() {
  const supabase = createClientComponentClient()
  const { role } = useApp()

  const [codes, setCodes] = useState<CommonCode[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groups, setGroups] = useState<GroupInfo[]>([])
  const [showGuide, setShowGuide] = useState(true)

  // 새 코드 추가 폼
  const [newGroupCode, setNewGroupCode] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newSortOrder, setNewSortOrder] = useState(0)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showNewGroupForm, setShowNewGroupForm] = useState(false)
  const [customGroupCode, setCustomGroupCode] = useState('')

  // 편집
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editSortOrder, setEditSortOrder] = useState(0)

  const isAdmin = role === 'god_admin' || role === 'master'

  const fetchCodes = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('common_codes')
        .select('*')
        .order('group_code')
        .order('sort_order', { ascending: true })
        .order('name')

      if (error) throw error

      const allCodes = data || []
      setCodes(allCodes)

      // 그룹 통계 계산
      const groupMap = new Map<string, GroupInfo>()
      allCodes.forEach(c => {
        const existing = groupMap.get(c.group_code)
        if (existing) {
          existing.count++
          if (c.is_active) existing.activeCount++
        } else {
          groupMap.set(c.group_code, {
            group_code: c.group_code,
            count: 1,
            activeCount: c.is_active ? 1 : 0,
          })
        }
      })
      setGroups(Array.from(groupMap.values()).sort((a, b) => a.group_code.localeCompare(b.group_code)))

      if (!selectedGroup && allCodes.length > 0) {
        setSelectedGroup(allCodes[0].group_code)
      }
    } catch (error) {
      console.error('코드 로드 실패:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCodes() }, [])

  const filteredCodes = codes.filter(c => c.group_code === selectedGroup)

  const handleAdd = async () => {
    const groupCode = showNewGroupForm ? customGroupCode.toUpperCase().trim() : newGroupCode || selectedGroup
    if (!groupCode || !newCode.trim() || !newName.trim()) {
      alert('그룹코드, 코드, 이름을 모두 입력하세요.')
      return
    }

    try {
      const { data, error } = await supabase
        .from('common_codes')
        .insert([{
          group_code: groupCode,
          code: newCode.trim(),
          name: newName.trim(),
          sort_order: newSortOrder,
          is_active: true,
        }])
        .select()

      if (error) {
        if (error.message.includes('unique') || error.message.includes('duplicate')) {
          alert(`이미 존재하는 코드입니다: ${groupCode} / ${newCode.trim()}`)
        } else {
          throw error
        }
        return
      }

      setNewCode('')
      setNewName('')
      setNewSortOrder(0)
      setShowAddForm(false)
      setShowNewGroupForm(false)
      setCustomGroupCode('')
      if (showNewGroupForm) setSelectedGroup(groupCode)
      fetchCodes()
    } catch (error) {
      console.error('코드 추가 실패:', error)
      alert('코드 추가에 실패했습니다.')
    }
  }

  const handleToggleActive = async (code: CommonCode) => {
    try {
      const { error } = await supabase
        .from('common_codes')
        .update({ is_active: !code.is_active })
        .eq('id', code.id)

      if (error) throw error
      setCodes(codes.map(c => c.id === code.id ? { ...c, is_active: !c.is_active } : c))
      // 그룹 통계도 업데이트
      setGroups(groups.map(g => {
        if (g.group_code === code.group_code) {
          return { ...g, activeCount: g.activeCount + (code.is_active ? -1 : 1) }
        }
        return g
      }))
    } catch (error) {
      console.error('상태 변경 실패:', error)
    }
  }

  const handleStartEdit = (code: CommonCode) => {
    setEditingId(code.id)
    setEditName(code.name)
    setEditSortOrder(code.sort_order)
  }

  const handleSaveEdit = async (code: CommonCode) => {
    if (!editName.trim()) return
    try {
      const { error } = await supabase
        .from('common_codes')
        .update({ name: editName.trim(), sort_order: editSortOrder })
        .eq('id', code.id)

      if (error) throw error
      setCodes(codes.map(c => c.id === code.id ? { ...c, name: editName.trim(), sort_order: editSortOrder } : c))
      setEditingId(null)
    } catch (error) {
      console.error('수정 실패:', error)
    }
  }

  const handleDelete = async (code: CommonCode) => {
    if (!confirm(`"${code.name}" (${code.code}) 코드를 삭제하시겠습니까?`)) return
    try {
      const { error } = await supabase
        .from('common_codes')
        .delete()
        .eq('id', code.id)

      if (error) throw error
      setCodes(codes.filter(c => c.id !== code.id))
      setGroups(groups.map(g => {
        if (g.group_code === code.group_code) {
          return {
            ...g,
            count: g.count - 1,
            activeCount: g.activeCount - (code.is_active ? 1 : 0),
          }
        }
        return g
      }).filter(g => g.count > 0))
    } catch (error) {
      console.error('삭제 실패:', error)
    }
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/3 mx-auto" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto" />
        </div>
        <p className="text-gray-500 text-sm mt-4">공통 코드를 불러오는 중...</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* 가이드 */}
      {showGuide && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🏷️</span>
              <div>
                <h3 className="text-sm font-bold text-blue-900 mb-1">공통 코드 관리</h3>
                <p className="text-xs text-blue-700 leading-relaxed">
                  시스템 전반에서 사용되는 드롭다운 항목, 상태값, 분류 코드를 관리합니다.
                  그룹별로 코드를 정리하고, 각 코드의 활성/비활성 상태를 제어할 수 있습니다.
                  비활성된 코드는 드롭다운 목록에서 제외됩니다.
                </p>
              </div>
            </div>
            <button onClick={() => setShowGuide(false)} className="text-blue-400 hover:text-blue-600 text-xs flex-shrink-0 ml-4">닫기</button>
          </div>
        </div>
      )}

      {/* 메인 레이아웃: 그룹 사이드바 + 코드 목록 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 왼쪽: 그룹 목록 */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900">코드 그룹</h3>
                <span className="text-xs text-gray-400">{groups.length}개 그룹</span>
              </div>
            </div>

            <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
              {groups.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-gray-400 mb-3">등록된 코드 그룹이 없습니다</p>
                  {isAdmin && (
                    <button
                      onClick={() => { setShowAddForm(true); setShowNewGroupForm(true) }}
                      className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                    >
                      + 새 그룹 만들기
                    </button>
                  )}
                </div>
              ) : (
                groups.map(group => (
                  <button
                    key={group.group_code}
                    onClick={() => setSelectedGroup(group.group_code)}
                    className={`w-full text-left p-3 transition-all ${
                      selectedGroup === group.group_code
                        ? 'bg-blue-50 border-l-4 border-blue-500'
                        : 'hover:bg-gray-50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={`text-xs font-bold ${selectedGroup === group.group_code ? 'text-blue-900' : 'text-gray-700'}`}>
                          {group.group_code}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {group.activeCount}/{group.count}개 활성
                        </p>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        selectedGroup === group.group_code
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {group.count}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {isAdmin && groups.length > 0 && (
              <div className="p-3 border-t border-gray-100">
                <button
                  onClick={() => { setShowAddForm(true); setShowNewGroupForm(true); setNewGroupCode('') }}
                  className="w-full px-3 py-2 text-xs font-semibold text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  + 새 그룹 추가
                </button>
              </div>
            )}
          </div>

          {/* 프리셋 그룹 제안 */}
          {isAdmin && groups.length === 0 && (
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 mt-4">
              <h4 className="text-xs font-bold text-amber-800 mb-2">추천 코드 그룹</h4>
              <div className="space-y-2">
                {PRESET_GROUPS.map(preset => (
                  <button
                    key={preset.group_code}
                    onClick={() => {
                      setShowAddForm(true)
                      setShowNewGroupForm(false)
                      setNewGroupCode(preset.group_code)
                      setSelectedGroup(preset.group_code)
                    }}
                    className="w-full text-left p-2 rounded-lg bg-white border border-amber-200 hover:border-amber-400 transition-colors"
                  >
                    <p className="text-xs font-bold text-amber-900">{preset.group_code}</p>
                    <p className="text-[10px] text-amber-600">{preset.label} — {preset.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 오른쪽: 코드 목록 + CRUD */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    {selectedGroup || '그룹을 선택하세요'}
                  </h3>
                  {selectedGroup && (
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {filteredCodes.length}개 코드 | {filteredCodes.filter(c => c.is_active).length}개 활성
                    </p>
                  )}
                </div>
                {isAdmin && selectedGroup && (
                  <button
                    onClick={() => { setShowAddForm(true); setShowNewGroupForm(false); setNewGroupCode(selectedGroup) }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    + 코드 추가
                  </button>
                )}
              </div>
            </div>

            {/* 추가 폼 */}
            {showAddForm && isAdmin && (
              <div className="p-4 bg-blue-50 border-b border-blue-100">
                <div className="space-y-3">
                  {showNewGroupForm && (
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-1">새 그룹 코드</label>
                      <input
                        type="text"
                        value={customGroupCode}
                        onChange={e => setCustomGroupCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ''))}
                        placeholder="예: VEHICLE_COLOR"
                        className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white"
                      />
                      <p className="text-[10px] text-gray-400 mt-1">영문 대문자, 숫자, 밑줄(_)만 사용 가능</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-1">코드</label>
                      <input
                        type="text"
                        value={newCode}
                        onChange={e => setNewCode(e.target.value)}
                        placeholder="예: ACTIVE"
                        className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-1">이름(표시값)</label>
                      <input
                        type="text"
                        value={newName}
                        onChange={e => setNewName(e.target.value)}
                        placeholder="예: 활성"
                        className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-600 block mb-1">정렬순서</label>
                      <input
                        type="number"
                        value={newSortOrder}
                        onChange={e => setNewSortOrder(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-400 bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleAdd}
                      className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      추가
                    </button>
                    <button
                      onClick={() => { setShowAddForm(false); setShowNewGroupForm(false) }}
                      className="px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 코드 테이블 */}
            {!selectedGroup ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-sm text-gray-500">왼쪽에서 코드 그룹을 선택하세요</p>
              </div>
            ) : filteredCodes.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">📭</div>
                <p className="text-sm text-gray-500 mb-2">이 그룹에 등록된 코드가 없습니다</p>
                {isAdmin && (
                  <button
                    onClick={() => { setShowAddForm(true); setShowNewGroupForm(false); setNewGroupCode(selectedGroup) }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700"
                  >
                    + 첫 코드 추가
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="text-left px-4 py-2.5 font-bold text-gray-500 w-12">순서</th>
                      <th className="text-left px-4 py-2.5 font-bold text-gray-500">코드</th>
                      <th className="text-left px-4 py-2.5 font-bold text-gray-500">이름</th>
                      <th className="text-center px-4 py-2.5 font-bold text-gray-500 w-16">상태</th>
                      {isAdmin && <th className="text-center px-4 py-2.5 font-bold text-gray-500 w-24">관리</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredCodes.map(code => (
                      <tr key={code.id} className={`hover:bg-gray-50 transition-colors ${!code.is_active ? 'opacity-50' : ''}`}>
                        <td className="px-4 py-2.5">
                          {editingId === code.id ? (
                            <input
                              type="number"
                              value={editSortOrder}
                              onChange={e => setEditSortOrder(parseInt(e.target.value) || 0)}
                              className="w-12 px-1 py-0.5 text-xs border rounded"
                              autoFocus
                            />
                          ) : (
                            <span className="text-gray-400">{code.sort_order}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <code className="px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono text-gray-700">
                            {code.code}
                          </code>
                        </td>
                        <td className="px-4 py-2.5">
                          {editingId === code.id ? (
                            <input
                              type="text"
                              value={editName}
                              onChange={e => setEditName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleSaveEdit(code)}
                              className="w-full px-2 py-0.5 text-xs border rounded"
                            />
                          ) : (
                            <span className="text-gray-800 font-medium">{code.name}</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {isAdmin ? (
                            <button
                              onClick={() => handleToggleActive(code)}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                                code.is_active
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                  : 'bg-red-100 text-red-600 hover:bg-red-200'
                              }`}
                            >
                              {code.is_active ? '활성' : '비활성'}
                            </button>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              code.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                            }`}>
                              {code.is_active ? '활성' : '비활성'}
                            </span>
                          )}
                        </td>
                        {isAdmin && (
                          <td className="px-4 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {editingId === code.id ? (
                                <>
                                  <button
                                    onClick={() => handleSaveEdit(code)}
                                    className="px-2 py-0.5 bg-green-600 text-white rounded text-[10px] font-bold hover:bg-green-700"
                                  >
                                    저장
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="px-2 py-0.5 border border-gray-200 text-gray-500 rounded text-[10px] hover:bg-gray-50"
                                  >
                                    취소
                                  </button>
                                </>
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleStartEdit(code)}
                                    className="px-2 py-0.5 border border-gray-200 text-gray-500 rounded text-[10px] hover:bg-gray-50"
                                  >
                                    편집
                                  </button>
                                  <button
                                    onClick={() => handleDelete(code)}
                                    className="px-2 py-0.5 border border-red-200 text-red-500 rounded text-[10px] hover:bg-red-50"
                                  >
                                    삭제
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 통계 카드 */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <p className="text-2xl font-black text-gray-900">{groups.length}</p>
              <p className="text-[10px] text-gray-400 mt-1">코드 그룹</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <p className="text-2xl font-black text-green-600">{codes.filter(c => c.is_active).length}</p>
              <p className="text-[10px] text-gray-400 mt-1">활성 코드</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-3 text-center">
              <p className="text-2xl font-black text-red-500">{codes.filter(c => !c.is_active).length}</p>
              <p className="text-[10px] text-gray-400 mt-1">비활성 코드</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
