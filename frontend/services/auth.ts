import api from './api';
import {
    LoginCredentials,
    RegisterData,
    LoginResponse,
    RegisterResponse
} from '@/types/auth';
import { setTokens, removeTokens, isAuthenticated, getAccessToken } from '@/lib/auth';

export const authService = {
    async login(credentials: LoginCredentials) {
        const response = await api.post<LoginResponse>('/api/users/login/', credentials);
        if (response.data.access && response.data.refresh) {
            setTokens(response.data.access, response.data.refresh);
        }
        return response.data;
    },

    async register(data: RegisterData) {
        const response = await api.post<RegisterResponse>('/api/users/register/', data);
        if (response.data.tokens?.access) {
            setTokens(response.data.tokens.access, response.data.tokens.refresh);
        }
        return response.data;
    },

    logout() {
        removeTokens();
        // Optional: Call logout endpoint logic
        // api.post('/api/users/logout/');
    },

    isAuthenticated,
    getToken: getAccessToken
};
