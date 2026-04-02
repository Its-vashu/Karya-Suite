/**
 * Professional Enterprise Login Page Component
 * Matching web portal design for cohesive brand experience
 * @format
 */
import React, { useState, useEffect, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  StyleSheet,
  Alert,
  Image,
  Dimensions,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Animated,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from './AuthContext';
import { authAPI } from './api'; // CORRECT: Import the central API service

const { width, height } = Dimensions.get('window');

/**
 * Login Screen Component
 * Handles user authentication and provides a responsive interface
 */
const Loginpage = () => {
  // Hooks
  const navigation = useNavigation();
  const { login } = useAuth();
  
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const errorTimeoutRef = useRef(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'employee',
  });
  const [showPassword, setShowPassword] = useState(false);
  
  // Animation values
  const fadeAnim = useState(new Animated.Value(0))[0];
  const slideAnim = useState(new Animated.Value(30))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];
  const focusShift = useRef(new Animated.Value(0)).current;
  
  /**
   * Setup animations and event listeners when component mounts
   */
  useEffect(() => {
    // Initial entrance animations
    const setupEntranceAnimations = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800, // Using a fixed value
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800, // Using a fixed value
          useNativeDriver: true,
        })
      ]).start();
    };
    
    // Logo pulse animation
    const setupPulseAnimation = () => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };
    
    // Setup keyboard visibility detection
    const keyboardDidShowListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    
    const keyboardDidHideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
        // Reset focus shift animation when keyboard hides
        Animated.timing(focusShift, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      }
    );

    // Initialize animations
    setupEntranceAnimations();
    setupPulseAnimation();
    
    // Cleanup function
    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
      }
    };
  }, [fadeAnim, slideAnim, pulseAnim]);

  /**
   * Handle form input changes with validation
   * Provides immediate feedback for input fields
   */
  const handleInputChange = useCallback((field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear any existing errors when typing
    if (error) {
      setError('');
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
    }
    
  // Optional: Add real-time validation feedback
  // if (field === 'username' && value && !value.match(/^[a-zA-Z0-9_@.-]{2,}$/)) {
  //   setError('Username must be at least 2 characters and contain only letters, numbers, and _ @ . -');
  // }
  }, [error]);

  /**
   * Handle user authentication using the central authAPI service
   * Enhanced with better error detection and user feedback
   */
  const handleLogin = useCallback(async () => {
    // Form validation with specific messages
    if (formData.username.trim() === '') {
      setError('Username is required.');
      return;
    }
    
    if (formData.password.trim() === '') {
      setError('Password is required.');
      return;
    }

    // Minimum length validation
    if (formData.username.trim().length < 2) {
      setError('Username must be at least 2 characters.');
      return;
    }

    if (formData.password.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Use the login function from our central api.js file
      const data = await authAPI.login(formData.username, formData.password);

      if (data?.access_token) {
        // Extract user info and make sure we have the ID
        const userInfo = {
          username: formData.username,
          email: data.user?.email,
          id: data.user?.id,
          role: data.user?.role || 'employee',
          ...(data.user || {}),
        };
        
        console.log('Logging in with user data:', JSON.stringify(userInfo));
        
        await login(data.access_token, userInfo);
        
        // Wait for auth context to update before navigation
        setTimeout(() => {
          setLoading(false); // Clear loading state after navigation
          // Reset navigation stack to prevent back button from returning to login
          navigation.reset({
            index: 0,
            routes: [{ name: 'Home' }],
          });
        }, 100);
        return; // Exit early to prevent finally block from clearing loading
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      console.error('Authentication failed:', err);
      
      // Enhanced error handling with specific messages
      if (err.message?.includes('Network Error')) {
        setError('Cannot connect to server. Please check your internet connection or contact IT support. (Try using the 10.0.2.2 API URL for emulators)');
      } else if (err.response?.status === 401) {
        setError('Invalid username or password. Please try again.');
      } else if (err.response?.status === 403) {
        setError('Your account does not have permission to access this application.');
      } else if (err.response?.status === 429) {
        setError('Too many login attempts. Please try again in a few minutes.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later or contact IT support.');
      } else {
        const detail = err.response?.data?.detail || 'Authentication failed. Please check your credentials.';
        setError(detail);
      }
      
      // Auto-clear error after 5 seconds
      errorTimeoutRef.current = setTimeout(() => {
        setError('');
      }, 5000);
    } finally {
      setLoading(false);
    }
  }, [formData, login, navigation]);

  /**
   * Handle forgot password action
   */
  const handleForgotPassword = useCallback(() => {
    Alert.alert(
      'Forgot Password',
      'Please contact your IT department to reset your password.'
    );
  }, []);

  // Move the card up slightly when input is focused so the SIGN IN button stays visible
  const handleInputFocus = useCallback((field) => {
    // Clear any existing error on focus
    if (error) {
      setError('');
      if (errorTimeoutRef.current) {
        clearTimeout(errorTimeoutRef.current);
        errorTimeoutRef.current = null;
      }
    }
    
    // Adjust the position based on which field is focused
    if (field === 'password') {
      const toValue = Platform.OS === 'ios' ? -90 : -120;
      Animated.timing(focusShift, {
        toValue,
        duration: 220,
        useNativeDriver: true,
      }).start();
    } else if (field === 'username') {
      const toValue = Platform.OS === 'ios' ? -50 : -80;
      Animated.timing(focusShift, {
        toValue,
        duration: 220,
        useNativeDriver: true,
      }).start();
    }
  }, [focusShift, error]);

  const handleInputBlur = useCallback(() => {
    Animated.timing(focusShift, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [focusShift]);

  /**
   * Dismiss keyboard when tapping outside of inputs
   */
  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0a2c5d" />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoidingContainer}
      >
        <TouchableWithoutFeedback onPress={dismissKeyboard}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.innerContainer}>
            {/* Top Section - Logo removed for compact design */}
            <View style={styles.topSection}>
              <Animated.View 
                style={[
                  styles.logoContainer,
                  {
                    transform: [{ scale: pulseAnim }]
                  }
                ]}
              >
                <Text style={styles.companyName}>CONCIENTECH</Text>
                <Text style={styles.appName}>Employee Portal</Text>
              </Animated.View>
            </View>
            
            {/* Main Card Section */}
            <Animated.View 
              style={[
                styles.cardContainer, 
                {
                  opacity: fadeAnim,
                  transform: [
                    { translateY: slideAnim },
                    { translateY: focusShift }
                  ]
                }
              ]}
            >
              {/* Welcome Text */}
              <View style={styles.welcomeContainer}>
                <Text style={styles.welcomeText}>Welcome Back!</Text>
                <Text style={styles.welcomeSubtext}>Sign in to continue your journey with us</Text>
              </View>
              
              {/* Form Fields */}
              <View style={styles.formContainer}>
                {/* Username Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconContainer}>
                      <Icon name="account-outline" size={20} color="#0a2c5d" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your username"
                      placeholderTextColor="#A0AEC0"
                      value={formData.username}
                      onChangeText={(text) => handleInputChange('username', text)}
                      onFocus={() => handleInputFocus('username')}
                      onBlur={handleInputBlur}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      accessibilityLabel="Username input"
                      returnKeyType="next"
                      testID="login-username-input"
                    />
                  </View>
                </View>
                
                {/* Password Field */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={styles.inputWrapper}>
                    <View style={styles.inputIconContainer}>
                      <Icon name="lock-outline" size={20} color="#0a2c5d" />
                    </View>
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your password"
                      placeholderTextColor="#A0AEC0"
                      value={formData.password}
                      onChangeText={(text) => handleInputChange('password', text)}
                      onFocus={() => handleInputFocus('password')}
                      onBlur={handleInputBlur}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      accessibilityLabel="Password input"
                      returnKeyType="done"
                      onSubmitEditing={handleLogin}
                      testID="login-password-input"
                    />
                    <TouchableOpacity 
                      style={styles.eyeButton}
                      onPress={() => setShowPassword(prevState => !prevState)}
                      accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                      testID="password-visibility-toggle"
                    >
                      <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color="#2b6cb0" />
                    </TouchableOpacity>
                  </View>
                </View>
                
                {/* Forgot Password */}
                <TouchableOpacity 
                  style={styles.forgotPasswordContainer}
                  onPress={handleForgotPassword}
                >
                  <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                </TouchableOpacity>
                
                {/* Login Button */}
                <TouchableOpacity
                  style={[styles.loginButtonWrapper, loading && styles.loginButtonDisabled]}
                  onPress={handleLogin}
                  disabled={loading}
                  activeOpacity={0.85}
                  accessibilityLabel="Sign in button"
                  testID="login-button"
                >
                  <LinearGradient
                    colors={["#0a2c5d", "#215a9d"]}
                    start={[0, 0]}
                    end={[1, 1]}
                    style={styles.loginButton}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.loginButtonText}>SIGN IN</Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                
                {/* Error Message */}
                {error ? (
                  <Animated.View 
                    style={styles.errorContainer}
                    testID="error-message"
                  >
                    <Text style={styles.errorText}>{error}</Text>
                  </Animated.View>
                ) : null}
                
                {/* Help Text */}
                <View style={styles.helpContainer}>
                  <Text style={styles.helpText}>Need help? Contact IT Support</Text>
                </View>
              </View>
            </Animated.View>
            
            {/* Footer */}
            {!keyboardVisible && (
              <View style={styles.footer}>
                <Text style={styles.footerText}>© 2025 Concientech</Text>
                <Text style={styles.versionText}>v1.0.2</Text>
              </View>
            )}
          </View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a2c5d',
  },
  keyboardAvoidingContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    minHeight: height,
  },
  innerContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingBottom: 20,
  },
  topSection: {
    paddingTop: height * 0.06,
    alignItems: 'center',
    marginBottom: height * 0.04,
  },
  logoContainer: {
    alignItems: 'center',
  },
  companyLogo: {
    width: 80,
    height: 80,
    marginBottom: 8,
  },
  companyName: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  appName: {
    marginTop: 2,
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    letterSpacing: 0.5,
  },
  cardContainer: {
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 10,
    overflow: 'hidden',
    maxHeight: height * 0.7,
  },
  welcomeContainer: {
    backgroundColor: '#0a2c5d',
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  welcomeSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
  },
  formContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F7FAFC',
    overflow: 'visible',
    position: 'relative',
    height: 46,
  },
  inputIconContainer: {
    width: 40,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputIcon: {
    fontSize: 20,
    color: '#0a2c5d',
  },
  input: {
    flex: 1,
    paddingHorizontal: 8,
    paddingRight: 56, // leave room for the show/hide button so text doesn't underlap it
    fontSize: 16,
    color: '#2D3748',
    height: 46,
    textAlignVertical: 'center', // ensure Android vertically centers text
    includeFontPadding: false,
    paddingVertical: 0,
    lineHeight: 20,
  },
  eyeButton: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: 14,
    color: '#2b6cb0',
    fontWeight: '500',
    includeFontPadding: false,
  },
  inputIconContainer: {
    width: 40,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginButtonWrapper: {
    marginTop: 24,
    width: '80%',
    alignSelf: 'center',
    borderRadius: 25,
    overflow: 'hidden',
  },
  loginButton: {
    borderRadius: 25,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#2C5282',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
    width: '100%',
  },
  forgotPasswordContainer: {
    alignItems: 'flex-end',
    marginTop: 8,
    marginBottom: 20,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#2b6cb0',
    fontWeight: '500',
  },
  loginButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.1,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  errorContainer: {
    marginTop: 16,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  helpContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  helpText: {
    fontSize: 12,
    color: '#718096',
  },
  footer: {
    padding: 16,
    paddingBottom: 24,
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  versionText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.4)',
    marginTop: 2,
  },
});

export default Loginpage;