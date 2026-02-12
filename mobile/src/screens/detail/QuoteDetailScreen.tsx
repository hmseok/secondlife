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
import type { Quote } from '../../lib/types'

type NavigationProp = NativeStackNavigationProp<DetailStackParamList>
type RouteProp = { params: { id: number } }

export default function QuoteDetailScreen() {
  const route = useRoute<RouteProp>()
  const navigation = useNavigation<NavigationProp>()
  const [quote, setQuote] = useState<Quote | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadQuote = async () => {
      try {
        const { data } = await supabase
          .from('quotes')
          .select('*, cars(*)')
          .eq('id', route.params.id)
          .single()
        setQuote(data)
      } catch (err) {
        console.error('견적 로드 에러:', err)
      } finally {
        setLoading(false)
      }
    }
    loadQuote()
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

  if (!quote) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorContainer}>
          <Icon name="document-text-outline" size={48} color={Colors.textMuted} />
          <Text style={s.errorText}>견적 정보를 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    )
  }

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'pending': return 'warning'
      case 'approved': return 'success'
      case 'completed': return 'info'
      default: return 'default'
    }
  }

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'pending': return '대기'
      case 'approved': return '승인'
      case 'completed': return '완료'
      default: return '미정'
    }
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
        <Text style={s.headerTitle}>견적 상세</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={s.headerCard}>
          <View style={s.headerCardContent}>
            <View>
              <Text style={s.customerName}>{quote.customer_name || '고객 미정'}</Text>
              {quote.cars && (
                <Text style={s.carInfo}>{quote.cars.brand} {quote.cars.model}</Text>
              )}
            </View>
            <Badge text={getStatusLabel(quote.status)} variant={getStatusVariant(quote.status)} size="md" />
          </View>
        </Card>

        {/* Quote Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>견적 정보</Text>
          <Card style={s.infoCard}>
            <InfoRow label="고객명" value={quote.customer_name} />
            <View style={s.divider} />
            <InfoRow
              label="차량"
              value={quote.cars ? `${quote.cars.brand} ${quote.cars.model}` : '-'}
            />
          </Card>
        </View>

        {/* Rental Period */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>렌탈 기간</Text>
          <Card style={s.infoCard}>
            <InfoRow
              label="시작일"
              value={quote.start_date ? new Date(quote.start_date).toLocaleDateString('ko-KR') : '-'}
            />
            <View style={s.divider} />
            <InfoRow
              label="종료일"
              value={quote.end_date ? new Date(quote.end_date).toLocaleDateString('ko-KR') : '-'}
            />
          </Card>
        </View>

        {/* Cost & Status */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>요금 및 상태</Text>
          <Card style={s.infoCard}>
            <View style={s.monthlyCostRow}>
              <Text style={s.infoLabel}>월비용</Text>
              <Text style={s.monthlyCostValue}>₩{quote.monthly_cost?.toLocaleString() || '0'}</Text>
            </View>
            <View style={s.divider} />
            <InfoRow label="상태" value={getStatusLabel(quote.status)} />
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
  customerName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  carInfo: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.xs },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  infoCard: { gap: 0 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  infoLabel: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: FontSize.base, color: Colors.text, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: Spacing.md },
  monthlyCostRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  monthlyCostValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.success },
  divider: { height: 1, backgroundColor: Colors.border },
})
