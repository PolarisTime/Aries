import { createRouter, createWebHistory } from 'vue-router'
import { routes } from './routes'
import { appTitle } from '@/utils/env'
import { getToken } from '@/utils/storage'

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | ${appTitle}` : appTitle

  if (to.meta.public) {
    return true
  }

  if (getToken()) {
    return true
  }

  return {
    path: '/login',
    query: {
      redirect: to.fullPath,
    },
  }
})
