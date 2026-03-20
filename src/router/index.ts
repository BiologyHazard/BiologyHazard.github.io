import { createRouter, createWebHistory } from 'vue-router'

import ImageProcessing from '@/pages/ImageProcessing.vue'
import Home from '@/pages/index.vue'
import StringConverter from '@/pages/StringConverter.vue'
import UnixTimestamp from '@/pages/UnixTimestamp.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/image-processing',
      name: 'image-processing',
      component: ImageProcessing,
    },
    {
      path: '/unix-timestamp',
      name: 'unix-timestamp',
      component: UnixTimestamp,
    },
    {
      path: '/string-converter',
      name: 'string-converter',
      component: StringConverter,
    },
  ],
})

export default router
