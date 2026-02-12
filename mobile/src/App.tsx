import React from 'react'
import { StatusBar } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AppProvider, useApp } from './context/AppContext'
import AppNavigator from './navigation/AppNavigator'
import LoadingScreen from './components/ui/LoadingScreen'

function AppContent() {
  const { loading } = useApp()

  if (loading) {
    return <LoadingScreen message="Self-Disruption 로딩 중..." />
  }

  return <AppNavigator />
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
          <AppProvider>
            <AppContent />
          </AppProvider>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
