import React, { createContext, useState, useContext, useCallback, useEffect, ReactNode } from 'react';
import { GoogleUserProfile } from '../types';
import * as GoogleAuthService from '../services/googleAuthService';
import { ConversationMemoryService } from '../services';

interface AuthContextType {
  googleAccessToken: string | null;
  googleUserProfile: GoogleUserProfile | null;
  isGoogleLoggedIn: boolean;
  handleGoogleLogin: () => void;
  handleGoogleLogout: () => Promise<void>;
  isGoogleClientConfigured: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ 
  children, 
  onUserLogin, 
  memoryService 
}: { 
  children: ReactNode; 
  onUserLogin?: (profile: GoogleUserProfile) => void;
  memoryService: ConversationMemoryService | null;
}) {
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleUserProfile, setGoogleUserProfile] = useState<GoogleUserProfile | null>(null);
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // IMPORTANT: Replace with your actual Google Client ID in index.html and here for initialization check
  const GOOGLE_CLIENT_ID = (document.querySelector('meta[name="google-signin-client_id"]') as HTMLMetaElement)?.content || "YOUR_GOOGLE_CLIENT_ID";
  const isGoogleClientConfigured = GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID";

  const handleGoogleTokenResponse = useCallback(async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
    setGoogleAccessToken(tokenResponse.access_token);
    setIsGoogleLoggedIn(true);
    setError(null);
    try {
      const profile = await GoogleAuthService.fetchUserProfile(tokenResponse.access_token);
      setGoogleUserProfile(profile);
      
      // Set user ID in memory service when user logs in
      if (memoryService && profile.email) {
        memoryService.setUserId(profile.email);
      }
      
      if (onUserLogin && profile) {
        onUserLogin(profile);
      }
    } catch (e) {
      console.error("Error fetching Google user profile:", e);
      setError("Failed to fetch Google user profile. See console for details.");
      // Keep logged in state, but profile might be missing
    }
  }, [memoryService, onUserLogin]);

  const handleGoogleError = useCallback((errorResponse: any) => {
    console.error("Google Sign-In Error:", errorResponse);
    setError(errorResponse.message || "Google Sign-In failed. Check console for details.");
    setIsGoogleLoggedIn(false);
    setGoogleAccessToken(null);
    setGoogleUserProfile(null);
    
    // Clear user ID in memory service when user logs out
    if (memoryService) {
      memoryService.setUserId(null);
    }
  }, [memoryService]);

  useEffect(() => {
    // Initialize Google Sign In
    if (isGoogleClientConfigured) {
      GoogleAuthService.initGoogleSignIn(GOOGLE_CLIENT_ID, handleGoogleTokenResponse, handleGoogleError)
        .then(() => console.log("Google Sign-In initialized."))
        .catch(err => {
          console.error("Google Sign-In initialization failed:", err);
          setError("Google Sign-In could not be initialized. Ensure Client ID is correct and GIS library is loaded.");
        });
    } else {
      console.warn("Google Client ID not configured. Google Sign-In will not be available.");
      setError("Google integration disabled: Client ID not configured.");
    }
  }, [handleGoogleTokenResponse, handleGoogleError, isGoogleClientConfigured, GOOGLE_CLIENT_ID]);

  const handleGoogleLogin = () => {
    if (isGoogleClientConfigured) {
      GoogleAuthService.signInWithGoogle();
    } else {
      setError("Google Client ID not configured. Cannot sign in.");
      alert("Google Client ID not configured. Please check the application setup.");
    }
  };

  const handleGoogleLogout = async () => {
    await GoogleAuthService.signOutWithGoogle();
    setGoogleAccessToken(null);
    setGoogleUserProfile(null);
    setIsGoogleLoggedIn(false);
    setError(null); // Clear any previous Google-related errors
    
    // Clear user ID in memory service when user logs out
    if (memoryService) {
      memoryService.setUserId(null);
    }
    
    return Promise.resolve();
  };

  const value = {
    googleAccessToken,
    googleUserProfile,
    isGoogleLoggedIn,
    handleGoogleLogin,
    handleGoogleLogout,
    isGoogleClientConfigured
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}