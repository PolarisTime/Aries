import { useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

type QueryKey = readonly unknown[]

export function useInvalidateQueries(
  queryKeys: readonly QueryKey[],
): () => void {
  const queryClient = useQueryClient()

  return useCallback(() => {
    void Promise.all(
      queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    )
  }, [queryClient, queryKeys])
}
