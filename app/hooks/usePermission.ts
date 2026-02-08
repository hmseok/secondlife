'use client'

import { useApp } from '../context/AppContext'
import type { PermissionAction, DataScope } from '../types/rbac'

// ============================================
// usePermission - 권한 체크 Hook
// ============================================
// 사용법:
//   const { canView, canCreate, canEdit, canDelete, getDataScope } = usePermission('/cars')
//   if (canView) { ... }  // 차량 조회 가능?
//   if (canCreate) { ... } // 차량 생성 가능?

export function usePermission(pagePath?: string) {
  const { role, permissions, profile } = useApp()

  // god_admin은 항상 모든 권한
  const isGodAdmin = role === 'god_admin'

  // 특정 페이지의 특정 액션 권한 확인
  const checkPermission = (page: string, action: PermissionAction): boolean => {
    // god_admin = 무조건 허용
    if (isGodAdmin) return true

    // master(대표) = role 기반으로 전체 허용
    if (role === 'master') return true

    // 일반 유저 = page_permissions 테이블 기반
    const perm = permissions.find(p => p.page_path === page)
    if (!perm) return false

    switch (action) {
      case 'view': return perm.can_view
      case 'create': return perm.can_create
      case 'edit': return perm.can_edit
      case 'delete': return perm.can_delete
      default: return false
    }
  }

  // 데이터 범위 확인 (all / department / own)
  const getDataScope = (page?: string): DataScope => {
    if (isGodAdmin || role === 'master') return 'all'

    const targetPage = page || pagePath
    if (!targetPage) return 'own'

    const perm = permissions.find(p => p.page_path === targetPage)
    return (perm?.data_scope as DataScope) || 'own'
  }

  // pagePath가 지정된 경우 편의 속성 제공
  const canView = pagePath ? checkPermission(pagePath, 'view') : false
  const canCreate = pagePath ? checkPermission(pagePath, 'create') : false
  const canEdit = pagePath ? checkPermission(pagePath, 'edit') : false
  const canDelete = pagePath ? checkPermission(pagePath, 'delete') : false

  // 특정 페이지에 view 권한이 있는지 (메뉴 표시용)
  const hasPageAccess = (page: string): boolean => {
    return checkPermission(page, 'view')
  }

  return {
    // 현재 페이지 권한 (pagePath 지정 시)
    canView,
    canCreate,
    canEdit,
    canDelete,

    // 범용 체크 함수
    checkPermission,
    hasPageAccess,
    getDataScope,
    isGodAdmin,
  }
}
