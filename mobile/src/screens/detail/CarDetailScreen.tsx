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
import type { Car } from '../../lib/types'

type NavigationProp = NativeStackNavigationProp<DetailStackParamList>
type RouteProp = { params: { id: number } }

export default function CarDetailScreen() {
  const route = useRoute<RouteProp>()
  const navigation = useNavigation<NavigationProp>()
  const [car, setCar] = useState<Car | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadCar = async () => {
      try {
        const { data } = await supabase
          .from('cars')
          .select('*')
          .eq('id', route.params.id)
          .single()
        setCar(data)
      } catch (err) {
        console.error('차량 로드 에러:', err)
      } finally {
        setLoading(false)
      }
    }
    loadCar()
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

  if (!car) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.errorContainer}>
          <Icon name="car-outline" size={48} color={Colors.textMuted} />
          <Text style={s.errorText}>차량 정보를 찾을 수 없습니다</Text>
        </View>
      </SafeAreaView>
    )
  }

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'available': return 'success'
      case 'rented': return 'info'
      case 'maintenance': return 'warning'
      case 'sold': return 'danger'
      default: return 'default'
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
        <Text style={s.headerTitle}>차량 상세</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <Card style={s.headerCard}>
          <View style={s.headerCardContent}>
            <View>
              <Text style={s.carNumber}>{car.number}</Text>
              <Text style={s.carModel}>{car.brand} {car.model}</Text>
            </View>
            <Badge text={car.status || 'unknown'} variant={getStatusVariant(car.status)} size="md" />
          </View>
        </Card>

        {/* Basic Info Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>기본 정보</Text>
          <Card style={s.infoCard}>
            <InfoRow label="차량번호" value={car.number} />
            <View style={s.divider} />
            <InfoRow label="차대번호" value={car.vin} />
            <View style={s.divider} />
            <InfoRow label="브랜드" value={car.brand} />
            <View style={s.divider} />
            <InfoRow label="모델" value={car.model} />
            <View style={s.divider} />
            <InfoRow label="트림" value={car.trim} />
          </Card>
        </View>

        {/* Specification Section */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>사양</Text>
          <Card style={s.infoCard}>
            <InfoRow label="연식" value={car.year} />
            <View style={s.divider} />
            <InfoRow label="연료" value={car.fuel} />
            <View style={s.divider} />
            <InfoRow label="주행거리" value={car.mileage ? `${car.mileage.toLocaleString()} km` : '-'} />
          </Card>
        </View>

        {/* Location & Pricing */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>거래 정보</Text>
          <Card style={s.infoCard}>
            <InfoRow label="위치" value={car.location} />
            <View style={s.divider} />
            <InfoRow label="매입가" value={car.purchase_price ? `₩${car.purchase_price.toLocaleString()}` : '-'} />
            <View style={s.divider} />
            <InfoRow label="취득일" value={car.acq_date ? new Date(car.acq_date).toLocaleDateString('ko-KR') : '-'} />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  content: { flex: 1, paddingHorizontal: Spacing.lg },
  headerCard: { marginBottom: Spacing.lg },
  headerCardContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  carNumber: { fontSize: FontSize.xl, fontWeight: '700', color: Colors.text },
  carModel: { fontSize: FontSize.base, color: Colors.textSecondary, marginTop: Spacing.xs },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text, marginBottom: Spacing.md },
  infoCard: { gap: 0 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  infoLabel: { fontSize: FontSize.base, color: Colors.textSecondary, fontWeight: '500' },
  infoValue: { fontSize: FontSize.base, color: Colors.text, fontWeight: '600' },
  divider: { height: 1, backgroundColor: Colors.border },
})
