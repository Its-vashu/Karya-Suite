import { useEffect, useState } from 'react';
const API_BASE = process.env.REACT_APP_API_BASE_URL;

// Custom hook to fetch leave days for the calendar
export default function useLeaveDays(user_id) {
  const [leaveDays, setLeaveDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user_id) return;
    setLoading(true);
    fetch(`${API_BASE}/calendar/leave-days/?user_id=${user_id}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch leave days');
        return res.json();
      })
      .then(data => {
        setLeaveDays(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch(err => {
        setError(err.message || 'Error fetching leave days');
        setLeaveDays([]);
      })
      .finally(() => setLoading(false));
  }, [user_id]);

  return { leaveDays, loading, error };
}
