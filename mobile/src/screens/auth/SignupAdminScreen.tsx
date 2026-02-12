import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableOpacity,
  Alert,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/Ionicons'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/theme'
import { signUpAdmin } from '../../lib/auth'
import type { AuthStackParamList } from '../../navigation/types'

type SignupAdminScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'SignupAdmin'>

interface FormErrors {
  name: string
  email: string
  password: string
  confirmPassword: string
  inviteCode: string
}

export default function SignupAdminScreen() {
  const navigation = useNavigation<SignupAdminScreenNavigationProp>()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    inviteCode: '',
  })

  const validateForm = () => {
    const newErrors: FormErrors = {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      inviteCode: '',
    }
    let valid = true

    if (!form.name) {
      newErrors.name = '이름을 입력해주세요'
      valid = false
    }

    if (!form.email) {
      newErrors.email = '이메일을 입력해주세요'
      valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = '유효한 이메일을 입력해주세요'
      valid = false
    }

    if (!form.password) {
      newErrors.password = '비밀번호를 입력해주세요'
      valid = false
    } else if (form.password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다'
      valid = false
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = '비밀번호 확인을 입력해주세요'
      valid = false
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = '비밀번호가 일치하지 않습니다'
      valid = false
    }

    if (!form.inviteCode) {
      newErrors.inviteCode = '초대코드를 입력해주세요'
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleSignup = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      await signUpAdmin({
        name: form.name,
        email: form.email,
        password: form.password,
        inviteCode: form.inviteCode,
      })
      Alert.alert('성공', '회원가입이 완료되었습니다', [
        { text: '확인', onPress: () => navigation.goBack() },
      ])
    } catch (error: any) {
      Alert.alert('회원가입 실패', error.message || '회원가입 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              disabled={loading}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="arrow-back" size={24} color={Colors.steel[700]} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>관리자 가입</Text>
              <Text style={styles.subtitle}>초대코드로 플랫폼 관리자 등록</Text>
            </View>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <Input
              label="이름"
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              placeholder="이름을 입력하세요"
              autoCapitalize="words"
              error={errors.name}
              required
            />

            <Input
              label="이메일"
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              placeholder="이메일을 입력하세요"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              error={errors.email}
              required
            />

            <Input
              label="초대코드"
              value={form.inviteCode}
              onChangeText={(text) => setForm({ ...form, inviteCode: text })}
              placeholder="초대코드를 입력하세요"
              autoCapitalize="none"
              error={errors.inviteCode}
              required
            />

            <Input
              label="비밀번호"
              value={form.password}
              onChangeText={(text) => setForm({ ...form, password: text })}
              placeholder="비밀번호를 입력하세요"
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.password}
              required
            />

            <Input
              label="비밀번호 확인"
              value={form.confirmPassword}
              onChangeText={(text) => setForm({ ...form, confirmPassword: text })}
              placeholder="비밀번호를 다시 입력하세요"
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.confirmPassword}
              required
            />

            {/* Signup Button */}
            <Button
              title="가입하기"
              onPress={handleSignup}
              loading={loading}
              disabled={loading}
              fullWidth
              size="lg"
              style={styles.signupButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing['2xl'],
    gap: Spacing.lg,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: FontSize['2xl'],
    fontWeight: '800',
    color: Colors.steel[900],
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  formSection: {
    marginBottom: Spacing['2xl'],
  },
  signupButton: {
    marginTop: Spacing.lg,
  },
})
