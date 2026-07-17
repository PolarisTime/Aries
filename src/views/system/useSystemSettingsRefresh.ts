import { QUERY_KEYS } from '@/constants/query-keys'
import { useInvalidateQueries } from '@/hooks/useInvalidateQueries'

const SYSTEM_SETTINGS_QUERY_KEYS = [
  QUERY_KEYS.generalSetting,
  QUERY_KEYS.runtimeConfig,
] as const

export function useSystemSettingsRefresh(): () => void {
  return useInvalidateQueries(SYSTEM_SETTINGS_QUERY_KEYS)
}
