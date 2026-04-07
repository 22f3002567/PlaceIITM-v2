const { createApp, defineComponent, ref, reactive, computed, watch, onMounted } = Vue;

const App = defineComponent({

    name: "PlaceIITM",

    setup() {
        const { totalState } = StorageEvent;

    }
});

const app = createApp(App);
app.use(router);
app.mount('#app');