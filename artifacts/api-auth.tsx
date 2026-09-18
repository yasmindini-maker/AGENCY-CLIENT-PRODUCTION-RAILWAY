import { useAuth } from '@clerk/clerk-react';
import { useEffect, useState } from 'react';

export function useApiAuth() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      setToken(null);
      return;
    }

    const fetchToken = async () => {
      try {
        const jwt = await getToken();
        setToken(jwt);
      } catch (error) {
        console.error('Failed to get token:', error);
        setToken(null);
      }
    };

    fetchToken();
  }, [getToken, isLoaded, isSignedIn]);

  return {
    token,
    isLoaded,
    isSignedIn,
    isAuthenticated: isLoaded && isSignedIn && !!token,
  };
}
