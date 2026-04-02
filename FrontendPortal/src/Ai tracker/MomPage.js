import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import MomCreate from './MomCreate';
import ViewMom from './ViewMom';
import ViewMyAIs from './ViewMyAIs';
import { ArrowLeft } from 'lucide-react';

const MomPage = () => {
  const { currentTime, currentdate } = useUser();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(() => {
    return localStorage.getItem('activeSection') || 'create';
  });

  useEffect(() => {
    localStorage.setItem('activeSection', activeSection);
  }, [activeSection]);

  return (
    <div className="min-h-screen bg-blue-900 p-6">
      <div className="max-w-4xl mx-auto flex flex-col border-2 border-gray-400 p-6 rounded-lg shadow-lg mb-2">
        {/* Navigation Buttons - Always visible */}
        <div className="">
          <div className='flex align-center mb-2 space-x-2'>
            <button
              onClick={() => navigate(-1)}
              className="px-2 py-2 text-gray-100 rounded-lg border hover:text-gray-600 hover:bg-blue-400 transition-colors"
            >
              <ArrowLeft />
            </button>
            <h1 className='font-bold text-gray-100 text-3xl'>Minutes of Meeting</h1>
          </div>
          <div className="flex justify-center space-x-8 mb-4">
            <button
              onClick={() => setActiveSection('create')}
              className={`px-8 py-3 rounded-full font-medium transition-colors ${
                activeSection === 'create'
                  ? 'bg-blue-600 text-white'
                  : 'border-2 border-gray-400 text-gray-100 hover:bg-blue-300 hover:text-blue-600'
              }`}
            >
              Create MoM
            </button>
            <button
              onClick={() => setActiveSection('view')}
              className={`px-8 py-3 rounded-full font-medium transition-colors ${
                activeSection === 'view'
                  ? 'bg-blue-600 text-white'
                  : 'border-2 border-gray-400 text-gray-100 hover:bg-blue-300 hover:text-blue-600'
              }`}
            >
              View MoM
            </button>
            <button
              onClick={() => setActiveSection('myais')}
              className={`px-8 py-3 rounded-full font-medium transition-colors ${
                activeSection === 'myais'
                  ? 'bg-blue-600 text-white'
                  : 'border-2 border-gray-400 text-gray-100 hover:bg-blue-300 hover:text-blue-600'
              }`}
            >
              View my AIs
            </button>
          </div>
        </div>
        {/* Content Section */}
        <div className="bg-gray-100 rounded-lg">
          {activeSection === 'create' && (
            <MomCreate 
              currentdate={currentdate} 
              defaultStartTime={currentTime}
            />
          )}
          {activeSection === 'view' && <ViewMom />}
          {activeSection === 'myais' && <ViewMyAIs />}
        </div>

      </div>
    </div>
  );
};

export default MomPage;
