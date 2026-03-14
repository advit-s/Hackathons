import api from './api';

const authService = {
    async login(email, password) {
        const formData = new FormData();
        formData.append('username', email);
        formData.append('password', password);

        const response = await api.post('/token', formData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const { access_token } = response.data;
        localStorage.setItem('token', access_token);

        // Get user info - pass token explicitly to avoid race condition
        const userResponse = await api.get('/me', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const userData = userResponse.data;
        localStorage.setItem('user', JSON.stringify(userData));

        return userData;
    },

    async register(email, password, role, fullName) {
        const response = await api.post('/register', {
            email,
            password,
            role,
            full_name: fullName,
        });

        // Auto-login after registration
        return this.login(email, password);
    },

    async getCurrentUser() {
        const response = await api.get('/me');
        return response.data;
    },

    logout() {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getToken() {
        return localStorage.getItem('token');
    },

    getStoredUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },
};

export default authService;
