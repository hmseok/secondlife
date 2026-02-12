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
import type { InsuranceContract } from '../../lib/types'

type NavigationProp = NativeStackNavigationProp<DetailStackParamList>
type RouteProp = { params: { id: number } }

export default function InsuranceDetailScreen() {
  const route = useRoute<RouteProp>()
  const navigation = useNavigation<NavigationProp>()
  const [contract, setContract] = useState<InsuranceContract | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadContract = async () => {
      try {
        const { data } = await supabase
          .from('insurance_contracts')
          .select('*, cars(*)')
          .eq('id', route.params.id)
          .single()
        setContract(data)
      } catch (err) {
        console.error('보험 계약 로드 에러:', err)
      } finally {
        setLoading(false)
      }
    }
    loadContract()
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

  if (!contract) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorContainer}>
          <Icon name="shield-checkmark-outline" size={48} color={Colors.textMuted} />
          <Text style={s.errorText}>보험 정보를 찾을 수 없습니다</Text>
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
        <Text style={s.headerTitle}>보험 상세</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={s.headerCard}>
          <View>
            <Text style={s.companyName}>{contract.insurance_company || '보험사'}</Text>
            {contract.cars && (
              <Text style={s.carInfo}>{contract.cars.brand} {contract.cars.model}</Text>
            )}
          </View>
          {contract.status && (
            <View style={s.statusBadge}>
              <Badge text={contract.status} variant="info" />
            </View>
          )}
        </Card>

        {/* Insurance Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>보험 정보</Text>
          <Card style={s.infoCard}>
            <InfoRow label="보험사" value={contract.insurance_company} />
            <View style={s.divider} />
            <InfoRow label="증권번호" value={contract.policy_number} />
            <View style={s.divider} />
            <InfoRow label="차량" value={contract.cars ? `${contract.cars.brand} ${contract.cars.model}` : '-'} />
            <View style={s.divider} />
            <InfoRow label="보장유형" value={contract.coverage_type} />
          </Card>
        </View>

        {/* Coverage Period */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>보장 기간</Text>
          <Card style={s.infoCard}>
            <InfoRow
              label="시작일"
              value={contract.start_date ? new Date(contract.start_date).toLocaleDateString('ko-KR') : '-'}
            />
            <View style={s.divider} />
            <InfoRow
              label="만료일"
              value={contract.end_date ? new Date(contract.end_date).toLocaleDateString('ko-KR') : '-'}
            />
          </Card>
        </View>

        {/* Premium & Status */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>요금 및 상태</Text>
          <Card style={s.infoCard}>
            <InfoRow label="보험료" value={contract.premium ? `₩${contract.premium.toLocaleString()}` : '-'} />
            <View style={s.divider} />
            <InfoRow label="상태" value={contract.status} />
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
  companyName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  carInfo: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.xs },
  statusBadge: { marginTop: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  infoCard: { gap: 0 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  infoLabel: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: FontSize.base, color: Colors.text, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border },
})
