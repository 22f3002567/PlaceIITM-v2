const { createApp, defineComponent, ref, computed, onMounted } = Vue;

//Root App Component
// Renders the Navbar, the router-view (current page), and the toast container.

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

        function toastIcon(type) {
            const icons = {
                success: 'bi bi-check-circle-fill text-success',
                error: 'bi bi-x-circle-fill text-danger',
                warning: 'bi bi-exclamation-triangle-fill text-warning',
                info: 'bi bi-info-circle-fill text-primary'
            };
            return icons[type] || icons.info;
        }

        return { toastState, toastIcon, Store };
    }
});


//Helper Components registered globally 

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

// Empty state placeholder
const AppEmpty = defineComponent({
    name: 'AppEmpty',
    props: {
        icon: { type: String, default: 'bi-inbox' },
        message: { type: String, default: 'Nothing here yet.' },
        subtext: { type: String, default: '' }
    },
    template: `
        <div class="ppa-empty">
            <i :class="icon"></i>
            <p class="mb-1 fw-600">{{ message }}</p>
            <p v-if="subtext" class="small">{{ subtext }}</p>
            <slot />
        </div>
    `
});

// Status badge (consistent across all views)
const StatusBadge = defineComponent({
    name: 'StatusBadge',
    props: { status: { type: String, required: true } },
    template: `
        <span class="ppa-badge" :class="badgeClass">{{ status }}</span>
    `,
    computed: {
        badgeClass() {
            const map = {
                'pending': 'badge-pending',
                'approved': 'badge-approved',
                'rejected': 'badge-rejected',
                'closed': 'badge-closed',
                'Applied': 'badge-applied',
                'Shortlisted': 'badge-shortlisted',
                'Interview': 'badge-interview',
                'Selected': 'badge-selected',
                'Rejected': 'badge-rejected',
            };
            return map[this.status] || 'bg-secondary text-white';
        }
    }
});

// Confirmation modal (simple, reusable)
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
        <div class="modal fade show d-block" tabindex="-1" style="background:rgba(0,0,0,0.4);">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-600">{{ title }}</h5>
                    </div>
                    <div class="modal-body pt-2">
                        <p class="text-muted mb-0">{{ message }}</p>
                    </div>
                    <div class="modal-footer border-0">
                        <button class="btn btn-light" @click="$emit('cancel')">Cancel</button>
                        <button
                            :class="danger ? 'btn btn-danger' : 'btn btn-primary'"
                            @click="$emit('confirm')"
                        >{{ confirmText }}</button>
                    </div>
                </div>
            </div>
        </div>
    `
});


//Global utility function exposed to all components 

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
    if (days <= 1)  return 'days-urgent';
    if (days <= 3)  return 'days-warning';
    return 'days-normal';
};


// Create and mount the app 
const app = createApp(App);

app.use(AppRouter);

// Register global components
app.component('app-navbar', window.AppNavbar);
app.component('app-spinner', AppSpinner);
app.component('app-empty', AppEmpty);
app.component('status-badge', StatusBadge);
app.component('confirm-modal', ConfirmModal);

app.mount('#app');

console.log("PlaceIITM V2 booted or say Vue app initialized successfully!");


