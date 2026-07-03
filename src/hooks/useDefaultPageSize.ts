import { useQuery } from '@tanstack/react-query'
import { listClientSettings } from '@/api/system-settings'
import { QUERY_KEYS } from '@/constants/query-keys'
import { DEFAULT_LIST_PAGE_SIZE_SETTING_CODE } from '@/module-system/settings-constants'

const DEFAULT_SIZE = 20

export function useDefaultPageSize() {
  const { data: rows } = useQuery({
    queryKey: QUERY_KEYS.clientSettings,
    queryFn: async () => {
      try {
        return await listClientSettings()
      } catch {
        return []
      }
    },
    staleTime: 30_000,
  })

  if (!rows) return DEFAULT_SIZE
  const setting = rows.find(
    (r) =>
      String(r.settingCode || '').trim() ===
      DEFAULT_LIST_PAGE_SIZE_SETTING_CODE,
  )
  const value = Number(setting?.sampleNo)
  if (!Number.isFinite(value) || value <= 0) {
    return DEFAULT_SIZE
  }
  return Math.floor(value)
}
