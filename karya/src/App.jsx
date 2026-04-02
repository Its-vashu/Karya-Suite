/**
 * Intranet App
 * @format
 */

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar, View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './AuthContext';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import NetInfo from '@react-native-community/netinfo';

// Import screens
import Loginpage from './Loginpage';
import HomeScreen from './HomeScreen';
import TimesheetScreen from './TimesheetScreen';
import LeaveManagementScreen from './LeaveManagementScreen';
import ProfileScreen from './profilescreen';
import Calendar from './Calendar';
import PoliciesView from './Policiesview';
import BackgroundCheckForm from './BackgroundCheckForm';
import AiTrackerPage from './Tracker/AiTracker.jsx';
import Settings from './Settings';
import HelpSupportScreen from './HelpSupportScreen';
import UserDetails from './UserDetails';
import About from './About';
import Appreciation from './appreciation/Appreciation';
import ExpenseScreen from './Expenses/ExpenseScreen';

// Create a single stack for all routes
const Stack = createNativeStackNavigator();

// Loading screen component
const LoadingScreen = () => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#2b6cb0" />
    <Text style={styles.loadingText}>Loading...</Text>
  </View>
);

// Network error screen component
const NetworkErrorScreen = ({ onRetry }) => (
  <View style={styles.errorContainer}>
    <Text style={styles.errorTitle}>Connection Error</Text>
    <Text style={styles.errorText}>
      Unable to connect to the server. Please check your internet connection and try again.
    </Text>
    <Text style={styles.retryButton} onPress={onRetry}>
      Retry
    </Text>
  </View>
);

// Main navigation component
const MainNavigation = ({ isAuthenticated }) => (
  <Stack.Navigator 
    initialRouteName={isAuthenticated ? "Home" : "Login"}
    screenOptions={{ headerShown: false }}
  >
    {!isAuthenticated ? (
      // Auth screens
      <Stack.Screen name="Login" component={Loginpage} />
    ) : (
      // App screens
      <>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Login" component={Loginpage} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Timesheet" component={TimesheetScreen} />
        <Stack.Screen name="LeaveManagement" component={LeaveManagementScreen} />
        <Stack.Screen name="Calendar" component={Calendar} />
        <Stack.Screen name="PoliciesView" component={PoliciesView} />
        <Stack.Screen name="BackgroundCheckForm" component={BackgroundCheckForm} />
        <Stack.Screen name="AITracker" component={AiTrackerPage} />
        <Stack.Screen name="Expenses" component={ExpenseScreen} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="Help" component={HelpSupportScreen} />
        <Stack.Screen name="UserDetails" component={UserDetails} />
        <Stack.Screen name="About" component={About} />
        <Stack.Screen name="Appreciation" component={Appreciation} />
      </>
    )}
  </Stack.Navigator>
);

// Navigation container with authentication flow
const AppNavigator = () => {
  const { isAuthenticated, loading, authError, user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  
  // Properly check authentication - both token and user must exist
  const userIsAuthenticated = isAuthenticated();
  
  // Debug logging
  useEffect(() => {
    console.log('🔐 Auth Status:', {
      isAuthenticated: userIsAuthenticated,
      hasUser: !!user,
      hasToken: !!token,
      loading
    });
  }, [userIsAuthenticated, user, token, loading]);

  // Check network connectivity
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // Handle retry when network is unavailable
  const handleRetry = () => {
    setRetryCount(prevCount => prevCount + 1);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isConnected) {
    return <NetworkErrorScreen onRetry={handleRetry} />;
  }

  return (
    <NavigationContainer>
      <MainNavigation isAuthenticated={userIsAuthenticated} />
    </NavigationContainer>
  );
};

const ThemedStatusBar = () => {
  const { theme } = useTheme();
  // Choose barStyle based on theme
  const barStyle = theme.name === 'dark' ? 'light-content' : 'dark-content';
  return <StatusBar barStyle={barStyle} backgroundColor={theme.colors.primary} />;
};

const App = () => {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedStatusBar />
        <AuthProvider>
          <AppNavigator />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#333',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#e53e3e',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    fontSize: 16,
    color: '#fff',
    backgroundColor: '#2b6cb0',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
    overflow: 'hidden',
  },
});

export default App;
