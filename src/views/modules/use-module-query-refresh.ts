import { useQueryClient } from '@tanstack/vue-query'
import { type Ref } from 'vue'

export function useModuleQueryRefresh(moduleKey: Ref<string>) {
  const queryClient = useQueryClient()

  async function refreshModuleQueries() {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ['business-grid', moduleKey.value],
      }),
      queryClient.invalidateQueries({
        queryKey: ['business-grid-all', moduleKey.value],
      }),
    ])
  }

  return {
    refreshModuleQueries,
  }
}
