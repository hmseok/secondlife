import { supabase } from './supabase'

// ============================================
// 인증 헬퍼 함수
// ============================================

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signUpAdmin(
  email: string, password: string, inviteCode: string, name: string
) {
  const { data: codeData, error: codeError } = await supabase
    .from('admin_invite_codes')
    .select('*')
    .eq('code', inviteCode)
    .eq('is_used', false)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (codeError || !codeData) throw new Error('유효하지 않은 초대코드입니다.')

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email, password,
    options: { data: { employee_name: name, role: 'god_admin', invite_code_id: codeData.id } },
  })
  if (authError) throw authError

  await supabase
    .from('admin_invite_codes')
    .update({ is_used: true, used_by: authData.user?.id, used_at: new Date().toISOString() })
    .eq('id', codeData.id)

  return authData
}

export async function signUpFounder(
  email: string, password: string, name: string,
  companyName: string, businessNumber?: string
) {
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { employee_name: name, role: 'master', company_name: companyName, business_number: businessNumber } },
  })
  if (error) throw error
  return data
}

export async function signUpEmployee(
  email: string, password: string, name: string, companyCode: string
) {
  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('invite_code', companyCode)
    .eq('is_active', true)
    .maybeSingle()

  if (companyError || !companyData) throw new Error('유효하지 않은 회사 코드입니다.')

  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { employee_name: name, role: 'user', company_id: companyData.id } },
  })
  if (error) throw error
  return data
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  if (error) throw error
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
