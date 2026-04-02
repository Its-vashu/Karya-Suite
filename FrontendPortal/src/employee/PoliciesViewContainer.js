import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PoliciesView from './PoliciesView';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const PoliciesViewContainer = () => {
    const [policies, setPolicies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchPolicies = async () => {
            try {
                //console.log('Fetching policies from:', `${API_BASE}/policies`);
                const response = await axios.get(`${API_BASE}/policies`, {
                    withCredentials: true
                });
                //console.log('Policies response:', response.data);
                setPolicies(response.data);
                setLoading(false);
            } catch (err) {
                //console.error('Error fetching policies:', err);
                setError(err.message || 'Failed to fetch policies');
                setLoading(false);
            }
        };

        fetchPolicies();
    }, []);

    const handleBack = () => {
        window.history.back();
    };

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-md">
                    <h2 className="text-red-600 text-xl font-semibold mb-4">Error Loading Policies</h2>
                    <p className="text-gray-600">{error}</p>
                    <button 
                        onClick={handleBack}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                    >
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <PoliciesView 
            policies={policies} 
            loading={loading} 
            onBack={handleBack}
        />
    );
};

export default PoliciesViewContainer;
