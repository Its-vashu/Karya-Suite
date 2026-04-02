import React, { useEffect, useState, Suspense, lazy } from 'react'
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext'
import axios from 'axios';
import { MessageCircle, ThumbsUp,ArrowLeft } from 'lucide-react';
import  Personal_details  from '../utils/Personal_details';

const  ProfilePic  = lazy( () => import ('../utils/ProfilePic'));
const API_BASE = process.env.REACT_APP_API_BASE_URL;

export const SelfViewAppreciation = () => {
    const navigate = useNavigate();
    const { user_id } = useUser();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [appreciations, setAppreciations] = useState([]);
    
    // Modal states
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'likes' or 'comments'
    const [modalData, setModalData] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalAppreciation, setModalAppreciation] = useState(null);

    const token = localStorage.getItem('access_token');
    const [filter, setFilter] = useState({
            badge_level: '',
            year: new Date().getFullYear()
        });

    useEffect(() => {
        fetchSelfAppreciation();
    }, [user_id, filter.badge_level, filter.year]);

    const fetchSelfAppreciationWithFilter = async (filterParams = filter) => {
        setLoading(true);
        setError(null);
        try {
            if (!token) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('refresh_token');
                setError('Authentication required');
                setLoading(false);
                return;
            }

            //console.log('🔍 Fetching with filters:', filterParams); // Debug log

            const params = {
                page: 1,
                badge_level: filterParams.badge_level || undefined,
                award_type: filterParams.award_type || undefined,
                month: filterParams.month || undefined,
                year: filterParams.year || undefined,
            };

            //console.log('📡 Sending API params:', params); // Debug log

            const response = await axios.get(`${API_BASE}/appreciation/${user_id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                params: params
            });

            if (response.status === 200) {
                setAppreciations(response.data);
            } else {
                setError('Failed to fetch appreciations');
            }
        } catch (error) {
            let errorMessage = 'Failed to load self appreciation data';
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                errorMessage = 'Connection failed. Please check your backend server.';
            }
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const fetchSelfAppreciation = async () => {
        return fetchSelfAppreciationWithFilter();
    };

    const handleOpenLike = async (appreciation) => {
        setModalAppreciation(appreciation);
        setModalType('likes');
        setShowModal(true);
        setModalLoading(true);
        
        try {
            const response = await axios.get(`${API_BASE}/appreciation/${appreciation.id}/likes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            // Handle different response formats
            let likesData = [];
            if (Array.isArray(response.data)) {
                likesData = response.data;
            } else if (response.data && Array.isArray(response.data.liked_users)) {
                likesData = response.data.liked_users;
            }
            
            setModalData(likesData);
        } catch (error) {
            //console.error('Error fetching likes:', error);
            setModalData([]);
        } finally {
            setModalLoading(false);
        }
    };

    const handleOpenComment = async (appreciation) => {
        setModalAppreciation(appreciation);
        setModalType('comments');
        setShowModal(true);
        setModalLoading(true);

        try {
            const response = await axios.get(`${API_BASE}/appreciation/${appreciation.id}/comments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setModalData(response.data);
        } catch (error) {
            console.error('Error fetching comments:', error);
            setModalData([]);
        } finally {
            setModalLoading(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setModalType('');
        setModalData([]);
        setModalAppreciation(null);
        setModalLoading(false);
    };

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscKey = (event) => {
            if (event.key === 'Escape' && showModal) {
                closeModal();
            }
        };

        if (showModal) {
            document.addEventListener('keydown', handleEscKey);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
            document.body.style.overflow = 'unset';
        };
    }, [showModal]);

    const getBadgeColor = (level) => {
        const colors = {
            'gold': 'bg-yellow-100',
            'silver': 'bg-gray-100',
            'bronze': 'bg-orange-100'
        };
        return colors[level.toLowerCase()] || 'bg-gray-100';
    };

    const getBadgeTextColor = (level) => {
        const colors = {
            'gold': 'text-yellow-800',
            'silver': 'text-gray-800',
            'bronze': 'text-orange-800'
        };
        return colors[level.toLowerCase()] || 'text-gray-800';
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="text-red-500 text-center">
                    <p className="text-xl mb-2">Error</p>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
    
    const handleFilterChange = (key, value) => {
        const newFilter = { ...filter, [key]: value };
        setFilter(newFilter);
        
        // Immediately fetch with the new filter values
        fetchSelfAppreciationWithFilter(newFilter);
    };

    return (
        <div className='container min-h-screen max-w-full bg-blue-800 py-8'>
            <div className='max-w-6xl px-4 mx-auto'>

                {/* header */}
                <div className="flex items-center justify-start mb-4 space-x-2">
                    <button
                        onClick={() => navigate(-1)}
                        className="mt-2 py-2 px-2 rounded-lg flex items-center text-gray-100 hover:bg-gray-300 hover:text-gray-800"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <h1 className='text-3xl font-bold text-gray-100 '>My Appreciations</h1>
                </div>

                {/* Filter Section */}
                <div className="bg-white rounded-lg p-4 mb-6 shadow-md">
                    <div className="flex flex-wrap gap-4">
                        <div >
                            <label className="block text-md font-medium text-gray-800 mb-1 ml-2">Badge Level </label>
                            <select
                                value={filter.badge_level}
                                onChange={(e) => handleFilterChange('badge_level', e.target.value)}
                                className=" border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Badges</option>
                                <option value="gold">Gold</option>
                                <option value="silver">Silver</option>
                                <option value="bronze">Bronze</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="block text-lg font-medium text-gray-800 mb-1 ml-4">Year</label>
                            <select
                                value={filter.year}
                                onChange={(e) => handleFilterChange('year', e.target.value)}
                                className=" border border-gray-300 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                                <option value="">All Years</option>
                                {years.map(year => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </div>

                        <div className='flex items-end'>
                            <button
                                onClick={() => {
                                    const clearedFilter = { badge_level: '', year: '' };
                                    setFilter(clearedFilter);
                                    fetchSelfAppreciationWithFilter(clearedFilter);
                                }}
                                className="bg-red-500 hover:bg-red-600 text-gray-100 font-medium py-2 px-4 rounded-md transition-colors duration-200"
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {/* Appreciation Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-2">
                    {appreciations.length === 0 ? (
                        <div className="col-span-full text-center py-16">
                            <div className="text-6xl mb-4">🏆</div>
                            <p className="text-white text-lg"> You have no appreciations yet !</p>
                        </div>
                    ) : (
                        appreciations.map(appreciation => (
                            <div key={appreciation.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col">
                                <div className="bg-gradient-to-r from-gray-100 to-gray-300 text-blue-800 p-4">
                                    <div className="flex justify-between items-center">
                                        <span className={`px-4 py-1 rounded-full text-sm font-bold ${getBadgeColor(appreciation.badge_level)} ${getBadgeTextColor(appreciation.badge_level)} shadow-md`}>
                                            {appreciation.badge_level.toUpperCase()}
                                        </span>
                                        <span className="font-medium">
                                            {appreciation.month} / {appreciation.year}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 flex-grow">
                                    <div className="flex items-center mb-3">
                                        <div className="mr-3">
                                            <Suspense fallback={<div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>}>
                                                <ProfilePic
                                                    userId={appreciation.employee_id}
                                                />
                                            </Suspense>
                                        </div>
                                        
                                        <span className="text-xl font-bold text-gray-800">
                                            <Personal_details
                                                userId={appreciation.employee_id}
                                            />
                                        </span>
                                    </div>
                                    <p className="text-blue-600 font-semibold mb-2 text-sm">
                                        {appreciation.award_type}
                                    </p>
                                    <p className="text-gray-700 italic leading-relaxed mb-4 border-l-4 border-gray-300 pl-3 py-1">
                                        "{appreciation.appreciation_message}"
                                    </p>
                                    <div className='flex flex-col w-full'>
                                        <div className="flex justify-between">
                                            <div className="space-x-2 flex items-center">
                                                <button
                                                    onClick={() => handleOpenLike(appreciation)}
                                                    className="flex items-center space-x-2 bg-gray-200 border-gray-300 border-2 bg-opacity-20 hover:bg-blue-100 hover:border-blue-300 px-4 py-2 rounded-lg transition-all text-sm"
                                                >
                                                    <ThumbsUp className="w-4 h-4" />
                                                    <span>{appreciation.likes_count || 0} Like{(appreciation.likes_count !== 1) && 's'}</span>
                                                </button>
                                                <button
                                                    onClick={() => handleOpenComment(appreciation)}
                                                    className="flex items-center space-x-2 bg-gray-200 border-gray-300 border-2 bg-opacity-20 hover:bg-blue-100 hover:border-blue-300 px-4 py-2 rounded-lg transition-all text-sm"
                                                >
                                                    <MessageCircle className="w-4 h-4" />
                                                    <span>{appreciation.comments_count || 0} Comment{(appreciation.comments_count !== 1) && 's'}</span>
                                                </button>
                                            </div>
                                            <div className="flex flex-col items-end">
                                                <div className="mb-1">
                                                    <Suspense fallback={<div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse inline-block"></div>}>
                                                        <ProfilePic userId={appreciation.given_by_id} />
                                                    </Suspense>
                                                </div>
                                                
                                                <span className="text-gray-800 text-sm italic">
                                                    By: <Personal_details userId={appreciation.given_by_id} />
                                                </span>
                                            </div>
                                
                                        </div>
                                    </div>

                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Modal for Likes and Comments */}
                {showModal && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
                        onClick={closeModal}
                    >
                        <div 
                            className="bg-white rounded-lg max-w-lg w-full mx-4 max-h-96 overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-center p-4 border-b border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {modalType === 'likes' ? '👍 People who liked this Appreciation!' : '💬 People who commented on this Appreciation!'}
                                </h3>
                                <button
                                    onClick={closeModal}
                                    className="text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="p-4 max-h-80 overflow-y-auto">
                                {modalLoading ? (
                                    <div className="text-center py-8">
                                        <div className="inline-block w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                        <p className="text-gray-500 mt-2">Loading {modalType}...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {modalData.length > 0 ? (
                                            modalType === 'likes' ? (
                                                // Render Likes
                                                modalData.map((like, index) => {
                                                    let displayName;
                                                    let displayDate;
                                                    
                                                    if (typeof like === 'string') {
                                                        displayName = like;
                                                        displayDate = null;
                                                    } else if (like === null || typeof like !== 'object') {
                                                        displayName = "Unknown User";
                                                        displayDate = null;
                                                    } else {
                                                        displayName = like.username || "Unknown User";
                                                        
                                                        const dateField =  like.liked_at;
                                                        displayDate = dateField ? new Date(dateField).toLocaleDateString() : null;
                                                    }
                                                    
                                                    return (
                                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center">
                                                                <ThumbsUp className="w-5 h-5 mr-3 text-blue-500" />
                                                                <span className="font-medium text-blue-600">
                                                                    @{displayName}
                                                                </span>
                                                            </div>
                                                            {displayDate && (
                                                                <span className="text-sm text-gray-500">
                                                                    {displayDate}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                // Render Comments
                                                modalData.map((comment) => (
                                                    <div key={comment.id} className="p-3 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="font-medium text-blue-600">@{comment.username}</span>
                                                            <span className="text-sm text-gray-500">
                                                                {new Date(comment.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-700">{comment.text}.</p>
                                                    </div>
                                                ))
                                            )
                                        ) : (
                                            <div className="text-center py-8">
                                                <div className="text-4xl mb-2">
                                                    {modalType === 'likes' ? '👍' : '💬'}
                                                </div>
                                                <p className="text-gray-500">
                                                    No {modalType} yet!
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="p-4 border-t border-gray-200 bg-gray-50">
                                <div className="text-sm text-gray-600 text-center">
                                    {modalAppreciation && (
                                        <span>
                                            Showing {modalType} for "{modalAppreciation.award_type}" appreciation of
                                            <p className="text-blue-600">{modalAppreciation.month} / {modalAppreciation.year}</p>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                
            </div>

        </div>
    )
}
