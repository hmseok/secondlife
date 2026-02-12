import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/theme'

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'plan'

const vc: Record<string, { bg: string; text: string }> = {
  default: { bg: Colors.steel[100], text: Colors.steel[600] },
  success: { bg: '#dcfce7', text: '#166534' },
  warning: { bg: '#fef3c7', text: '#92400e' },
  danger: { bg: '#fee2e2', text: '#991b1b' },
  info: { bg: '#dbeafe', text: '#1e40af' },
}
const pc: Record<string, { bg: string; text: string }> = {
  free: { bg: Colors.steel[100], text: Colors.steel[600] },
  basic: { bg: '#dcfce7', text: '#166534' },
  pro: { bg: '#dbeafe', text: '#1e40af' },
  max: { bg: '#fef3c7', text: '#92400e' },
}

export default function Badge({ text, variant = 'default', planType, size = 'sm' }: {
  text: string; variant?: Variant; planType?: string; size?: 'sm' | 'md'
}) {
  const c = variant === 'plan' && planType ? (pc[planType] || vc.default) : (vc[variant] || vc.default)
  return (
    <View style={[s.badge, { backgroundColor: c.bg }, size === 'md' && s.md]}>
      <Text style={[s.text, { color: c.text }, size === 'md' && s.textMd]}>{text}</Text>
    </View>
  )
}

const s = StyleSheet.create({
  badge: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: BorderRadius.full, alignSelf: 'flex-start' },
  md: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs },
  text: { fontSize: FontSize.xs, fontWeight: '700' },
  textMd: { fontSize: FontSize.sm },
})
