import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/pages/index.vue'),
    },
    {
      path: '/image-processing',
      name: 'image-processing',
      component: () => import('@/pages/ImageProcessing.vue'),
    },
  ],
})

export default router
