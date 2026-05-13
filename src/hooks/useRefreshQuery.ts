import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'

export function useRefreshQuery(queryKey: string) {
  const queryClient = useQueryClient()
  return useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [queryKey] })
  }, [queryClient, queryKey])
}
