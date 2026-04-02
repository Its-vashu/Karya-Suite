export default function MaintenancePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mb-6">
          <div className="mx-auto w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center">
            <svg 
              className="w-10 h-10 text-indigo-600" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" 
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-3xl font-bold text-gray-800 mb-3">
          Under Maintenance
        </h1>
        
        {/* Description */}
        <p className="text-gray-600 mb-6">
          We're currently working on this feature to make it better for you. 
          It will be available soon!
        </p>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          Coming Soon
        </div>

        {/* Button */}
        <button 
          onClick={() => window.history.back()}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          Go Back
        </button>
      </div>
    </div>
  );
}