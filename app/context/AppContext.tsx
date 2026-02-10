'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../utils/supabase'
import type { Profile, PagePermission, Position, Department } from '../types/rbac'

// ============================================
// AppContext - 전역 상태 (사용자 + 권한)
// ============================================

type AppContextType = {
  user: any
  profile: Profile | null
  company: any
  role: string
  position: Position | null
  department: Department | null
  permissions: PagePermission[]
  loading: boolean
  refreshAuth: () => Promise<void>     // 외부에서 새로고침 호출용
  // god_admin 회사 선택 기능
  allCompanies: any[]
  adminSelectedCompanyId: string | null  // null = 전체, string = 특정 회사
  setAdminSelectedCompanyId: (id: string | null) => void
  // 사이드바 메뉴 새로고침 트리거
  menuRefreshKey: number
  triggerMenuRefresh: () => void
}

const AppContext = createContext<AppContextType>({
  user: null,
  profile: null,
  company: null,
  role: '',
  position: null,
  department: null,
  permissions: [],
  loading: true,
  refreshAuth: async () => {},
  allCompanies: [],
  adminSelectedCompanyId: null,
  setAdminSelectedCompanyId: () => {},
  menuRefreshKey: 0,
  triggerMenuRefresh: () => {},
})

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<any>(null)
  const [role, setRole] = useState('')
  const [position, setPosition] = useState<Position | null>(null)
  const [department, setDepartment] = useState<Department | null>(null)
  const [permissions, setPermissions] = useState<PagePermission[]>([])
  const [loading, setLoading] = useState(true)

  // god_admin 회사 선택 상태
  const [allCompanies, setAllCompanies] = useState<any[]>([])
  const [adminSelectedCompanyId, setAdminSelectedCompanyId] = useState<string | null>(null)

  // 사이드바 메뉴 새로고침 키
  const [menuRefreshKey, setMenuRefreshKey] = useState(0)
  const triggerMenuRefresh = () => setMenuRefreshKey(prev => prev + 1)

  // ★ 무한루프 방지용 ref
  const isFetchingRef = useRef(false)

  // 세션 없을 때 상태 초기화
  const clearState = () => {
    setUser(null)
    setProfile(null)
    setCompany(null)
    setRole('')
    setPosition(null)
    setDepartment(null)
    setPermissions([])
    setAllCompanies([])
    setAdminSelectedCompanyId(null)
  }

  // ★ 프로필 데이터만 로드 (getSession 호출 없음 → 무한루프 원천 차단)
  const loadUserData = async (authUser: any) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      setUser(authUser)

      // 프로필 + 직급 + 부서 + 회사 한 번에 로드
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          companies(*),
          position:positions(*),
          department:departments(*)
        `)
        .eq('id', authUser.id)
        .maybeSingle()

      if (profileError) {
        console.error('❌ 프로필 로드 에러:', profileError.message)
      }

      if (profileData) {
        console.log('✅ AppContext 로드:', profileData.role, profileData.position?.name)
        setProfile(profileData as Profile)
        setRole(profileData.role || 'user')
        setCompany(profileData.companies)
        setPosition(profileData.position || null)
        setDepartment(profileData.department || null)

        // 페이지 권한 로드 (직급이 있는 경우만)
        if (profileData.position_id && profileData.company_id) {
          const { data: permsData } = await supabase
            .from('page_permissions')
            .select('*')
            .eq('company_id', profileData.company_id)
            .eq('position_id', profileData.position_id)
          setPermissions(permsData || [])
        }

        // god_admin: 전체 회사 목록 로드
        if (profileData.role === 'god_admin') {
          const { data: companiesData } = await supabase
            .from('companies')
            .select('id, name, plan, is_active')
            .eq('is_active', true)
            .order('name')
          setAllCompanies(companiesData || [])
        }
      } else {
        setRole('user')
      }
    } catch (error: any) {
      console.error('AppContext 로딩 에러:', error)
    } finally {
      setLoading(false)
      isFetchingRef.current = false
    }
  }

  // ★ 초기 로드 전용 (getSession은 여기서만 1번 호출)
  const fetchSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error || !session) {
        clearState()
        setLoading(false)
        return
      }
      await loadUserData(session.user)
    } catch (error: any) {
      console.error('초기 세션 로드 에러:', error)
      clearState()
      setLoading(false)
    }
  }

  useEffect(() => {
    // 초기 세션 로드 (getSession 1회만 호출)
    fetchSession()

    // ★ Auth 이벤트 감지 — 콜백의 session을 직접 사용 (getSession 재호출 안 함)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth 상태 변경:', event)

        if (event === 'SIGNED_OUT') {
          clearState()
          setLoading(false)
        } else if (event === 'SIGNED_IN' && session?.user) {
          // ★ 핵심: getSession()을 다시 호출하지 않고 콜백의 session.user 사용
          loadUserData(session.user)
        }
        // INITIAL_SESSION, TOKEN_REFRESHED → 무시 (불필요한 재로드 방지)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AppContext.Provider value={{
      user,
      profile,
      company,
      role,
      position,
      department,
      permissions,
      loading,
      refreshAuth: fetchSession,
      allCompanies,
      adminSelectedCompanyId,
      setAdminSelectedCompanyId,
      menuRefreshKey,
      triggerMenuRefresh,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
