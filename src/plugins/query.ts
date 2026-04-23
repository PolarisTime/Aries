import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import type { App } from 'vue'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})

export const queryClientPlugin = {
  install(app: App) {
    app.use(VueQueryPlugin, { queryClient })
  },
}

export { queryClient }
