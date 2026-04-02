import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator,
  Dimensions,
  Animated,
  Image,
  ImageBackground,
  Linking,
  Alert,
  Platform
} from 'react-native';
import { useAuth } from './AuthContext';
import { useIsFocused } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { API_BASE_URL_EXPORT as API_BASE_URL } from './api';

const { width } = Dimensions.get('window');

// Helper: Decode JWT token
function decodeToken(token) {
  if (!token) return null;
  try {
    const base64Payload = token.split('.')[1];
    if (!base64Payload) return null;
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');

    // Robust base64 decode: prefer atob, fallback to Buffer if available
    let decoded = null;
    if (typeof atob === 'function') {
      decoded = atob(padded);
    } else if (typeof Buffer !== 'undefined') {
      try {
        decoded = Buffer.from(padded, 'base64').toString('utf8');
      } catch (e) {
        decoded = null;
      }
    }

    if (!decoded) {
      // Last-resort: try a lightweight base64 decode (not ideal for all inputs)
      const binary = globalThis.atob ? globalThis.atob(padded) : null;
      decoded = binary || null;
    }

    if (!decoded) return null;
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Token decode error:', error);
    return null;
  }
}

const About = ({ navigation }) => {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [stats, setStats] = useState({
    employeesManaged: 0,
    activeProjects: 0,
    overallTasks: 0,
    pendingTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [currentModule, setCurrentModule] = useState(0);
  
  // Animated values
  const featureScrollX = useRef(new Animated.Value(0)).current;
  const testimonialsScrollX = useRef(new Animated.Value(0)).current;
  const moduleScrollX = useRef(new Animated.Value(0)).current;
  const moduleScrollRef = useRef(null);
  const featureScrollRef = useRef(null);
  const testimonialsScrollRef = useRef(null);

  // Auto-slide for testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => {
        const nextSlide = (prev + 1) % testimonials.length;
        return nextSlide;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Scroll testimonials ScrollView when currentSlide changes (auto or dot tap)
  useEffect(() => {
    const x = Math.round(currentSlide * (width - 40));
    testimonialsScrollRef.current?.scrollTo({ x, animated: true });
  }, [currentSlide]);

  // Auto-slide for feature cards
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => {
        const nextFeature = (prev + 1) % features.length;
        return nextFeature;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Scroll features ScrollView when currentFeature changes
  useEffect(() => {
    const x = Math.round(currentFeature * (width - 40));
    featureScrollRef.current?.scrollTo({ x, animated: true });
  }, [currentFeature]);

  // Fetch data when screen is focused
  useEffect(() => {
    if (isFocused) {
      fetchStats();
    }
  }, [isFocused]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get token from AsyncStorage
      const token = await AsyncStorage.getItem('authToken');
      
      if (!token) {
        setLoading(false);
        return;
      }

      // Use try/catch for each API call to handle individual failures
      let employeeCount = 0;
      let projectCount = 0;
      let totalTasks = 0;
      let pendingTaskCount = 0;

      try {
        // Fetch all users from user-details API
        const usersResponse = await fetch(`${API_BASE_URL}/user-details/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (usersResponse.ok) {
          const users = await usersResponse.json();
          employeeCount = Array.isArray(users) ? users.length : 0;
        }
      } catch (error) {
        console.error('Error fetching users:', error);
      }

      try {
        // Fetch projects
        const projectsResponse = await fetch(`${API_BASE_URL}/user-details/projects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (projectsResponse.ok) {
          const projects = await projectsResponse.json();
          projectCount = Array.isArray(projects) ? projects.length : 0;
        }
      } catch (error) {
        console.error('Error fetching projects:', error);
      }

      try {
        // Fetch timesheets
        const timesheetsResponse = await fetch(`${API_BASE_URL}/timesheets/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (timesheetsResponse.ok) {
          const timesheets = await timesheetsResponse.json();
          totalTasks = Array.isArray(timesheets) ? timesheets.length : 0;
          pendingTaskCount = Array.isArray(timesheets) 
            ? timesheets.filter(sheet => sheet.status === 'pending' || !sheet.end_time).length 
            : 0;
        }
      } catch (error) {
        console.error('Error fetching timesheets:', error);
      }

      setStats({
        employeesManaged: employeeCount,
        activeProjects: projectCount,
        overallTasks: totalTasks,
        pendingTasks: pendingTaskCount
      });
    } catch (error) {
      console.error('Error in fetchStats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle module slide
  const handleModuleSlide = (direction) => {
    // compute new index and scroll to the corresponding card
    let newIndex = currentModule;
    if (direction === 'next') {
      newIndex = (currentModule + 1) % modules.length;
    } else {
      newIndex = (currentModule - 1 + modules.length) % modules.length;
    }
    setCurrentModule(newIndex);
    const x = Math.round(newIndex * (width * 0.85));
    moduleScrollRef.current?.scrollTo({ x, animated: true });
  };

  // Handle external links
  const handleStartJourney = async () => {
    const url = 'https://concientech.com/';
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        // fallback: navigate to Contact within the app
        Alert.alert(
          'Cannot open link',
          'Opening contact page instead.',
          [{ text: 'OK', onPress: () => navigation.navigate('Contact') }]
        );
      }
    } catch (error) {
      console.error('Error opening URL:', error);
      Alert.alert(
        'Error',
        'Unable to open the website. You can contact us from the Contact page.',
        [{ text: 'Open Contact', onPress: () => navigation.navigate('Contact') }, { text: 'OK' }]
      );
    }
  };

  const handleContactExpert = () => {
    navigation.navigate('Help');
  };

  const testimonials = [
    {
      text: "ConcienTech Solution has completely transformed how we manage our workforce. The AI-powered insights have improved our decision-making process significantly.",
      author: "Rajesh Kumar",
      role: "HR Manager",
      company: "Tech Innovations Pvt Ltd",
      rating: 5,
        image: "account-tie"
    },
    {
      text: "Excellent platform with intuitive design. The timesheet management and employee portal features are outstanding. Highly recommend!",
      author: "Priya Sharma",
      role: "Operations Director",
      company: "Digital Solutions Inc",
      rating: 4,
        image: "account-tie"
    },
    {
      text: "The policy management system is a game-changer. Easy to implement and track compliance across all departments.",
      author: "Amit Patel",
      role: "IT Manager",
      company: "GlobalTech Systems",
      rating: 5,
        image: "laptop-code"
    },
    {
      text: "Best workforce management solution we've used. The AI tracker provides valuable insights for performance optimization.",
      author: "Neha Gupta",
      role: "CEO",
      company: "StartUp Ventures",
      rating: 4,
        image: "account-tie"
    },
    {
      text: "Customer support is excellent and the platform is very user-friendly. Great ROI on our investment.",
      author: "Vikram Singh",
      role: "Project Manager",
      company: "Enterprise Solutions",
      rating: 3,
        image: "account-tie"
    }
  ];

  const features = [
    {
        icon: 'account-group',
      title: 'HR Management',
      description: 'Complete employee lifecycle management with advanced analytics and automated workflows.',
      capabilities: ['Employee Onboarding', 'Profile Management', 'Role Assignment', 'Leave Approvals'],
      gradient: ['#3b82f6', '#0ea5e9'],
      path: 'HrHome'
    },
    {
        icon: 'chart-bar',
      title: 'Admin Dashboard',
      description: 'AI-powered administrative tools with predictive analytics and real-time insights.',
      capabilities: ['Team Management', 'Project Oversight', 'Performance Tracking', 'Advanced Reporting'],
      gradient: ['#8b5cf6', '#ec4899'],
      path: 'AdminHome'
    },
    {
        icon: 'office-building',
      title: 'Employee Portal',
      description: 'Intelligent self-service portal with personalized recommendations and smart automation.',
      capabilities: ['Personal Dashboard', 'Smart Time Tracking', 'Automated Requests', 'AI Assistant'],
      gradient: ['#22c55e', '#14b8a6'],
      path: 'EmployeeHome'
    }
  ];

  const modules = [
    {
        icon: 'calendar-month',
      title: 'Calendar Management',
      description: 'AI-powered scheduling with conflict detection and smart recommendations.',
      features: ['Smart Scheduling', 'Conflict Detection', 'Meeting Analytics', 'Calendar Sync'],
      path: 'Calendar'
    },
    {
        icon: 'beach',
      title: 'Leave Management',
      description: 'Automated approval workflows with predictive balance management.',
      features: ['Auto Approval', 'Balance Prediction', 'Team Coverage', 'Holiday Planning'],
      path: 'LeaveManagement'
    },
    {
        icon: 'clock-outline',
      title: 'Timesheet Tracking',
      description: 'Smart time tracking with productivity insights and project analytics.',
      features: ['Auto Time Capture', 'Project Analytics', 'Productivity Insights', 'Billing Integration'],
      path: 'Timesheet'
    },
    {
        icon: 'robot',
      title: 'AI Tracker',
      description: 'Machine learning-powered analytics for performance optimization.',
      features: ['Performance ML', 'Predictive Analytics', 'Behavior Insights', 'Smart Recommendations'],
      path: 'MomPage'
    },
    {
        icon: 'file-document-outline',
      title: 'Policy Management',
      description: 'Comprehensive policy management system with department-wise organization.',
      features: ['Department Policies', 'Policy Creation', 'Compliance Tracking', 'Version Control'],
      path: 'PolicyManagement'
    }
  ];

  const achievements = [
  { number: "500+", label: "Companies Trust Us", icon: "trophy" },
  { number: "50K+", label: "Active Users", icon: "account-group" },
  { number: "99.9%", label: "Uptime Guarantee", icon: "flash" },
  { number: "24/7", label: "Support Available", icon: "lifebuoy" }
  ];

  const renderStarRating = (rating) => {
    return (
      <View style={{ flexDirection: 'row', marginVertical: 5 }}>
        {[...Array(5)].map((_, i) => (
          <Icon 
            key={i} 
            name={i < rating ? 'star' : 'star-outline'} 
            size={16} 
            color={i < rating ? '#f59e0b' : '#d1d5db'}
            style={{ marginHorizontal: 1 }}
          />
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4051B5" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialIcons name="arrow-back" size={22} color="#0a2850" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>About Us</Text>
        <View style={{ width: 22 }} />
      </View>
      
      {/* Hero Section */}
      <LinearGradient
        colors={['#1e40af', '#3b82f6', '#0ea5e9']}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.heroSection}
      >
        <Text style={styles.heroTitle}>Revolutionizing Workforce Management</Text>
        <Text style={styles.heroSubtitle}>
          AI-powered insights • Seamless automation {'\n'}Intelligent analytics
        </Text>
        <TouchableOpacity style={styles.startJourneyButton} onPress={handleStartJourney}>
          <Icon name="rocket-launch" size={18} color="#4051B5" style={{ marginRight: 8 }} />
          <Text style={styles.startJourneyText}>Start Journey</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#4051B5" />
        </TouchableOpacity>
      </LinearGradient>
      
      {/* Features Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Start Your Journey</Text>
          <Text style={styles.sectionSubtitle}>
            Experience the future of workforce management with our intelligent solutions
          </Text>
        </View>
        
        <View style={styles.featuresContainer}>
          <ScrollView
            ref={(ref) => { featureScrollRef.current = ref; }}
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            snapToInterval={width - 40}
            decelerationRate="fast"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: featureScrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {features.map((feature, index) => (
              <View key={index} style={styles.featureCard}>
                <LinearGradient
                  colors={feature.gradient}
                  start={[0, 0]}
                  end={[1, 1]}
                  style={styles.featureCardInner}
                >
                  <Icon name={feature.icon} size={36} color="#fff" style={styles.featureIcon} />
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
                  <View style={styles.capabilitiesContainer}>
                    {feature.capabilities.map((capability, i) => (
                      <View key={i} style={styles.capabilityItem}>
                        <Icon name="check-circle" size={14} color="#fff" style={{ marginRight: 8 }} />
                        <Text style={styles.capabilityText}>{capability}</Text>
                      </View>
                    ))}
                  </View>
                </LinearGradient>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.paginationContainer}>
            {features.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.paginationDot,
                  currentFeature === index && styles.paginationDotActive
                ]}
                onPress={() => setCurrentFeature(index)}
              />
            ))}
          </View>
        </View>
      </View>
      
      {/* Core Modules Section */}
      <LinearGradient
        colors={['#1e40af', '#3b82f6']}
        start={[0, 0]}
        end={[1, 1]}
        style={[styles.sectionContainer, styles.modulesSectionContainer]}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, styles.lightText]}>Intelligent Core Modules</Text>
          <Text style={[styles.sectionSubtitle, styles.lightText]}>
            Discover our comprehensive suite of AI-powered modules
          </Text>
        </View>
        
        <View style={styles.modulesContainer}>
          <View style={styles.modulesArrows}>
            <TouchableOpacity 
              style={styles.moduleArrowButton} 
              onPress={() => handleModuleSlide('prev')}
            >
              <MaterialIcons name="arrow-back-ios" size={20} color="#4051B5" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.moduleArrowButton} 
              onPress={() => handleModuleSlide('next')}
            >
              <MaterialIcons name="arrow-forward-ios" size={20} color="#4051B5" />
            </TouchableOpacity>
          </View>
          
          <ScrollView
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            snapToInterval={width * 0.85}
            decelerationRate="fast"
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: moduleScrollX } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
            ref={(ref) => { moduleScrollRef.current = ref; }}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          >
            {modules.map((module, index) => (
              <View key={index} style={styles.moduleCard}>
                <View style={styles.moduleCardInner}>
                  <Icon name={module.icon} size={36} color="#4051B5" style={styles.moduleIcon} />
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  <Text style={styles.moduleDescription}>{module.description}</Text>
                  <View style={styles.moduleFeatures}>
                    {module.features.map((feature, i) => (
                      <View key={i} style={styles.moduleFeatureItem}>
                        <View style={styles.moduleFeatureDot}>
                          <Text style={styles.moduleFeatureCheck}>✓</Text>
                        </View>
                        <Text style={styles.moduleFeatureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={styles.moduleExploreButton}
                    onPress={() => navigation.navigate(module.path)}
                    activeOpacity={0.8}
                  >
                    <LinearGradient
                      colors={['#4051B5', '#5b6fd4']}
                      start={[0, 0]}
                      end={[1, 0]}
                      style={styles.moduleExploreButtonGradient}
                    >
                      <Icon name="compass" size={16} color="#fff" style={{ marginRight: 6 }} />
                      <Text style={styles.moduleExploreText}>Explore Module</Text>
                      <MaterialIcons name="arrow-forward" size={16} color="#fff" />
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.paginationContainer}>
            {modules.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.paginationDot,
                    styles.modulePaginationDot,
                    currentModule === index && styles.modulePaginationDotActive
                  ]}
                  onPress={() => {
                    setCurrentModule(index);
                    const x = Math.round(index * (width * 0.85));
                    moduleScrollRef.current?.scrollTo({ x, animated: true });
                  }}
                />
            ))}
          </View>
        </View>
      </LinearGradient>
      
      {/* Testimonials Section */}
      <View style={styles.sectionContainer}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>What Our Clients Say</Text>
          <Text style={styles.sectionSubtitle}>
            Real stories from satisfied customers worldwide
          </Text>
        </View>
        
        <View style={styles.testimonialsContainer}>
          <ScrollView
            ref={(ref) => { testimonialsScrollRef.current = ref; }}
            horizontal
            nestedScrollEnabled={true}
            showsHorizontalScrollIndicator={false}
            snapToInterval={width - 40}
            snapToAlignment="center"
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal: (width - (width - 40)) / 2 }}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: testimonialsScrollX } } }],
              { useNativeDriver: false }
            )}
            onMomentumScrollEnd={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const index = Math.round(offsetX / (width - 40));
              setCurrentSlide(index);
            }}
            scrollEventThrottle={16}
          >
            {testimonials.map((testimonial, index) => (
              <View key={index} style={styles.testimonialCard}>
                <View style={styles.testimonialCardInner}>
                  <Image
                    source={{ uri: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Quotation_marks.png' }}
                    style={styles.testimonialQuoteImage}
                    resizeMode="contain"
                  />
                  <Text style={styles.testimonialText}>{testimonial.text}</Text>
                  <View style={styles.testimonialFooter}>
                    <View style={styles.testimonialAuthorContainer}>
                      <View style={styles.testimonialAvatar}>
                        <Icon name={testimonial.image} size={22} color="#4051B5" />
                      </View>
                      <View style={styles.testimonialAuthorDetails}>
                        <Text style={styles.testimonialAuthorName}>{testimonial.author}</Text>
                        <Text style={styles.testimonialAuthorRole}>{testimonial.role}</Text>
                        <Text style={styles.testimonialAuthorCompany}>{testimonial.company}</Text>
                      </View>
                    </View>
                    {renderStarRating(testimonial.rating)}
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>
          
          <View style={styles.paginationContainer}>
            {testimonials.map((_, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.paginationDot,
                  currentSlide === index && styles.paginationDotActive
                ]}
                onPress={() => {
                  setCurrentSlide(index);
                  const x = Math.round(index * (width - 40));
                  testimonialsScrollRef.current?.scrollTo({ x, animated: true });
                }}
              />
            ))}
          </View>
        </View>
      </View>
      
      {/* Achievements Section */}
      <View style={styles.achievementsSection}>
        <View style={styles.achievementsGrid}>
          {achievements.map((achievement, index) => (
            <View key={index} style={styles.achievementItem}>
              <Icon name={achievement.icon} size={32} color="#4051B5" style={styles.achievementIcon} />
              <View style={styles.achievementNumberContainer}>
                <Text style={styles.achievementNumber}>{achievement.number}</Text>
              </View>
              <Text style={styles.achievementLabel}>{achievement.label}</Text>
            </View>
          ))}
        </View>
      </View>
      
      {/* Mission and Vision */}
      <LinearGradient
        colors={['#4051B5', '#5b6fd4']}
        start={[0, 0]}
        end={[1, 1]}
        style={styles.missionVisionSection}
      >
        <View style={styles.missionContainer}>
          <View style={styles.missionHeader}>
            <Icon name="target" size={24} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.missionTitle}>Our Mission</Text>
          </View>
          <Text style={styles.missionText}>
            To revolutionize workforce management through intelligent automation, predictive analytics, 
            and seamless user experiences that empower organizations to unlock their full potential.
          </Text>
        </View>
        
        <View style={styles.visionContainer}>
          <View style={styles.missionHeader}>
            <Icon name="star-four-points" size={24} color="#fff" style={{ marginRight: 10 }} />
            <Text style={styles.missionTitle}>Our Vision</Text>
          </View>
          <Text style={styles.missionText}>
            To become the global standard for AI-powered workforce management, creating a future where 
            technology enhances human potential and drives unprecedented organizational success.
          </Text>
        </View>
      </LinearGradient>
      
      {/* Ready to Transform Section */}
      <View style={styles.readyToTransformSection}>
        <Icon name="chart-timeline-variant" size={40} color="#4051B5" style={{ marginBottom: 16 }} />
        <Text style={styles.readyTitle}>Ready to Transform Your Future?</Text>
        <Text style={styles.readySubtitle}>
          Join the revolution in workforce management with ConcienTech Solution
        </Text>
        
        <View style={styles.readyButtonsContainer}>
          <TouchableOpacity 
            style={styles.readyButton}
            onPress={() => navigation.navigate('Contact')}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#4051B5', '#5b6fd4']}
              start={[0, 0]}
              end={[1, 0]}
              style={styles.getStartedButton}
            >
              <Icon name="rocket-launch" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.getStartedButtonText}>Get Started Now</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.readyButton}
            onPress={handleContactExpert}
            activeOpacity={0.85}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              start={[0, 0]}
              end={[1, 0]}
              style={styles.contactExpertButton}
            >
              <Icon name="headset" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.contactExpertButtonText}>Contact Our Expert</Text>
              <MaterialIcons name="arrow-forward" size={16} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Bottom space */}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4051B5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 40,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0a2850',
  },
  
  // Hero Section
  heroSection: {
    padding: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#e0e7ff',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  startJourneyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  startJourneyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4051B5',
    marginRight: 8,
  },
  
  // Section Common Styles
  sectionContainer: {
    padding: 20,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0a2850',
    marginBottom: 6,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  lightText: {
    color: '#fff',
  },
  
  // Features Section
  featuresContainer: {
    position: 'relative',
  },
  featureCard: {
    width: width - 60,
    padding: 5,
    marginRight: 12,
  },
  featureCardInner: {
    borderRadius: 12,
    padding: 20,
    minHeight: 260,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  featureIcon: {
    marginBottom: 10,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 14,
    color: '#fff',
    marginBottom: 12,
    opacity: 0.9,
  },
  capabilitiesContainer: {
    marginTop: 10,
  },
  capabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingVertical: 2,
  },
  capabilityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#fff',
    marginRight: 8,
  },
  capabilityText: {
    fontSize: 13,
    color: '#fff',
    flex: 1,
  },
  
  // Pagination
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#4051B5',
    transform: [{ scale: 1.2 }],
  },
  
  // Modules Section
  modulesSectionContainer: {
    marginBottom: 16,
  },
  modulesContainer: {
    position: 'relative',
  },
  modulesArrows: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    zIndex: 10,
    paddingHorizontal: 10,
    transform: [{ translateY: -20 }],
  },
  moduleArrowButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  moduleCard: {
    width: width * 0.85,
    paddingHorizontal: 10,
    marginRight: 12,
  },
  moduleCardInner: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    height: 380,
  },
  moduleIcon: {
    textAlign: 'center',
    marginBottom: 12,
    alignSelf: 'center',
  },
  moduleTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0a2850',
    textAlign: 'center',
    marginBottom: 8,
  },
  moduleDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  moduleFeatures: {
    marginTop: 8,
    marginBottom: 20,
  },
  moduleFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  moduleFeatureDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4051B5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  moduleFeatureCheck: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  moduleFeatureText: {
    fontSize: 14,
    color: '#4b5563',
    flex: 1,
  },
  moduleExploreButton: {
    marginTop: 'auto',
    borderRadius: 8,
    overflow: 'hidden',
  },
  moduleExploreButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  moduleExploreText: {
    color: '#fff',
    fontWeight: 'bold',
    marginRight: 6,
  },
  modulePaginationDot: {
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
  },
  modulePaginationDotActive: {
    backgroundColor: '#fff',
  },
  
  // Testimonials Section
  testimonialsContainer: {
    marginTop: 8,
  },
  testimonialCard: {
    width: width - 40,
  },
  testimonialCardInner: {
    backgroundColor: '#fff',
    borderRadius: 12,
  padding: 20,
  paddingLeft: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 220,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  testimonialQuote: {
    fontSize: 40,
    color: '#d1d5db',
    marginBottom: -16,
  },
  testimonialQuoteImage: {
    position: 'absolute',
    top: 8,
    left: 12,
    width: 48,
    height: 48,
    opacity: 0.08,
  },
  testimonialText: {
    fontSize: 15,
    color: '#1e3a8a',
    marginBottom: 16,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  testimonialFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  testimonialAuthorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  testimonialAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginLeft: 6,
  },
  testimonialAvatarText: {
    fontSize: 0,
  },
  testimonialAuthorDetails: {
    flex: 1,
  },
  testimonialAuthorName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e3a8a',
  },
  testimonialAuthorRole: {
    fontSize: 12,
    color: '#4b5563',
  },
  testimonialAuthorCompany: {
    fontSize: 12,
    color: '#6b7280',
  },
  
  // Achievements Section
  achievementsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginHorizontal: -8,
  },
  achievementItem: {
    width: '48%',
    alignItems: 'center',
    padding: 10,
    marginBottom: 16,
  },
  achievementIcon: {
    marginBottom: 10,
  },
  achievementNumberContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#4051B5',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  achievementNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  achievementLabel: {
    fontSize: 14,
    color: '#4051B5',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 6,
  },
  
  // Mission and Vision Section
  missionVisionSection: {
    padding: 20,
    marginBottom: 16,
  },
  missionContainer: {
    marginBottom: 24,
  },
  visionContainer: {},
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  missionIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  missionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  missionText: {
    fontSize: 14,
    color: '#e0e7ff',
    lineHeight: 22,
  },
  
  // Ready to Transform Section
  readyToTransformSection: {
    backgroundColor: '#f3f4f6',
    padding: 20,
    alignItems: 'center',
  },
  readyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0a2850',
    textAlign: 'center',
    marginBottom: 8,
  },
  readySubtitle: {
    fontSize: 16,
    color: '#4b5563',
    textAlign: 'center',
    marginBottom: 24,
  },
  readyButtonsContainer: {
    width: '100%',
  },
  readyButton: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  getStartedButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  contactExpertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  contactExpertButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
});

export default About;
