import React, { useState } from 'react'
import { View, TextInput, Text, StyleSheet, TouchableOpacity, ViewStyle } from 'react-native'
import Icon from 'react-native-vector-icons/Ionicons'
import { Colors, BorderRadius, FontSize, Spacing } from '../../constants/theme'

interface Props {
  label?: string; value: string; onChangeText: (t: string) => void
  placeholder?: string; secureTextEntry?: boolean
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad'
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'
  error?: string; disabled?: boolean; multiline?: boolean
  icon?: string; style?: ViewStyle; required?: boolean
}

export default function Input({
  label, value, onChangeText, placeholder, secureTextEntry = false,
  keyboardType = 'default', autoCapitalize = 'none', error, disabled = false,
  multiline = false, icon, style, required = false,
}: Props) {
  const [show, setShow] = useState(false)
  const [focused, setFocused] = useState(false)

  return (
    <View style={[styles.wrap, style]}>
      {label && <Text style={styles.label}>{label}{required && <Text style={styles.req}> *</Text>}</Text>}
      <View style={[styles.box, focused && styles.focused, error && styles.err, disabled && styles.dis]}>
        {icon && <Icon name={icon} size={18} color={Colors.steel[400]} style={styles.icon} />}
        <TextInput
          value={value} onChangeText={onChangeText} placeholder={placeholder}
          placeholderTextColor={Colors.steel[400]}
          secureTextEntry={secureTextEntry && !show} keyboardType={keyboardType}
          autoCapitalize={autoCapitalize} editable={!disabled} multiline={multiline}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={[styles.input, multiline && styles.multi, icon ? { paddingLeft: 0 } : undefined]}
        />
        {secureTextEntry && (
          <TouchableOpacity onPress={() => setShow(!show)}>
            <Icon name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={Colors.steel[400]} />
          </TouchableOpacity>
        )}
      </View>
      {error && <Text style={styles.errText}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { marginBottom: Spacing.lg },
  label: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.steel[700], marginBottom: Spacing.xs },
  req: { color: Colors.danger },
  box: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.steel[50],
    borderWidth: 1.5, borderColor: Colors.steel[200], borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md, minHeight: 48,
  },
  focused: { borderColor: Colors.steel[500], backgroundColor: Colors.white },
  err: { borderColor: Colors.danger },
  dis: { backgroundColor: Colors.steel[100], opacity: 0.7 },
  icon: { marginRight: Spacing.sm },
  input: { flex: 1, fontSize: FontSize.base, color: Colors.text, paddingVertical: Spacing.md },
  multi: { textAlignVertical: 'top', minHeight: 80 },
  errText: { fontSize: FontSize.xs, color: Colors.danger, marginTop: Spacing.xs },
})
