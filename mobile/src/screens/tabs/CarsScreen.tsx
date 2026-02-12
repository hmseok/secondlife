import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/Ionicons'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Input from '../../components/ui/Input'
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/theme'
import { DetailStackParamList } from '../../navigation/types'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'
import type { Car } from '../../lib/types'

type NavigationProp = NativeStackNavigationProp<DetailStackParamList>

const STATUS_TABS = [
  { label: '전체', value: 'all' },
  { label: '대기', value: 'available' },
  { label: '렌트', value: 'rented' },
  { label: '정비', value: 'maintenance' },
  { label: '매각', value: 'sold' },
]

export default function CarsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { company } = useApp()
  const [cars, setCars] = useState<Car[]>([])
  const [filteredCars, setFilteredCars] = useState<Car[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')

  const loadCars = async () => {
    if (!company?.id) return
    setLoading(true)
    try {
      const { data } = await supabase
        .from('cars')
        .select('*')
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
      setCars(data || [])
    } catch (err) {
      console.error('차량 로드 에러:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCars()
  }, [company?.id])

  useEffect(() => {
    let filtered = cars
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(c => c.status === selectedStatus)
    }
    if (search) {
      filtered = filtered.filter(c =>
        c.number?.toLowerCase().includes(search.toLowerCase()) ||
        c.brand?.toLowerCase().includes(search.toLowerCase()) ||
        c.model?.toLowerCase().includes(search.toLowerCase())
      )
    }
    setFilteredCars(filtered)
  }, [search, selectedStatus, cars])

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'available': return 'success'
      case 'rented': return 'info'
      case 'maintenance': return 'warning'
      case 'sold': return 'danger'
      default: return 'default'
    }
  }

  const CarItem = ({ car }: { car: Car }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('CarDetail', { id: car.id })}
      activeOpacity={0.7}
    >
      <Card style={s.carCard}>
        <View style={s.carHeader}>
          <View>
            <Text style={s.carNumber}>{car.number}</Text>
            <Text style={s.carModel}>{car.brand} {car.model}</Text>
          </View>
          <Badge text={car.status || 'unknown'} variant={getStatusVariant(car.status)} />
        </View>
        <View style={s.carDetails}>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>연식</Text>
            <Text style={s.detailValue}>{car.year || '-'}</Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>주행거리</Text>
            <Text style={s.detailValue}>{car.mileage?.toLocaleString() || '-'} km</Text>
          </View>
          <View style={s.detailRow}>
            <Text style={s.detailLabel}>연료</Text>
            <Text style={s.detailValue}>{car.fuel || '-'}</Text>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>차량</Text>
      </View>

      <View style={s.content}>
        <Input
          placeholder="차량번호, 브랜드 검색"
          value={search}
          onChangeText={setSearch}
          icon="search"
          style={s.searchInput}
        />

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
          data={filteredCars}
          keyExtractor={item => item.id.toString()}
          renderItem={({ item }) => <CarItem car={item} />}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={s.empty}>
              <Icon name="car-outline" size={48} color={Colors.textMuted} />
              <Text style={s.emptyText}>차량이 없습니다</Text>
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
  searchInput: { marginBottom: Spacing.lg },
  tabsContainer: { marginBottom: Spacing.lg },
  tabs: { gap: Spacing.sm },
  tab: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, borderRadius: BorderRadius.full, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.border },
  tabActive: { backgroundColor: Colors.steel[700], borderColor: Colors.steel[700] },
  tabText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  carCard: { marginBottom: Spacing.md },
  carHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: Spacing.md },
  carNumber: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  carModel: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  carDetails: { gap: Spacing.sm },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { fontSize: FontSize.sm, color: Colors.textSecondary },
  detailValue: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.text },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing['3xl'] },
  emptyText: { fontSize: FontSize.base, color: Colors.textMuted, marginTop: Spacing.md },
})
