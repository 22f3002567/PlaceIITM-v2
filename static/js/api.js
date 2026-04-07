const API_BASE = '/api';

const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
        timeout : 15000
    }
});


api.interceptors.response.use(config => {
    const token = localStorage.getItem('access_token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}, error => Promise.reject(error));





window.API = {
    auth: {
        login: (data) => api.post('/auth/login', data),
        refresh: () => api.post('/auth/refresh'),
        me: () => api.get('/auth/me'),
        registerStudent: (data) => api.post('/auth/register/student', data),
        registerCompany: (data) => api.post('/auth/register/company', data),
    },

    admin: {
        dashboard: () => api.get('/admin/dashboard'),
    },

    company: {
        dashboard: () => api.get('/company/dashboard'),

    },

    student: {
        dashboard: () => api.get('/student/dashboard'),
    }
}