'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../utils/supabase'

type AppContextType = {
  user: any
  company: any
  role: string
  loading: boolean
}

const AppContext = createContext<AppContextType>({
  user: null,
  company: null,
  role: '',
  loading: true,
})

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSession = async () => {
      try {
        // 1. 세션 확인
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          setLoading(false)
          return
        }
        setUser(session.user)

        // 2. [핵심 수정] company_members(X) -> profiles(O)
        // 기존 코드가 여기서 에러를 내고 있었습니다!
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, companies(*)')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profile) {
          console.log('✅ AppContext 로드 성공:', profile.role)
          setRole(profile.role || 'user')
          setCompany(profile.companies)
        } else {
          setRole('user')
        }

      } catch (error) {
        console.error('Context 로딩 에러:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSession()
  }, [])

  return (
    <AppContext.Provider value={{ user, company, role, loading }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)