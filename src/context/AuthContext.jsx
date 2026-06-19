import React, { createContext, useState, useContext, useEffect } from 'react';
import { API_BASE_URL } from '../config';
import { getCurrentPosition, reverseGeocode } from '../utils/location';

const AuthContext = createContext(null);

const STORAGE_KEY_USER  = 'ams_user';
const STORAGE_KEY_TOKEN = 'ams_token';

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [token, setToken]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Migrate any old Kqualitysoft_* keys from previous session
    const legacyUser  = localStorage.getItem('Kqualitysoft_user');
    const legacyToken = localStorage.getItem('Kqualitysoft_token');
    if (legacyUser)  { localStorage.setItem(STORAGE_KEY_USER,  legacyUser);  localStorage.removeItem('Kqualitysoft_user');  }
    if (legacyToken) { localStorage.setItem(STORAGE_KEY_TOKEN, legacyToken); localStorage.removeItem('Kqualitysoft_token'); }

    // Load persisted auth
    try {
      const storedUser  = localStorage.getItem(STORAGE_KEY_USER);
      const storedToken = localStorage.getItem(STORAGE_KEY_TOKEN);
      if (storedUser && storedToken) {
        setUser(JSON.parse(storedUser));
        setToken(storedToken);
      }
    } catch (e) {
      console.error('Corrupt session data found. Clearing auth state:', e);
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_TOKEN);
    }
    setLoading(false);
  }, []);

  const login = async (email, password, role) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      if (data.user && data.user.isActive === false) {
        throw new Error('Your account has been deactivated. Please contact an administrator.');
      }

      setUser(data.user);
      setToken(data.token);
      localStorage.setItem(STORAGE_KEY_USER,  JSON.stringify(data.user));
      localStorage.setItem(STORAGE_KEY_TOKEN, data.token);

      // Attempt to capture and send login location in the background
      if (role === 'employee') {
        try {
          const pos = await getCurrentPosition();
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          
          fetch(`${API_BASE_URL}/auth/login-location`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${data.token}`
            },
            body: JSON.stringify({
              userId: data.user.id,
              latitude: lat,
              longitude: lng,
              timestamp: new Date().toISOString()
            })
          }).catch(err => console.error("Failed to send login location:", err));
        } catch (locErr) {
          console.warn("Location permission denied or unavailable on login", locErr);
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(STORAGE_KEY_USER);
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
