// ============================================
// 타입 정의 (웹과 공유)
// ============================================

export interface Position {
  id: string
  company_id: string
  name: string
  level: number
  description?: string
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  company_id: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

export interface Company {
  id: string
  name: string
  business_number?: string
  plan: string
  owner_id: string
  is_active: boolean
  created_at: string
}

export interface Profile {
  id: string
  email?: string
  company_id: string
  role: 'god_admin' | 'master' | 'user'
  is_super_admin: boolean
  position_id?: string
  department_id?: string
  employee_name?: string
  phone?: string
  is_active: boolean
  avatar_url?: string
  created_at?: string
  position?: Position
  department?: Department
  companies?: Company
}

export interface PagePermission {
  id: string
  company_id: string
  position_id: string
  page_path: string
  can_view: boolean
  can_create: boolean
  can_edit: boolean
  can_delete: boolean
  data_scope: 'all' | 'department' | 'own'
  created_at: string
  updated_at: string
}

export interface Car {
  id: number
  created_at?: string
  company_id?: string
  number: string
  vin?: string
  brand: string
  model: string
  trim?: string
  year?: number
  fuel?: string
  status: 'available' | 'rented' | 'maintenance' | 'sold'
  location?: string
  mileage?: number
  image_url?: string
  purchase_price: number
  acq_date?: string
  owner_id?: string
}

export interface InsuranceContract {
  id: number
  company_id?: string
  car_id?: number
  insurance_company?: string
  policy_number?: string
  start_date?: string
  end_date?: string
  premium?: number
  coverage_type?: string
  status?: string
  created_at?: string
  cars?: Car
}

export interface Quote {
  id: number
  company_id?: string
  customer_name?: string
  car_id?: number
  start_date?: string
  end_date?: string
  monthly_cost?: number
  status?: string
  created_at?: string
  cars?: Car
}

export interface Customer {
  id: number
  company_id?: string
  name: string
  phone?: string
  type?: '개인' | '법인' | '외국인'
  memo?: string
  created_at?: string
}

export interface Transaction {
  id: number
  company_id?: string
  transaction_date: string
  type: string
  client_name: string
  description: string
  amount: number
  payment_method: string
  category: string
  related_id?: string
  related_type?: string
  status: string
  created_at?: string
}

export interface Loan {
  id: number
  company_id?: string
  car_id?: number
  bank_name?: string
  loan_amount?: number
  interest_rate?: number
  monthly_payment?: number
  start_date?: string
  end_date?: string
  status?: string
  created_at?: string
  cars?: Car
}

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete'
export type DataScope = 'all' | 'department' | 'own'
