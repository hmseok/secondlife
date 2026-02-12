import React from 'react'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { AuthStackParamList } from './types'

import LoginScreen from '../screens/auth/LoginScreen'
import SignupAdminScreen from '../screens/auth/SignupAdminScreen'
import SignupFounderScreen from '../screens/auth/SignupFounderScreen'
import SignupEmployeeScreen from '../screens/auth/SignupEmployeeScreen'

const Stack = createNativeStackNavigator<AuthStackParamList>()

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen
        name="SignupAdmin"
        component={SignupAdminScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="SignupFounder"
        component={SignupFounderScreen}
        options={{ presentation: 'modal' }}
      />
      <Stack.Screen
        name="SignupEmployee"
        component={SignupEmployeeScreen}
        options={{ presentation: 'modal' }}
      />
    </Stack.Navigator>
  )
}
