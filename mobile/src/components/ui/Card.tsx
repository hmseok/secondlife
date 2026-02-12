import React from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { Colors, BorderRadius, Spacing } from '../../constants/theme'

export default function Card({ children, style, noPadding }: { children: React.ReactNode; style?: ViewStyle; noPadding?: boolean }) {
  return <View style={[styles.card, noPadding ? undefined : styles.pad, style]}>{children}</View>
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white, borderRadius: BorderRadius.xl,
    borderWidth: 1, borderColor: Colors.border,
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
  },
  pad: { padding: Spacing.lg },
})
