import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import Imgs from '../views/Imgs.vue'
import Video from '../views/Video.vue'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        redirect: '/Home'
    },
    {
        path: '/Home',
        name: 'Home',
        component: Home
    },
    {
        path: '/Imgs',
        name: 'Imgs',
        component: Imgs
    },
    {
        path: '/Video',
        name: 'Video',
        component: Video
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
