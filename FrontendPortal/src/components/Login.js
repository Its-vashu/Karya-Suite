import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { FaEye, FaEyeSlash, FaUserCircle, FaLock, FaUserShield } from 'react-icons/fa';
import { KeyRound, User, ShieldCheck, Copy } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

// Configuration
const LOGIN_ENDPOINTS = {
  employee: `${API_BASE}/auth/employee/login`,
  hr: `${API_BASE}/auth/hr/login`,
};

const ROLES = ['employee', 'hr'];

// Demo accounts — these must exist in the backend (see seed script)
const DEMO_ACCOUNTS = {
  hr: {
    label: 'HR / Admin',
    email: 'admin@demo.com',
    password: 'Admin@123',
    role: 'hr',
  },
  employee: {
    label: 'Employee',
    email: 'employee@demo.com',
    password: 'Employee@123',
    role: 'employee',
  },
};

// Particles configuration for animated background
const PARTICLES_CONFIG = {
  fullScreen: { enable: false },
  background: { 
    color: { value: "#0d47a1" },
    image: "radial-gradient(#1e3c72, #0a1e3c)"
  },
  fpsLimit: 60,
  particles: {
    number: { value: 80, density: { enable: true, value_area: 800 } },
    color: { value: ["#00fffc", "#ffffff", "#00fff0"] },
    shape: { type: ["circle", "triangle", "polygon"] },
    opacity: { value: 0.8, anim: { enable: true, speed: 1, opacity_min: 0.1 } },
    size: { value: 3, random: true, anim: { enable: true, speed: 2 } },
    line_linked: { enable: true, distance: 150, color: "#00fffc", opacity: 0.4 },
    move: { enable: true, speed: 2, out_mode: "out" }
  },
  interactivity: {
    events: { onhover: { enable: true, mode: "grab" }, onclick: { enable: true, mode: "push" } },
    modes: { grab: { distance: 200 }, push: { particles_nb: 4 } }
  }
};

// Custom hooks for cleaner state management
const useAuth = () => {
  const navigate = useNavigate();
  return { navigate };
};

const useParticles = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/tsparticles@2.9.3/tsparticles.bundle.min.js';
    script.async = true;
    script.onload = () => window.tsParticles?.load('particles-js', PARTICLES_CONFIG);
    document.body.appendChild(script);

    return () => {
      const existingScript = document.querySelector(`script[src="${script.src}"]`);
      if (existingScript) document.body.removeChild(existingScript);
    };
  }, []);
};

/**
 * Main Login Component 
 * Handles user authentication and role-based redirection
 */
const Login = () => {
  // State management
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'employee'
  });
  const [showPassword, setShowPassword] = useState(false);
  
  // Custom hooks
  const { navigate } = useAuth();
  useParticles();

  // Form handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const performLogin = async ({ username, password, role }) => {
    const endpoint = LOGIN_ENDPOINTS[role];
    const response = await axios.post(endpoint, { username, password });

    localStorage.setItem('access_token', response.data.access_token);
    localStorage.setItem('refresh_token', response.data.refresh_token);
    localStorage.setItem('user_role', role);

    if (response.data.user) {
      localStorage.setItem('user_id', response.data.user.id);
      localStorage.setItem('username', response.data.user.username);
    }

    window.dispatchEvent(new Event('userDataUpdated'));
    toast.success(`Welcome to Concientech! Logged in as ${role.toUpperCase()}`);

    if (role === 'hr') navigate('/HrHome');
    else navigate('/EmployeeHome');
  };

  /**
   * Form submission handler - Authenticates user and redirects based on role
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await performLogin({
        username: formData.username,
        password: formData.password,
        role: formData.role,
      });
    } catch (error) {
      toast.error("Please check your credentials");
    }
  };

  const handleQuickLogin = async (accountKey) => {
    const acct = DEMO_ACCOUNTS[accountKey];
    setFormData({ username: acct.email, password: acct.password, role: acct.role });
    try {
      await performLogin({ username: acct.email, password: acct.password, role: acct.role });
    } catch (error) {
      toast.error("Demo login failed. Make sure demo users are seeded in the backend.");
    }
  };

  // Component render
  return (
    <div style={styles.wrapper}>
      {/* Animated Background */}
      <div id="particles-js" style={styles.particlesBackground} />

      {/* Login + Demo Side-by-Side (stacked on mobile) */}
      <div className="relative z-[2] w-full max-w-[920px] flex flex-col md:flex-row items-stretch justify-center gap-5 px-2">
        <div style={{ ...styles.container, maxWidth: '440px', width: '100%' }}>
          <LoginForm
            formData={formData}
            showPassword={showPassword}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onTogglePassword={() => setShowPassword(prev => !prev)}
            onNavigate={navigate}
          />
        </div>
        <DemoAccessCard onQuickLogin={handleQuickLogin} />
      </div>
    </div>
  );
};

const DemoAccessCard = ({ onQuickLogin }) => {
  const copy = (text) => {
    navigator.clipboard?.writeText(text);
    toast.info(`Copied: ${text}`);
  };

  return (
    <div className="relative z-[3] w-full md:w-[360px] md:flex-shrink-0 bg-white/95 backdrop-blur rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col">
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-700" />
          <h3 className="text-sm font-semibold text-slate-900">Demo Access</h3>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">
          One-click sign-in for reviewers — no signup needed.
        </p>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4">
        <button
          type="button"
          onClick={() => onQuickLogin('hr')}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-[#0a2c5d] to-[#2b6cb0] hover:opacity-95 transition shadow-sm"
        >
          <ShieldCheck size={16} />
          Login as HR / Admin
        </button>
        <button
          type="button"
          onClick={() => onQuickLogin('employee')}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-emerald-500 hover:opacity-95 transition shadow-sm"
        >
          <User size={16} />
          Login as Employee
        </button>

        <div className="flex items-center gap-2 pt-1">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[10px] uppercase tracking-wider text-slate-400">or use credentials</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        <DemoRow
          icon={<ShieldCheck size={14} className="text-blue-700" />}
          title="HR / Admin"
          email={DEMO_ACCOUNTS.hr.email}
          password={DEMO_ACCOUNTS.hr.password}
          onCopy={copy}
        />
        <DemoRow
          icon={<User size={14} className="text-emerald-700" />}
          title="Employee"
          email={DEMO_ACCOUNTS.employee.email}
          password={DEMO_ACCOUNTS.employee.password}
          onCopy={copy}
        />
      </div>
    </div>
  );
};

const DemoRow = ({ icon, title, email, password, onCopy }) => (
  <div className="space-y-1.5">
    <div className="flex items-center gap-1.5">
      {icon}
      <span className="text-xs font-semibold text-slate-700">{title}</span>
    </div>
    <CredField value={email} onCopy={onCopy} icon={<KeyRound size={12} />} />
    <CredField value={password} onCopy={onCopy} mono />
  </div>
);

const CredField = ({ value, onCopy, mono }) => (
  <div className="flex items-center justify-between gap-2 bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 group">
    <code className={`text-xs text-slate-700 truncate ${mono ? 'font-mono' : ''}`}>{value}</code>
    <button
      type="button"
      onClick={() => onCopy(value)}
      className="shrink-0 p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition"
      title="Copy"
    >
      <Copy size={12} />
    </button>
  </div>
);

// Sub-components for better organization
const LoginForm = ({ formData, showPassword, onInputChange, onSubmit, onTogglePassword, onNavigate }) => (
  <form onSubmit={onSubmit} style={styles.formBox}>
    <WelcomeHeader />
    <RoleSelector selectedRole={formData.role} onRoleChange={(role) => onInputChange('role', role)} />
    <InputField
      type="text"
      placeholder="Username"
      value={formData.username}
      onChange={(e) => onInputChange('username', e.target.value)}
      icon={<FaUserCircle />}
      required
    />
    <PasswordField
      value={formData.password}
      showPassword={showPassword}
      onChange={(e) => onInputChange('password', e.target.value)}
      onToggleVisibility={onTogglePassword}
      required
    />
    <SubmitButton />
    <ForgotPasswordLink onNavigate={onNavigate} />
  </form>
);

const WelcomeHeader = () => (
  <>
    <h1 style={styles.welcomeText}>Welcome Back!</h1>
    <p style={styles.subText}>Sign in to continue your journey with us</p>
    <div style={styles.logoContainer}>
      <FaUserShield style={styles.logo} />
    </div>
    <h2 style={styles.title}>Login</h2>
  </>
);

const RoleSelector = ({ selectedRole, onRoleChange }) => (
  <div style={styles.roleSelector}>
    {ROLES.map((role) => (
      <button
        key={role}
        type="button"
        style={{
          ...styles.roleButton,
          ...(selectedRole === role ? styles.roleButtonActive : {})
        }}
        onClick={() => onRoleChange(role)}
      >
        {role.toUpperCase()}
      </button>
    ))}
  </div>
);

const InputField = ({ type, placeholder, value, onChange, icon, required }) => (
  <div style={styles.inputGroup}>
    <span style={styles.inputIcon}>{icon}</span>
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      style={styles.input}
    />
  </div>
);

const PasswordField = ({ value, showPassword, onChange, onToggleVisibility, required }) => (
  <div style={styles.inputGroup}>
    <FaLock style={styles.inputIcon} />
    <input
      type={showPassword ? "text" : "password"}
      placeholder="Password"
      value={value}
      onChange={onChange}
      required={required}
      style={styles.input}
    />
    <span onClick={onToggleVisibility} style={styles.passwordToggle}>
      {showPassword ? <FaEyeSlash /> : <FaEye />}
    </span>
  </div>
);

const SubmitButton = () => (
  <button type="submit" style={styles.button}>
    Sign In
  </button>
);

const ForgotPasswordLink = ({ onNavigate }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <p style={styles.forgotPassword}>
      <span>Forgot password ? </span>
      <span
        onClick={() => onNavigate('/forgot-password')}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{
          ...styles.forgotLink,
          ...(isHovered ? {
            background: 'linear-gradient(135deg, #0a2c5d 0%, #2b6cb0 100%)',
            color: 'red',
            textDecoration: 'undereline',
            padding: '0.1rem 0.3rem',
            borderRadius: '6px',
            transform: 'scale(1)'
          } : {})
        }}
      >
        {isHovered ? 'Reset Password' : 'Reset here'}
      </span>
    </p>
  );
};

// Styles - organized by component sections
const styles = {
  // Layout & Background
  wrapper: {
    minHeight: '70vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    padding: '2rem'
  },
  particlesBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1
  },

  // Container & Form
  container: {
    display: 'flex',
    maxWidth: '500px',
    width: '100%',
    background: 'rgba(255, 255, 255, 0.3)',
    borderRadius: '20px',
    overflow: 'hidden',
    boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
    position: 'relative',
    zIndex: 2,
    backdropFilter: 'blur(6px)',
    border: '1px solid rgba(255, 255, 255, 0.4)',
    justifyContent: 'center'
  },
  formBox: {
    width: '100%',
    padding: '2rem',
    background: 'white',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    backdropFilter: 'blur(5px)',
    position: 'relative',
    zIndex: 3
  },

  // Header Elements
  welcomeText: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#0a2850',
    marginBottom: '0.3rem',
    textShadow: '0 2px 4px rgba(255, 255, 255, 0.5)',
    textAlign: 'center'
  },
  subText: {
    fontSize: '0.9rem',
    color: '#1a365d',
    marginBottom: '1rem',
    textAlign: 'center',
    fontWeight: '500',
    textShadow: '0 1px 2px rgba(255, 255, 255, 0.4)'
  },
  logoContainer: {
    marginBottom: '1rem'
  },
  logo: {
    fontSize: '2.5rem',
    color: '#2b6cb0'
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: '600',
    color: '#2d3748',
    marginBottom: '1.5rem'
  },

  // Role Selector
  roleSelector: {
    display: 'flex',
    gap: '0.8rem',
    marginBottom: '1.5rem',
    width: '100%'
  },
  roleButton: {
    flex: '1',
    padding: '0.6rem',
    border: '2px solid rgba(226, 232, 240, 0.4)',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.3)',
    color: '#0a2850',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontWeight: '600',
    backdropFilter: 'blur(4px)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    boxShadow: '0 5px 15px rgba(0, 0, 0, 0.05)',
    fontSize: '0.85rem'
  },
  roleButtonActive: {
    background: 'linear-gradient(135deg, #0a2c5d 0%, #2b6cb0 100%)',
    color: 'white',
    borderColor: '#0a2c5d',
    boxShadow: '0 10px 20px rgba(10, 44, 93, 0.25)'
  },

  // Input Fields
  inputGroup: {
    position: 'relative',
    width: '100%',
    marginBottom: '1.2rem'
  },
  inputIcon: {
    position: 'absolute',
    left: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#4a5568',
    fontSize: '1.3rem',
    zIndex: 10,
    filter: 'none',
    textShadow: '0 1px 2px rgba(255, 255, 255, 0.6)'
  },
  input: {
    width: '100%',
    padding: '1rem 1rem 1rem 3rem',
    borderRadius: '10px',
    border: '2px solid rgba(226, 232, 240, 0.8)',
    fontSize: '1rem',
    transition: 'all 0.3s ease',
    outline: 'none',
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(2px)',
    boxShadow: 'inset 0 2px 5px rgba(0, 0, 0, 0.03)',
    color: '#0a2850',
    fontWeight: '500'
  },
  passwordToggle: {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    cursor: 'pointer',
    color: '#4a5568',
    fontSize: '1.2rem',
    zIndex: 10,
    filter: 'none',
    textShadow: '0 1px 2px rgba(255, 255, 255, 0.6)',
    transition: 'color 0.2s ease'
  },

  // Submit Button
  button: {
    width: '100%',
    padding: '0.9rem',
    background: 'linear-gradient(135deg, #0a2c5d 0%, #2b6cb0 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '10px',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '0.8rem',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    textTransform: 'uppercase',
    letterSpacing: '1px'
  },

  // Footer Links
  forgotPassword: {
    marginTop: '1.2rem',
    fontSize: '0.9rem',
    color: 'black',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center'
  },
  forgotLink: {
    cursor: 'pointer',
    textDecoration: 'underline',
    background: 'linear-gradient(135deg, #0a2c5d 0%, #2b6cb0 100%)',
    color: 'white',
    padding: '0.1rem 0.4rem',
    borderRadius: '6px',
    transform: 'scale(1)'
  }
};

export default Login;
