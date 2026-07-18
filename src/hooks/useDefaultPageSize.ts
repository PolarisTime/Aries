import { useRuntimeConfig } from './useRuntimeConfig'

const DEFAULT_SIZE = 30

export function useDefaultPageSize() {
  const { data: runtimeConfig } = useRuntimeConfig()
  const value = Number(runtimeConfig?.ui.defaultPageSize)
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_SIZE
  }
  return Math.floor(value)
}
