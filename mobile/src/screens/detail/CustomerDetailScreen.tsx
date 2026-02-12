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
import type { Customer } from '../../lib/types'

type NavigationProp = NativeStackNavigationProp<DetailStackParamList>
type RouteProp = { params: { id: number } }

export default function CustomerDetailScreen() {
  const route = useRoute<RouteProp>()
  const navigation = useNavigation<NavigationProp>()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const { data } = await supabase
          .from('customers')
          .select('*')
          .eq('id', route.params.id)
          .single()
        setCustomer(data)
      } catch (err) {
        console.error('고객 로드 에러:', err)
      } finally {
        setLoading(false)
      }
    }
    loadCustomer()
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

  if (!customer) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorContainer}>
          <Icon name="person-outline" size={48} color={Colors.textMuted} />
          <Text style={s.errorText}>고객 정보를 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    )
  }

  const getTypeVariant = (type?: string) => {
    switch (type) {
      case '개인': return 'success'
      case '법인': return 'info'
      case '외국인': return 'warning'
      default: return 'default'
    }
  }

  const InfoRow = ({ label, value, icon }: { label: string; value: string | number | undefined; icon?: string }) => (
    <View style={s.infoRow}>
      <View style={s.labelContainer}>
        {icon && <Icon name={icon} size={20} color={Colors.steel[600]} style={s.rowIcon} />}
        <Text style={s.infoLabel}>{label}</Text>
      </View>
      <Text style={s.infoValue}>{value || '-'}</Text>
    </View>
  )

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={28} color={Colors.steel[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>고객 상세</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={s.headerCard}>
          <View style={s.headerCardContent}>
            <View style={s.avatarContainer}>
              <Icon name="person-circle" size={64} color={Colors.steel[300]} />
            </View>
            <View style={s.headerInfo}>
              <Text style={s.customerName}>{customer.name}</Text>
              {customer.type && (
                <View style={s.typeBadge}>
                  <Badge text={customer.type} variant={getTypeVariant(customer.type)} />
                </View>
              )}
            </View>
          </View>
        </Card>

        {/* Customer Details */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>고객 정보</Text>
          <Card style={s.infoCard}>
            <InfoRow label="이름" value={customer.name} icon="person" />
            <View style={s.divider} />
            <InfoRow label="연락처" value={customer.phone} icon="call" />
            <View style={s.divider} />
            <InfoRow label="유형" value={customer.type} icon="people" />
          </Card>
        </View>

        {/* Memo */}
        {customer.memo && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>메모</Text>
            <Card style={s.memoCard}>
              <Text style={s.memoText}>{customer.memo}</Text>
            </Card>
          </View>
        )}

        {/* Registration Date */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>등록 정보</Text>
          <Card style={s.infoCard}>
            <InfoRow
              label="등록일"
              value={customer.created_at ? new Date(customer.created_at).toLocaleDateString('ko-KR') : '-'}
              icon="calendar"
            />
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
  headerCardContent: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { marginRight: Spacing.lg },
  headerInfo: { flex: 1 },
  customerName: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  typeBadge: { marginTop: Spacing.sm },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  infoCard: { gap: 0 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  labelContainer: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  rowIcon: { marginRight: Spacing.sm },
  infoLabel: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: FontSize.base, color: Colors.text, fontWeight: '600', textAlign: 'right', flex: 1, marginLeft: Spacing.md },
  divider: { height: 1, backgroundColor: Colors.border },
  memoCard: { minHeight: 100, justifyContent: 'flex-start' },
  memoText: { fontSize: FontSize.base, color: Colors.text, lineHeight: 22 },
})
