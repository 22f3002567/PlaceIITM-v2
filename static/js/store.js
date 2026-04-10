const { reactive } = Vue;

//Auth State

const _storedUser = localStorage.getItem('user');

const authState = reactive({
    user:  _storedUser ? JSON.parse(_storedUser) : null,
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
    get isStudent(){ 
        return authState.user?.role === 'student'; 
    },
};


//Toast Notification System 

const toastState = reactive({ toasts: [] });
let _toastId = 0;

const Toast = {
    state: toastState,

    _add(message, type = 'info', duration = 4000) {
        const id = ++_toastId;
        toastState.toasts.push({ id, message, type });
        setTimeout(() => this.remove(id), duration);
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
        if (idx !== -1) toastState.toasts.splice(idx, 1);
    }
};


//Helper: handle API errors uniformly

function handleApiError(error, fallback = 'Something went wrong. Please try again.') {
    const message = error?.response?.data?.message || fallback;
    Toast.error(message);
    return message;
}


// Form Validator
// Usage: const errors = validate(form, rules)
// rules: { fieldName: [{ test: (v) => !!v, msg: 'Required' }] }
// Returns: {} if valid, { fieldName: 'error message' } if not

function validate(form, rules) {
    const errors = {};
    for (const [field, checks] of Object.entries(rules)) {
        for (const { test, msg } of checks) {
            if (!test(form[field])) {
                errors[field] = msg;
                break;
            }
        }
    }
    return errors;
}

// Common rule builders
const Rules = {
    required: (msg = 'This field is required.')          => ({ test: v => !!String(v || '').trim(), msg }),
    minLen: (n, msg)                                   => ({ test: v => String(v || '').length >= n, msg: msg || `Minimum ${n} characters.` }),
    email: (msg = 'Enter a valid email address.')     => ({ test: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v || ''), msg }),
    match: (other, msg = 'Fields do not match.')      => ({ test: v => v === other, msg }),
    minNum: (n, msg)                                   => ({ test: v => parseFloat(v) >= n, msg: msg || `Minimum value is ${n}.` }),
    maxNum: (n, msg)                                   => ({ test: v => parseFloat(v) <= n, msg: msg || `Maximum value is ${n}.` }),
    isDate: (msg = 'Enter a valid date.')              => ({ test: v => !!v && !isNaN(Date.parse(v)), msg }),
    futureDate: (msg = 'Date must be in the future.')      => ({ test: v => v && new Date(v) > new Date(), msg }),
};

//Expose globally
window.Store   = { Auth, Toast, toastState, handleApiError };
window.validate = validate;
window.Rules    = Rules;
