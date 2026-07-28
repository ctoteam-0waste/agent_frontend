import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../context/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { TabNavigator } from './TabNavigator';
import { JobFlowScreen } from '../screens/JobFlowScreen';
import { RedeemScreen } from '../screens/RedeemScreen';
import { RedeemHistoryScreen } from '../screens/RedeemHistoryScreen';
import { ActivityIndicator, View } from 'react-native';
import { colors } from '../theme/colors';

const Stack = createStackNavigator();

export function RootNavigator() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.primaryDeep, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="white" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!token ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={TabNavigator} />
            <Stack.Screen name="JobFlow" component={JobFlowScreen} />
            <Stack.Screen name="Redeem" component={RedeemScreen} />
            <Stack.Screen name="RedeemHistory" component={RedeemHistoryScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
