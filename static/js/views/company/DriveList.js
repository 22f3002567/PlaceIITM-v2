window.CompanyDriveList = {
    name: 'CompanyDriveList',
    template: `<div></div>`,
    setup() {
        const router = VueRouter.useRouter();
        router.replace('/company/dashboard');
    }
};