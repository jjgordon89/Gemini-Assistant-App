import React, { createContext, useState, useEffect, useCallback, ReactNode } from 'react';
import * as GoogleAuthService from '../services/googleAuthService';
import { GoogleUserProfile } from '../types';

interface AuthContextType {
  googleAccessToken: string | null;
  googleUserProfile: GoogleUserProfile | null;
  isGoogleLoggedIn: boolean;
  isLoading: boolean; // To handle loading state during sign-in process
  error: string | null; // To handle errors from Google Sign-In
  handleGoogleLogin: () => void;
  handleGoogleLogout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
  googleClientId?: string; // Made optional to handle cases where it might not be configured
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children, googleClientId }) => {
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleUserProfile, setGoogleUserProfile] = useState<GoogleUserProfile | null>(null);
  const [isGoogleLoggedIn, setIsGoogleLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // For GSI loading
  const [error, setError] = useState<string | null>(null);

  const handleGoogleTokenResponse = useCallback(async (tokenResponse: google.accounts.oauth2.TokenResponse) => {
    setIsLoading(true);
    setError(null); // Clear previous errors
    setGoogleAccessToken(tokenResponse.access_token);
    try {
      const profile = await GoogleAuthService.fetchUserProfile(tokenResponse.access_token);
      setGoogleUserProfile(profile);
      setIsGoogleLoggedIn(true);
      setError(null); // Clear error on success
    } catch (e) {
      console.error("Error fetching Google user profile or initial data:", e);
      const errorMsg = e instanceof Error ? e.message : String(e);
      setError(`Failed to fetch Google user profile: ${errorMsg}.`);
      setGoogleAccessToken(null); // Clear token if profile fetch fails
      setIsGoogleLoggedIn(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleGoogleError = useCallback((errorResponse: any) => {
    console.error("Google Sign-In Error Details:", errorResponse);
    let displayMessage = "Google Sign-In failed. Please try again or check console for details.";
    // Check for specific GSI library error structures
    if (typeof errorResponse === 'object' && errorResponse !== null && 'type' in errorResponse) {
        switch (errorResponse.type) {
            case 'popup_closed_by_user':
                displayMessage = "Google Sign-In popup was closed before completing. Please try again.";
                break;
            case 'popup_failed_to_open':
                displayMessage = "Google Sign-In popup failed to open. Please check your browser's popup blocker settings and try again.";
                break;
            case 'idpiframe_initialization_failed':
                displayMessage = "Google Sign-In initialization failed. This might be due to network issues or third-party cookie restrictions. Please check your browser settings and try again.";
                break;
            default:
                if ('details' in errorResponse && typeof errorResponse.details === 'string') {
                    displayMessage = `Google Sign-In error: ${errorResponse.details}`;
                } else if (errorResponse.type) {
                    displayMessage = `Google Sign-In error: ${errorResponse.type}.`;
                }
                break;
        }
    } else if (errorResponse instanceof Error && errorResponse.message) {
        // General error handling as before
        displayMessage = errorResponse.message;
        if (errorResponse.message.toLowerCase().includes('popup_closed') ||
            errorResponse.message.toLowerCase().includes('popup window closed') ||
            errorResponse.message.toLowerCase().includes('client init error') ) {
            displayMessage = `Google Sign-In: ${errorResponse.message}. This often means the popup was closed or blocked. Please check: 1) 'Authorized JavaScript Origins' in your Google Cloud Console OAuth settings. 2) Browser popup blockers. 3) Ensure you are a test user if your app is in 'Testing' mode on the OAuth consent screen.`;
        }
    } else if (typeof errorResponse === 'string') {
        displayMessage = errorResponse;
    }

    setError(displayMessage);
    setIsGoogleLoggedIn(false);
    setGoogleAccessToken(null);
    setGoogleUserProfile(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (googleClientId && googleClientId !== "YOUR_GOOGLE_CLIENT_ID") {
      // GSI library handles its own initial loading state for auto-sign-in attempts or previous session restoration.
      // We set isLoading true mainly for explicit login/logout actions.
      // setError(null); // Clear previous init errors before trying again (optional)
      GoogleAuthService.initGoogleSignIn(googleClientId, handleGoogleTokenResponse, handleGoogleError)
        .then(() => {
          console.log("Google Sign-In initialized via AuthContext.");
        })
        .catch(err => {
          console.error("Google Sign-In initialization failed in AuthContext:", err);
          // Do not overwrite a more specific error from handleGoogleError if it was already called
          if (!error) {
               handleGoogleError(err || new Error("Google Sign-In could not be initialized. This might be due to an invalid Client ID, network issues, or third-party cookie restrictions. Please check console for details."));
          }
        });
    } else {
        const msg = "Google integration disabled: Client ID not configured. Google Sign-In will not function.";
        console.warn(msg);
        // setError(msg); // This could be displayed globally if desired
        setIsLoading(false); // Not loading if no client ID
    }
    // isLoading is primarily for button interactions, not GSI background loading.
  }, [googleClientId, handleGoogleTokenResponse, handleGoogleError, error]); // Added error to dependency array

  const handleGoogleLogin = () => {
    setError(null); // Clear previous errors before attempting login
    if (googleClientId && googleClientId !== "YOUR_GOOGLE_CLIENT_ID") {
        setIsLoading(true);
        GoogleAuthService.signInWithGoogle();
    } else {
        const msg = "Google Client ID not configured. Cannot sign in. Please check your application setup (index.html or environment variables).";
        setError(msg);
        // alert(msg); // Alert can be aggressive; relying on error display in UI is better
    }
  };

  const handleGoogleLogout = async () => {
    setError(null); // Clear previous errors
    setIsLoading(true);
    await GoogleAuthService.signOutWithGoogle();
    setGoogleAccessToken(null);
    setGoogleUserProfile(null);
    setIsGoogleLoggedIn(false);
    setError(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider value={{
      googleAccessToken,
      googleUserProfile,
      isGoogleLoggedIn,
      isLoading,
      error,
      handleGoogleLogin,
      handleGoogleLogout
    }}>
      {children}
    </AuthContext.Provider>
  );
};
