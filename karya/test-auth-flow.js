/**
 * Test Authentication Flow Script
 * Run this in React Native Debugger Console to test login flow
 */

// Test 1: Check current auth state
console.log('=== AUTH STATE TEST ===');
AsyncStorage.getItem('authToken').then(token => {
  console.log('authToken:', token ? 'EXISTS' : 'NOT FOUND');
});
AsyncStorage.getItem('userData').then(data => {
  console.log('userData:', data ? 'EXISTS' : 'NOT FOUND');
  if (data) console.log('User:', JSON.parse(data).username);
});

// Test 2: Clear all auth data (simulate fresh install)
const clearAuth = async () => {
  await AsyncStorage.multiRemove(['authToken', 'userData', 'user', 'refreshToken']);
  console.log('✅ All auth data cleared! App should now show Login screen.');
  console.log('Please reload the app to see changes.');
};

// Test 3: Check what's stored
const checkStorage = async () => {
  const keys = await AsyncStorage.getAllKeys();
  console.log('All AsyncStorage keys:', keys);
  
  for (const key of keys) {
    const value = await AsyncStorage.getItem(key);
    console.log(`${key}:`, value?.substring(0, 50) + '...');
  }
};

// Usage:
// clearAuth();     // Clear and test fresh login
// checkStorage();  // See what's stored
