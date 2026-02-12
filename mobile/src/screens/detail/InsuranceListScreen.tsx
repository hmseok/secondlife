import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/Ionicons'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/theme'
import { DetailStackParamList } from '../../navigation/types'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import type { InsuranceContract } from '../../lib/types'

type NavigationProp = NativeStackNavigationProp<DetailStackParamList>

export default function InsuranceListScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { company } = useApp()
  const [contracts, setContracts] = useState<InsuranceContract[]>([])
  const [loading, setLoading] = useState(true)

  const loadContracts = async () => {
    if (!company?.id) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('insurance_contracts')
        .select('*, cars(*)')
        .eq('company_id', company.id)
        .order('end_date', { ascending: true })
      setContracts(data || [])
    } catch (err) {
      console.error('보험 로드 에러:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadContracts()
  }, [company?.id])

  const isExpiringSoon = (endDate?: string) => {
    if (!endDate) return false
    const end = new Date(endDate)
    const today = new Date()
    const diffTime = end.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays <= 30 && diffDays > 0
  }

  const ContractItem = ({ contract }: { contract: InsuranceContract }) => {
    const expiring = isExpiringSoon(contract.end_date)

    return (
      <TouchableOpacity
        onPress={() => navigation.navigate('InsuranceDetail', { id: contract.id })}
        activeOpacity={0.7}
      >
        <Card style={s.contractCard}>
          <View style={s.cardHeader}>
            <View>
              <Text style={s.companyName}>{contract.insurance_company || '보험사'}</Text>
              {contract.cars && (
                <Text style={s.carInfo}>{contract.cars.brand} {contract.cars.model}</Text>
              )}
            </View>
            {expiring && <Badge text="만기임박" variant="danger" />}
          </View>

          <View style={s.cardDetails}>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>증권번호</Text>
              <Text style={s.detailValue}>{contract.policy_number || '-'}</Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>기간</Text>
              <Text style={s.detailValue}>
                {contract.start_date ? new Date(contract.start_date).toLocaleDateString('ko-KR') : '-'} ~ {contract.end_date ? new Date(contract.end_date).toLocaleDateString('ko-KR') : '-'}
              </Text>
            </View>
            <View style={s.detailRow}>
              <Text style={s.detailLabel}>보험료</Text>
              <Text style={s.detailValue}>₩{contract.premium?.toLocaleString() || '0'}</Text>
            </View>
          </View>
        </Card>
      </TouchableOpacity>
    )
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={28} color={Colors.steel[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>보험 관리</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={s.content}>
        <FlatList
          data={contracts}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => <ContractItem contract={item} />}
          scrollEnabled={true}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="shield-checkmark-outline" size={48} color={Colors.textMuted} />
              <Text style={s.emptyText}>보험 계약이 없습니다</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  contractCard: { marginBottom: Spacing.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  companyName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  carInfo: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  cardDetails: { gap: Spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  detailValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text, textAlign: 'right', flex: 1, marginLeft: Spacing.md },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'] },
  emptyText: { fontSize: FontSize.base, color: Colors.textMuted, marginTop: Spacing.md },
})
