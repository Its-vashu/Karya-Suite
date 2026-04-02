import React, { useState, useEffect } from 'react';

const API_BASE = process.env.REACT_APP_API_BASE_URL;


const Personal_details = ({ userId }) => {
    const [details, setDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let isMounted = true;
        if (userId) {
            const fetchDetails = async () => {
                setLoading(true);
                setError(null);
                try {
                    const token = localStorage.getItem('access_token');
                    const response = await fetch(`${API_BASE}/users/${userId}/details`, {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    });
                    if (!response.ok) {
                        if (response.status === 404) {
                            if (isMounted) setDetails(null);
                            setLoading(false);
                            return;
                        }
                        throw new Error(`Failed to fetch details: ${response.status}`);
                    }
                    const data = await response.json();
                    if (isMounted) setDetails(data);
                } catch (err) {
                    // console.error('Error fetching user details:', err);
                    alert('Error fetching user details: '+err.message);
                    if (isMounted) setError('Failed to load details');
                } finally {
                    if (isMounted) setLoading(false);
                }
            };
            fetchDetails();
        } else {
            setDetails(null);
            setLoading(false);
        }
        return () => { isMounted = false; };
    }, [userId]);

    if (loading) return <span>Loading...</span>;
    if (error) return <span className="text-danger">{error}</span>;
    if (!details) return <span className="text-muted">No details found.</span>;

    // Only display the full_name (or fallback to username or 'N/A')
    return (
        <span>{details.full_name || details.username || 'N/A'}</span>
    );
};

export default Personal_details;