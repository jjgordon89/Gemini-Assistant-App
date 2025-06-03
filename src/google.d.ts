
declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        error?: string;
        error_description?: string;
        expires_in?: number;
        scope?: string;
        token_type?: string;
        // Add other properties as needed based on actual usage
      }

      interface ClientConfigError {
        type: string;
        description?: string;
        // Add other properties as needed
      }

      interface TokenClient {
        requestAccessToken: (overrideConfig?: { prompt?: string; hint?: string }) => void;
      }

      function initTokenClient(config: {
        client_id: string;
        scope: string;
        callback: (tokenResponse: TokenResponse) => void;
        error_callback?: (error: ClientConfigError) => void;
        hint?: string;
        prompt?: string; // e.g. 'consent', 'select_account'
        // Add other config options as needed
      }): TokenClient;

      function revoke(token: string, callback: () => void): void;

      // If you use other GIS features like One Tap or Sign In With Google button,
      // you would add their declarations here, e.g., under google.accounts.id
    }

    // Example for google.accounts.id if you were to use it (not strictly needed for current errors but good for completeness)
    /*
    namespace id {
      function initialize(config: { client_id: string; callback?: (response: any) => void; [key: string]: any }): void;
      function renderButton(parentElement: HTMLElement, options: { [key: string]: any }): void;
      function prompt(notification?: (notification: any) => void): void;
      // ... other id related functions and interfaces
    }
    */
  }
}
