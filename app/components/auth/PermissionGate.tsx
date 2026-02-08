'use client'

import { usePermission } from '../../hooks/usePermission'
import type { PermissionAction } from '../../types/rbac'

// ============================================
// PermissionGate - 컴포넌트 단위 권한 제어
// ============================================
// 사용법:
//   <PermissionGate page="/cars" action="delete">
//     <button>삭제</button>  ← 권한 없으면 안 보임
//   </PermissionGate>
//
//   <PermissionGate page="/cars" action="edit" fallback={<span>수정 권한 없음</span>}>
//     <button>수정</button>
//   </PermissionGate>

interface PermissionGateProps {
  page: string                       // 페이지 경로 (예: '/cars')
  action: PermissionAction           // 'view' | 'create' | 'edit' | 'delete'
  fallback?: React.ReactNode         // 권한 없을 때 보여줄 내용 (기본: 아무것도 안 보임)
  children: React.ReactNode          // 권한 있을 때 보여줄 내용
}

export default function PermissionGate({
  page,
  action,
  fallback = null,
  children,
}: PermissionGateProps) {
  const { checkPermission } = usePermission()

  // 권한 확인
  const allowed = checkPermission(page, action)

  // 권한 있으면 children 표시, 없으면 fallback 표시
  return <>{allowed ? children : fallback}</>
}
