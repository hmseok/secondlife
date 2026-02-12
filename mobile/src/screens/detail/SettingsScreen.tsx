import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import Icon from 'react-native-vector-icons/Ionicons'
import Card from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { Colors, FontSize, Spacing, BorderRadius } from '../../constants/theme'
import { DetailStackParamList } from '../../navigation/types'
import { useApp } from '../../context/AppContext'
import { supabase } from '../../lib/supabase'

type NavigationProp = NativeStackNavigationProp<DetailStackParamList>

export default function SettingsScreen() {
  const navigation = useNavigation<NavigationProp>()
  const { profile, refreshAuth } = useApp()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setName(profile.employee_name || '')
      setPhone(profile.phone || '')
    }
  }, [profile])

  const handleSave = async () => {
    if (!profile?.id) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ employee_name: name, phone })
        .eq('id', profile.id)

      if (error) {
        Alert.alert('오류', '프로필 저장 중 오류가 발생했습니다.')
        return
      }

      await refreshAuth()
      Alert.alert('성공', '프로필이 저장되었습니다.')
    } catch (err) {
      console.error('저장 에러:', err)
      Alert.alert('오류', '프로필 저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Card style={s.sectionCard}>{children}</Card>
    </View>
  )

  const SettingRow = ({ icon, label, value, onPress }: { icon: string; label: string; value?: string | React.ReactNode; onPress?: () => void }) => (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={s.settingRow}>
        <View style={s.settingContent}>
          <Icon name={icon} size={20} color={Colors.steel[600]} style={s.settingIcon} />
          <View>
            <Text style={s.settingLabel}>{label}</Text>
            {typeof value === 'string' && <Text style={s.settingValue}>{value}</Text>}
          </View>
        </View>
        {typeof value === 'string' && <Icon name="chevron-forward" size={20} color={Colors.textMuted} />}
        {typeof value !== 'string' && value}
      </View>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-back" size={28} color={Colors.steel[700]} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>설정</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={s.content} showsVerticalScrollIndicator={false}>
        {/* Profile Settings */}
        <Section title="프로필">
          <View style={s.profileInputs}>
            <Input
              label="이름"
              value={name}
              onChangeText={setName}
              placeholder="이름 입력"
              icon="person"
            />
            <Input
              label="연락처"
              value={phone}
              onChangeText={setPhone}
              placeholder="010-0000-0000"
              keyboardType="phone-pad"
              icon="call"
            />
            <Button
              title="저장"
              onPress={handleSave}
              loading={saving}
              fullWidth
              style={s.saveBtn}
            />
          </View>
        </Section>

        {/* Notification Settings */}
        <Section title="알림">
          <SettingRow
            icon="notifications-outline"
            label="푸시 알림"
            value={
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.steel[200], true: Colors.success }}
                thumbColor={Colors.white}
              />
            }
          />
        </Section>

        {/* App Information */}
        <Section title="앱 정보">
          <SettingRow icon="information-circle-outline" label="앱 버전" value="1.0.0" />
          <View style={s.divider} />
          <SettingRow
            icon="open-outline"
            label="개발사"
            value="Sideline"
          />
          <View style={s.divider} />
          <SettingRow
            icon="globe-outline"
            label="웹사이트"
            value="www.sideline.com"
          />
        </Section>

        {/* Legal */}
        <Section title="법적 정보">
          <SettingRow
            icon="document-text-outline"
            label="이용약관"
            onPress={() => Alert.alert('이용약관', '준비 중입니다')}
          />
          <View style={s.divider} />
          <SettingRow
            icon="shield-outline"
            label="개인정보처리방침"
            onPress={() => Alert.alert('개인정보처리방침', '준비 중입니다')}
          />
        </Section>

        {/* Debug Info */}
        <View style={s.debugSection}>
          <Text style={s.debugTitle}>디버그 정보</Text>
          <View style={s.debugContent}>
            <Text style={s.debugText}>User ID: {profile?.id || 'N/A'}</Text>
            <Text style={s.debugText}>Company ID: {profile?.company_id || 'N/A'}</Text>
            <Text style={s.debugText}>Role: {profile?.role || 'N/A'}</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.text },
  content: { flex: 1, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.lg },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { fontSize: FontSize.base, fontWeight: '700', color: Colors.steel[700], marginBottom: Spacing.md, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: { gap: 0 },
  profileInputs: { gap: 0, padding: 0 },
  saveBtn: { marginTop: Spacing.lg },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md },
  settingContent: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  settingIcon: { marginRight: Spacing.md },
  settingLabel: { fontSize: FontSize.base, fontWeight: '600', color: Colors.text },
  settingValue: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.xs },
  divider: { height: 1, backgroundColor: Colors.border },
  debugSection: { backgroundColor: Colors.steel[50], borderRadius: BorderRadius.lg, padding: Spacing.lg, marginBottom: Spacing.xl, borderWidth: 1, borderColor: Colors.border },
  debugTitle: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.steel[600], marginBottom: Spacing.md, textTransform: 'uppercase' },
  debugContent: { gap: Spacing.sm },
  debugText: { fontSize: FontSize.xs, color: Colors.steel[600], fontFamily: 'monospace' },
})
