export const BACKEND_URL = import.meta.env.VITE_API_URL || '';
const BASE_URL = `${BACKEND_URL}/api/v1`;

// Helper function for resolving image URLs (supports full R2/S3 URLs and local paths)
export const getImageUrl = (path?: string | null): string => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return BACKEND_URL ? `${BACKEND_URL}/${cleanPath}` : `/${cleanPath}`;
};

// Helper function for managing authentication tokens
export const getAuthToken = () => localStorage.getItem('token');
export const setAuthToken = (token: string) => localStorage.setItem('token', token);
export const removeAuthToken = () => localStorage.removeItem('token');

// Centralized data request function (Request Wrapper)
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  // 1. Automatically attach the JWT token to requests if the user is logged in.
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 2. Automatically set the Content-Type to JSON (except for file/image uploads using FormData).
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    let errorMessage = 'เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์';

    if (typeof errorData.detail === 'string') {
      errorMessage = errorData.detail;
    } else if (Array.isArray(errorData.detail) && errorData.detail.length > 0) {
      errorMessage = errorData.detail
        .map((err: any) => {
          if (err.msg && err.loc) {
            const field = err.loc[err.loc.length - 1];
            if (field === 'password') return 'รหัสผ่านต้องมีความยาวอย่างน้อย 5 ตัวอักษร';
            if (field === 'birth_date') return 'รูปแบบวันเกิดไม่ถูกต้อง';
            if (field === 'admit_date') return 'รูปแบบวันที่เข้ารักษาไม่ถูกต้อง';
            return `${field}: ${err.msg}`;
          }
          return err.msg || JSON.stringify(err);
        })
        .join(', ');
    } else if (errorData.message) {
      errorMessage = errorData.message;
    }

    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
}

// Commands for sending requests using various methods (GET, POST, PUT, DELETE)
export const api = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'GET' }),
    
  post: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),
    
  put: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  patch: <T = any>(endpoint: string, body?: any, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: 'DELETE' }),
};


