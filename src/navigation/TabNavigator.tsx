import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, StyleSheet } from 'react-native';
import { Home, List, Package, User } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { DashboardScreen } from '../screens/DashboardScreen';
import { QueueScreen } from '../screens/QueueScreen';
import { EarningsScreen } from '../screens/EarningsScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { useLanguage } from '../context/LanguageContext';
import { IncomingBookingOverlay } from '../components/IncomingBookingOverlay';

const Tab = createBottomTabNavigator();

export function TabNavigator() {
  const { t } = useLanguage();

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarLabelStyle: styles.tabLabel,
          tabBarIcon: ({ color, size }) => {
            if (route.name === 'Home') return <Home size={size} color={color} />;
            if (route.name === 'Queue') return <List size={size} color={color} />;
            if (route.name === 'Earnings') return <Package size={size} color={color} />;
            if (route.name === 'Profile') return <User size={size} color={color} />;
            return null;
          },
        })}
      >
        <Tab.Screen name="Home" component={DashboardScreen} options={{ tabBarLabel: t('tabHome') }} />
        <Tab.Screen name="Queue" component={QueueScreen} options={{ tabBarLabel: t('tabQueue') }} />
        <Tab.Screen name="Earnings" component={EarningsScreen} options={{ tabBarLabel: t('myJobsTitle') }} />
        <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t('tabProfile') }} />
      </Tab.Navigator>
      <IncomingBookingOverlay />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    paddingBottom: 8,
    height: 70,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 4,
  },
});
