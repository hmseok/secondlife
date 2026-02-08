'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../utils/supabase'
import { useApp } from '../../context/AppContext'
import type { Position, Department } from '../../types/rbac'

// ============================================
// 직원 관리 페이지
// master/god_admin만 접근 가능
// ============================================

export default function EmployeesPage() {
  const { company, role } = useApp()

  const [employees, setEmployees] = useState<any[]>([])
  const [positions, setPositions] = useState<Position[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<any>({})

  // 탭: employees | positions | departments
  const [activeTab, setActiveTab] = useState<'employees' | 'positions' | 'departments'>('employees')

  // 직급/부서 추가 폼
  const [newPositionName, setNewPositionName] = useState('')
  const [newPositionLevel, setNewPositionLevel] = useState(4)
  const [newDeptName, setNewDeptName] = useState('')

  // god_admin 전용: 회사 선택
  const [allCompanies, setAllCompanies] = useState<any[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')

  // 실제 사용할 company_id (god_admin은 선택한 회사, master는 자기 회사)
  const activeCompanyId = role === 'god_admin' ? selectedCompanyId : company?.id

  useEffect(() => {
    const init = async () => {
      if (role === 'god_admin') {
        // god_admin: 전체 회사 목록 로드
        const { data } = await supabase.from('companies').select('*').order('name')
        setAllCompanies(data || [])
        if (data && data.length > 0) {
          setSelectedCompanyId(data[0].id)
        } else {
          setLoading(false)
        }
      } else if (company) {
        loadAll()
      }
    }
    init()
  }, [company, role])

  // god_admin: 회사 선택 변경 시 데이터 재로드
  useEffect(() => {
    if (role === 'god_admin' && selectedCompanyId) {
      loadAll()
    }
  }, [selectedCompanyId])

  const loadAll = async () => {
    setLoading(true)
    await Promise.all([loadEmployees(), loadPositions(), loadDepartments()])
    setLoading(false)
  }

  const loadEmployees = async () => {
    if (!activeCompanyId) return
    const query = role === 'god_admin'
      ? supabase.from('profiles').select('*, companies(*), position:positions(*), department:departments(*)').eq('company_id', activeCompanyId).order('created_at', { ascending: false })
      : supabase.from('profiles').select('*, companies(*), position:positions(*), department:departments(*)').eq('company_id', activeCompanyId).order('created_at', { ascending: false })

    const { data } = await query
    setEmployees(data || [])
  }

  const loadPositions = async () => {
    if (!activeCompanyId) return
    const { data } = await supabase
      .from('positions')
      .select('*')
      .eq('company_id', activeCompanyId)
      .order('level')
    setPositions(data || [])
  }

  const loadDepartments = async () => {
    if (!activeCompanyId) return
    const { data } = await supabase
      .from('departments')
      .select('*')
      .eq('company_id', activeCompanyId)
      .order('name')
    setDepartments(data || [])
  }

  // 직원 직급/부서 수정
  const startEdit = (emp: any) => {
    setEditingId(emp.id)
    setEditForm({
      employee_name: emp.employee_name || '',
      phone: emp.phone || '',
      position_id: emp.position_id || '',
      department_id: emp.department_id || '',
      role: emp.role || 'user',
      is_active: emp.is_active !== false,
    })
  }

  const saveEdit = async () => {
    if (!editingId) return

    // 보안: role 상승 방지
    if (role === 'master' && editForm.role === 'god_admin') {
      alert('god_admin 권한은 부여할 수 없습니다.')
      return
    }
    if (role !== 'god_admin' && role !== 'master') {
      alert('직원 정보를 수정할 권한이 없습니다.')
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update(editForm)
      .eq('id', editingId)

    if (error) {
      alert('저장 실패: ' + error.message)
    } else {
      setEditingId(null)
      loadEmployees()
    }
  }

  // 직급 추가
  const addPosition = async () => {
    if (!newPositionName.trim() || !activeCompanyId) return
    const { error } = await supabase.from('positions').insert({
      company_id: activeCompanyId,
      name: newPositionName.trim(),
      level: newPositionLevel,
    })
    if (error) {
      alert('직급 추가 실패: ' + error.message)
    } else {
      setNewPositionName('')
      setNewPositionLevel(4)
      loadPositions()
    }
  }

  const deletePosition = async (id: string) => {
    if (!confirm('이 직급을 삭제하시겠습니까? 해당 직급의 직원은 직급이 해제됩니다.')) return
    await supabase.from('positions').delete().eq('id', id)
    loadPositions()
  }

  // 부서 추가
  const addDepartment = async () => {
    if (!newDeptName.trim() || !activeCompanyId) return
    const { error } = await supabase.from('departments').insert({
      company_id: activeCompanyId,
      name: newDeptName.trim(),
    })
    if (error) {
      alert('부서 추가 실패: ' + error.message)
    } else {
      setNewDeptName('')
      loadDepartments()
    }
  }

  const deleteDepartment = async (id: string) => {
    if (!confirm('이 부서를 삭제하시겠습니까?')) return
    await supabase.from('departments').delete().eq('id', id)
    loadDepartments()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin text-4xl">&#9203;</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">조직 관리</h1>
            <p className="text-slate-500 mt-1">직원, 직급, 부서를 관리합니다.</p>
          </div>
          {/* god_admin: 회사 선택 */}
          {role === 'god_admin' && allCompanies.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-sm font-bold text-slate-500">회사 선택:</label>
              <select
                value={selectedCompanyId}
                onChange={e => setSelectedCompanyId(e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm font-bold bg-white min-w-[200px]"
              >
                {allCompanies.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 탭 */}
        <div className="flex gap-2 mb-6">
          {(['employees', 'positions', 'departments'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab
                  ? 'bg-slate-900 text-white shadow-lg'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              {tab === 'employees' ? '직원 목록' : tab === 'positions' ? '직급 관리' : '부서 관리'}
            </button>
          ))}
        </div>

        {/* ===== 직원 목록 탭 ===== */}
        {activeTab === 'employees' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold">직원 목록</h2>
              <p className="text-sm text-slate-400 mt-1">총 {employees.length}명</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">이름/이메일</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">역할</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">직급</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">부서</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">상태</th>
                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      {editingId === emp.id ? (
                        <>
                          <td className="p-4">
                            <input value={editForm.employee_name} onChange={e => setEditForm({...editForm, employee_name: e.target.value})} className="border rounded px-2 py-1 text-sm w-full" placeholder="이름" />
                            <div className="text-xs text-slate-400 mt-1">{emp.id.slice(0,8)}...</div>
                          </td>
                          <td className="p-4">
                            <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})} className="border rounded px-2 py-1 text-sm">
                              <option value="user">user</option>
                              <option value="master">master</option>
                              {role === 'god_admin' && <option value="god_admin">god_admin</option>}
                            </select>
                          </td>
                          <td className="p-4">
                            <select value={editForm.position_id} onChange={e => setEditForm({...editForm, position_id: e.target.value || null})} className="border rounded px-2 py-1 text-sm">
                              <option value="">미지정</option>
                              {positions.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                          </td>
                          <td className="p-4">
                            <select value={editForm.department_id} onChange={e => setEditForm({...editForm, department_id: e.target.value || null})} className="border rounded px-2 py-1 text-sm">
                              <option value="">미지정</option>
                              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                          </td>
                          <td className="p-4">
                            <label className="flex items-center gap-2 text-sm">
                              <input type="checkbox" checked={editForm.is_active} onChange={e => setEditForm({...editForm, is_active: e.target.checked})} />
                              활성
                            </label>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <button onClick={saveEdit} className="text-sm font-bold text-blue-600 hover:underline">저장</button>
                            <button onClick={() => setEditingId(null)} className="text-sm font-bold text-slate-400 hover:underline">취소</button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{emp.employee_name || '(이름 미설정)'}</div>
                            <div className="text-xs text-slate-400 mt-0.5">{emp.id.slice(0,8)}...</div>
                          </td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                              emp.role === 'god_admin' ? 'bg-purple-100 text-purple-700' :
                              emp.role === 'master' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>{emp.role}</span>
                          </td>
                          <td className="p-4 text-sm text-slate-600">{emp.position?.name || '-'}</td>
                          <td className="p-4 text-sm text-slate-600">{emp.department?.name || '-'}</td>
                          <td className="p-4">
                            <span className={`text-xs font-bold px-2 py-1 rounded ${emp.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {emp.is_active !== false ? '활성' : '비활성'}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <button onClick={() => startEdit(emp)} className="text-sm font-bold text-blue-600 hover:underline">수정</button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== 직급 관리 탭 ===== */}
        {activeTab === 'positions' && (
          <div className="space-y-6">
            {/* 추가 폼 */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold mb-4">직급 추가</h2>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 block mb-1">직급명</label>
                  <input value={newPositionName} onChange={e => setNewPositionName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="예: 과장, 차장" />
                </div>
                <div className="w-32">
                  <label className="text-xs font-bold text-slate-500 block mb-1">레벨 (1=최상위)</label>
                  <input type="number" min={1} max={10} value={newPositionLevel} onChange={e => setNewPositionLevel(Number(e.target.value))} className="w-full border rounded-lg px-3 py-2 text-sm" />
                </div>
                <button onClick={addPosition} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800">추가</button>
              </div>
            </div>

            {/* 직급 목록 */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-xs font-bold text-slate-500">레벨</th>
                    <th className="p-4 text-xs font-bold text-slate-500">직급명</th>
                    <th className="p-4 text-xs font-bold text-slate-500">설명</th>
                    <th className="p-4 text-xs font-bold text-slate-500 text-right">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {positions.map(pos => (
                    <tr key={pos.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="p-4">
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded">Lv.{pos.level}</span>
                      </td>
                      <td className="p-4 font-bold text-slate-900">{pos.name}</td>
                      <td className="p-4 text-sm text-slate-500">{pos.description || '-'}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => deletePosition(pos.id)} className="text-sm font-bold text-red-500 hover:underline">삭제</button>
                      </td>
                    </tr>
                  ))}
                  {positions.length === 0 && (
                    <tr><td colSpan={4} className="p-8 text-center text-slate-400">직급이 없습니다. 위에서 추가해주세요.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===== 부서 관리 탭 ===== */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold mb-4">부서 추가</h2>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label className="text-xs font-bold text-slate-500 block mb-1">부서명</label>
                  <input value={newDeptName} onChange={e => setNewDeptName(e.target.value)} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="예: 재무팀, 인사팀" />
                </div>
                <button onClick={addDepartment} className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800">추가</button>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="p-4 text-xs font-bold text-slate-500">부서명</th>
                    <th className="p-4 text-xs font-bold text-slate-500">설명</th>
                    <th className="p-4 text-xs font-bold text-slate-500 text-right">액션</th>
                  </tr>
                </thead>
                <tbody>
                  {departments.map(dept => (
                    <tr key={dept.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="p-4 font-bold text-slate-900">{dept.name}</td>
                      <td className="p-4 text-sm text-slate-500">{dept.description || '-'}</td>
                      <td className="p-4 text-right">
                        <button onClick={() => deleteDepartment(dept.id)} className="text-sm font-bold text-red-500 hover:underline">삭제</button>
                      </td>
                    </tr>
                  ))}
                  {departments.length === 0 && (
                    <tr><td colSpan={3} className="p-8 text-center text-slate-400">부서가 없습니다. 위에서 추가해주세요.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
