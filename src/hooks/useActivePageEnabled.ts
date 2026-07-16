import { usePageVisibility } from '@/hooks/usePageVisibility'

export function useActivePageEnabled(active = true): boolean {
  const isPageVisible = usePageVisibility()
  return active && isPageVisible
}
