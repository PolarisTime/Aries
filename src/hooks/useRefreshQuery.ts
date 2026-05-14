import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

export function useRefreshQuery(queryKey: string) {
  const queryClient = useQueryClient()
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: [queryKey] })
  }, [queryClient, queryKey])
}
