const { createApp, defineComponent, ref, reactive, computed, watch, onMounted } = Vue;

const App = defineComponent({

    name: "PlaceIITM",

    template:
    `<div>
        <app-navbar />

        <main>
            <router-view v-slot="{ Component }">
                <component :is="Component" />
            </router-view>
        </main>

        <div>
            <div v-for="toast in toastState.toasts" :key="toast.id" class="toast">
                <span>{{ toast.message }}</span>
                <button @click="State.Toast.remove(toast.id)">X</button>
            </div>
        </div>
    </div>`,

    setup() {
        const { totalState } = Store;
        return { toastState, Store };
    }
});

const AppSpinner = defineComponent({

    name: "AppSpinner",
    template:
    `<div class="spinner">Loading...</div>`

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
    `<span">[ {{ status }} ]</span>`

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