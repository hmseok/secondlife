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
import type { Quote } from '../../lib/types'

type NavigationProp = NativeStackNavigationProp<DetailStackParamList>

const STATUS_TABS = [
  { label: '전체', value: 'all' },
  { label: '대기', value: 'pending' },
  { label: '승인', value: 'approved' },
  { label: '완료', value: 'completed' },
]

export default function QuotesScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { company } = useApp()
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [filteredQuotes, setFilteredQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState('all')

  const loadQuotes = async () => {
    if (!company?.id) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('quotes')
        .select('*, cars(*)')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
      setQuotes(data || [])
    } catch (err) {
      console.error('견적 로드 에러:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadQuotes()
  }, [company?.id])

  useEffect(() => {
    let filtered = quotes
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(q => q.status === selectedStatus)
    }
    setFilteredQuotes(filtered)
  }, [selectedStatus, quotes])

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

  const QuoteItem = ({ quote }: { quote: Quote }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('QuoteDetail', { id: quote.id })}
      activeOpacity={0.7}
    >
      <Card style={s.quoteCard}>
        <View style={s.quoteHeader}>
          <View>
            <Text style={s.customerName}>{quote.customer_name || '고객 미정'}</Text>
            {quote.cars && (
              <Text style={s.carInfo}>{quote.cars.brand} {quote.cars.model}</Text>
            )}
          </View>
          <Badge text={getStatusLabel(quote.status)} variant={getStatusVariant(quote.status)} />
        </View>

        <View style={s.quoteDetails}>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>기간</Text>
            <Text style={s.detailValue}>
              {quote.start_date ? new Date(quote.start_date).toLocaleDateString('ko-KR') : '-'} ~ {quote.end_date ? new Date(quote.end_date).toLocaleDateString('ko-KR') : '-'}
            </Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>월비용</Text>
            <Text style={s.monthlyCost}>₩{quote.monthly_cost?.toLocaleString() || '0'}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>견적</Text>
      </View>

      <View style={s.content}>
        <View style={s.tabsContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={STATUS_TABS}
            keyExtractor={item => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedStatus(item.value)}
                style={[s.tab, selectedStatus === item.value && s.tabActive]}
              >
                <Text style={[s.tabText, selectedStatus === item.value && s.tabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={s.tabs}
          />
        </View>

        <FlatList
          data={filteredQuotes}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => <QuoteItem quote={item} />}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="document-text-outline" size={48} color={Colors.textMuted} />
              <Text style={s.emptyText}>견적이 없습니다</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  title: { fontSize: FontSize['3xl'], fontWeight: '700', color: Colors.text },
  content: { flex: 1, paddingHorizontal: Spacing.lg },
  tabsContainer: { marginBottom: Spacing.lg },
  tabs: { gap: Spacing.sm },
  tab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.steel[700], borderColor: Colors.steel[700] },
  tabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  quoteCard: { marginBottom: Spacing.md },
  quoteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  customerName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  carInfo: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  quoteDetails: { gap: Spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  detailValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  monthlyCost: { fontSize: FontSize.base, fontWeight: '700', color: Colors.success },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'] },
  emptyText: { fontSize: FontSize.base, color: Colors.textMuted, marginTop: Spacing.md },
})
