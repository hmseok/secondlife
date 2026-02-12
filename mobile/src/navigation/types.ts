// ============================================
// 네비게이션 타입 정의
// ============================================

export type RootStackParamList = {
  Auth: undefined
  Main: undefined
}

export type AuthStackParamList = {
  Login: undefined
  SignupAdmin: undefined
  SignupFounder: undefined
  SignupEmployee: undefined
}

export type MainTabParamList = {
  Dashboard: undefined
  Cars: undefined
  Quotes: undefined
  Finance: undefined
  More: undefined
}

export type DetailStackParamList = {
  MainTabs: undefined
  CarDetail: { id: number }
  InsuranceList: undefined
  InsuranceDetail: { id: number }
  QuoteDetail: { id: number }
  LoanDetail: { id: number }
  CustomerDetail: { id: number }
  Settings: undefined
}
