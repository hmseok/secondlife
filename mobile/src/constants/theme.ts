// ============================================
// Steel 컬러 팔레트 (웹과 동일)
// ============================================

export const Colors = {
  steel: {
    50: '#f8fafc', 100: '#f1f5f9', 200: '#e2e8f0', 300: '#cbd5e1',
    400: '#94a3b8', 500: '#64748b', 600: '#475569', 700: '#334155',
    800: '#1e293b', 900: '#0f172a',
  },
  plan: { free: '#94a3b8', basic: '#22c55e', pro: '#3b82f6', max: '#eab308' },
  status: { available: '#22c55e', rented: '#3b82f6', maintenance: '#f59e0b', sold: '#ef4444' },
  white: '#ffffff',
  black: '#000000',
  primary: '#475569',
  primaryDark: '#334155',
  background: '#f8fafc',
  card: '#ffffff',
  border: '#e2e8f0',
  text: '#0f172a',
  textSecondary: '#64748b',
  textMuted: '#94a3b8',
  danger: '#ef4444',
  success: '#22c55e',
  warning: '#f59e0b',
  info: '#3b82f6',
} as const

export const Spacing = {
  xs: 4, sm: 8, md: 12, lg: 16, xl: 20, '2xl': 24, '3xl': 32, '4xl': 40,
} as const

export const FontSize = {
  xs: 10, sm: 12, base: 14, lg: 16, xl: 18, '2xl': 22, '3xl': 26, '4xl': 32,
} as const

export const BorderRadius = {
  sm: 6, md: 8, lg: 12, xl: 16, '2xl': 20, full: 9999,
} as const
