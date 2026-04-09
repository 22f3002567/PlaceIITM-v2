const { createApp, defineComponent} = Vue;


const App = defineComponent({

    name: 'PlaceIITM',

    template: `
        <div>
            <!-- Global Navbar -->
            <app-navbar />

            <!-- Page content -->
            <main class="ppa-main">
                <router-view v-slot="{ Component }">
                    <transition name="fade" mode="out-in">
                        <component :is="Component" />
                    </transition>
                </router-view>
            </main>

            <!-- Toast notification container -->
            <div class="ppa-toast-container">
                <div
                    v-for="toast in toastState.toasts"
                    :key="toast.id"
                    class="ppa-toast"
                    :class="toast.type"
                >
                    <i :class="toastIcon(toast.type)" style="margin-top:2px; flex-shrink:0;"></i>
                    <span style="flex:1;">{{ toast.message }}</span>
                    <button
                        @click="Store.Toast.remove(toast.id)"
                        style="background:none;border:none;cursor:pointer;padding:0;opacity:0.5;font-size:1rem;"
                    >✕</button>
                </div>
            </div>
        </div>
    `,

    setup() {
        const { toastState } = Store;
        function toastBg(type) {
            const colors = {
                success: 'background: #059669;',
                error: 'background: #dc2626;',
                warning: 'background: #d97706;',
                info: 'background: #1a56db;'
            };
            return colors[type] || colors.info;
        }
        return { toastState, toastBg, Store };
    }
});


// A spinner shown while data is loading
const AppSpinner = defineComponent({
    name: 'AppSpinner',
    template: `
        <div class="ppa-spinner-overlay">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading...</span>
            </div>
        </div>
    `
});

const AppEmpty = defineComponent({

    name: "AppEmpty",
    props: {
        message: {
            type: String,
            default: "Nothing here yet, pleasee wait."
        },
        subtext: {
            type: String,
            default: "This page is under construction, please check back later."
        },
    },
    template:
    `<div class="empty-state">
        <p>{{ message }}</p>
        <p v-if="subtext">{{ subtext }}</p>
    </div>`
    
});

const StatusBadge = defineComponent({

    name: "StatusBadge",
    props: {
        status: {
            type: String,
            required: true
        }
    },
    template:
    `<span>[ {{ status }} ]</span>`,

    computed: {
        badgeClass() {
            const map = {
                'pending': 'badge-pending',
                'approved': 'badge-approved',
                'rejected': 'badge-rejected',
                'closed': 'badge-closed',
                'Applied': 'badge-applied',
                'Shortlisted': 'badge-shortlisted',
                'Interview':'badge-interview',
                'Selected': 'badge-selected',
                'Rejected': 'badge-rejected',
            };
            return map[this.status] || 'bg-secondary text-white';
        }
    }

});

const ConfirmModal = defineComponent({
    name: 'ConfirmModal',
    props: {
        title: { type: String, default: 'Are you sure?' },
        message: { type: String, default: 'This action cannot be undone.' },
        confirmText: { type: String, default: 'Confirm' },
        danger: { type: Boolean, default: true }
    },
    emits: ['confirm', 'cancel'],
    template: `
        <div>
            <h3>{{ title }}</h3>
            <p>{{ message }}</p>

            <button @click="$emit('cancel')">Cancel</button>
            <button @click="$emit('confirm')">{{ confirmText }}</button>
        </div>
    `
});



// Global utility function exposed to all components

// Format date strings nicely
window.formatDate = (isoString) => {
    if (!isoString) return '-';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Days left display helper
window.daysLeftDisplay = (days) => {
    if (days === null || days === undefined) return '';
    if (days === 0) return 'Closes today!';
    if (days <= 3)  return `${days} day(s) left`;
    return `${days} days left`;
};

// Days left CSS class
window.daysLeftClass = (days) => {
    if (days === null || days === undefined) return '';
    if (days <= 1) return 'days-urgent';
    if (days <= 3) return 'days-warning';
    return 'days-normal';
};

const app = createApp(App);

app.use(AppRouter);

app.component('app-navbar', window.AppNavbar);
app.component('app-spinner', AppSpinner);
app.component('app-empty', AppEmpty);
app.component('status-badge', StatusBadge);
app.component('confirm-modal', ConfirmModal);


app.mount('#app');

console.log("PlaceIITM V2 booted or say Vue app initialized successfully!");


