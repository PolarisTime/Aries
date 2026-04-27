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
await authStore.restoreSession()

app.use(i18n)
app.use(router)
app.use(queryClientPlugin)

app.mount('#app')
