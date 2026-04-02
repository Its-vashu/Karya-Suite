import React, { useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const ResetPassword = () => {

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();
  const { token: paramToken } = useParams();
  const location = useLocation();
  const queryToken = new URLSearchParams(location.search).get('token');
  const token = paramToken || queryToken;

  const getPasswordStrength = (pw) => {
    if (!pw) return { strength: 0, label: '', color: '' };
    
    let score = 0;
    const checks = [
      pw.length >= 8,
      /[a-z]/.test(pw),
      /[A-Z]/.test(pw),
      /\d/.test(pw),
      /[!@#$%^&*(),.?":{}|<>]/.test(pw)
    ];
    
    score = checks.filter(Boolean).length;
    
    if (score < 3) return { strength: score, label: 'Weak', color: 'bg-red-500' };
    if (score < 4) return { strength: score, label: 'Fair', color: 'bg-yellow-500' };
    if (score < 5) return { strength: score, label: 'Good', color: 'bg-blue-500' };
    return { strength: score, label: 'Strong', color: 'bg-green-500' };
  };


  const validatePassword = (pw) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
    return passwordRegex.test(pw);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');


    if (!password || !confirmPassword) {
      setError('Please fill in both password fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The passwords do not match.');
      return;
    }
    if (!validatePassword(password)) {
      setError('Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/reset-password/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (response.ok) {
        setSuccess('Password reset successful! Redirecting to login in 5 seconds...');
        setTimeout(() => navigate('/login'), 5000);
      } else {
        setError(data.detail || 'Password reset failed. The link may be invalid or expired.');
      }
    } catch (err) {
      setError('A server error occurred. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600">Create a new, strong password for your account</p>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <div className="space-y-6">
            {/* New Password Field */}
            <div className="space-y-2">
              <label htmlFor="new-password" className="text-sm font-semibold text-gray-700 block">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your new password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {password && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Password strength:</span>
                    <span className={`font-medium ${
                      passwordStrength.label === 'Strong' ? 'text-green-600' :
                      passwordStrength.label === 'Good' ? 'text-blue-600' :
                      passwordStrength.label === 'Fair' ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${(passwordStrength.strength / 5) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-2">
              <label htmlFor="confirm-password" className="text-sm font-semibold text-gray-700 block">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="flex items-center space-x-2 text-sm">
                  {password === confirmPassword ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-green-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-red-500" />
                      <span className="text-red-600">Passwords don't match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-center space-x-2 p-4 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="flex items-center space-x-2 p-4 bg-green-50 border border-green-200 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <span className="text-green-700 text-sm">{success}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !!success}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Resetting Password...</span>
                </div>
              ) : (
                'Reset Password'
              )}
            </button>
          </div>
        </div>

        {/* Password Requirements */}
        <div className="mt-6 bg-gray-50 rounded-xl p-4 border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Password Requirements:</h3>
          <ul className="space-y-1 text-sm text-gray-600">
            <li className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>At least 8 characters long</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${/[A-Z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>One uppercase letter</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${/[a-z]/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>One lowercase letter</span>
            </li>
            <li className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${/\d/.test(password) ? 'bg-green-500' : 'bg-gray-300'}`}></div>
              <span>One number</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;