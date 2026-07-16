import { useMemo } from 'react'
import { useInvalidateQueries } from '@/hooks/useInvalidateQueries'

export function useRefreshQuery(queryKey: readonly unknown[]) {
  const queryKeys = useMemo(() => [queryKey], [queryKey])
  return useInvalidateQueries(queryKeys)
}
