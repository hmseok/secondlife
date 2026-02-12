import React from 'react'
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, TextStyle } from 'react-native'
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/theme'

type Variant = 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

interface Props {
  title: string; onPress: () => void; variant?: Variant; size?: Size
  loading?: boolean; disabled?: boolean; icon?: React.ReactNode
  style?: ViewStyle; textStyle?: TextStyle; fullWidth?: boolean
}

export default function Button({
  title, onPress, variant = 'primary', size = 'md',
  loading = false, disabled = false, icon, style, textStyle, fullWidth = false,
}: Props) {
  const off = disabled || loading
  return (
    <TouchableOpacity
      onPress={onPress} disabled={off} activeOpacity={0.7}
      style={[s.base, s[variant], s[`sz_${size}`], fullWidth && s.full, off && s.off, style]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'outline' || variant === 'ghost' ? Colors.primary : Colors.white} />
      ) : (
        <>
          {icon}
          <Text style={[s.text, s[`t_${variant}`], s[`ts_${size}`], icon ? { marginLeft: Spacing.sm } : undefined, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}

const s = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: BorderRadius.xl },
  full: { width: '100%' },
  off: { opacity: 0.5 },
  primary: { backgroundColor: Colors.steel[700] },
  secondary: { backgroundColor: Colors.steel[100] },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.steel[300] },
  danger: { backgroundColor: Colors.danger },
  ghost: { backgroundColor: 'transparent' },
  sz_sm: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, minHeight: 32 },
  sz_md: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, minHeight: 44 },
  sz_lg: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.lg, minHeight: 52 },
  text: { fontWeight: '700' },
  t_primary: { color: Colors.white }, t_secondary: { color: Colors.steel[700] },
  t_outline: { color: Colors.steel[700] }, t_danger: { color: Colors.white },
  t_ghost: { color: Colors.steel[600] },
  ts_sm: { fontSize: FontSize.sm }, ts_md: { fontSize: FontSize.base }, ts_lg: { fontSize: FontSize.lg },
})
