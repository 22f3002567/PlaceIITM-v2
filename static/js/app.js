
const { createApp, defineComponent } = Vue;

const App = defineComponent({

    name: 'PlaceIITM',

    template: `
        <div>
            <app-navbar />
            <main style="padding: 0;">
                <router-view />
            </main>

            <!-- Toast container - bottom right -->
            <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 8px;">
                <div
                    v-for="toast in toastState.toasts"
                    :key="toast.id"
                    style="padding: 10px 16px; border-radius: 4px; color: white; display: flex; align-items: center; gap: 8px; min-width: 260px; max-width: 400px;"
                    :style="toastBg(toast.type)"
                >
                    <span style="flex: 1;">{{ toast.message }}</span>
                    <button @click="Store.Toast.remove(toast.id)"
                        style="background: none; border: none; color: white; cursor: pointer; font-size: 1rem;">✕</button>
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
    `<span>[ {{ status }} ]</span>`

});

const ConfirmModal = defineComponent({
    name: 'ConfirmModal',
    props: {
        title: { type: String, default: 'Are you sure?' },
        message: { type: String, default: 'This action cannot be undone.' },
        confirmText: { type: String, default: 'Confirm' }
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




const app = createApp(App);

app.use(AppRouter);

app.component('app-navbar', window.AppNavbar);
app.component('app-spinner', AppSpinner);
app.component('app-empty', AppEmpty);
app.component('status-badge', StatusBadge);
app.component('confirm-modal', ConfirmModal);


app.mount('#app');

console.log("PlaceIITM V2 booted or say Vue app initialized successfully!");


