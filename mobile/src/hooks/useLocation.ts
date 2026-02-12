import { useState, useCallback, useRef, useEffect } from 'react'
import { Platform, Alert } from 'react-native'
import Geolocation from '@react-native-community/geolocation'
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

export interface LocationCoordinates {
  latitude: number
  longitude: number
  accuracy: number
}

export interface LocationState {
  location: LocationCoordinates | null
  tracking: boolean
  getCurrentLocation: () => Promise<LocationCoordinates | null>
  startTracking: (intervalMs?: number) => Promise<void>
  stopTracking: () => void
  saveLocation: (coords: LocationCoordinates) => Promise<boolean>
}

export const useLocation = (): LocationState => {
  const { user, profile } = useApp()
  const [location, setLocation] = useState<LocationCoordinates | null>(null)
  const [tracking, setTracking] = useState(false)
  const watchIdRef = useRef<number | null>(null)

  // Get appropriate permission based on platform
  const getLocationPermission = () => {
    return Platform.OS === 'ios'
      ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
      : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION
  }

  // Request location permission
  const requestLocationPermission = async (): Promise<boolean> => {
    try {
      const permission = getLocationPermission()
      const checkResult = await check(permission)

      if (checkResult === RESULTS.GRANTED) {
        return true
      }

      if (checkResult === RESULTS.DENIED) {
        const requestResult = await request(permission)
        if (requestResult === RESULTS.GRANTED) {
          return true
        }
      }

      if (checkResult === RESULTS.BLOCKED || checkResult === RESULTS.UNAVAILABLE) {
        Alert.alert(
          '위치 권한 필요',
          '이 기능을 사용하려면 설정에서 위치 권한을 허용해주세요.',
          [{ text: '확인', onPress: () => {} }]
        )
        return false
      }

      return false
    } catch (error) {
      console.error('위치 권한 요청 오류:', error)
      Alert.alert('오류', '위치 권한을 요청하는 중 오류가 발생했습니다.')
      return false
    }
  }

  // Get current location
  const getCurrentLocation = useCallback(async (): Promise<LocationCoordinates | null> => {
    try {
      const hasPermission = await requestLocationPermission()
      if (!hasPermission) {
        return null
      }

      return new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          (position) => {
            const coords: LocationCoordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            }
            setLocation(coords)
            resolve(coords)
          },
          (error) => {
            console.error('현재 위치 조회 실패:', error)
            Alert.alert('오류', '현재 위치를 가져올 수 없습니다.')
            resolve(null)
          },
          {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 10000,
          }
        )
      })
    } catch (error) {
      console.error('getCurrentLocation 오류:', error)
      Alert.alert('오류', '위치 조회 중 오류가 발생했습니다.')
      return null
    }
  }, [])

  // Save location to database
  const saveLocation = useCallback(
    async (coords: LocationCoordinates): Promise<boolean> => {
      if (!user?.id || !profile?.company_id) {
        console.warn('사용자 정보가 없어 위치를 저장할 수 없습니다.')
        return false
      }

      try {
        const { error } = await supabase.from('location_history').insert([
          {
            user_id: user.id,
            company_id: profile.company_id,
            latitude: coords.latitude,
            longitude: coords.longitude,
            accuracy: coords.accuracy,
            created_at: new Date().toISOString(),
          },
        ])

        if (error) {
          console.error('위치 저장 오류:', error.message)
          return false
        }

        return true
      } catch (error) {
        console.error('위치 저장 중 예외 발생:', error)
        return false
      }
    },
    [user, profile]
  )

  // Start tracking location
  const startTracking = useCallback(
    async (intervalMs: number = 30000): Promise<void> => {
      try {
        const hasPermission = await requestLocationPermission()
        if (!hasPermission) {
          Alert.alert('오류', '위치 추적을 시작할 수 없습니다.')
          return
        }

        if (watchIdRef.current !== null) {
          console.warn('이미 위치 추적 중입니다.')
          return
        }

        setTracking(true)

        watchIdRef.current = Geolocation.watchPosition(
          async (position) => {
            const coords: LocationCoordinates = {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            }
            setLocation(coords)

            // Save to database
            await saveLocation(coords)
          },
          (error) => {
            console.error('위치 추적 오류:', error)
            setTracking(false)
            Alert.alert('오류', '위치 추적 중 오류가 발생했습니다.')
          },
          {
            enableHighAccuracy: true,
            distanceFilter: 10,
            interval: intervalMs,
            maximumAge: 0,
          }
        )
      } catch (error) {
        console.error('startTracking 오류:', error)
        setTracking(false)
        Alert.alert('오류', '위치 추적을 시작하는 중 오류가 발생했습니다.')
      }
    },
    [saveLocation]
  )

  // Stop tracking location
  const stopTracking = useCallback((): void => {
    try {
      if (watchIdRef.current !== null) {
        Geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      setTracking(false)
    } catch (error) {
      console.error('stopTracking 오류:', error)
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking()
    }
  }, [stopTracking])

  return {
    location,
    tracking,
    getCurrentLocation,
    startTracking,
    stopTracking,
    saveLocation,
  }
}
