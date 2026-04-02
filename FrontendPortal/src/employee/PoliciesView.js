import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const PoliciesView = ({ policies = [], loading = false, onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [expandedPolicy, setExpandedPolicy] = useState(null);
  
  // Debug log policies on load
  useEffect(() => {
    //console.log('PoliciesView loaded with policies:', policies);
    if (policies.length === 0 && !loading) {
      //console.warn('No policies found. This might indicate an authentication or API issue.');
    }
  }, [policies, loading]);

  // Download policy document
  const downloadPolicyDocument = async (policyId, policyName) => {
    try {
      if (!policyId) {
        //console.error('Policy ID is missing');
        alert('Cannot download policy: Policy ID is missing');
        return;
      }
      
      //console.log(`Downloading policy document: ID=${policyId}, Name=${policyName}`);
      
      //console.log(`Using API endpoint: ${API_BASE}/policies/${policyId}/download`);

      const response = await fetch(`${API_BASE}/policies/${policyId}/download`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No error details');
        //console.error(`Download failed with status: ${response.status}`, errorText);
        throw new Error(errorText);
      }
      
      const blob = await response.blob();
      //console.log(`Downloaded blob size: ${blob.size} bytes, type: ${blob.type}`);
      
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${policyName.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      //console.log('Download initiated');
      
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
    } catch (err) {
      //console.error('Error downloading policy document:', err);
      alert('Error downloading document: ' + err.message);
    }
  };

  // Extract unique categories from policies
  const categories = ['All', ...new Set(policies.map(policy => policy.category || policy.department).filter(Boolean))];

  // Filter policies based on search query and active category
  const filteredPolicies = policies.filter(policy => {
    const matchesSearch = searchQuery === '' || 
      (policy.title || policy.name)?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.content?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      policy.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = activeCategory === 'All' || 
      policy.category === activeCategory || 
      policy.department === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50/10 to-gray-50">
      {/* Header Section with gradient and shadow */}
      <div className="bg-gradient-to-r from-blue-700 to-blue-900 shadow-lg">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-4">
              <button 
                onClick={onBack}
                className="p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all duration-200 shadow-md"
                aria-label="Back to dashboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold text-white">Company Policies</h1>
                <p className="text-blue-100 text-xs">Guidelines and regulations for all employees</p>
              </div>
            </div>
            
            <div className="mt-4 md:mt-0 w-full md:w-auto md:max-w-xs">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-4 w-4 text-blue-300" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 text-sm border border-blue-600 rounded-md leading-5 bg-blue-600/50 text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:bg-blue-700"
                  placeholder="Search policies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Category filters */}
        {categories.length > 1 && (
          <div className="pb-4 mb-5 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:justify-between md:items-center">
              <h2 className="text-sm font-medium text-gray-600 mb-3 md:mb-0">
                Filter by Department or Category
              </h2>
              
              <div className="flex flex-wrap gap-1.5">
                {categories.map((category) => {
                  const count = category === 'All' 
                    ? policies.length 
                    : policies.filter(p => (p.category === category || p.department === category)).length;
                  
                  return (
                    <button
                      key={category}
                      onClick={() => setActiveCategory(category)}
                      className={`px-3 py-1 rounded-md text-xs font-medium ${
                        activeCategory === category
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      } transition-all duration-200`}
                    >
                      {category}
                      <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
                        activeCategory === category
                          ? 'bg-white text-blue-800'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="flex flex-col items-center justify-center h-60 bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-600"></div>
            <p className="mt-3 text-gray-600 text-sm">Loading company policies...</p>
          </div>
        ) : filteredPolicies.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center border border-gray-200">
            <div className="mx-auto w-16 h-16 flex items-center justify-center bg-blue-50 rounded-full mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-medium text-gray-800 mb-2">No Policies Found</h3>
            {searchQuery || activeCategory !== 'All' ? (
              <p className="text-gray-600 text-sm max-w-md mx-auto">
                No policies match your current search criteria. Try adjusting your search or filter settings.
              </p>
            ) : (
              <p className="text-gray-600 text-sm max-w-md mx-auto">
                There are currently no company policies available in our system. New policies will appear here once they are published.
              </p>
            )}
            {(searchQuery || activeCategory !== 'All') && (
              <div className="mt-4 flex justify-center space-x-3">
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    Clear Search
                  </button>
                )}
                {activeCategory !== 'All' && (
                  <button
                    onClick={() => setActiveCategory('All')}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    Show All Policies
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Policy count and search results summary */}
            <div className="mb-4 pb-2 border-b border-gray-200 flex flex-col sm:flex-row sm:justify-between sm:items-center">
              <div className="mb-2 sm:mb-0">
                <span className="text-sm font-medium text-gray-500">
                  Showing {filteredPolicies.length} of {policies.length} policies
                </span>
                {activeCategory !== 'All' && (
                  <span className="ml-1 text-sm text-gray-500">
                    in <span className="font-medium">{activeCategory}</span>
                  </span>
                )}
              </div>
              
              {searchQuery && (
                <div className="text-sm text-gray-500">
                  Search results for: <span className="font-medium text-blue-600">"{searchQuery}"</span>
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="ml-2 text-blue-600 hover:text-blue-800 underline text-xs"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>
            
            {/* Policies list in registration form style */}
            <div className="space-y-6">
              {filteredPolicies.map((policy, index) => {
                const isExpanded = expandedPolicy === (policy.id || index);
                const policyName = policy.title || policy.name || `Policy ${index + 1}`;
                const policyCategory = policy.category || policy.department || 'General';
                // Calculate if the policy is new (less than 30 days old)
                const isNewPolicy = policy.created_at && 
                  (new Date().getTime() - new Date(policy.created_at).getTime()) < (30 * 24 * 60 * 60 * 1000);
                // Calculate if the policy was recently updated (updated in the last 7 days)
                const isRecentlyUpdated = (policy.lastUpdated || policy.updated_at) && 
                  (new Date().getTime() - new Date(policy.lastUpdated || policy.updated_at).getTime()) < (7 * 24 * 60 * 60 * 1000);
                
                return (
                  <div 
                    key={policy.id || index} 
                    className={`bg-white rounded-lg shadow-sm overflow-hidden transition-all duration-200 ${
                      isNewPolicy 
                        ? 'border-2 border-green-200' 
                        : isRecentlyUpdated 
                        ? 'border-2 border-blue-200' 
                        : 'border border-gray-200'
                    }`}
                  >
                    {/* Policy Header - Always visible */}
                    <div 
                      className={`px-4 py-4 sm:px-6 flex items-center justify-between cursor-pointer ${
                        isExpanded ? 'bg-blue-50 border-b border-blue-100' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => setExpandedPolicy(isExpanded ? null : (policy.id || index))}
                    >
                      <div className="flex items-center flex-grow">
                        <div className={`flex-shrink-0 mr-4 p-2 rounded-full ${
                          isExpanded ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-grow">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="text-md font-medium text-gray-900">{policyName}</h3>
                            {policy.version && (
                              <span className="mt-1 sm:mt-0 text-xs text-gray-500">
                                Version: {policy.version}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${
                              isExpanded ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                              {policyCategory}
                            </span>
                            
                            {policy.status && (
                              <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-md ${
                                policy.status === 'Active' || policy.status === 'active' 
                                  ? 'bg-green-100 text-green-800' 
                                  : policy.status === 'Draft' || policy.status === 'draft'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : policy.status === 'Archived' || policy.status === 'archived'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}>
                                {policy.status || 'Active'}
                              </span>
                            )}
                            
                            {policy.created_at && (
                              <span className="text-xs text-gray-500 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                Created: {new Date(policy.created_at).toLocaleDateString()}
                              </span>
                            )}
                            
                            {(policy.lastUpdated || policy.updated_at) && (
                              <span className="text-xs text-gray-500 flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Updated: {new Date(policy.lastUpdated || policy.updated_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex-shrink-0 ml-4 flex items-center gap-2">
                        {policy.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              //console.log('Policy data for download:', policy);
                              if (!policy.pdf_filename && !policy.pdf_path) {
                                alert('This policy does not have an attached document to download.');
                                return;
                              }
                              downloadPolicyDocument(policy.id, policy.name || policy.title);
                            }}
                            className={`p-2 ${policy.pdf_filename || policy.pdf_path ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 cursor-not-allowed'} rounded-lg transition-colors`}
                            title={policy.pdf_filename || policy.pdf_path ? "Download policy document" : "No document available"}
                            disabled={!policy.pdf_filename && !policy.pdf_path}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        )}
                        <div className="flex items-center">
                          <span className="text-xs mr-2 text-blue-600 font-medium hidden sm:inline-block">
                            {isExpanded ? 'Hide Details' : 'View Details'}
                          </span>
                          <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 text-blue-500 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    {/* Policy Details - Only visible when expanded */}
                    {isExpanded && (
                      <div className="px-4 py-5 sm:px-6 bg-white border-t border-gray-100">
                        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                          <div className="sm:col-span-2">
                            <dt className="text-sm font-medium text-gray-500">Description</dt>
                            <dd className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                              {policy.description || "No description available."}
                            </dd>
                          </div>
                          
                          {(policy.department || policy.category) && (
                            <div className="border-l-2 border-blue-100 pl-3">
                              <dt className="text-sm font-medium text-gray-500">Department</dt>
                              <dd className="mt-1 text-sm text-gray-900">{policy.department || policy.category}</dd>
                            </div>
                          )}
                          
                          {policy.policy_category && (
                            <div className="border-l-2 border-blue-100 pl-3">
                              <dt className="text-sm font-medium text-gray-500">Category</dt>
                              <dd className="mt-1 text-sm text-gray-900">{policy.policy_category}</dd>
                            </div>
                          )}
                          
                          {policy.effective_date && (
                            <div className="border-l-2 border-blue-100 pl-3">
                              <dt className="text-sm font-medium text-gray-500">Effective Date</dt>
                              <dd className="mt-1 text-sm text-gray-900">{new Date(policy.effective_date).toLocaleDateString()}</dd>
                            </div>
                          )}
                          
                          <div className="border-l-2 border-blue-100 pl-3">
                            <dt className="text-sm font-medium text-gray-500">Created Date</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {policy.created_at ? 
                                new Date(policy.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'long', day: 'numeric'
                                }) : "Not available"
                              }
                            </dd>
                          </div>
                          
                          <div className="border-l-2 border-blue-100 pl-3">
                            <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                            <dd className="mt-1 text-sm text-gray-900">
                              {(policy.lastUpdated || policy.updated_at) ? 
                                new Date(policy.lastUpdated || policy.updated_at).toLocaleDateString('en-US', {
                                  year: 'numeric', month: 'long', day: 'numeric'
                                }) : "Not available"
                              }
                            </dd>
                          </div>
                          
                          {policy.version && (
                            <div className="border-l-2 border-blue-100 pl-3">
                              <dt className="text-sm font-medium text-gray-500">Version</dt>
                              <dd className="mt-1 text-sm text-gray-900">{policy.version}</dd>
                            </div>
                          )}
                          
                          {policy.status && (
                            <div className="border-l-2 border-blue-100 pl-3">
                              <dt className="text-sm font-medium text-gray-500">Status</dt>
                              <dd className="mt-1 text-sm text-gray-900">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  policy.status === 'Active' || policy.status === 'active' 
                                    ? 'bg-green-100 text-green-800' 
                                    : policy.status === 'Draft' || policy.status === 'draft'
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : policy.status === 'Archived' || policy.status === 'archived'
                                    ? 'bg-gray-100 text-gray-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {policy.status}
                                </span>
                              </dd>
                            </div>
                          )}
                          
                          {policy.content && (
                            <div className="sm:col-span-2 mt-3 border-t border-gray-100 pt-4">
                              <dt className="text-sm font-medium text-gray-500">Full Content</dt>
                              <dd className="mt-2 text-sm text-gray-900 bg-gray-50 p-4 rounded-md whitespace-pre-line border border-gray-200">
                                {policy.content}
                              </dd>
                            </div>
                          )}
                          
                          <div className="sm:col-span-2 border-t border-gray-100 pt-4 mt-4">
                            {policy.pdf_filename || policy.pdf_path ? (
                              <button 
                                onClick={() => {
                                  //console.log('Policy data for expanded view download:', policy);
                                  downloadPolicyDocument(policy.id, policy.name || policy.title);
                                }}
                                className="inline-flex items-center px-4 py-2 border border-blue-600 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                              >
                                <Download className="h-4 w-4 mr-2" />
                                Download Policy Document
                              </button>
                            ) : (
                              <div className="text-sm text-gray-500">
                                <span className="inline-flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                  </svg>
                                  No document is available for download
                                </span>
                              </div>
                            )}
                          </div>
                          
                          {/* Show "New" or "Recently Updated" badges */}
                          <div className="sm:col-span-2 flex flex-wrap gap-2 mt-3">
                            {isNewPolicy && (
                              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                New Policy
                              </div>
                            )}
                            
                            {!isNewPolicy && isRecentlyUpdated && (
                              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Recently Updated
                              </div>
                            )}
                          </div>
                          
                          {/* Related Policies - Only show if we have data for them */}
                          {policy.relatedPolicies && policy.relatedPolicies.length > 0 && (
                            <div className="sm:col-span-2 border-t border-gray-200 mt-6 pt-4">
                              <dt className="text-sm font-medium text-gray-500 mb-2">Related Policies</dt>
                              <dd className="mt-1">
                                <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
                                  {policy.relatedPolicies.map((relatedPolicy, idx) => (
                                    <li key={idx} className="px-4 py-3 hover:bg-gray-50">
                                      <button 
                                        className="w-full text-left flex items-center justify-between"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          // Find the related policy in our list and expand it
                                          const policyToExpand = policies.find(p => 
                                            (p.id === relatedPolicy.id) || 
                                            (p.title === relatedPolicy.title) || 
                                            (p.name === relatedPolicy.name)
                                          );
                                          if (policyToExpand) {
                                            const policyIndex = policies.indexOf(policyToExpand);
                                            setExpandedPolicy(policyToExpand.id || policyIndex);
                                          }
                                        }}
                                      >
                                        <span className="text-sm text-blue-600 hover:text-blue-800">
                                          {relatedPolicy.title || relatedPolicy.name}
                                        </span>
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-500" viewBox="0 0 20 20" fill="currentColor">
                                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                        </svg>
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              </dd>
                            </div>
                          )}
                        </dl>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
      
      
    </div>
  );
};

export default PoliciesView;
