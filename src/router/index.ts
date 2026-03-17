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
    {
      path: '/unix-timestamp',
      name: 'unix-timestamp',
      component: () => import('@/pages/UnixTimestamp.vue'),
    },
    {
      path: '/string-converter',
      name: 'string-converter',
      component: () => import('@/pages/StringConverter.vue'),
    },
  ],
})

export default router
