import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useModuleQueryRefresh(moduleKey: string) {
  const queryClient = useQueryClient()

  const refreshModuleQueries = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['business-grid', moduleKey] }),
      queryClient.invalidateQueries({ queryKey: ['business-grid-all', moduleKey] }),
    ])
  }, [moduleKey, queryClient])

  return { refreshModuleQueries }
}
