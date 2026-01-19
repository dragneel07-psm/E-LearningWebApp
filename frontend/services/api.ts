import axios from 'axios';
import { getAccessToken } from '@/lib/auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add interceptor to include token
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = getAccessToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Add response interceptor for 401 (Refresh Token Flow could be added here later)
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        // If 401 and we have a refresh token (TODO: Implement refresh logic)
        return Promise.reject(error);
    }
);

export default api;
