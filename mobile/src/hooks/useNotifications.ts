import { useState, useCallback, useEffect } from 'react'
import { Platform, Alert } from 'react-native'
import messaging from '@react-native-firebase/messaging'
import notifee, { AndroidImportance, EventType } from '@notifee/react-native'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

export interface NotificationData {
  title?: string
  body?: string
  [key: string]: any
}

export interface NotificationState {
  fcmToken: string | null
  notification: NotificationData | null
  requestPermission: () => Promise<boolean>
  removeToken: () => Promise<boolean>
}

export const useNotifications = (): NotificationState => {
  const { user, profile } = useApp()
  const [fcmToken, setFcmToken] = useState<string | null>(null)
  const [notification, setNotification] = useState<NotificationData | null>(null)

  // Create Android notification channel
  const createAndroidChannel = useCallback(async () => {
    try {
      await notifee.createChannel({
        id: 'self-disruption',
        name: 'Self-Disruption',
        importance: AndroidImportance.HIGH,
        lights: [4282601983],
        vibration: true,
        sound: 'default',
      })
    } catch (error) {
      console.error('안드로이드 채널 생성 오류:', error)
    }
  }, [])

  // Request notification permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const authStatus = await messaging().requestPermission()
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL

      if (!enabled) {
        Alert.alert(
          '알림 권한 필요',
          '이 기능을 사용하려면 설정에서 알림 권한을 허용해주세요.',
          [{ text: '확인', onPress: () => {} }]
        )
        return false
      }

      return true
    } catch (error) {
      console.error('알림 권한 요청 오류:', error)
      Alert.alert('오류', '알림 권한을 요청하는 중 오류가 발생했습니다.')
      return false
    }
  }, [])

  // Get FCM token and save to database
  const getAndSaveToken = useCallback(async () => {
    try {
      if (!user?.id || !profile?.company_id) {
        console.warn('사용자 정보가 없어 토큰을 저장할 수 없습니다.')
        return
      }

      // Create Android channel
      if (Platform.OS === 'android') {
        await createAndroidChannel()
      }

      const token = await messaging().getToken()
      setFcmToken(token)

      // Get platform
      const platform = Platform.OS === 'ios' ? 'ios' : 'android'

      // Save to database
      try {
        const { data: existingToken, error: fetchError } = await supabase
          .from('device_tokens')
          .select('id')
          .eq('user_id', user.id)
          .eq('token', token)
          .single()

        if (!existingToken && !fetchError) {
          // Token exists, no need to insert
          return
        }

        const { error: insertError } = await supabase.from('device_tokens').insert([
          {
            user_id: user.id,
            company_id: profile.company_id,
            token,
            platform,
            created_at: new Date().toISOString(),
          },
        ])

        if (insertError) {
          console.error('토큰 저장 오류:', insertError.message)
        }
      } catch (dbError) {
        console.error('데이터베이스 오류:', dbError)
      }
    } catch (error) {
      console.error('토큰 조회 오류:', error)
      Alert.alert('오류', 'FCM 토큰을 가져올 수 없습니다.')
    }
  }, [user, profile, createAndroidChannel])

  // Remove token from database (on logout)
  const removeToken = useCallback(async (): Promise<boolean> => {
    try {
      if (!user?.id || !fcmToken) {
        console.warn('사용자 정보 또는 토큰이 없습니다.')
        return false
      }

      const { error } = await supabase
        .from('device_tokens')
        .delete()
        .eq('user_id', user.id)
        .eq('token', fcmToken)

      if (error) {
        console.error('토큰 제거 오류:', error.message)
        return false
      }

      setFcmToken(null)
      return true
    } catch (error) {
      console.error('토큰 제거 중 예외 발생:', error)
      return false
    }
  }, [user, fcmToken])

  // Handle foreground notifications
  useEffect(() => {
    const unsubscribe = messaging().onMessage(async (remoteMessage) => {
      try {
        const notificationData: NotificationData = {
          title: remoteMessage.notification?.title || '알림',
          body: remoteMessage.notification?.body || '',
          ...remoteMessage.data,
        }

        setNotification(notificationData)

        // Display foreground notification using notifee
        await notifee.displayNotification({
          title: notificationData.title,
          body: notificationData.body,
          android: {
            channelId: 'self-disruption',
            pressAction: {
              id: 'default',
            },
          },
          ios: {
            sound: 'default',
          },
        })
      } catch (error) {
        console.error('포그라운드 메시지 처리 오류:', error)
      }
    })

    return unsubscribe
  }, [])

  // Handle background tap on notification
  useEffect(() => {
    const unsubscribe = messaging().onNotificationOpenedApp((remoteMessage) => {
      try {
        if (remoteMessage?.notification) {
          const notificationData: NotificationData = {
            title: remoteMessage.notification.title || '알림',
            body: remoteMessage.notification.body || '',
            ...remoteMessage.data,
          }
          setNotification(notificationData)
          console.log('백그라운드에서 알림 탭:', notificationData)
        }
      } catch (error) {
        console.error('백그라운드 알림 처리 오류:', error)
      }
    })

    return unsubscribe
  }, [])

  // Handle notifee events (notification taps)
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(({ type, detail }) => {
      switch (type) {
        case EventType.PRESS:
          console.log('알림이 탭되었습니다:', detail.notification?.title)
          break
        case EventType.APP_BLOCKED:
          console.log('앱이 차단되었습니다.')
          break
        default:
          break
      }
    })

    return unsubscribe
  }, [])

  // Check initial notification on app launch
  useEffect(() => {
    const checkInitialNotification = async () => {
      try {
        const remoteMessage = await messaging().getInitialNotification()
        if (remoteMessage?.notification) {
          const notificationData: NotificationData = {
            title: remoteMessage.notification.title || '알림',
            body: remoteMessage.notification.body || '',
            ...remoteMessage.data,
          }
          setNotification(notificationData)
          console.log('초기 알림:', notificationData)
        }
      } catch (error) {
        console.error('초기 알림 확인 오류:', error)
      }
    }

    checkInitialNotification()
  }, [])

  // Get and save token when user is available
  useEffect(() => {
    if (user?.id && profile?.company_id) {
      getAndSaveToken()
    }
  }, [user?.id, profile?.company_id, getAndSaveToken])

  return {
    fcmToken,
    notification,
    requestPermission,
    removeToken,
  }
}
