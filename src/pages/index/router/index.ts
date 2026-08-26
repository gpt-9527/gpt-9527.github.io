import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router'
import Home from '../views/Home.vue'
import Imgs from '../views/Imgs.vue'
import Video from '../views/Video.vue'
import Dota2Video from '../views/Dota2Video.vue'
import Games from '../views/Games.vue'
import GuangYaPan from '../views/GuangYaPan.vue'
import Magnetism from '../views/Magnetism.vue'

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
    },
    {
        path: '/Dota2Video',
        name: 'Dota2Video',
        component: Dota2Video
    },
    {
        path: '/Games',
        name: 'Games',
        component: Games
    },
    {
        path: '/Games/RoadRash',
        name: 'RoadRash',
        component: () => import('../views/games/RoadRash.vue')
    },
     {
        path: '/Games/CS16Shooter',
        name: 'CS16Shooter',
        component: () => import('../views/games/CS16Shooter.vue')
    },
    {
        path: '/Games/SpiderSolitaire',
        name: 'SpiderSolitaire',
        component: () => import('../views/games/SpiderSolitaire.vue')
    },
    {
        path: '/Games/Thirteen',
        name: 'Thirteen',
        component: () => import('../views/games/Thirteen.vue')
    },
    {
        path: '/GuangYaPan',
        name: 'GuangYaPan',
        component: GuangYaPan
    },
    {
        path: '/Magnetism',
        name: 'Magnetism',
        component: Magnetism
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
