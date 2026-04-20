// Copyright (c) 2024-2026 Pramod Singh Manyal. All rights reserved.
// Unauthorized copying, modification, or distribution of this file,
// via any medium, is strictly prohibited. Proprietary and confidential.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import LoginScreen from './screens/LoginScreen';
import DashboardScreen from './screens/DashboardScreen';
import CoursesScreen from './screens/CoursesScreen';
import LessonsScreen from './screens/LessonsScreen';
import LessonDetailScreen from './screens/LessonDetailScreen';
import GradesScreen from './screens/GradesScreen';
import AssignmentsScreen from './screens/AssignmentsScreen';
import TakeAssessmentScreen from './screens/TakeAssessmentScreen';
import AssessmentResultsScreen from './screens/AssessmentResultsScreen';
import TakeQuizScreen from './screens/TakeQuizScreen';
import OfflineScreen from './screens/OfflineScreen';
import ProfileScreen from './screens/ProfileScreen';
import FeesScreen from './screens/FeesScreen';
import MessagingScreen from './screens/MessagingScreen';
import {
  AdminDashboardScreen,
  AdminPeopleScreen,
  NoticeBoardScreen,
  ParentChildrenScreen,
  ParentDashboardScreen,
  ParentFeesScreen,
  TeacherStudentsScreen,
  TeacherDashboardScreen,
  TimetableScreen,
} from './screens/role-dashboard-screens';
import {
  clearTokens,
  getAuthToken,
  getCurrentUser,
  saveCurrentUser,
  User,
  UserRole,
  usersAPI,
} from './lib/api';
import { Colors } from './constants/theme';
import { configureNotificationBehavior, registerForPushNotificationsAsync } from './lib/notifications';

const RootStack = createNativeStackNavigator();
const InnerStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function tabIcon(name: string, focused: boolean) {
  const icons: Record<string, [string, string]> = {
    Home: ['🏠', '🏡'],
    Courses: ['📚', '📖'],
    Grades: ['📊', '📈'],
    Assignments: ['📝', '✏️'],
    Fees: ['💳', '💰'],
    Messages: ['💬', '🗨️'],
    Timetable: ['🗓️', '📆'],
    People: ['👥', '🧑‍🤝‍🧑'],
    Children: ['👶', '🧒'],
    Notices: ['📢', '📣'],
    Offline: ['📥', '💾'],
    Profile: ['👤', '🧑'],
  };

  const [inactive, active] = icons[name] || ['⚪', '🔵'];
  return focused ? active : inactive;
}

function commonTabOptions(routeName: string) {
  const RNText = require('react-native').Text;
  return {
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
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' as const },
    tabBarIcon: ({ focused }: { focused: boolean }) => (
      <RNText style={{ fontSize: 21 }}>{tabIcon(routeName, focused)}</RNText>
    ),
  };
}

function DashboardStackNavigator() {
  return (
    <InnerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <InnerStack.Screen name="DashHome" component={DashboardScreen} options={{ headerShown: false }} />
      <InnerStack.Screen name="Lessons" component={LessonsScreen} options={{ title: 'Lessons' }} />
      <InnerStack.Screen name="LessonDetail" component={LessonDetailScreen} options={{ title: 'Lesson Detail' }} />
      <InnerStack.Screen name="TakeQuiz" component={TakeQuizScreen} options={{ title: 'Quiz' }} />
    </InnerStack.Navigator>
  );
}

function AssignmentsStackNavigator() {
  return (
    <InnerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <InnerStack.Screen name="AssignmentsList" component={AssignmentsScreen} options={{ headerShown: false }} />
      <InnerStack.Screen name="TakeAssessment" component={TakeAssessmentScreen} options={{ title: 'Assessment' }} />
      <InnerStack.Screen name="AssessmentResults" component={AssessmentResultsScreen} options={{ title: 'Result' }} />
    </InnerStack.Navigator>
  );
}

function CoursesStackNavigator() {
  return (
    <InnerStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800', fontSize: 18 },
      }}
    >
      <InnerStack.Screen name="CoursesList" component={CoursesScreen} options={{ title: 'My Subjects' }} />
      <InnerStack.Screen name="Lessons" component={LessonsScreen} options={{ title: 'Lessons' }} />
      <InnerStack.Screen name="LessonDetail" component={LessonDetailScreen} options={{ title: 'Lesson Detail' }} />
      <InnerStack.Screen name="TakeQuiz" component={TakeQuizScreen} options={{ title: 'Quiz' }} />
    </InnerStack.Navigator>
  );
}

function StudentTabs({
  user,
  onLogout,
  onUserUpdated,
}: {
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}) {
  return (
    <Tab.Navigator screenOptions={({ route }) => commonTabOptions(route.name)}>
      <Tab.Screen name="Home" component={DashboardStackNavigator} />
      <Tab.Screen name="Courses" component={CoursesStackNavigator} />
      <Tab.Screen name="Grades" component={GradesScreen} />
      <Tab.Screen name="Fees" component={FeesScreen} />
      <Tab.Screen name="Assignments" component={AssignmentsStackNavigator} />
      <Tab.Screen name="Notices">
        {() => <NoticeBoardScreen role="student" />}
      </Tab.Screen>
      <Tab.Screen name="Timetable">
        {() => <TimetableScreen role="student" />}
      </Tab.Screen>
      <Tab.Screen name="Messages" component={MessagingScreen} />
      <Tab.Screen
        name="Offline"
        component={OfflineScreen}
        initialParams={{ browseRoute: 'Courses' }}
      />
      <Tab.Screen name="Profile">
        {() => <ProfileScreen user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function TeacherTabs({
  user,
  onLogout,
  onUserUpdated,
}: {
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}) {
  return (
    <Tab.Navigator screenOptions={({ route }) => commonTabOptions(route.name)}>
      <Tab.Screen name="Home" component={TeacherDashboardScreen} />
      <Tab.Screen name="People" component={TeacherStudentsScreen} />
      <Tab.Screen name="Timetable">
        {() => <TimetableScreen role="teacher" />}
      </Tab.Screen>
      <Tab.Screen name="Notices">
        {() => <NoticeBoardScreen role="teacher" />}
      </Tab.Screen>
      <Tab.Screen name="Messages" component={MessagingScreen} />
      <Tab.Screen name="Offline" component={OfflineScreen} />
      <Tab.Screen name="Profile">
        {() => <ProfileScreen user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function ParentTabs({
  user,
  onLogout,
  onUserUpdated,
}: {
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}) {
  return (
    <Tab.Navigator screenOptions={({ route }) => commonTabOptions(route.name)}>
      <Tab.Screen name="Home" component={ParentDashboardScreen} />
      <Tab.Screen name="Children" component={ParentChildrenScreen} />
      <Tab.Screen name="Fees" component={ParentFeesScreen} />
      <Tab.Screen name="Notices">
        {() => <NoticeBoardScreen role="parent" />}
      </Tab.Screen>
      <Tab.Screen name="Timetable">
        {() => <TimetableScreen role="parent" />}
      </Tab.Screen>
      <Tab.Screen name="Messages" component={MessagingScreen} />
      <Tab.Screen name="Offline" component={OfflineScreen} />
      <Tab.Screen name="Profile">
        {() => <ProfileScreen user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function AdminTabs({
  role,
  user,
  onLogout,
  onUserUpdated,
}: {
  role: UserRole;
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}) {
  const timetableRole: UserRole = role === 'staff' ? 'staff' : role;

  return (
    <Tab.Navigator screenOptions={({ route }) => commonTabOptions(route.name)}>
      <Tab.Screen name="Home" component={AdminDashboardScreen} />
      <Tab.Screen name="People" component={AdminPeopleScreen} />
      <Tab.Screen name="Timetable">
        {() => <TimetableScreen role={timetableRole} />}
      </Tab.Screen>
      <Tab.Screen name="Notices">
        {() => <NoticeBoardScreen role={timetableRole} />}
      </Tab.Screen>
      <Tab.Screen name="Profile">
        {() => <ProfileScreen user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

function RoleTabs({
  user,
  onLogout,
  onUserUpdated,
}: {
  user: User;
  onLogout: () => void;
  onUserUpdated: (user: User) => void;
}) {
  const role = user.role;

  if (role === 'teacher') {
    return <TeacherTabs user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />;
  }

  if (role === 'parent') {
    return <ParentTabs user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />;
  }

  if (role === 'admin' || role === 'staff' || role === 'saas_admin') {
    return <AdminTabs role={role} user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />;
  }

  return <StudentTabs user={user} onLogout={onLogout} onUserUpdated={onUserUpdated} />;
}

// ─── Root App ─────────────────────────────────────────────────
// Configure foreground notification behaviour once at module load.
configureNotificationBehavior();

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  const checkAuth = useCallback(async () => {
    setChecking(true);

    const token = await getAuthToken();
    if (!token) {
      setIsAuthenticated(false);
      setCurrentUser(null);
      setChecking(false);
      return;
    }

    const storedUser = await getCurrentUser();
    if (storedUser) {
      // Immediately unblock UI with cached session while we refresh profile in background.
      setCurrentUser(storedUser);
      setIsAuthenticated(true);
      setChecking(false);
    }

    try {
      const freshUser = await usersAPI.getMe();
      await saveCurrentUser(freshUser);
      setCurrentUser(freshUser);
      setIsAuthenticated(true);
      // Register for push notifications after a confirmed authenticated session.
      registerForPushNotificationsAsync().catch(() => {});
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message.toLowerCase() : '';
      const authError =
        message.includes('401') ||
        message.includes('403') ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('token');

      if (!storedUser || authError) {
        await clearTokens();
        setIsAuthenticated(false);
        setCurrentUser(null);
      }
      // For network/timeout errors with cached user, keep the session visible.
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const handleLogout = useCallback(async () => {
    await clearTokens();
    setIsAuthenticated(false);
    setCurrentUser(null);
  }, []);

  const handleLoginSuccess = useCallback((user: User) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  }, []);

  const handleUserUpdated = useCallback((user: User) => {
    setCurrentUser(user);
  }, []);

  const appContent = useMemo(() => {
    if (checking) {
      return (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.loadingBrand}>Preparing workspace...</Text>
        </View>
      );
    }

    if (isAuthenticated && currentUser) {
      return <RoleTabs user={currentUser} onLogout={handleLogout} onUserUpdated={handleUserUpdated} />;
    }

    return (
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        <RootStack.Screen name="Login">
          {() => <LoginScreen onLoginSuccess={handleLoginSuccess} />}
        </RootStack.Screen>
      </RootStack.Navigator>
    );
  }, [checking, isAuthenticated, currentUser, handleLoginSuccess, handleLogout, handleUserUpdated]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
        <NavigationContainer>{appContent}</NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  loadingBrand: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.95)',
    fontWeight: '700',
  },
});
