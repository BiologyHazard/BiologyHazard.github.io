import { createRouter, createWebHistory } from 'vue-router';

import AudioLoudness from '@/pages/AudioLoudness.vue';
import ImageProcessing from '@/pages/ImageProcessing.vue';
import Home from '@/pages/index.vue';
import StringConverter from '@/pages/StringConverter.vue';
import UnixTimestamp from '@/pages/UnixTimestamp.vue';
import UUIDGenerator from '@/pages/UUIDGenerator.vue';

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
      path: '/audio-loudness',
      name: 'audio-loudness',
      component: AudioLoudness,
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
    {
      path: '/uuid-generator',
      name: 'uuid-generator',
      component: UUIDGenerator,
    },
    {
      path: '/test',
      name: 'test',
      component: () => import('@/pages/SuperEllipse.vue'),
    },
  ],
});

export default router;
