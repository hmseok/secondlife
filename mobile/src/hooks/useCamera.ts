import { useState, useCallback } from 'react'
import { Platform, Alert } from 'react-native'
import { launchCamera, launchImageLibrary, ImagePickerResponse } from 'react-native-image-picker'
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions'
import { useApp } from '../context/AppContext'
import { supabase } from '../lib/supabase'

export interface ImageData {
  uri: string | null
  width?: number
  height?: number
  fileName?: string
  size?: number
  type?: string
}

export interface CameraState {
  takePhoto: () => Promise<ImageData | null>
  pickImage: () => Promise<ImageData | null>
  uploadImage: (
    uri: string,
    bucket: string,
    path: string
  ) => Promise<string | null>
  uploading: boolean
}

export const useCamera = (): CameraState => {
  const { user, profile } = useApp()
  const [uploading, setUploading] = useState(false)

  // Get appropriate camera permission based on platform
  const getCameraPermission = () => {
    return Platform.OS === 'ios'
      ? PERMISSIONS.IOS.CAMERA
      : PERMISSIONS.ANDROID.CAMERA
  }

  // Get appropriate photo library permission
  const getPhotoLibraryPermission = () => {
    return Platform.OS === 'ios'
      ? PERMISSIONS.IOS.PHOTO_LIBRARY
      : PERMISSIONS.ANDROID.READ_EXTERNAL_STORAGE
  }

  // Request camera permission
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      const permission = getCameraPermission()
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
          '카메라 권한 필요',
          '이 기능을 사용하려면 설정에서 카메라 권한을 허용해주세요.',
          [{ text: '확인', onPress: () => {} }]
        )
        return false
      }

      return false
    } catch (error) {
      console.error('카메라 권한 요청 오류:', error)
      Alert.alert('오류', '카메라 권한을 요청하는 중 오류가 발생했습니다.')
      return false
    }
  }

  // Request photo library permission
  const requestPhotoLibraryPermission = async (): Promise<boolean> => {
    try {
      const permission = getPhotoLibraryPermission()
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
          '사진 라이브러리 권한 필요',
          '이 기능을 사용하려면 설정에서 사진 라이브러리 권한을 허용해주세요.',
          [{ text: '확인', onPress: () => {} }]
        )
        return false
      }

      return false
    } catch (error) {
      console.error('사진 라이브러리 권한 요청 오류:', error)
      Alert.alert('오류', '사진 라이브러리 권한을 요청하는 중 오류가 발생했습니다.')
      return false
    }
  }

  // Extract image data from response
  const extractImageData = (response: ImagePickerResponse): ImageData | null => {
    if (response.didCancel) {
      console.log('사용자가 작업을 취소했습니다.')
      return null
    }

    if (response.errorCode) {
      console.error('이미지 선택 오류:', response.errorMessage)
      Alert.alert('오류', '이미지를 선택할 수 없습니다.')
      return null
    }

    if (!response.assets || response.assets.length === 0) {
      console.warn('선택된 이미지가 없습니다.')
      return null
    }

    const asset = response.assets[0]

    return {
      uri: asset.uri || null,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName,
      size: asset.fileSize,
      type: asset.type,
    }
  }

  // Take a photo with camera
  const takePhoto = useCallback(async (): Promise<ImageData | null> => {
    try {
      const hasPermission = await requestCameraPermission()
      if (!hasPermission) {
        return null
      }

      return new Promise((resolve) => {
        launchCamera(
          {
            mediaType: 'photo',
            quality: 0.8,
            cameraType: 'back',
            saveToPhotos: true,
          },
          (response) => {
            const imageData = extractImageData(response)
            resolve(imageData)
          }
        )
      })
    } catch (error) {
      console.error('카메라 실행 오류:', error)
      Alert.alert('오류', '카메라를 실행할 수 없습니다.')
      return null
    }
  }, [])

  // Pick image from library
  const pickImage = useCallback(async (): Promise<ImageData | null> => {
    try {
      const hasPermission = await requestPhotoLibraryPermission()
      if (!hasPermission) {
        return null
      }

      return new Promise((resolve) => {
        launchImageLibrary(
          {
            mediaType: 'photo',
            quality: 0.8,
            selectionLimit: 1,
          },
          (response) => {
            const imageData = extractImageData(response)
            resolve(imageData)
          }
        )
      })
    } catch (error) {
      console.error('이미지 라이브러리 실행 오류:', error)
      Alert.alert('오류', '이미지 라이브러리를 열 수 없습니다.')
      return null
    }
  }, [])

  // Upload image to Supabase Storage
  const uploadImage = useCallback(
    async (uri: string, bucket: string, path: string): Promise<string | null> => {
      if (!user?.id || !profile?.company_id) {
        Alert.alert('오류', '사용자 정보가 없어 업로드할 수 없습니다.')
        return null
      }

      setUploading(true)

      try {
        // Extract file name and extension
        const fileName = path.split('/').pop() || `image_${Date.now()}.jpg`
        const fullPath = `${profile.company_id}/${user.id}/${fileName}`

        // Convert file URI to blob
        const response = await fetch(uri)
        if (!response.ok) {
          throw new Error('이미지 파일을 읽을 수 없습니다.')
        }

        const blob = await response.blob()

        // Upload to Supabase Storage
        const { error: uploadError, data } = await supabase.storage
          .from(bucket)
          .upload(fullPath, blob, {
            cacheControl: '3600',
            upsert: false,
          })

        if (uploadError) {
          console.error('업로드 오류:', uploadError.message)
          Alert.alert('오류', '이미지 업로드에 실패했습니다.')
          return null
        }

        // Get public URL
        const { data: publicData } = supabase.storage
          .from(bucket)
          .getPublicUrl(fullPath)

        if (!publicData?.publicUrl) {
          throw new Error('공개 URL을 생성할 수 없습니다.')
        }

        return publicData.publicUrl
      } catch (error) {
        console.error('uploadImage 오류:', error)
        Alert.alert('오류', '이미지 업로드 중 오류가 발생했습니다.')
        return null
      } finally {
        setUploading(false)
      }
    },
    [user, profile]
  )

  return {
    takePhoto,
    pickImage,
    uploadImage,
    uploading,
  }
}
