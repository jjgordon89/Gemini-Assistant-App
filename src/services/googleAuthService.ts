// Google Authentication Service using Google Identity Services (GIS)
import { GoogleUserProfile } from '../types';

const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar';
const GOOGLE_TASKS_SCOPE = 'https://www.googleapis.com/auth/tasks';

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let googleClientId: string | null = null;
let currentAccessToken: string | null = null;


const ensureGoogleClientInitialized = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      // GIS library might not be loaded yet, wait a bit and retry or reject.
      // This simple retry is basic; a more robust solution might use a global load event.
      setTimeout(() => {
        if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
          console.error("Google Identity Services library not loaded.");
          reject(new Error("Google Identity Services library not loaded."));
          return;
        }
        resolve();
      }, 1000);
    } else {
      resolve();
    }
  });
};


export const initGoogleSignIn = (
    clientId: string, 
    onTokenResponse: (tokenResponse: google.accounts.oauth2.TokenResponse) => void,
    onError: (error: any) => void
): Promise<void> => {
  return ensureGoogleClientInitialized().then(() => {
    googleClientId = clientId;
    if (!googleClientId || googleClientId === "YOUR_GOOGLE_CLIENT_ID") {
        const errorMsg = "Google Client ID is not configured. Please set it in index.html.";
        console.error(errorMsg);
        onError(new Error(errorMsg));
        return Promise.reject(errorMsg);
    }
    try {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: googleClientId,
        scope: `${GOOGLE_CALENDAR_SCOPE} ${GOOGLE_TASKS_SCOPE}`,
        callback: (tokenResponse: google.accounts.oauth2.TokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            currentAccessToken = tokenResponse.access_token;
            onTokenResponse(tokenResponse);
          } else if (tokenResponse && tokenResponse.error) {
            console.error('Google Sign-In Error:', tokenResponse.error, tokenResponse.error_description);
            onError(new Error(tokenResponse.error_description || tokenResponse.error || 'Unknown Google Sign-In error'));
            currentAccessToken = null;
          } else {
            onError(new Error('Empty token response from Google.'));
            currentAccessToken = null;
          }
        },
        error_callback: (error: google.accounts.oauth2.ClientConfigError) => {
            console.error('Google Sign-In Client Init Error:', error);
            onError(new Error(error.type || 'Google Sign-In client initialization failed'));
            currentAccessToken = null;
        }
      });
      return Promise.resolve();
    } catch (e) {
      console.error("Error initializing Google token client:", e);
      onError(e);
      return Promise.reject(e);
    }
  }).catch(error => {
      onError(error);
      return Promise.reject(error);
  });
};

export const signInWithGoogle = (): void => {
  if (!tokenClient) {
    console.error("Google token client not initialized. Call initGoogleSignIn first.");
    // Potentially notify the user or call an error handler passed in
    alert("Google Sign-In is not ready. Please try again in a moment or check console for errors.");
    return;
  }
  // Prompt the user to select a Google Account and ask for consent to share their data
  // when establishing a new session.
  tokenClient.requestAccessToken({ prompt: 'consent' });
};

export const signOutWithGoogle = (): Promise<void> => {
  if (currentAccessToken) {
    google.accounts.oauth2.revoke(currentAccessToken, () => {
      console.log('Google access token revoked.');
    });
  }
  currentAccessToken = null;
  // Clear any stored user profile data as well
  return Promise.resolve();
};

export const getAccessToken = (): string | null => {
  return currentAccessToken;
};

// Fetch user profile information - requires an access token
// Note: This specific endpoint is not part of the standard OIDC userinfo endpoint if you used 'profile' or 'email' scopes.
// For basic profile info (name, email, picture), it's better to use the id_token if you configured to receive one,
// or call the Google People API with the appropriate scope (e.g., 'https://www.googleapis.com/auth/userinfo.profile')
// For simplicity, if you just need basic info and have an access token, you can use this,
// but ensure your scopes are appropriate or use the People API: 'https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses,photos'
export const fetchUserProfile = async (accessToken: string): Promise<GoogleUserProfile> => {
  if (!accessToken) {
    throw new Error("Access token is required to fetch user profile.");
  }
  try {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Failed to fetch user profile: ${response.status} ${response.statusText}. ${errorData.error?.message || ''}`);
    }
    const profile = await response.json();
    return {
      name: profile.name,
      email: profile.email,
      picture: profile.picture,
    };
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw error;
  }
};