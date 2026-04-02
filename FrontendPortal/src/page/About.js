import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

// Helper: Decode JWT token
function decodeToken(token) {
  if (!token) return null;
  try {
    const base64Payload = token.split('.')[1];
    const base64 = base64Payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, '=');
    const payload = atob(padded);
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

const About = () => {
  const [stats, setStats] = useState({
    employeesManaged: 0,
    activeProjects: 0,
    overallTasks: 0,
    pendingTasks: 0
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [currentFeature, setCurrentFeature] = useState(0);
  const [currentModule, setCurrentModule] = useState(0);
  const [flippedCards, setFlippedCards] = useState({});
  const navigate = useNavigate();

  // Fetch data from multiple APIs
  useEffect(() => {
    const fetchStats = async () => {
      const token = localStorage.getItem('access_token');
      const decoded = decodeToken(token);
      setUser(decoded);

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Fetch all users from user-details API
        const usersResponse = await fetch(`${API_BASE}/user-details/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // Fetch projects from user-details API
        const projectsResponse = await fetch(`${API_BASE}/user-details/projects`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        // Fetch timesheets
        const timesheetsResponse = await fetch(`${API_BASE}/timesheets/`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        let employeeCount = 0;
        let projectCount = 0;
        let totalTasks = 0;
        let pendingTaskCount = 0;

        if (usersResponse.ok) {
          const users = await usersResponse.json();
          employeeCount = Array.isArray(users) ? users.length : 0;
        }

        if (projectsResponse.ok) {
          const projects = await projectsResponse.json();
          projectCount = Array.isArray(projects) ? projects.length : 0;
        }

        if (timesheetsResponse.ok) {
          const timesheets = await timesheetsResponse.json();
          totalTasks = timesheets.length;
          pendingTaskCount = timesheets.filter(sheet => 
            sheet.status === 'pending' ||
            !sheet.end_time
          ).length;
        }

        setStats({
          employeesManaged: employeeCount,
          activeProjects: projectCount,
          overallTasks: totalTasks,
          pendingTasks: pendingTaskCount
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Auto-slide for testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-slide for feature cards
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentFeature((prev) => (prev + 1) % features.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Manual slide for modules (mouse click only)
  const handleModuleSlide = (direction) => {
    if (direction === 'next') {
      setCurrentModule((prev) => (prev + 1) % modules.length);
    } else {
      setCurrentModule((prev) => (prev - 1 + modules.length) % modules.length);
    }
  };

  // Handle Start Journey link to external website
  const handleStartJourney = () => {
    window.open('https://concientech.com/', '_blank');
  };

  const testimonials = [
    {
      text: "ConcienTech Solution has completely transformed how we manage our workforce. The AI-powered insights have improved our decision-making process significantly.",
      author: "Rajesh Kumar",
      role: "HR Manager",
      company: "Tech Innovations Pvt Ltd",
      rating: 5,
      image: "👨‍💼"
    },
    {
      text: "Excellent platform with intuitive design. The timesheet management and employee portal features are outstanding. Highly recommend!",
      author: "Priya Sharma",
      role: "Operations Director",
      company: "Digital Solutions Inc",
      rating: 4,
      image: "👩‍💼"
    },
    {
      text: "The policy management system is a game-changer. Easy to implement and track compliance across all departments.",
      author: "Amit Patel",
      role: "IT Manager",
      company: "GlobalTech Systems",
      rating: 5,
      image: "👨‍💻"
    },
    {
      text: "Best workforce management solution we've used. The AI tracker provides valuable insights for performance optimization.",
      author: "Neha Gupta",
      role: "CEO",
      company: "StartUp Ventures",
      rating: 4,
      image: "👩‍💼"
    },
    {
      text: "Customer support is excellent and the platform is very user-friendly. Great ROI on our investment.",
      author: "Vikram Singh",
      role: "Project Manager",
      company: "Enterprise Solutions",
      rating: 3,
      image: "👨‍💼"
    }
  ];

  const features = [
    {
      icon: '👥',
      title: 'HR Management',
      description: 'Complete employee lifecycle management with advanced analytics and automated workflows.',
      capabilities: ['Employee Onboarding', 'Profile Management', 'Role Assignment', 'Leave Approvals'],
      gradient: 'from-blue-500 via-blue-600 to-cyan-500',
      path: '/HrHome'
    },
    {
      icon: '📊',
      title: 'Admin Dashboard',
      description: 'AI-powered administrative tools with predictive analytics and real-time insights.',
      capabilities: ['Team Management', 'Project Oversight', 'Performance Tracking', 'Advanced Reporting'],
      gradient: 'from-purple-500 via-purple-600 to-pink-500',
      path: '/AdminHome'
    },
    {
      icon: '🏢',
      title: 'Employee Portal',
      description: 'Intelligent self-service portal with personalized recommendations and smart automation.',
      capabilities: ['Personal Dashboard', 'Smart Time Tracking', 'Automated Requests', 'AI Assistant'],
      gradient: 'from-green-500 via-green-600 to-teal-500',
      path: '/EmployeeHome'
    }
  ];

  // Updated modules array with blue background
  const modules = [
    {
      icon: '📅',
      title: 'Calendar Management',
      description: 'AI-powered scheduling with conflict detection and smart recommendations.',
      features: ['Smart Scheduling', 'Conflict Detection', 'Meeting Analytics', 'Calendar Sync'],
      path: '/calendar'
    },
    {
      icon: '🏖',
      title: 'Leave Management',
      description: 'Automated approval workflows with predictive balance management.',
      features: ['Auto Approval', 'Balance Prediction', 'Team Coverage', 'Holiday Planning'],
      path: '/LeaveManagement'
    },
    {
      icon: '⏰',
      title: 'Timesheet Tracking',
      description: 'Smart time tracking with productivity insights and project analytics.',
      features: ['Auto Time Capture', 'Project Analytics', 'Productivity Insights', 'Billing Integration'],
      path: '/Timesheet'
    },
    {
      icon: '🤖',
      title: 'AI Tracker',
      description: 'Machine learning-powered analytics for performance optimization.',
      features: ['Performance ML', 'Predictive Analytics', 'Behavior Insights', 'Smart Recommendations'],
      path: '/MomPage'
    },
    {
      icon: '📋',
      title: 'Policy Management',
      description: 'Comprehensive policy management system with department-wise organization.',
      features: ['Department Policies', 'Policy Creation', 'Compliance Tracking', 'Version Control'],
      path: '/PolicyManagement'
    }
  ];

  const achievements = [
    { number: "500+", label: "Companies Trust Us", icon: "🏆" },
    { number: "50K+", label: "Active Users", icon: "👥" },
    { number: "99.9%", label: "Uptime Guarantee", icon: "⚡" },
    { number: "24/7", label: "Support Available", icon: "🛟" }
  ];

  const renderStarRating = (rating) => {
    return (
      <div className="flex space-x-1">
        {[...Array(5)].map((_, i) => (
          <span key={i} className={`text-lg transition-all duration-300 ${i < rating ? 'text-yellow-400' : 'text-gray-300'}`}>
            ⭐
          </span>
        ))}
      </div>
    );
  };

  const handleContactExpert = () => {
    navigate('/help');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-4 border-blue-500 border-t-transparent shadow-lg"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-blue-900">
      {/* Hero Section */}
      <section className="relative bg-blue-800 text-white py-20 overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <div className="space-y-6">
            <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-green-300 bg-clip-text text-white leading-tight">
              Revolutionizing Workforce Management
            </h1>
            <p className="text-xl md:text-2xl mb-8 max-w-4xl mx-auto text-white leading-relaxed">
              🚀 AI-powered insights • 🎯 Seamless automation • 📊 Intelligent analytics
            </p>
            
            <div className="flex justify-center">
              <button 
                onClick={handleStartJourney}
                className="group relative bg-gradient-to-r from-white to-blue-50 text-blue-600 px-10 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 border-2 border-white/20"
              >
                <span className="relative z-10 flex items-center space-x-2">
                  <span>🚀 Start Journey</span>
                  <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - Reduced Height */}
      <section className="py-20 bg-white relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-gray-800 to-blue-600 bg-clip-text text-transparent">
              Start Your Journey
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Experience the future of workforce management with our intelligent solutions
            </p>
          </div>
          
          <div className="relative max-w-5xl mx-auto">
            <div className="overflow-hidden rounded-2xl shadow-2xl">
              <div 
                className="flex transition-all duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentFeature * 100}%)` }}
              >
                {features.map((feature, index) => (
                  <div key={index} className="w-full flex-shrink-0  height-full">
                    <div className={`bg-gradient-to-br ${feature.gradient} rounded-2xl p-6 text-white h-64 relative overflow-hidden group hover:shadow-2xl transition-all duration-500`}>
                      <div className="absolute inset-0 opacity-10">
                        <div className="absolute top-4 right-4 w-24 h-24 border-2 border-white rounded-full animate-spin-slow"></div>
                        <div className="absolute bottom-4 left-4 w-16 h-16 border-2 border-white rounded-full animate-ping"></div>
                      </div>
                      
                      <div className="relative z-10">
                        <div className="text-4xl animate-bounce">{feature.icon}</div>
                        <h3 className="text-xl font-bold mb-1">{feature.title}</h3>
                        <p className="text-white/90 mb-4 leading-relaxed text-sm">{feature.description}</p>
                        <ul className="space-y-1">
                          {feature.capabilities.map((cap, i) => (
                            <li key={i} className="flex items-center text-xs">
                              <span className="w-2 h-2 bg-white rounded-full mr-3 animate-pulse"></span>
                              {cap}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex justify-center mt-8 absolute bottom-[-30px] left-0 right-0 pb-9 space-x-3">
              {features.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentFeature(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    currentFeature === index 
                      ? 'bg-blue-600 scale-125 shadow-lg' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Intelligent Core Modules - Blue Background with White Cards & Manual Slider */}
      <section className="py-5 h-[700px]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-white">
              Intelligent Core Modules
            </h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Discover our comprehensive suite of AI-powered modules designed to optimize every aspect of workforce management
            </p>
          </div>
          
          <div className="relative h-full max-w-[40rem] mx-auto flex justify-center">
            <div className="overflow-hidden rounded-2xl">
              <div 
                className="flex justify-start transition-all duration-700 ease-in-out"
                style={{ transform: `translateX(-${currentModule * 50}%)` }}
              >
                {modules.map((module, index) => (
                  <div key={index} className="w-80 flex-shrink-0 px-3">
                    <div 
                      className={`flip-card h-[28rem] cursor-pointer group ${flippedCards[`module-${index}`] ? 'flipped' : ''}`}
                      onMouseEnter={() => setFlippedCards(prev => ({ ...prev, [`module-${index}`]: true }))}
                      onMouseLeave={() => setFlippedCards(prev => ({ ...prev, [`module-${index}`]: false }))}
                    >
                      <div className="flip-card-inner relative w-full h-full">
                        {/* Front Side */}
                        <div className="flip-card-front absolute inset-0 bg-white rounded-xl p-6 shadow-xl flex flex-col items-center justify-center text-center border border-gray-200 transition-all duration-500">
                          <div className="text-5xl mb-2">{module.icon}</div>
                          <h3 className="text-xl font-bold text-gray-800">{module.title}</h3>
                        </div>
                        {/* Back Side */}
                        <div className="flip-card-back absolute inset-0 bg-white rounded-xl p-6 border border-gray-200 shadow-xl flex flex-col">
                          <div className="text-center mb-6 flex-shrink-0">
                            <div className="text-3xl mb-2">{module.icon}</div>
                            <h4 className="font-bold text-gray-800 text-lg mb-2 leading-tight">
                              {module.title}
                            </h4>
                            <div className="w-16 h-0.5 bg-gradient-to-r from-blue-500 to-purple-500 mx-auto"></div>
                          </div>
                          <div className="text-gray-600 text-sm mb-2 overflow-y-auto max-h-32">{module.description}</div>
                          <div className="flex-grow overflow-y-auto">
                            <div className="space-y-2">
                              {module.features.map((feature, i) => (
                                <div key={i} className="flex items-center p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 group/item">
                                  <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mr-1 flex-shrink-0 group-hover/item:scale-110 transition-transform duration-300">
                                    <span className="text-white text-xs font-bold">✓</span>
                                  </div>
                                  <span className="text-sm text-gray-700 group-hover/item:text-blue-600 transition-colors duration-300 leading-snug">
                                    {feature}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex-shrink-0 mt-4">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(module.path);
                              }}
                              className="w-full bg-gray-600 text-white px-4 py-3 rounded-lg text-sm font-semibold hover:shadow-lg hover:bg-blue-700 transform hover:scale-105 transition-all duration-1000 flex items-center justify-center space-x-2"
                            >
                              <span>🚀</span>
                              <span>Explore Module</span>
                              <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Manual Navigation Arrows */}
            <button 
              onClick={() => handleModuleSlide('prev')}
              className="absolute left-[-50px] top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-blue-600 w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-10"
            >
              <span className="text-xl">←</span>
            </button>
            <button 
              onClick={() => handleModuleSlide('next')}
              className="absolute right-[-50px] top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-blue-600 w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-10"
            >
              <span className="text-xl">→</span>
            </button>
            
            {/* Slide Indicators - Moved to Bottom */}
            <div className="flex justify-center mt-4 absolute bottom-[-60px] left-0 right-0 pb-4 space-x-3">
              {modules.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentModule(index)}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    currentModule === index 
                      ? 'bg-white scale-125 shadow-lg' 
                      : 'bg-white/50 hover:bg-white/75'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What Your Clients Say - PROPERLY ALIGNED */}
      <section className="py-16 bg-gradient-to-r from-gray-100 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 bg-gradient-to-r from-gray-800 to-blue-600 bg-clip-text text-transparent">
              What Your Clients Say
            </h2>
            <p className="text-lg text-gray-600">Real stories from satisfied customers worldwide</p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-100">
              <div className="flex items-start gap-6">
                <div className="flex-1 min-w-0">
                  <div className="text-4xl text-blue-200 mb-3 opacity-50 leading-none">"</div>
                  <blockquote className="text-lg text-blue-900 mb-4 leading-relaxed font-medium">
                    {testimonials[currentSlide].text}
                  </blockquote>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                        {testimonials[currentSlide].author.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-blue-900 text-base truncate">
                          {testimonials[currentSlide].author}
                        </div>
                        <div className="text-blue-700 text-sm truncate">
                          {testimonials[currentSlide].role}
                        </div>
                        <div className="text-blue-600 text-xs truncate">
                          {testimonials[currentSlide].company}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-1 flex-shrink-0">
                      {renderStarRating(testimonials[currentSlide].rating)}
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg flex items-center justify-center shadow-sm border border-blue-200">
                    <div className="text-center">
                      <div className="flex space-x-1 flex-shrink-0">
                      {testimonials[currentSlide].image}
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex justify-center mt-6 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    currentSlide === index 
                      ? 'bg-blue-600 scale-125 shadow-md' 
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
            {/* Achievements Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-12 text-center">
            {achievements.map((achievement, index) => (
              <div key={index} className="group space-y-6">
                <div className="text-5xl group-hover:scale-110 transition-transform duration-300">
                  {achievement.icon}
                </div>
                
                {/* Updated styling for all achievement numbers */}
                <div className="relative bg-blue-600 text-white w-24 h-24 rounded-full flex items-center justify-center mx-auto shadow-xl group-hover:shadow-2xl transition-all duration-300">
                  <span className="text-2xl font-bold">{achievement.number}</span>
                  <div className="absolute inset-0 bg-white/10 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                
                {/* Updated text color to blue */}
                <div className="text-blue-600 font-medium">{achievement.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission and Vision */}
      <section className="py-4 pb-3 bg-blue-500 text-white overflow-hidden relative border-1 border-gray-500">
        <div className="container mx-auto px-2 lg:px-5 divide-gray-400 relative z-10">
          <div className="grid md:grid-cols-2 gap-5 p-6">
            <div className="group">
              <div className="flex items-center mb-6">
                <span className="text-4xl mr-4">🎯</span>
                <h2 className="text-3xl font-bold">Our Mission</h2>
              </div>
              <p className="text-gray-100 leading-relaxed text-lg group-hover:text-white transition-colors duration-300">
                To revolutionize workforce management through intelligent automation, predictive analytics, 
                and seamless user experiences that empower organizations to unlock their full potential.
              </p>
            </div>
            <div className="group">
              <div className="flex items-center mb-6">
                <span className="text-4xl mr-4">🌟</span>
                <h2 className="text-3xl font-bold">Our Vision</h2>
              </div>
              <p className="text-gray-100 leading-relaxed text-lg group-hover:text-white transition-colors duration-300">
                To become the global standard for AI-powered workforce management, creating a future where 
                technology enhances human potential and drives unprecedented organizational success.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ready to Transform Section */}
      <section className="py-20 text-gray-800 bg-gray-100 relative border-1 border-gray-500 overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 bg-clip-text">
            Ready to Transform Your Future?
          </h2>
          <p className="text-xl mb-12 max-w-3xl mx-auto leading-relaxed">
            🚀 Join the revolution in workforce management with ConcienTech Solution
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button 
              onClick={() => navigate('/contact')}
              className="group bg-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:shadow-2xl transition-all duration-300 transform hover:bg-green-500 hover:text-blue-900 hover:scale-105 hover:-translate-y-1"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>🎯 Get Started Now</span>
                <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
              </span>
            </button>
            <button 
              onClick={handleContactExpert}
              className="group bg-blue-500 text-white border-2 border-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-green-500 hover:text-blue-900 transition-all duration-300 transform hover:scale-105 hover:-translate-y-1"
            >
              <span className="flex items-center justify-center space-x-2">
                <span>👨‍💼 Contact Our Expert</span>
                <span className="group-hover:translate-x-1 transition-transform duration-300">→</span>
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default About;
