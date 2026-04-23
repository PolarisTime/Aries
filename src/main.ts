import { createApp } from 'vue'
import { createPinia } from 'pinia'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import { router } from './router'
import { antdPlugin } from './plugins/antd'
import { queryClientPlugin } from './plugins/query'
import './styles/index.less'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(antdPlugin)
app.use(queryClientPlugin)

app.mount('#app')
