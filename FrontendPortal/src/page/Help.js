import React, { useState } from 'react';
import {useNavigate} from 'react-router-dom';
import { toast } from 'react-toastify';
import  {ArrowLeft } from 'lucide-react';
import {useUser} from '../context/UserContext';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const Help = () => {
  const { username, user_id, email } = useUser();
  const navigate = useNavigate();

  const [query, setQuery] = useState({
    subject: '',
    message: '',
    priority: 'medium',
    category: 'general'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const categories = [
    { value: 'general', label: 'General Inquiry', icon: '💬' },
    { value: 'technical', label: 'Technical Support', icon: '🔧' },
    { value: 'hr', label: 'HR Related', icon: '👥' },
    { value: 'payroll', label: 'Payroll Issues', icon: '💰' },
    { value: 'leave', label: 'Leave Management', icon: '🗓️' },
    { value: 'system', label: 'System Access', icon: '🔑' }
  ];

  const priorities = [
    { value: 'low', label: 'Low Priority', color: 'text-green-600', bgColor: 'bg-green-50' },
    { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600', bgColor: 'bg-yellow-50' },
    { value: 'high', label: 'High Priority', color: 'text-orange-600', bgColor: 'bg-orange-50' },
    { value: 'urgent', label: 'Urgent', color: 'text-red-600', bgColor: 'bg-red-50' }
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setQuery(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const submitQuery = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        toast.error('Please login to submit a query');
        return;
      }

      // Placeholder for fetching user data
      const userData = {
        id: user_id,
        email: email,
        name: username
      };

      const url = new URL(`${API_BASE}/api/queries/`);
      url.searchParams.append('user_id', userData.id);
      url.searchParams.append('user_email', userData.email);
      url.searchParams.append('user_name', userData.name);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(query)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to submit query');
      }

      setSuccess(true);
      setQuery({
        subject: '',
        message: '',
        priority: 'medium',
        category: 'general'
      });
      
      toast.success('Query submitted successfully! You will receive a response via email.');
      
      setTimeout(() => setSuccess(false), 5000);

    } catch (error) {
      // console.error('Error submitting query:', error);
      toast.error(`Failed to submit query: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const faqData = [
    {
      question: 'How do I reset my password?',
      answer: 'You can reset your password by clicking on "Forgot Password" on the login page and following the instructions sent to your email.',
      icon: '🔒' 
    },
    {
      question: 'How do I apply for leave?',
      answer: 'Navigate to the Leave Management section from your dashboard and click on "Request Leave" to submit your application.',
      icon: '📝'
    },
    {
      question: 'Where can I view my timesheet?',
      answer: 'Your timesheet is available in the Timesheet section where you can log hours and view your work history.',
      icon: '⏱️'
    },
    {
      question: 'How do I update my profile information?',
      answer: 'Go to your Profile section to update personal information, profile picture, and other details.',
      icon: '👤'
    },
    {
      question: 'Who do I contact for urgent issues?',
      answer: 'For urgent matters, please contact Robin Kaushik at +91 9897511232 or email robin.kaushik@concientech.com',
      icon: '🚨'
    }
  ];

  return (
    <div className="min-h-screen bg-blue-900 py-5 px-4">
      <div className="max-w-7xl mx-auto mb-4">
        {/* Header */}
        <div className=" mb-2 p-3 space-x-3 rounded-2xl bg-white flex  align-center">
          <div>
             <button
                onClick={() => navigate(-1)}
                className="mt-4 py-2 px-2 rounded-lg  text-gray-700 hover:bg-gray-300"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
          </div>
          <div className="py-2">
            <h1 className="text-4xl md:text-3xl font-bold text-gray-700 mb-2">
              Help & Support
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl">
              We're here to help! Submit your query and our team will get back to you promptly.
            </p>
          </div>
        </div>
        

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Contact Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🏠</span> {/* Corrected emoji */}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 ml-3">Contact Information</h2>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">👨‍💼</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-2">HR Manager</h3>
                  </div>
                  <p className="text-gray-900 font-medium mb-2">Robin Kaushik</p>
                  <div className="space-y-1">
                    <p className="text-gray-600 flex items-center">
                      <span className="w-4 h-4 mr-2">📧</span>
                      robin.kaushik@concientech.com
                    </p>
                    <p className="text-gray-600 flex items-center">
                      <span className="w-4 h-4 mr-2">📱</span>
                      +91 9897511232
                    </p>
                  </div>
                </div>
                
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                  <div className="flex items-center mb-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">👩‍💼</span> {/* Corrected emoji */}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 ml-2">HR Manager</h3>
                  </div>
                  <p className="text-gray-900 font-medium mb-2">Nazia</p>
                  <p className="text-gray-600 flex items-center">
                    <span className="w-4 h-4 mr-2">📧</span> {/* Corrected emoji */}
                    nazia@concientech.com
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Query Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">📝</span> {/* Corrected emoji */}
                </div>
                <h2 className="text-2xl font-bold text-gray-900 ml-3">Submit a Query</h2>
              </div>
              
              {success && (
                <div className="mb-2 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                    <span className="text-white text-sm">✅</span>
                  </div>
                  <p className="text-green-800">Query submitted successfully! You will receive a response via email.</p>
                </div>
              )}

              <form onSubmit={submitQuery} className="space-y-2">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="category" className="block text-sm font-semibold text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      id="category"
                      name="category"
                      value={query.category}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>
                          {cat.icon} {cat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="priority" className="block text-sm font-semibold text-gray-700 mb-2">
                      Priority *
                    </label>
                    <select
                      id="priority"
                      name="priority"
                      value={query.priority}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                    >
                      {priorities.map(pri => (
                        <option key={pri.value} value={pri.value}>
                          {pri.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    id="subject"
                    name="subject"
                    value={query.subject}
                    onChange={handleInputChange}
                    placeholder="Brief description of your query"
                    required
                    maxLength="100"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  <p className="text-right text-xs text-gray-500 mt-1">
                    {query.subject.length}/100 characters
                  </p>
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                    Detailed Message *
                  </label>
                  <textarea
                    id="message"
                    name="message"
                    value={query.message}
                    onChange={handleInputChange}
                    placeholder="Please provide detailed information about your query..."
                    rows="6"
                    required
                    maxLength="500"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  />
                  <p className="text-right text-xs text-gray-500 ">
                    {query.message.length}/500 characters
                  </p>
                </div>

                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Query
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* FAQ Section */}
        <div className="mt-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <div className="flex items-center mb-8">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl">❓</span> {/* Corrected emoji */}
              </div>
              <h2 className="text-2xl font-bold text-gray-900 ml-3">Frequently Asked Questions</h2>
            </div>
            
            <div className="grid md:grid-cols-1 gap-2">
              {faqData.map((faq, index) => (
                <details key={index} className="group bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl border border-gray-200 hover:border-blue-300 transition-all duration-200">
                  <summary className="cursor-pointer p-5 flex items-center justify-between list-none">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                        <span className="text-sm">{faq.icon}</span>
                      </div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
                        {faq.question}
                      </h3>
                    </div>
                    <div className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors duration-200">
                      <svg className="w-5 h-5 transform group-open:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </summary>
                  <div className="px-5 pb-5">
                    <div className="pl-11 text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Help;