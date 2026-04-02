import React, { useState, useEffect, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThumbsUp, MessageCircle,ArrowLeft } from 'lucide-react';
import axios from 'axios';
import PersonalDetails from '../utils/Personal_details';

import { useUser } from '../context/UserContext';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const ProfilePic = lazy(() => import('../utils/ProfilePic'));

const ShowAppreciation = () => {
    const navigate = useNavigate();
    const { user_id } = useUser();
    const [appreciations, setAppreciations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');
    const [stats, setStats] = useState({});
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    
    // Modal states for likes and comments view
    const [showModal, setShowModal] = useState(false);
    const [modalType, setModalType] = useState(''); // 'likes' or 'comments'
    const [modalData, setModalData] = useState([]);
    const [modalLoading, setModalLoading] = useState(false);
    const [modalAppreciation, setModalAppreciation] = useState(null);

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const getCurrentMonthName = () => {
        const currentMonth = new Date().getMonth();
        return monthNames[currentMonth];
    };


    const [filter, setFilter] = useState({
        badge_level: '',
        award_type: '',
        month: getCurrentMonthName(),
        year: new Date().getFullYear()
    });

    useEffect(() => {
        fetchAppreciations(true); 
        fetchStats();
    }, []);

    const fetchAppreciations = async (isInitialLoad = false) => {
        try {
            
            if (isInitialLoad) {
                setLoading(true);
                setPage(1); 
            } else {
                setLoadingMore(true);
            }
            
            const currentPage = isInitialLoad ? 1 : page;
            
            const response = await axios.get(`${API_BASE}/appreciation`, {
                params: {
                    page: currentPage,
                    limit: 9, // Number of items per page
                    badge_level: filter.badge_level || undefined,
                    award_type: filter.award_type || undefined,
                    month: filter.month || undefined,
                    year: filter.year || undefined
                }
            });
            
            const newData = response.data || [];
           
            const existingItemsMap = {};
            if (!isInitialLoad) {
                appreciations.forEach(item => {
                    if (item && item.id) {
                        existingItemsMap[item.id] = true;
                    }
                });
            }
            const uniqueNewData = newData.filter(item => 
                item && item.id && !existingItemsMap[item.id]
            );
            
            //console.log(`Received ${newData.length} items, ${uniqueNewData.length} are unique`);
            
            // Update appreciations - either replace or append
            if (isInitialLoad) {
                setAppreciations(newData);
            } else {
                setAppreciations(prev => [...prev, ...uniqueNewData]);
            }
            setHasMore(newData.length > 0 && newData.length >= 9);
            
            if (!isInitialLoad && newData.length > 0) {
                setPage(prev => prev + 1);
            }
        } catch (error) {
           //console.error('Error fetching appreciations:', error);
            setError('Failed to load appreciations');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const fetchStats = async () => {
        try {
            const response = await axios.get(`${API_BASE}/appreciation/stats`);
            setStats(response.data || {});
        } catch (error) {
            //console.error('Error fetching stats:', error);
            setError('Failed to load appreciation statistics');
        }
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilter(prev => ({
            ...prev,
            [name]: value
        }));

        setPage(1);
        setHasMore(true);
        setAppreciations([]); 
        
        setTimeout(() => fetchAppreciations(true), 0);
    };
    
    // Modal functions for likes and comments view
    const handleOpenLike = async (appreciation) => {
        setModalAppreciation(appreciation);
        setModalType('likes');
        setShowModal(true);
        setModalLoading(true);
        
        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_BASE}/appreciation/${appreciation.id}/likes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            //console.log('Likes data received:', response.data);

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

    const handleOpenCommentModal = async (appreciation) => {
        setModalAppreciation(appreciation);
        setModalType('comments');
        setShowModal(true);
        setModalLoading(true);

        try {
            const token = localStorage.getItem('access_token');
            const response = await axios.get(`${API_BASE}/appreciation/${appreciation.id}/comments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setModalData(response.data);
        } catch (error) {
            //console.error('Error fetching comments:', error);
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
    
    //handle like
    const handleLike = async (appreciation) => {
        if (!appreciation || !appreciation.id) return;
        
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/appreciation/${appreciation.id}/like`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user_id 
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                // Update the appreciation in state with new like count & like status
                setAppreciations(prev => prev.map(app => 
                    app.id === appreciation.id 
                        ? {
                            ...app,
                            likes_count: data.is_liked ? app.likes_count + 1 : app.likes_count - 1,
                            is_liked: data.is_liked
                        }
                        : app
                ));
                // const message = data.is_liked ? "You liked this appreciation" : "You removed your like";
            } else {
                //console.error('Failed to like appreciation');
                setError('Failed to like appreciation');
            }
        } catch (error) {
            //console.error('Error liking appreciation:', error);
            setError('Error liking appreciation:', error);
        }
    };
    // State for comments management
    const [commentTexts, setCommentTexts] = useState({});
    const [activeCommentAppreciation, setActiveCommentAppreciation] = useState(null);
    const [comments, setComments] = useState({});
    const [loadingComments, setLoadingComments] = useState({});
               
    // Fetch comments for an appreciation
    // const fetchComments = async (appreciationId) => {
    //     try {
    //         setLoadingComments(prev => ({...prev, [appreciationId]: true}));
    //         const token = localStorage.getItem('access_token');
    //         const response = await fetch(`${API_BASE}/appreciation/${appreciationId}/comments`, {
    //             headers: {
    //                 'Authorization': `Bearer ${token}`
    //             }
    //         });
            
    //         if (response.ok) {
    //             const data = await response.json();
    //             setComments(prev => ({...prev, [appreciationId]: data}));
    //         } else {
    //             //console.error('Failed to fetch comments');
    //             setError('Failed to fetch comments');
    //         }
    //     } catch (error) {
    //         //console.error('Error fetching comments:', error);
    //         setError('Error fetching comments', error);

    //     } finally {
    //         setLoadingComments(prev => ({...prev, [appreciationId]: false}));
    //     }
    // };
    
    // Post a new comment from modal
    const handlePostCommentInModal = async () => {
        if (!modalAppreciation) return;
        
        const appreciationId = modalAppreciation.id;
        const text = commentTexts[appreciationId] || '';
        
        if (!text.trim()) return;
        
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/appreciation/${appreciationId}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user_id,
                    text: text.trim()
                })
            });
            
            if (response.ok) {
                const newComment = await response.json();
                
                // Add the new comment to modal data (at the beginning)
                setModalData(prev => [newComment, ...prev]);
                
                // Also update the regular comments state if it exists
                setComments(prev => ({
                    ...prev,
                    [appreciationId]: [
                        newComment,
                        ...(prev[appreciationId] || [])
                    ]
                }));
                
                // Update comments count in main appreciation list
                setAppreciations(prev => prev.map(app => 
                    app.id === appreciationId 
                        ? {...app, comments_count: (app.comments_count || 0) + 1}
                        : app
                ));
                
                // Update modal appreciation's comment count
                setModalAppreciation(prev => ({
                    ...prev,
                    comments_count: (prev.comments_count || 0) + 1
                }));
                
                // Clear the input
                setCommentTexts(prev => ({
                    ...prev,
                    [appreciationId]: ''
                }));
                
                // Show success message (optional)
                //console.log('Comment posted successfully in modal!');
                
            } else {
                //console.error('Failed to post comment from modal');
                setError('Failed to post comment from modal');
            }
        } catch (error) {
            //console.error('Error posting comment from modal:', error);
            setError('Error posting comment from modal:', error);
        }
    };
    
    // Post a new comment
    const handlePostComment = async () => {
        if (!activeCommentAppreciation) return;
        
        const appreciationId = activeCommentAppreciation.id;
        const text = commentTexts[appreciationId] || '';
        
        if (!text.trim()) return;
        
        try {
            const token = localStorage.getItem('access_token');
            const response = await fetch(`${API_BASE}/appreciation/${appreciationId}/comments`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    user_id: user_id,
                    text: text.trim()
                })
            });
            
            if (response.ok) {
                const newComment = await response.json();
                
                // Add the new comment to the state
                setComments(prev => ({
                    ...prev,
                    [appreciationId]: [
                        newComment,
                        ...(prev[appreciationId] || [])
                    ]
                }));
                
                // Update comments count
                setAppreciations(prev => prev.map(app => 
                    app.id === appreciationId 
                        ? {...app, comments_count: app.comments_count + 1}
                        : app
                ));
                
                // Clear the input for this appreciation only
                setCommentTexts(prev => ({
                    ...prev,
                    [appreciationId]: ''
                }));
            } else {
                //console.error('Failed to post comment');
                setError('Failed to post comment');
            }
        } catch (error) {
            //console.error('Error posting comment:', error);
            setError('Error posting comment:', error);  
        }
    };
    // We'll use server-side filtering instead of client-side filtering
    const filteredAppreciations = appreciations;

    const getBadgeColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'gold': return 'bg-yellow-400';
            case 'silver': return 'bg-gray-300';
            case 'bronze': return 'bg-orange-400';
            default: return 'bg-gray-400';
        }
    };

    const getBadgeTextColor = (level) => {
        switch (level?.toLowerCase()) {
            case 'gold': return 'text-yellow-900';
            case 'silver': return 'text-gray-800';
            case 'bronze': return 'text-orange-900';
            default: return 'text-gray-800';
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
        <div className="max-w-full  bg-blue-900 mx-auto p-5">
            <div className='flex align-center ml-2 space-x-3'>
                <div>
                    <button
                        onClick = {() => navigate(-1)}
                        className=" p-2 mt-4 text-white hover:bg-blue-400 rounded-md flex items-center"
                    > <ArrowLeft />
                    </button>
                </div>
                 <div className="mb-4">
                    <h2 className="text-4xl font-bold text-gray-100 mb-1">Employee Appreciations</h2>
                    <p className="text-gray-200 text-lg">Recent recognitions and awards</p>
                </div>
            </div>

           

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-5">
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
            <div className="bg-white p-6 rounded-xl shadow-lg mb-5">
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

                    <select
                        name="month"
                        value={filter.month}
                        onChange={handleFilterChange}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    >
                        <option value="">All Months</option>
                        {monthNames.map((month) => (
                            <option key={month} value={month}>
                                {month}
                            </option>
                        ))}
                    </select>

                    <select
                        name="year"
                        value={filter.year}
                        onChange={handleFilterChange}
                        className="px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200"
                    >
                        <option value="">All Years</option>
                        {[...Array(5)].map((_, i) => {
                            const year = new Date().getFullYear() - i;
                            return <option key={year} value={year}>{year}</option>;
                        })}
                    </select>

                    <button
                        onClick={() => {
                            setFilter({ badge_level: '', award_type: '', month: '', year: '' });
                            setPage(1); // Reset page to 1
                            setHasMore(true); // Reset hasMore state
                            setAppreciations([]); // Clear current data
                            setTimeout(() => fetchAppreciations(true), 0);
                        }}
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
                        <p className="text-gray-100 text-lg">No appreciations found</p>
                    </div>
                ) : (
                    filteredAppreciations.map(appreciation => (
                        <div key={appreciation.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col">
                            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white p-4">
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
                                <div className="flex items-center mb-2">
                                    <div className="mr-3">
                                        <Suspense fallback={<div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse"></div>}>
                                            <ProfilePic
                                                userId={appreciation.employee_id}
                                            />
                                        </Suspense>
                                    </div>
                                    
                                    <span className="text-xl font-bold text-gray-800">
                                        <PersonalDetails
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
                                        <div className="space-x-3 flex items-center">
                                            <div>
                                                <button
                                                    onClick={() => handleLike(appreciation)}
                                                    className={`flex items-center space-x-2 ${appreciation.is_liked 
                                                        ? 'text-blue-600' 
                                                        : 'text-gray-900'
                                                    } hover:underline hover:text-blue-800 rounded-lg transition-all text-md font-semibold`}
                                                >
                                                    <ThumbsUp className={`w-6 h-6 ml-3 ${appreciation.is_liked ? 'fill-blue-600' : ''}`} />
                                                </button>
                                                <button
                                                    onClick={() => handleOpenLike(appreciation)}
                                                    className="flex items-center space-x-2 py-1 rounded-lg transition-all"
                                                >
                                                    <span
                                                        className='hover:underline hover:text-blue-800 text-black font-medium'
                                                        >{appreciation.likes_count || 0} like{
                                                        !(appreciation.likes_count <= 1) && 's'}</span>
                                                </button>
                                            </div>
                                            <div>
                                                <button
                                                    onClick={() => handleOpenCommentModal(appreciation)}
                                                    className=" space-x-2 py-1 rounded-lg transition-all text-md font-semibold"
                                                >
                                                    <MessageCircle className="w-6 h-6 ml-10"/>
                                                    <span
                                                        className='hover:underline hover:text-blue-800 font-medium '
                                                        >{appreciation.comments_count || 0} Comment{(appreciation.comments_count !== 1) && 's'}</span>
                                                </button>
                                            </div>
                                            
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <div className="mb-1">
                                                <Suspense fallback={<div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse inline-block"></div>}>
                                                    <ProfilePic userId={appreciation.given_by_id} />
                                                </Suspense>
                                            </div>
                                            
                                            <div className="text-gray-800 text-sm italic">
                                                By: <PersonalDetails userId={appreciation.given_by_id} />
                                            </div>
                                        </div>
                            
                                    </div>
                                </div>

                            </div>

                            <div className="bg-gray-50 px-6 py-3 flex justify-between items-center text-sm text-gray-800">
                                <span className="text-xs">
                                    Employee ID: {appreciation.employee_id}
                                </span>
                            </div>
                            
                            {/* Comment Section - Outside of the main card layout */}
                            {activeCommentAppreciation?.id === appreciation.id && (
                                <div className="mt-1 bg-gray-50 p-3 border-t border-gray-200">
                                    <div className="flex items-center mb-3">
                                        <input
                                            type="text"
                                            value={commentTexts[appreciation.id] || ''}
                                            onChange={(e) => setCommentTexts(prev => ({
                                                ...prev,
                                                [appreciation.id]: e.target.value
                                            }))}
                                            placeholder="Write a comment..."
                                            className="flex-grow px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                        <button
                                            onClick={handlePostComment}
                                            disabled={!(commentTexts[appreciation.id] || '').trim()}
                                            className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 disabled:bg-blue-300"
                                        >
                                            Post
                                        </button>
                                    </div>
                                    
                                    {loadingComments[appreciation.id] ? (
                                        <div className="text-center py-3">
                                            <div className="inline-block w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
                                        </div>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto">
                                            {comments[appreciation.id]?.length > 0 ? (
                                                comments[appreciation.id].map((comment) => (
                                                    <div key={comment.id} className="mb-2 p-2 bg-white rounded-lg shadow-sm">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-sm text-blue-600">{comment.username}</span>
                                                            <span className="text-xs text-gray-500 ml-2">
                                                                {new Date(comment.created_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-gray-700 text-sm mt-1">{comment.text}.</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <p className="text-gray-500 text-center py-2 text-sm">No comments yet. Be the first to comment!</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>

            {/* Load More Button */}
            {hasMore && (
                <div className="text-center">
                    <button
                        onClick={() => fetchAppreciations(false)} // false means it's a "load more" action, not initial load
                        disabled={loadingMore}
                        className={`px-8 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200 font-medium shadow-lg hover:shadow-xl ${loadingMore ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                        {loadingMore ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Loading...
                            </span>
                        ) : 'Load More'}
                    </button>
                </div>
            )}
            
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
                                {modalType === 'likes' ? '👍 People who liked this Appreciation!' : '💬 Comments & Add New Comment'}
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
                                    {/* Add Comment Section - Only show for comments modal */}
                                    {modalType === 'comments' && (
                                        <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                            <div className="flex items-center mb-2">
                                                <input
                                                    type="text"
                                                    value={commentTexts[modalAppreciation?.id] || ''}
                                                    onChange={(e) => setCommentTexts(prev => ({
                                                        ...prev,
                                                        [modalAppreciation?.id]: e.target.value
                                                    }))}
                                                    placeholder="Write a comment..."
                                                    className="flex-grow px-4 py-2 border border-gray-300 rounded-l-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    onKeyPress={(e) => {
                                                        if (e.key === 'Enter' && (commentTexts[modalAppreciation?.id] || '').trim()) {
                                                            handlePostCommentInModal();
                                                        }
                                                    }}
                                                />
                                                <button
                                                    onClick={handlePostCommentInModal}
                                                    disabled={!(commentTexts[modalAppreciation?.id] || '').trim()}
                                                    className="px-4 py-2 bg-blue-500 text-white rounded-r-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
                                                >
                                                Post
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-600">Press Enter or click Post to add your comment</p>
                                        </div>
                                    )}
                                    
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
    );
};

export default ShowAppreciation;
