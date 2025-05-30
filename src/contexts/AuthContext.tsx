'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthState, LoginCredentials, RegisterFormData, User } from '@/types/types';
import { getUserProfile, loginUser, registerUser } from '@/lib/api';

interface AuthContextType extends AuthState {
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegisterFormData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
}

const defaultAuthState: AuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  isAdmin: false,
};

// Create context with a default value
const AuthContext = createContext<AuthContextType>({
  ...defaultAuthState,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  loading: false,
  error: null,
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>(defaultAuthState);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Check for token in localStorage on initial load
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = localStorage.getItem('token');
        if (storedToken) {
          // Validate token by fetching user profile
          try {
            const userProfile = await getUserProfile(storedToken);
            setAuthState({
              isAuthenticated: true,
              user: userProfile,
              token: storedToken,
              isAdmin: userProfile.is_admin,
            });
          } catch (error) {
            console.error('Invalid token:', error);
            localStorage.removeItem('token');
          }
        }
      } catch (error) {
        console.error('Error loading auth from localStorage:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStoredAuth();
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials) => {
    setLoading(true);
    setError(null);
    try {
      const { token, user } = await loginUser(credentials);
      
      // Store token in localStorage
      localStorage.setItem('token', token);
      
      // Update auth state
      setAuthState({
        isAuthenticated: true,
        user,
        token,
        isAdmin: user.is_admin,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (userData: RegisterFormData) => {
    setLoading(true);
    setError(null);
    try {
      await registerUser(userData);
      // After registration, log in automatically
      await login({
        username: userData.username,
        password: userData.password,
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Registration failed');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = () => {
    localStorage.removeItem('token');
    setAuthState(defaultAuthState);
  };

  const contextValue: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};
