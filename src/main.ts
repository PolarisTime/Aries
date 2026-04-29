import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import { restoreRedirectedHistoryRoute } from './api/client'
import { i18n } from './i18n'
import { router } from './router'
import { queryClientPlugin } from './plugins/query'
import { useAuthStore } from './stores/auth'
import './styles/index.less'

restoreRedirectedHistoryRoute()

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)

const authStore = useAuthStore(pinia)

function shouldRestoreSessionOnBoot() {
  if (typeof window === 'undefined') {
    return true
  }
  if (window.sessionStorage.getItem('aries-logged-out') === '1') {
    window.sessionStorage.removeItem('aries-logged-out')
    return false
  }
  return !['/login', '/setup'].includes(window.location.pathname)
}

if (shouldRestoreSessionOnBoot()) {
  await authStore.restoreSession()
} else {
  authStore.hydrate()
}

app.use(i18n)
app.use(router)
app.use(queryClientPlugin)

app.mount('#app')
