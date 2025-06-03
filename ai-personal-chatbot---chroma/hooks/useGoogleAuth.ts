import { useState, useEffect, useCallback } from 'react';
import { GoogleUserProfile } from '../types';
import * as GoogleAuthService from '../services/googleAuthService';

/**
 * Custom hook to handle Google authentication
 * @param onUserLogin Callback when user logs in successfully
 * @param onSetUserId Callback to set user ID in other services
 * @returns Authentication state and methods
 */
export function useGoogleAuth(
  onUserLogin?: (profile: GoogleUserProfile) => void,
  onSetUserId?: (userId: string | null) => void
) {
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleUserProfile, setGoogleUserProfile] = useState<GoogleUserProfile | null>(null);
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if Google Client ID is configured
  const GOOGLE_CLIENT_ID = (document.querySelector('meta[name="google-signin-client_id"]') as HTMLMetaElement)?.content || "YOUR_GOOGLE_CLIENT_ID";
  const isGoogleClientConfigured = GOOGLE_CLIENT_ID !== "YOUR_GOOGLE_CLIENT_ID";

  const handleGoogleTokenResponse = useCallback(async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
    setGoogleAccessToken(tokenResponse.access_token);
    setIsGoogleLoggedIn(true);
    setError(null);
    
    try {
      const profile = await GoogleAuthService.fetchUserProfile(tokenResponse.access_token);
      setGoogleUserProfile(profile);
      
      // Call onSetUserId callback if provided
      if (onSetUserId && profile.email) {
        onSetUserId(profile.email);
      }
      
      // Call onUserLogin callback if provided
      if (onUserLogin && profile) {
        onUserLogin(profile);
      }
    } catch (e) {
      console.error("Error fetching Google user profile:", e);
      setError("Failed to fetch Google user profile. See console for details.");
      // Keep logged in state, but profile might be missing
    }
  }, [onUserLogin, onSetUserId]);

  const handleGoogleError = useCallback((errorResponse: any) => {
    console.error("Google Sign-In Error:", errorResponse);
    setError(errorResponse.message || "Google Sign-In failed. Check console for details.");
    setIsGoogleLoggedIn(false);
    setGoogleAccessToken(null);
    setGoogleUserProfile(null);
    
    // Call onSetUserId callback with null if provided
    if (onSetUserId) {
      onSetUserId(null);
    }
  }, [onSetUserId]);

  // Initialize Google Sign In
  useEffect(() => {
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
    
    // Call onSetUserId callback with null if provided
    if (onSetUserId) {
      onSetUserId(null);
    }
    
    return Promise.resolve();
  };

  return {
    googleAccessToken,
    googleUserProfile,
    isGoogleLoggedIn,
    error,
    isGoogleClientConfigured,
    handleGoogleLogin,
    handleGoogleLogout
  };
}