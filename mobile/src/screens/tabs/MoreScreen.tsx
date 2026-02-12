import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Image } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/Ionicons'
import Card from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/theme'
import { DetailStackParamList } from '../../navigation/types'
import { useApp } from '../../context/AppContext'

type NavigationProp = NativeStackNavigationProp<DetailStackParamList>

export default function MoreScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { profile, company, role, signOut } = useApp()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = () => {
    Alert.alert('로그아웃', '정말 로그아웃하시겠습니까?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true)
          try {
            await signOut()
          } catch (err) {
            Alert.alert('오류', '로그아웃 중 오류가 발생했습니다.')
            setLoggingOut(false)
          }
        },
      },
    ])
  }

  const isMaster = role === 'master' || role === 'god_admin'
  const isAdmin = role === 'god_admin'

  const MenuItem = ({ icon, label, onPress, rightIcon = true }: { icon: string; label: string; onPress: () => void; rightIcon?: boolean }) => (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={s.menuItem}>
        <View style={s.menuContent}>
          <Icon name={icon} size={24} color={Colors.steel[700]} style={s.menuIcon} />
          <Text style={s.menuLabel}>{label}</Text>
        </View>
        {rightIcon && <Icon name="chevron-forward" size={20} color={Colors.textMuted} />}
      </Card>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>더보기</Text>
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <Card style={s.profileCard}>
          <View style={s.profileContent}>
            <View style={s.avatarContainer}>
              {profile?.avatar_url ? (
                <Image source={{ uri: profile.avatar_url }} style={s.avatar} />
              ) : (
                <View style={[s.avatar, s.avatarPlaceholder]}>
                  <Icon name="person" size={32} color={Colors.white} />
                </View>
              )}
            </View>
            <View style={s.profileInfo}>
              <Text style={s.profileName}>{profile?.employee_name || '사용자'}</Text>
              <Text style={s.profileEmail}>{profile?.email}</Text>
              <View style={s.badgeContainer}>
                <Badge
                  text={company?.name || '회사'}
                  variant="default"
                  size="sm"
                />
              </View>
            </View>
          </View>
        </Card>

        {/* Menu Items */}
        <View style={s.menuSection}>
          <MenuItem
            icon="shield-checkmark-outline"
            label="보험 관리"
            onPress={() => navigation.navigate('InsuranceList')}
          />
          <MenuItem
            icon="wallet-outline"
            label="대출 관리"
            onPress={() => navigation.navigate('LoanDetail', { id: 1 })}
          />
          <MenuItem
            icon="people-outline"
            label="고객 관리"
            onPress={() => navigation.navigate('CustomerDetail', { id: 1 })}
          />
          <MenuItem
            icon="trending-up-outline"
            label="투자 관리"
            onPress={() => Alert.alert('투자 관리', '준비 중입니다')}
          />
          {isMaster && (
            <MenuItem
              icon="people-circle-outline"
              label="조직 관리"
              onPress={() => Alert.alert('조직 관리', '준비 중입니다')}
            />
          )}
          <MenuItem
            icon="settings-outline"
            label="설정"
            onPress={() => navigation.navigate('Settings')}
          />
        </View>

        {/* App Info */}
        <View style={s.infoSection}>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>앱 버전</Text>
            <Text style={s.infoValue}>1.0.0</Text>
          </View>
          <View style={s.infoRow}>
            <Text style={s.infoLabel}>역할</Text>
            <Text style={s.infoValue}>
              {role === 'god_admin' ? '시스템 관리자' : role === 'master' ? '마스터' : '사용자'}
            </Text>
          </View>
        </View>

        {/* Logout Button */}
        <Button
          title="로그아웃"
          onPress={handleLogout}
          variant="danger"
          fullWidth
          loading={loggingOut}
          style={s.logoutBtn}
        />
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  title: { fontSize: FontSize['3xl'], fontWeight: '700', color: Colors.text },
  content: { flex: 1, paddingHorizontal: Spacing.lg },
  profileCard: { marginBottom: Spacing.xl },
  profileContent: { flexDirection: 'row', alignItems: 'center' },
  avatarContainer: { marginRight: Spacing.lg },
  avatar: { width: 64, height: 64, borderRadius: BorderRadius.full, backgroundColor: Colors.steel[300] },
  avatarPlaceholder: { justifyContent: 'center', alignItems: 'center' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  profileEmail: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  badgeContainer: { marginTop: Spacing.sm },
  menuSection: { marginBottom: Spacing.xl, gap: Spacing.sm },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 },
  menuContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuIcon: { marginRight: Spacing.md },
  menuLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text },
  infoSection: { backgroundColor: Colors.white, borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoRow_last: { borderBottomWidth: 0 },
  infoLabel: { fontSize: FontSize.base, color: Colors.textSecondary },
  infoValue: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text },
  logoutBtn: { marginBottom: Spacing.xl },
})
