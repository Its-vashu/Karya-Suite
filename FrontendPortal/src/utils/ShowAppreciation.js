import React, { useState, useEffect } from 'react';
import axios from 'axios';

const ShowAppreciation = () => {
    const [appreciations, setAppreciations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({});
    const [filter, setFilter] = useState({
        badge_level: '',
        award_type: '',
        month: ''
    });

    useEffect(() => {
        fetchAppreciations();
        fetchStats();
    }, []);

    const fetchAppreciations = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/appreciation/dashboard?limit=20');
            setAppreciations(response.data || []);
        } catch (error) {
            console.error('Error fetching appreciations:', error);
            setError('Failed to load appreciations');
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get('/appreciation/stats');
            setStats(response.data || {});
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilter(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const filteredAppreciations = appreciations.filter(appreciation => {
        return (
            (!filter.badge_level || appreciation.badge_level === filter.badge_level) &&
            (!filter.award_type || appreciation.award_type === filter.award_type) &&
            (!filter.month || appreciation.month === filter.month)
        );
    });

    const getBadgeColor = (level) => {
        switch (level) {
            case 'gold': return 'bg-yellow-400';
            case 'silver': return 'bg-gray-300';
            case 'bronze': return 'bg-orange-400';
            default: return 'bg-gray-400';
        }
    };

    const getBadgeTextColor = (level) => {
        switch (level) {
            case 'gold': return 'text-yellow-900';
            case 'silver': return 'text-gray-800';
            case 'bronze': return 'text-orange-900';
            default: return 'text-gray-800';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
        <div className="max-w-full  bg-gray-100 mx-auto p-10">
            <div className="text-center mb-8">
                <h2 className="text-4xl font-bold text-gray-800 mb-2">Employee Appreciations</h2>
                <p className="text-gray-600 text-lg">Recent recognitions and awards</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border-l-4 border-blue-500">
                    <div className="flex items-center space-x-4">
                        <div className="text-4xl">🏆</div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.total_appreciations || 0}</h3>
                            <p className="text-gray-600">Total Appreciations</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border-l-4 border-yellow-400">
                    <div className="flex items-center space-x-4">
                        <div className="text-4xl">🥇</div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.badge_distribution?.gold || 0}</h3>
                            <p className="text-gray-600">Gold Badges</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border-l-4 border-gray-400">
                    <div className="flex items-center space-x-4">
                        <div className="text-4xl">🥈</div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.badge_distribution?.silver || 0}</h3>
                            <p className="text-gray-600">Silver Badges</p>
                        </div>
                    </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 border-l-4 border-orange-400">
                    <div className="flex items-center space-x-4">
                        <div className="text-4xl">🥉</div>
                        <div>
                            <h3 className="text-2xl font-bold text-gray-800">{stats.badge_distribution?.bronze || 0}</h3>
                            <p className="text-gray-600">Bronze Badges</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-6 rounded-xl shadow-lg mb-8">
                <div className="flex flex-wrap gap-4 items-center">
                    <select
                        name="badge_level"
                        value={filter.badge_level}
                        onChange={handleFilterChange}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    >
                        <option value="">All Badge Levels</option>
                        <option value="gold">Gold</option>
                        <option value="silver">Silver</option>
                        <option value="bronze">Bronze</option>
                    </select>

                    <select
                        name="award_type"
                        value={filter.award_type}
                        onChange={handleFilterChange}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    >
                        <option value="">All Award Types</option>
                        <option value="Employee of the Month">Employee of the Month</option>
                        <option value="Best Performer">Best Performer</option>
                        <option value="Innovation Champion">Innovation Champion</option>
                        <option value="Team Player">Team Player</option>
                        <option value="Customer Excellence">Customer Excellence</option>
                        <option value="Leadership Excellence">Leadership Excellence</option>
                    </select>

                    <input
                        type="month"
                        name="month"
                        value={filter.month}
                        onChange={handleFilterChange}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    />

                    <button
                        onClick={() => setFilter({ badge_level: '', award_type: '', month: '' })}
                        className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition duration-200 font-medium"
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-100 text-red-800 p-4 rounded-lg border border-red-200 mb-6 text-center">
                    {error}
                </div>
            )}

            {/* Appreciations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {filteredAppreciations.length === 0 ? (
                    <div className="col-span-full text-center py-16">
                        <div className="text-6xl mb-4">🏆</div>
                        <p className="text-gray-500 text-lg">No appreciations found</p>
                    </div>
                ) : (
                    filteredAppreciations.map(appreciation => (
                        <div key={appreciation.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4">
                                <div className="flex justify-between items-center">
                                    <span className={`px-3 py-1 rounded-full text-sm font-bold ${getBadgeColor(appreciation.badge_level)} ${getBadgeTextColor(appreciation.badge_level)} shadow-md`}>
                                        {appreciation.badge_level.toUpperCase()}
                                    </span>
                                    <span className="text-sm opacity-90">
                                        {formatDate(appreciation.created_at)}
                                    </span>
                                </div>
                            </div>

                            <div className="p-6">
                                <h3 className="text-xl font-bold text-gray-800 mb-2">
                                    {appreciation.employee_username}
                                </h3>
                                <p className="text-blue-600 font-semibold mb-3 text-sm">
                                    {appreciation.award_type}
                                </p>
                                <p className="text-gray-600 italic leading-relaxed mb-4">
                                    "{appreciation.appreciation_message}"
                                </p>
                            </div>

                            <div className="bg-gray-50 px-6 py-3 flex justify-between items-center text-sm text-gray-500">
                                <span className="font-medium">
                                    {appreciation.month} / {appreciation.year}
                                </span>
                                <span className="text-xs">
                                    ID: {appreciation.id}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Load More Button */}
            {appreciations.length >= 20 && (
                <div className="text-center">
                    <button
                        onClick={fetchAppreciations}
                        className="px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200 font-medium shadow-lg hover:shadow-xl"
                    >
                        Load More
                    </button>
                </div>
            )}
        </div>
    );
};

export default ShowAppreciation;
