import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import type { Profile, Company, Position, Department, PagePermission } from '../lib/types'

// ============================================
// AppContext - 전역 상태 (웹과 동일 구조)
// ============================================

type AppContextType = {
  user: any
  profile: Profile | null
  company: Company | null
  role: string
  position: Position | null
  department: Department | null
  permissions: PagePermission[]
  loading: boolean
  refreshAuth: () => Promise<void>
  allCompanies: Company[]
  adminSelectedCompanyId: string | null
  setAdminSelectedCompanyId: (id: string | null) => void
  signOut: () => Promise<void>
}

const AppContext = createContext<AppContextType>({
  user: null, profile: null, company: null, role: '',
  position: null, department: null, permissions: [], loading: true,
  refreshAuth: async () => {}, allCompanies: [],
  adminSelectedCompanyId: null, setAdminSelectedCompanyId: () => {},
  signOut: async () => {},
})

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [role, setRole] = useState('')
  const [position, setPosition] = useState<Position | null>(null)
  const [department, setDepartment] = useState<Department | null>(null)
  const [permissions, setPermissions] = useState<PagePermission[]>([])
  const [loading, setLoading] = useState(true)
  const [allCompanies, setAllCompanies] = useState<Company[]>([])
  const [adminSelectedCompanyId, setAdminSelectedCompanyId] = useState<string | null>(null)

  const isLoadedRef = useRef(false)
  const isFetchingRef = useRef(false)

  const clearState = () => {
    setUser(null); setProfile(null); setCompany(null); setRole('')
    setPosition(null); setDepartment(null); setPermissions([])
    setAllCompanies([]); setAdminSelectedCompanyId(null)
  }

  const loadUserData = async (authUser: any) => {
    if (isFetchingRef.current) return
    isFetchingRef.current = true
    try {
      setUser(authUser)
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('*, companies(*), position:positions(*), department:departments(*)')
        .eq('id', authUser.id)
        .maybeSingle()

      if (error) console.error('프로필 로드 에러:', error.message)

      if (profileData) {
        setProfile(profileData as Profile)
        setRole(profileData.role || 'user')
        setCompany(profileData.companies || null)
        setPosition(profileData.position || null)
        setDepartment(profileData.department || null)

        if (profileData.position_id && profileData.company_id) {
          const { data: perms } = await supabase
            .from('page_permissions').select('*')
            .eq('company_id', profileData.company_id)
            .eq('position_id', profileData.position_id)
          setPermissions(perms || [])
        }
        if (profileData.role === 'god_admin') {
          const { data: comps } = await supabase
            .from('companies').select('id, name, plan, is_active, owner_id, created_at')
            .eq('is_active', true).order('name')
          setAllCompanies((comps as Company[]) || [])
        }
      } else {
        setRole('user')
      }
      isLoadedRef.current = true
    } catch (e: any) {
      console.error('AppContext 에러:', e)
    } finally {
      setLoading(false); isFetchingRef.current = false
    }
  }

  const refreshAuth = async () => {
    isLoadedRef.current = false; isFetchingRef.current = false
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) await loadUserData(session.user)
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    isLoadedRef.current = false; isFetchingRef.current = false
    clearState()
  }

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        isLoadedRef.current = false; isFetchingRef.current = false
        clearState(); setLoading(false); return
      }
      if (isLoadedRef.current) return
      if ((event === 'INITIAL_SESSION' || event === 'SIGNED_IN') && session?.user) {
        loadUserData(session.user)
      } else if (event === 'INITIAL_SESSION' && !session) {
        clearState(); setLoading(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <AppContext.Provider value={{
      user, profile, company, role, position, department, permissions,
      loading, refreshAuth, allCompanies, adminSelectedCompanyId,
      setAdminSelectedCompanyId, signOut: handleSignOut,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
