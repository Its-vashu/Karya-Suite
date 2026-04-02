import React, { useState, useEffect } from 'react';
import axios from 'axios';
const API_BASE = process.env.REACT_APP_API_BASE_URL;

const ShowAppreciation = () => {
    const [appreciations, setAppreciations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchAppreciations();
    }, []);

    const fetchAppreciations = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`${API_BASE}/appreciation/dashboard?limit=5`);
            setAppreciations(response.data || []);
        } catch (error) {
            //console.error('Error fetching appreciations:', error);
            setError('Failed to load appreciations');
        } finally {
            setLoading(false);
        }
    };

    const getBadgeColor = (level) => {
        switch (level) {
            case 'gold': return 'bg-yellow-400';
            case 'silver': return 'bg-gray-300';
            case 'bronze': return 'bg-orange-400';
            default: return 'bg-gray-400';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-64 space-y-4">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Loading appreciations...</p>
            </div>
        );
    }

    return (
        <div className="max-w-full rounded-lg bg-gray-100 mx-auto p-2">
            <div className="flex justify-center items-center mb-1">
                <div>
                    <h4 className="text-2xl font-bold text-gray-800 mb-2">Latest Employee Appreciations</h4>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 text-red-800 p-4 rounded-lg border border-red-200 mb-6 text-center">
                    {error}
                </div>
            )}

            {/* Appreciations Table */}
            <div className="overflow-x-auto bg-white rounded-xl shadow-lg">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gradient-to-r from-purple-500 to-indigo-600 text-left text-xs font-medium text-white uppercase tracking-wider">
                        <tr>
                            <th scope="col" className="px-6 py-1 text-left ">
                                Employee
                            </th>
                            <th scope="col" className="px-6 py-1 text-left ">
                                Award Type
                            </th>
                            <th scope="col" className="px-6 py-1 text-left ">
                                Message
                            </th>
                            <th scope="col" className="px-6 py-1 text-left ">
                                Months / Year
                            </th>
                            <th scope="col" className="px-6 py-1 text-left ">
                                Badge Level
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {appreciations.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-16 text-center">
                                    <div className="text-6xl mb-4">🏆</div>
                                    <p className="text-gray-500 text-lg">No appreciations found</p>
                                </td>
                            </tr>
                        ) : (
                            appreciations.map((appreciation) => (
                                <tr key={appreciation.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-2 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            {appreciation.employee_username}
                                        </div>
                                    </td>
                                    <td className="px-6 whitespace-nowrap">
                                        <div className="text-sm text-blue-600">
                                            {appreciation.award_type}
                                        </div>
                                    </td>
                                    <td className="px-6">
                                        <div className="text-sm text-gray-500 max-w-md">
                                            "{appreciation.appreciation_message}"
                                        </div>
                                    </td>
                                    <td className="px-6 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {appreciation.month} / {appreciation.year}
                                        </div>
                                    </td>
                                    <td className="px-6 whitespace-nowrap">
                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getBadgeColor(appreciation.badge_level)} text-gray-900`}>
                                            {appreciation.badge_level.toUpperCase()}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default ShowAppreciation;
