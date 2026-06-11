import { useEffect, useRef, useState } from 'react';

export default function GoogleLoginButton({ onSuccess, onError }) {
  const buttonRef = useRef(null);
  const [error, setError] = useState('');
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const successRef = useRef(onSuccess);
  const errorRef = useRef(onError);

  useEffect(() => {
    successRef.current = onSuccess;
    errorRef.current = onError;
  }, [onSuccess, onError]);

  useEffect(() => {
    if (!clientId) {
      setError('Google Client ID is missing. Please configure VITE_GOOGLE_CLIENT_ID in your .env.local file.');
      return;
    }

    const loadGsi = () => {
      // If GSI script is already loaded, initialize directly
      if (window.google?.accounts?.id) {
        initializeGsi();
        return;
      }

      // Load script dynamically
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initializeGsi;
      script.onerror = () => {
        const failMsg = 'Failed to load Google Login SDK';
        setError(failMsg);
        if (errorRef.current) errorRef.current(failMsg);
      };
      document.body.appendChild(script);
    };

    const initializeGsi = () => {
      try {
        if (!window.gsiInitialized) {
          window.google.accounts.id.initialize({
            client_id: clientId,
            callback: (response) => {
              if (response.credential) {
                if (successRef.current) successRef.current(response.credential);
              } else {
                const failMsg = 'Failed to retrieve Google credentials';
                setError(failMsg);
                if (errorRef.current) errorRef.current(failMsg);
              }
            },
            auto_select: false,
          });
          window.gsiInitialized = true;
        }

        // Customise button container for layout
        if (buttonRef.current) {
          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            width: '350', // Fixed premium width or fluid wrapper
            text: 'signin_with',
            shape: 'rectangular',
          });
        }
      } catch (err) {
        const failMsg = 'Error initializing Google Sign-In: ' + err.message;
        setError(failMsg);
        if (errorRef.current) errorRef.current(failMsg);
      }
    };

    loadGsi();
  }, [clientId]);

  if (error) {
    return (
      <div 
        className="google-btn-error" 
        style={{ 
          color: 'var(--danger-color, #ef4444)', 
          fontSize: '13px', 
          textAlign: 'center', 
          margin: '12px 0',
          padding: '8px',
          background: 'rgba(239, 68, 68, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(239, 68, 68, 0.2)'
        }}
      >
        {error}
      </div>
    );
  }

  return (
    <div style={{ width: '100%', display: 'flex', justifyContent: 'center', margin: '16px 0' }}>
      <div ref={buttonRef} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
    </div>
  );
}
