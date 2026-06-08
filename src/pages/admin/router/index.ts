import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import Index from '../views/Index.vue'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/dashboard'
    },
    {
        path: '/login',
        name: 'Login',
        component: Login
    },
    {
        path: '/dashboard',
        name: 'Dashboard',
        component: Dashboard,
        meta: { requiresAuth: true },
        children: [
            {
                path: '',
                name: 'Index',
                component: Index,
                meta: { requiresAuth: true }
            }
        ]
    },
    {
        path: '/setting',
        name: 'Setting',
        component: Dashboard,
        meta: { requiresAuth: true },
        children: [
            {
                path: 'video',
                name: 'Video',
                component: () => import('../views/Video.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: 'GuangYaPan',
                name: 'GuangYaPan',
                component: () => import('../views/GuangYaPan.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: 'User',
                name: 'User',
                component: () => import('../views/User.vue'),
                meta: { requiresAuth: true }
            },
            {
                path: 'Set',
                name: 'Set',
                component: () => import('../views/Setting.vue'),
                meta: { requiresAuth: true }
            }
        ]
    }
]

const router = createRouter({
    history: createWebHashHistory(),
    routes
})

router.beforeEach((to, _from, next) => {
    const isAuthenticated = localStorage.getItem('admin_token')

    if (to.meta.requiresAuth && !isAuthenticated) {
        next('/login')
    } else if (to.path === '/login' && isAuthenticated) {
        next('/dashboard')
    } else {
        next()
    }
})

export default router

