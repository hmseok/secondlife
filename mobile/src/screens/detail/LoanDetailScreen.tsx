import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/Ionicons'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/theme'
import { DetailStackParamList } from '../../navigation/types'
import { supabase } from '../../lib/supabase'
import type { Loan } from '../../lib/types'

type NavigationProp = NativeStackNavigationProp<DetailStackParamList>
type RouteProp = { params: { id: number } }

export default function LoanDetailScreen() {
  const route = useRoute<RouteProp>()
  const navigation = useNavigation<NavigationProp>()
  const [loan, setLoan] = useState<Loan | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadLoan = async () => {
      try {
        const { data } = await supabase
          .from('loans')
          .select('*, cars(*)')
          .eq('id', route.params.id)
          .single()
        setLoan(data)
      } catch (err) {
        console.error('대출 로드 에러:', err)
      } finally {
        setLoading(false)
      }
    }
    loadLoan()
  }, [route.params.id])

  if (loading) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.steel[700]} />
        </View>
      </SafeAreaView>
    )
  }

  if (!loan) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorContainer}>
          <Icon name="wallet-outline" size={48} color={Colors.textMuted} />
          <Text style={s.errorText}>대출 정보를 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    )
  }

  const InfoRow = ({ label, value }: { label: string; value: string | number | undefined }) => (
    <View style={s.infoRow}>
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{value || '-'}</Text>
    </View>
  )

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={28} color={Colors.steel[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>대출 상세</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={s.headerCard}>
          <View style={s.headerCardContent}>
            <View>
              <Text style={s.bankName}>{loan.bank_name || '은행'}</Text>
              {loan.cars && (
                <Text style={s.carInfo}>{loan.cars.brand} {loan.cars.model}</Text>
              )}
            </View>
            {loan.status && <Badge text={loan.status} variant="info" size="md" />}
          </View>
        </Card>

        {/* Loan Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>대출 정보</Text>
          <Card style={s.infoCard}>
            <InfoRow label="은행" value={loan.bank_name} />
            <View style={s.divider} />
            <InfoRow
              label="차량"
              value={loan.cars ? `${loan.cars.brand} ${loan.cars.model}` : '-'}
            />
            <View style={s.divider} />
            <InfoRow
              label="대출금액"
              value={loan.loan_amount ? `₩${loan.loan_amount.toLocaleString()}` : '-'}
            />
            <View style={s.divider} />
            <InfoRow label="이자율" value={loan.interest_rate ? `${loan.interest_rate}%` : '-'} />
          </Card>
        </View>

        {/* Payment Terms */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>상환 정보</Text>
          <Card style={s.infoCard}>
            <InfoRow
              label="월상환액"
              value={loan.monthly_payment ? `₩${loan.monthly_payment.toLocaleString()}` : '-'}
            />
            <View style={s.divider} />
            <InfoRow
              label="시작일"
              value={loan.start_date ? new Date(loan.start_date).toLocaleDateString('ko-KR') : '-'}
            />
            <View style={s.divider} />
            <InfoRow
              label="만기일"
              value={loan.end_date ? new Date(loan.end_date).toLocaleDateString('ko-KR') : '-'}
            />
          </Card>
        </View>

        {/* Status */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>상태</Text>
          <Card style={s.infoCard}>
            <InfoRow label="상태" value={loan.status} />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { fontSize: FontSize.base, color: Colors.textMuted, marginTop: Spacing.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  headerCard: { marginBottom: Spacing.lg },
  headerCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bankName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  carInfo: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.xs },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  infoCard: { gap: 0 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  infoLabel: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: FontSize.base, color: Colors.text, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border },
})
