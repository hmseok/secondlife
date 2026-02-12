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
import { signInWithEmail, resetPassword } from '../../lib/auth'
import type { AuthStackParamList } from '../../navigation/types'

type LoginScreenNavigationProp = NativeStackNavigationProp<AuthStackParamList, 'Login'>

export default function LoginScreen() {
  const navigation = useNavigation<LoginScreenNavigationProp>()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({ email: '', password: '' })

  const validateForm = () => {
    const newErrors = { email: '', password: '' }
    let valid = true

    if (!email) {
      newErrors.email = '이메일을 입력해주세요'
      valid = false
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = '유효한 이메일을 입력해주세요'
      valid = false
    }

    if (!password) {
      newErrors.password = '비밀번호를 입력해주세요'
      valid = false
    } else if (password.length < 6) {
      newErrors.password = '비밀번호는 최소 6자 이상이어야 합니다'
      valid = false
    }

    setErrors(newErrors)
    return valid
  }

  const handleLogin = async () => {
    if (!validateForm()) return

    setLoading(true)
    try {
      await signInWithEmail(email, password)
      // Navigation handled by auth context/state management
    } catch (error: any) {
      Alert.alert('로그인 실패', error.message || '로그인 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('알림', '이메일을 입력해주세요')
      return
    }

    setLoading(true)
    try {
      await resetPassword(email)
      Alert.alert('성공', '비밀번호 초기화 이메일이 발송되었습니다')
    } catch (error: any) {
      Alert.alert('오류', error.message || '비밀번호 초기화 중 오류가 발생했습니다')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Logo Section */}
          <View style={styles.logoSection}>
            <View style={styles.logoCircle}>
              <Icon name="flash" size={40} color={Colors.white} />
            </View>
            <Text style={styles.title}>Self-Disruption</Text>
            <Text style={styles.subtitle}>차량 관리 ERP 시스템</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formSection}>
            <Input
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="이메일을 입력하세요"
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
              error={errors.email}
              required
            />

            <Input
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호를 입력하세요"
              secureTextEntry
              icon="lock-closed-outline"
              error={errors.password}
              required
            />

            {/* Forgot Password Link */}
            <TouchableOpacity
              onPress={handleForgotPassword}
              disabled={loading}
              style={styles.forgotContainer}
            >
              <Text style={styles.forgotText}>비밀번호를 잊으셨나요?</Text>
            </TouchableOpacity>

            {/* Login Button */}
            <Button
              title="로그인"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              fullWidth
              size="lg"
              style={styles.loginButton}
            />
          </View>

          {/* Signup Links Section */}
          <View style={styles.signupSection}>
            <Text style={styles.signupLabel}>아직 회원이 아니신가요?</Text>
            <View style={styles.signupLinks}>
              <TouchableOpacity
                onPress={() => navigation.navigate('SignupFounder')}
                disabled={loading}
                style={styles.signupLinkButton}
              >
                <Text style={styles.signupLinkText}>대표 가입</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                onPress={() => navigation.navigate('SignupEmployee')}
                disabled={loading}
                style={styles.signupLinkButton}
              >
                <Text style={styles.signupLinkText}>직원 가입</Text>
              </TouchableOpacity>
              <View style={styles.divider} />
              <TouchableOpacity
                onPress={() => navigation.navigate('SignupAdmin')}
                disabled={loading}
                style={styles.signupLinkButton}
              >
                <Text style={styles.signupLinkText}>관리자</Text>
              </TouchableOpacity>
            </View>
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
    paddingVertical: Spacing.xl,
    justifyContent: 'space-between',
  },
  logoSection: {
    alignItems: 'center',
    marginBottom: Spacing['3xl'],
    marginTop: Spacing.xl,
  },
  logoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.steel[700],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize['3xl'],
    fontWeight: '800',
    color: Colors.steel[900],
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  formSection: {
    marginBottom: Spacing['2xl'],
  },
  forgotContainer: {
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  forgotText: {
    fontSize: FontSize.sm,
    color: Colors.steel[600],
    fontWeight: '600',
  },
  loginButton: {
    marginBottom: Spacing.lg,
  },
  signupSection: {
    alignItems: 'center',
    marginTop: Spacing['2xl'],
  },
  signupLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
    fontWeight: '500',
  },
  signupLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupLinkButton: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  signupLinkText: {
    fontSize: FontSize.sm,
    color: Colors.steel[700],
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.steel[300],
    marginHorizontal: Spacing.sm,
  },
})
