import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import Icon from 'react-native-vector-icons/Ionicons'
import Card from '../../components/ui/Card'
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/theme'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import type { Transaction } from '../../lib/types'

const TRANSACTION_TABS = [
  { label: '전체', value: 'all' },
  { label: '수입', value: 'income' },
  { label: '지출', value: 'expense' },
]

export default function FinanceScreen() {
  const { company } = useApp()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState('all')
  const [summary, setSummary] = useState({ income: 0, expense: 0 })

  const loadTransactions = async () => {
    if (!company?.id) return
    setLoading(true)
    try {
      const currentMonth = new Date()
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString()

      const { data } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', company.id)
        .gte('transaction_date', startOfMonth)
        .order('transaction_date', { ascending: false })

      setTransactions(data || [])

      // Calculate summary
      const income = data?.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0) || 0
      const expense = data?.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0) || 0
      setSummary({ income, expense })
    } catch (err) {
      console.error('거래 로드 에러:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactions()
  }, [company?.id])

  useEffect(() => {
    let filtered = transactions
    if (selectedType !== 'all') {
      filtered = filtered.filter(t => t.type === selectedType)
    }
    setFilteredTransactions(filtered)
  }, [selectedType, transactions])

  const SummaryCard = ({ label, amount, icon, color }: { label: string; amount: number; icon: string; color: string }) => (
    <View style={[s.summaryCard, { borderLeftColor: color }]}>
      <View style={[s.summaryIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View>
        <Text style={s.summaryLabel}>{label}</Text>
        <Text style={s.summaryAmount}>₩{amount.toLocaleString()}</Text>
      </View>
    </View>
  )

  const TransactionItem = ({ transaction }: { transaction: Transaction }) => {
    const isIncome = transaction.type === 'income'
    const icon = isIncome ? 'arrow-down' : 'arrow-up'
    const color = isIncome ? Colors.success : Colors.danger

    return (
      <Card style={s.transactionCard}>
        <View style={s.transactionContent}>
          <View style={[s.transactionIcon, { backgroundColor: color + '20' }]}>
            <Icon name={icon} size={20} color={color} />
          </View>
          <View style={s.transactionDetails}>
            <Text style={s.transactionDesc}>{transaction.description}</Text>
            <Text style={s.transactionDate}>
              {new Date(transaction.transaction_date).toLocaleDateString('ko-KR')}
            </Text>
          </View>
        </View>
        <Text style={[s.transactionAmount, { color }]}>
          {isIncome ? '+' : '-'}₩{transaction.amount?.toLocaleString()}
        </Text>
      </Card>
    )
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>재무</Text>
      </View>

      <View style={s.content}>
        <View style={s.summaryContainer}>
          <SummaryCard
            label="이번달 수입"
            amount={summary.income}
            icon="arrow-down"
            color={Colors.success}
          />
          <SummaryCard
            label="이번달 지출"
            amount={summary.expense}
            icon="arrow-up"
            color={Colors.danger}
          />
        </View>

        <View style={s.tabsContainer}>
          <FlatList
            horizontal
            showsHorizontalScrollIndicator={false}
            data={TRANSACTION_TABS}
            keyExtractor={item => item.value}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => setSelectedType(item.value)}
                style={[s.tab, selectedType === item.value && s.tabActive]}
              >
                <Text style={[s.tabText, selectedType === item.value && s.tabTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            )}
            contentContainerStyle={s.tabs}
          />
        </View>

        <FlatList
          data={filteredTransactions}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => <TransactionItem transaction={item} />}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="cash-outline" size={48} color={Colors.textMuted} />
              <Text style={s.emptyText}>거래가 없습니다</Text>
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
  summaryContainer: { gap: Spacing.md, marginBottom: Spacing.lg },
  summaryCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderLeftWidth: 4, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  summaryIcon: { width: 48, height: 48, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  summaryLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  summaryAmount: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text, marginTop: Spacing.xs },
  tabsContainer: { marginBottom: Spacing.lg },
  tabs: { gap: Spacing.sm },
  tab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.steel[700], borderColor: Colors.steel[700] },
  tabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  transactionCard: { marginBottom: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  transactionContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  transactionIcon: { width: 44, height: 44, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  transactionDetails: { flex: 1 },
  transactionDesc: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  transactionDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.xs },
  transactionAmount: { fontSize: FontSize.base, fontWeight: '700' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'] },
  emptyText: { fontSize: FontSize.base, color: Colors.textMuted, marginTop: Spacing.md },
})
