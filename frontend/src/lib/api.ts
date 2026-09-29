import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: Attach JWT token if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('curaone_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: Handle 401s gracefully
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If token is invalid/expired and request wasn't the login endpoint
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/login')) {
      localStorage.removeItem('curaone_token');
      // Dispatch custom event so AuthContext can synchronize if needed
      window.dispatchEvent(new Event('curaone:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/**
 * Universal error extractor for backend responses.
 * Accurately parses Zod validation issues, structured server messages, and HTTP errors.
 */
export function getApiErrorMessage(err: any, defaultMsg = 'An unexpected error occurred'): string {
  const data = err?.response?.data;
  if (!data) {
    return err?.message || defaultMsg;
  }

  // 1. Zod validation issues array: [{ field: 'email', message: 'Please provide a valid email address' }]
  if (Array.isArray(data.issues) && data.issues.length > 0) {
    return data.issues
      .map((issue: any) => issue.message || `${issue.field}: invalid`)
      .join(', ');
  }

  // 2. Specific readable backend message (e.g. 'Invalid email or password', 'Doctor affiliation required')
  if (data.message && typeof data.message === 'string' && data.message.trim()) {
    return data.message;
  }

  // 3. Descriptive error string if it's not generic 'Error' or status codes
  if (
    data.error &&
    typeof data.error === 'string' &&
    !['Error', 'InternalServerError', 'Validation Error', 'BadRequest'].includes(data.error)
  ) {
    return data.error;
  }

  return defaultMsg;
}
