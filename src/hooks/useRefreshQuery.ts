import { useQueryClient } from '@tanstack/react-query'

export function useRefreshQuery(queryKey: string) {
  const queryClient = useQueryClient()
  return () => {
    void queryClient.invalidateQueries({ queryKey: [queryKey] })
  }
}
