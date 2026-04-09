const { reactive } = Vue;

//Auth State 
const _storedUser = localStorage.getItem('user');

const authState = reactive({
    user: _storedUser ? JSON.parse(_storedUser) : null,
    isLoggedIn: !!localStorage.getItem('access_token'),
    loading: false
});

const Auth = {
    state: authState,

    login(userData, accessToken, refreshToken) {
        authState.user = userData;
        authState.isLoggedIn = true;
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
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
    },
};


// Toast Notification System
const toastState = reactive({ toasts: [] });
let _toastId = 0;

const Toast = {
    state: toastState,

    _add(message, type = 'info', duration = 4000) {
        const id = ++_toastId;
        toastState.toasts.push({ id, message, type });
        setTimeout(() => this.remove(id), duration);
    },

    success(msg) { 
        this._add(msg, 'success'); 
    },


    error(msg) { 
        this._add(msg, 'error',   5000); 
    },

    warning(msg) { 
        this._add(msg, 'warning'); 
    },

    info(msg) { 
        this._add(msg, 'info'); 
    },

    remove(id) {
        const idx = toastState.toasts.findIndex(t => t.id === id);
        if (idx !== -1) toastState.toasts.splice(idx, 1);
    }
};


//Global error handler
function handleApiError(e) {
    const msg = e?.response?.data?.message || e?.message || 'An unexpected error occurred.';
    Toast.error(msg);
    console.error('[API Error]', msg, e);
}


// Date helper - available globally in all Vue components 
window.formatDate = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

window.daysLeftDisplay = (days) => {
    if (days === null || days === undefined) return '';
    if (days === 0) return 'Closes today!';
    if (days <= 3) return `${days} day(s) left`;
    return `${days} days left`;
};

window.daysLeftClass = (days) => {
    if (days === null || days === undefined) return '';
    if (days <= 1) return 'days-urgent';
    if (days <= 3) return 'days-warning';
    return 'days-normal';
};


// Expose everything globally 
window.Store = { Auth, Toast, toastState, handleApiError };