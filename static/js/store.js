const { reactive } = Vue;

const _storedUser = localStorage.getItem('user');
const _storedToken = localStorage.getItem('access_token');

const authState = reactive({
    user: _storedUser ? JSON.parse(_storedUser) : null,
    isLoggedIn: !!_storedToken,
    loading: false,
});

const Auth = {
    state: authState,
    
    login(userData, accessToken, refreshToken) {
        authState.user = userData;
        authState.isLoggedIn = true;
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken );
        localStorage.setItem('user', JSON.stringify(userData));
    
    },

    logout() {
        authState.user = null;
        authState.isLoggedIn = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('user');
    },

    get role() {
        return authState.user?.role || null;
    },

    get isAdmin() {
        return authState.user?.role === 'admin';
    },

    get isCompany() {
        return authState.user?.role === 'company';
    },

    get isStudent() {
        return authState.user?.role === 'student';
    }

};

window.Store = {
    Auth
};

