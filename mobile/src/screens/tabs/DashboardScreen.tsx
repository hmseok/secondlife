import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ScrollView } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/Ionicons'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/theme'
import { DetailStackParamList, MainTabParamList } from '../../navigation/types'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import type { Car } from '../../lib/types'

type NavigationProp = NativeStackNavigationProp<DetailStackParamList>

export default function DashboardScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { company } = useApp()
  const [stats, setStats] = useState({ cars: 0, insurance: 0, quotes: 0, revenue: 0 })
  const [cars, setCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = async () => {
    if (!company?.id) return
    setLoading(true)
    try {
      const [carsRes, insuranceRes, quotesRes, transactionRes] = await Promise.all([
        supabase.from('cars').select('*').eq('company_id', company.id),
        supabase.from('insurance_contracts').select('*').eq('company_id', company.id),
        supabase.from('quotes').select('*').eq('company_id', company.id),
        supabase.from('transactions')
          .select('amount')
          .eq('company_id', company.id)
          .gte('transaction_date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
          .eq('type', 'income'),
      ])

      setCars(carsRes.data || [])
      setStats({
        cars: carsRes.data?.length || 0,
        insurance: insuranceRes.data?.length || 0,
        quotes: quotesRes.data?.length || 0,
        revenue: transactionRes.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0,
      })
    } catch (err) {
      console.error('대시보드 로드 에러:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [company?.id])

  const KPICard = ({ icon, label, value, color }: { icon: string; label: string; value: string | number; color: string }) => (
    <View style={[s.kpiCard, { borderLeftColor: color }]}>
      <View style={[s.kpiIcon, { backgroundColor: color + '20' }]}>
        <Icon name={icon} size={24} color={color} />
      </View>
      <View style={s.kpiContent}>
        <Text style={s.kpiLabel}>{label}</Text>
        <Text style={s.kpiValue}>{value}</Text>
      </View>
    </View>
  )

  const CarItem = ({ car }: { car: Car }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('CarDetail', { id: car.id })}
      activeOpacity={0.7}
    >
      <Card style={s.carItem}>
        <View style={s.carHeader}>
          <Text style={s.carNumber}>{car.number}</Text>
          <Badge text={car.status || 'unknown'} variant={
            car.status === 'available' ? 'success' :
            car.status === 'rented' ? 'info' :
            car.status === 'maintenance' ? 'warning' : 'danger'
          } />
        </View>
        <Text style={s.carModel}>{car.brand} {car.model}</Text>
        <View style={s.carMeta}>
          <Text style={s.carMetaText}>연식: {car.year || '-'}</Text>
          <Text style={s.carMetaText}>주행거리: {car.mileage?.toLocaleString() || '-'} km</Text>
        </View>
      </Card>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>대시보드</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={s.settingsBtn}
        >
          <Icon name="settings-outline" size={24} color={Colors.steel[700]} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} />}
        style={s.content}
      >
        <View style={s.kpiGrid}>
          <KPICard icon="car" label="차량" value={stats.cars} color={Colors.info} />
          <KPICard icon="shield-checkmark" label="보험" value={stats.insurance} color={Colors.success} />
          <KPICard icon="document-text" label="견적" value={stats.quotes} color={Colors.warning} />
          <KPICard icon="trending-up" label="이번달 수입" value={`₩${(stats.revenue / 1000000).toFixed(1)}M`} color={Colors.steel[600]} />
        </View>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>최근 차량</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Cars')}>
              <Text style={s.seeAll}>전체보기</Text>
            </TouchableOpacity>
          </View>
          {cars.slice(0, 3).map(car => (
            <CarItem key={car.id} car={car} />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  title: { fontSize: FontSize['3xl'], fontWeight: '700', color: Colors.text },
  settingsBtn: { padding: Spacing.md },
  content: { flex: 1, paddingHorizontal: Spacing.lg },
  kpiGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg, marginBottom: Spacing.xl },
  kpiCard: { flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: BorderRadius.lg, borderLeftWidth: 4, padding: Spacing.lg, borderWidth: 1, borderColor: Colors.border },
  kpiIcon: { width: 48, height: 48, borderRadius: BorderRadius.lg, justifyContent: 'center', alignItems: 'center', marginRight: Spacing.md },
  kpiContent: {},
  kpiLabel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
  kpiValue: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  section: { marginBottom: Spacing.xl },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  seeAll: { fontSize: FontSize.sm, color: Colors.info, fontWeight: '600' },
  carItem: { marginBottom: Spacing.md },
  carHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  carNumber: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  carModel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginBottom: Spacing.xs },
  carMeta: { flexDirection: 'row', gap: Spacing.md },
  carMetaText: { fontSize: FontSize.xs, color: Colors.textMuted },
})
