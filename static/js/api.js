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


let _isRefreshing = false;
let _refreshQueue = []; 

const processQueue = (error, token = null) => {
    _refreshQueue.forEach(cb => error ? cb.reject(error) : cb.resolve(token));
    _refreshQueue = [];
};
        

api.interceptors.response.use(
    response => response,
     async error => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            const refreshToken = localStorage.getItem('refresh_token');

            if (!refreshToken) {

                _clearTokens();
                window.location.hash = '#/login';
                return Promise.reject(error);
            }

            if (_isRefreshing) {
                return new Promise((resolve, reject) => {
                    _refreshQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = `Bearer ${token}`;
                    return api(originalRequest);
                }).catch(err => Promise.reject(err));
            }

            originalRequest._retry = true;
            _isRefreshing = true;

            try {
                const newToken = res.data.data.access_token;
                localStorage.setItem('access_token', newToken);
                api.defaults.headers['Authorization'] = `Bearer ${newToken}`;
                processQueue(null, newToken);

                originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

                return api(originalRequest);

            } catch (refreshError) {
                processQueue(refreshError, null);
                _clearTokens();
                window.location.hash = '#/login';
                return Promise.reject(refreshError);
            } finally {
                _isRefreshing = false; 
            } 
        }
        return Promise.reject(error);
    }  
    
);

function _clearTokens() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
}



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