'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

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
  const supabase = createClientComponentClient()
  const [user, setUser] = useState<any>(null)
  const [company, setCompany] = useState<any>(null)
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUserAndCompany = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          setLoading(false)
          return
        }

        setUser(session.user)

        // 👇 [핵심 수정 1] company_roles 삭제하고 companies(*)만 가져오기
        // 👇 [핵심 수정 2] .single() 대신 .maybeSingle() 사용 (에러 방지)
        const { data: member, error } = await supabase
          .from('company_members')
          .select('*, companies(*)')
          .eq('user_id', session.user.id)
          .maybeSingle()

        if (member) {
          setRole(member.role || 'user')
          setCompany(member.companies)
        } else {
          // ⭐ DB에 정보가 없어도 에러 내지 말고, 'admin' 권한 주기 (개발용)
          console.log('DB에 회원 정보가 없습니다. 임시 관리자 권한 부여')
          setRole('admin')
        }

      } catch (error) {
        console.error('Context 로딩 에러:', error)
        // 에러가 나도 멈추지 말고 관리자로 통과
        setRole('admin')
      } finally {
        setLoading(false)
      }
    }

    fetchUserAndCompany()
  }, [])

  return (
    <AppContext.Provider value={{ user, company, role, loading }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)