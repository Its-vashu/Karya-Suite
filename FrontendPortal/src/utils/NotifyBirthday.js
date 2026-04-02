import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Box, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useUser } from '../context/UserContext';

const API_BASE = process.env.REACT_APP_API_BASE_URL;

const BirthdayCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, #FDF2F8 0%, #FFF1F2 100%)',
  marginBottom: theme.spacing(1),
  boxShadow: '0 4px 12px rgba(244, 63, 94, 0.04)',
  borderRadius: '12px',
  position: 'relative',
  overflow: 'hidden',
  border: '1px solid rgba(244, 63, 94, 0.1)',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    width: '3px',
    height: '100%',
    background: 'linear-gradient(180deg, #F43F5E 0%, #FB7185 100%)',
  },
  transition: 'all 0.2s ease',
  '&:hover': {
    transform: 'translateY(-1px)',
    boxShadow: '0 8px 24px rgba(244, 63, 94, 0.08)',
  }
}));

const NotifyBirthday = ({ onHasBirthday }) => {
  const {full_name} = useUser();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [birthdayPeople, setBirthdayPeople] = useState([]);

  useEffect(() => {
    const fetchBirthdays = async () => {
      try {
        setLoading(true);
        setError('');
        const token = localStorage.getItem('access_token');
        //console.log('Fetching birthdays for user:', full_name); // Debug log
        if (!token) {
          toast.error('You must be logged in to access this resource.');
          window.location.href = '/login';
          return;
        }

        const response = await fetch(`${API_BASE}/api/background-check/birthdays/today`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // if (!response.ok) {
        //   console.error('Birthday API Response:', {
        //     status: response.status,
        //     statusText: response.statusText,
        //     url: response.url
        //   });
        //   throw new Error(`Birthday API error: ${response.status} ${response.statusText}`);
        // }

        const data = await response.json();
        //console.log('Birthday data received:', data); // Debug log
        //console.log('Current user full name:', full_name); // Debug log
        
        // Extract birthday_users from the response and set it to birthdayPeople
        if (data && data.birthday_users) {
          const users = data.birthday_users;
          //console.log('Birthday users:', users); // Debug log
          setBirthdayPeople(users);
          const userHasBirthday = users.some(person => {
            // console.log('Comparing:', {
            //   personName: person.candidate_name,
            //   userName: full_name,
            //   matches: person.candidate_name && full_name && 
            //           person.candidate_name.toLowerCase() === full_name.toLowerCase()
            // });
            return person.candidate_name && full_name && 
                   person.candidate_name.toLowerCase() === full_name.toLowerCase();
          });
          // hasBirthday = userHasBirthday;
          // console.log('Has birthday:', userHasBirthday); // Debug log
          onHasBirthday?.(userHasBirthday);
        } else {
          setBirthdayPeople([]);
          onHasBirthday?.(false);
        }
      } catch (err) {
        //console.error('Error fetching birthdays:', err);
        setError(err.message);
        setBirthdayPeople([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBirthdays();
  }, [onHasBirthday,full_name]);


  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[40px]">
        <CircularProgress color="secondary" size={20} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 bg-red-50 rounded text-red-600 border border-red-200 text-sm">
        {error}
      </div>
    );
  }

  // Return a disabled state message when no birthdays
  if (birthdayPeople.length === 0) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Typography variant="h5" sx={{ 
            fontWeight: 700, 
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            fontSize: '1rem',
            letterSpacing: '-0.025em'
          }}>
            <span role="img" aria-label="celebration" style={{ fontSize: '1.75rem' }}>🎉</span>
            Birthday Celebrations
          </Typography>
        </Box>
        <Card sx={{ 
          p: 2, 
          bgcolor: '#FAFAFA',
          borderRadius: '16px',
          border: '1px dashed #E5E7EB',
          boxShadow: 'none'
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 1
          }}>
            <Typography variant="h3" sx={{ color: '#D1D5DB' }}>
              📅
            </Typography>
            <Typography variant="body1" sx={{ 
              color: '#6B7280',
              textAlign: 'center',
              fontWeight: 500
            }}>
              No birthdays to celebrate today
            </Typography>
          </Box>
        </Card>
      </Box>
    );
  }

  // Filter birthday people to only show those matching the current user's full name
  const userBirthdays = birthdayPeople.filter(person => 
    person.candidate_name && full_name && 
    person.candidate_name.toLowerCase() === full_name.toLowerCase()
  );

  if (userBirthdays.length === 0) {
    return null;
  }

  return (
    <Box>
      <Box sx={{ mb: 1 }}>
        <Typography variant="h5" sx={{ 
          fontWeight: 700, 
          color: '#111827',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          fontSize: '1rem',
          letterSpacing: '-0.025em'
        }}>
          <span role="img" aria-label="celebration" style={{ fontSize: '1.75rem' }}>🎉</span>
          It's Your Birthday!
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {userBirthdays.map((person, index) => {
          const name = person.candidate_name || full_name;
          return (
            <BirthdayCard key={person.id || index}>
              <CardContent sx={{ 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: 1.5,
                padding: '10px !important'
              }}>
                <Typography 
                  variant="h4" 
                  component="div" 
                  sx={{ 
                    fontSize: '1.5rem',
                    lineHeight: 2.5,
                    color: '#F43F5E'
                  }}
                >
                  🎂
                </Typography>
                <Box>
                  <Typography variant="h6" sx={{ 
                    fontWeight: 700, 
                    color: '#111827',
                    textTransform: 'uppercase',
                    letterSpacing: '0.025em',
                    fontSize: '1.125rem',
                    lineHeight: 1.3
                  }}>
                    Happy Birthday, {name}! 🎉
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      mt: 1,
                      color: '#4B5563',
                      fontSize: '0.975rem',
                      lineHeight: 1.5
                    }}
                  >
                    Wishing you a wonderful {person.age ? `${person.age}th` : ''} birthday filled with happiness and joy! 🌟
                  </Typography>
                </Box>
              </CardContent>
            </BirthdayCard>
          );
        })}
      </Box>
    </Box>
  );
};

export default NotifyBirthday;
