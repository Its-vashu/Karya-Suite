// src/SplashScreen.jsx
import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { useTheme } from './theme/ThemeContext';

const SplashScreen = () => {
  const { theme } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}> 
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={[styles.text, { color: theme.colors.muted }]}>Loading session...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    marginTop: 12,
    fontSize: 16,
  }
});

export default SplashScreen;