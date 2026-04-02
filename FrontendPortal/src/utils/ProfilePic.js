import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const ProfilePic = ({ userId, username }) => {
    const [pic, setPic] = useState(null);

    useEffect(() => {
        let isMounted = true;
        if (userId) {
            const fetchPic = async () => {
                try {
                    const token = localStorage.getItem('access_token');
                    const response = await fetch(`${API_BASE}/users/${userId}/profile-pic`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    if (!response.ok) {
                        if (response.status === 404) {
                            setPic(null);
                            return;
                        }
                        throw new Error(`Failed to fetch image: ${response.status}`);
                    }
                    const blob = await response.blob();
                    const imageUrl = URL.createObjectURL(blob);
                    if (isMounted) setPic(imageUrl);
                } catch (err) {
                    // console.error('Error fetching profile image:', err);
                    alert('Error fetching profile image: '+err.message);
                    if (isMounted) setPic(null);
                }
            };
            fetchPic();
        }
        return () => { isMounted = false; };
    }, [userId]);

    if (!pic) return <div className="w-12 h-12 rounded-full bg-gray-200 mb-4" title={username}></div>;
    return <img src={pic} alt={`${username}'s profile`} className="w-12 h-12 rounded-full mb-1 object-cover" />;
};

export default ProfilePic;