import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SecureStore from 'expo-secure-store';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import CoursesScreen from './screens/CoursesScreen';
import LessonsScreen from './screens/LessonsScreen';
import GradesScreen from './screens/GradesScreen';
import OfflineScreen from './screens/OfflineScreen';
import { clearTokens } from './lib/api';
import { Colors } from './constants/theme';

// ─── Navigator Types ──────────────────────────────────────────
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ─── Bottom Tab Icons ─────────────────────────────────────────
function tabIcon(name: string, focused: boolean) {
  const icons: Record<string, [string, string]> = {
    Dashboard: ['🏠', '🏡'],
    Courses: ['📚', '📖'],
    Grades: ['📊', '📈'],
    Offline: ['📥', '💾'],
  };
  const [inactive, active] = icons[name] || ['⚪', '🔵'];
  return focused ? active : inactive;
}

// ─── Tab Navigator (after login) ─────────────────────────────
function StudentTabs({ onLogout }: { onLogout: () => void }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: Colors.gray200,
          borderTopWidth: 1,
          height: 68,
          paddingBottom: 10,
          paddingTop: 6,
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.gray400,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ focused }) => {
          const Text = require('react-native').Text;
          return <Text style={{ fontSize: 22 }}>{tabIcon(route.name, focused)}</Text>;
        },
      })}
    >
      <Tab.Screen name="Dashboard" options={{ title: 'Home' }}>
        {(props) => (
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DashHome">
              {(p) => <DashboardScreen {...p} />}
            </Stack.Screen>
          </Stack.Navigator>
        )}
      </Tab.Screen>
      <Tab.Screen name="Courses" options={{ title: 'Subjects' }} component={CoursesScreenStack} />
      <Tab.Screen name="Grades" options={{ title: 'Grades' }} component={GradesScreen} />
      <Tab.Screen name="Offline" options={{ title: 'Offline' }} component={OfflineScreen} />
    </Tab.Navigator>
  );
}

// Wrapper stack for courses → lessons navigation
function CoursesScreenStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
        headerBackTitle: 'Back',
      }}
    >
      <Stack.Screen
        name="CoursesList"
        component={CoursesScreen}
        options={{ title: 'My Subjects' }}
      />
      <Stack.Screen
        name="Lessons"
        options={({ route }: any) => ({
          title: route.params?.subject?.name || 'Lessons',
        })}
      >
        {(props: any) => <LessonsScreen {...props} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}

// ─── Root App ─────────────────────────────────────────────────
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    try {
      const token = await SecureStore.getItemAsync('access_token');
      setIsAuthenticated(!!token);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = async () => {
    await clearTokens();
    setIsAuthenticated(false);
  };

  if (checking) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary }}>
        <ActivityIndicator color="#fff" size="large" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <NavigationContainer>
          {isAuthenticated ? (
            <StudentTabs onLogout={handleLogout} />
          ) : (
            <Stack.Navigator screenOptions={{ headerShown: false }}>
              <Stack.Screen name="Login">
                {() => <LoginScreen onLoginSuccess={() => setIsAuthenticated(true)} />}
              </Stack.Screen>
            </Stack.Navigator>
          )}
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
