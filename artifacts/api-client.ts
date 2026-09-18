import { useApiAuth } from './api-auth';

// Extend the fetch API to include authentication
export function useAuthenticatedFetch() {
  const { token } = useApiAuth();

  return async (url: string, options: RequestInit = {}) => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };
}
