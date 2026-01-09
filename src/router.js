import { createRouter, createWebHistory } from 'vue-router'
import Dashboard from './views/Dashboard.vue'
// import Analytics from './views/Analytics.vue'
// import Threshold from './views/Threshold.vue'
import Login from './views/Login.vue'

const routes = [
    { path: '/', name: 'Dashboard', component: Dashboard },
    { path: '/login', name: 'Login', component: Login },
    // { path: '/analytics', name: 'Analytics', component: Analytics },
    // { path: '/threshold', name: 'Threshold', component: Threshold }
]

export default createRouter({
    history: createWebHistory(),
    routes
})