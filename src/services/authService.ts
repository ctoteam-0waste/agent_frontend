import apiClient from '../api/apiClient';

export const authService = {
  /**
   * Login an agent with their mobile number and password.
   */
  login: async (phone: string, password: string) => {
    console.log('[Auth] Login attempt:', { identifier: phone, passwordLength: password.length });
    const response = await apiClient.post('/auth/login', { identifier: phone, password });
    console.log('[Auth] Login response:', JSON.stringify(response.data));
    return response.data;
  },
};
