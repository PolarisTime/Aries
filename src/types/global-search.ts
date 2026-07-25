import type { ModuleRecord } from '@/types/module-page'

export interface GlobalSearchResult {
  value: string
  label: string
  moduleKey: string
  title: string
  trackId: string
  primaryNo: string
  summary: string
  matchedByTrackId: boolean
}

export interface ModuleSearchResponse {
  data?: {
    rows?: ModuleRecord[]
  }
}
