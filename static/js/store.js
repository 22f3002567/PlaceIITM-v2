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

const Toast = {
    state: toastState,

    _add(message, type = 'info', duration = 4000) {
        const id = ++_toastId;
        toastState.toasts.push({ id, message, type });

        setTimeout(() => 
            this.remove(id), duration);
    },

    success(message) {
        this._add(message, 'success');
    },

    error(message) {
        this._add(message, 'error', 5000);
    },

    warning(message) {
        this._add(message, 'warning');
    },

    info(message) {
        this._add(message, 'info');
    },

    remove(id) {
        const idx = toastState.toasts.findIndex(t => t.id === id);
        if (idx !== -1) {
            toastState.toasts.splice(idx, 1);
        }
    }
};

function handleApiError(error, fallback = "Something went wrong, Pleasee try again.") {
    const message = error.response?.data?.message || fallback;
    Toast.error(message);
    return message;
}

const Rules = {
    reguired: (msg = "This field is required") => ({ test: v => !!String(v || '').trim(), msg }),
    minLen: (n, msg) => ({ test: v => String(v || '').length >= n, msg: msg || `Minimum length is ${n} Characters.` }),
    email: (msg = "Please enter a valid email address.") => ({ test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || ''), msg }),
    match: (other, msg = 'Fields do not match.') => ({ test: v => v === other, msg }),
    minNum: (n, msg) => ({ test: v => parseFloat(v) >= n, msg: msg || `Minimum value is ${n}.` }),
    maxNum: (n, msg) => ({ test: v => parseFloat(v) <= n, msg: msg || `Maximum value is ${n}.` }),
    isDate: (msg = 'Enter a valid date.') => ({ test: v => !!v && !isNaN(Date.parse(v)), msg }),
    futureDate: (msg = 'Date must be in the future.') => ({ test: v => v && new Date(v) > new Date(), msg }),

}

window.Store = {
    Auth,
    Toast, toastState, handleApiError
};

window.Rules = Rules;
