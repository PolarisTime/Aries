import type { ParsedLocation } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import type { SearchParams } from '@/types/api-raw'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

interface Props {
  location: ParsedLocation
  config: ModulePageConfig | undefined
  records: ModuleRecord[]
  setPage: (page: number) => void
  clearSelection: () => void
  setSubmittedFilters: (filters: SearchParams) => void
  updateFilter: (key: string, value: unknown) => void
  openDetail: (target: string | ModuleRecord) => Promise<void>
}

function parseRouteParams(searchStr: string) {
  const params = new URLSearchParams(searchStr)
  const docNo = params.get('docNo') || ''
  const trackId = params.get('trackId') || ''
  return {
    docNo,
    trackId,
    routeKeyword: docNo || trackId,
    shouldOpenDetail: params.get('openDetail') === '1',
  }
}

function getRawSearchString(fallbackSearchStr: string) {
  if (typeof window !== 'undefined' && window.location.search) {
    return window.location.search
  }
  return fallbackSearchStr
}

export function resolveAutoOpenDetailTarget({
  config,
  records,
  searchStr,
  autoOpenedRouteKey,
}: {
  config?: ModulePageConfig
  records: ModuleRecord[]
  searchStr: string
  autoOpenedRouteKey: string
}): {
  nextAutoOpenedRouteKey: string
  target: string | ModuleRecord
} | null {
  if (!config) return null

  const routeParams = parseRouteParams(searchStr)
  if (!routeParams.shouldOpenDetail) {
    return null
  }

  const routeKey = routeParams.trackId
    ? `track:${routeParams.trackId}`
    : routeParams.docNo
      ? `doc:${routeParams.docNo}`
      : ''
  if (!routeKey || autoOpenedRouteKey === routeKey) {
    return null
  }

  const primaryNoKey = config.primaryNoKey || 'id'
  const matchedRecord = routeParams.trackId
    ? records.find((record) => String(record.id || '') === routeParams.trackId)
    : records.find(
        (record) => asString(record[primaryNoKey]) === routeParams.docNo,
      )

  if (matchedRecord) {
    return {
      nextAutoOpenedRouteKey: routeKey,
      target: matchedRecord,
    }
  }

  if (routeParams.trackId) {
    return {
      nextAutoOpenedRouteKey: routeKey,
      target: routeParams.trackId,
    }
  }

  return null
}

export function useBusinessGridRouteSync({
  location,
  config,
  records,
  setPage,
  clearSelection,
  setSubmittedFilters,
  updateFilter,
  openDetail,
}: Props) {
  const autoOpenedRouteKeyRef = useRef('')
  const rawSearchStr = getRawSearchString(location.searchStr)
  const routeParams = parseRouteParams(rawSearchStr)

  useEffect(() => {
    setPage(1)
    clearSelection()
    autoOpenedRouteKeyRef.current = ''

    if (!routeParams.routeKeyword) {
      updateFilter('keyword', '')
      setSubmittedFilters({})
      return
    }

    updateFilter('keyword', routeParams.routeKeyword)
    setSubmittedFilters({ keyword: routeParams.routeKeyword })
  }, [
    clearSelection,
    routeParams.routeKeyword,
    setPage,
    setSubmittedFilters,
    updateFilter,
  ])

  useEffect(() => {
    if (!routeParams.shouldOpenDetail) {
      autoOpenedRouteKeyRef.current = ''
      return
    }

    const resolvedTarget = resolveAutoOpenDetailTarget({
      config,
      records,
      searchStr: rawSearchStr,
      autoOpenedRouteKey: autoOpenedRouteKeyRef.current,
    })
    if (!resolvedTarget) {
      return
    }

    autoOpenedRouteKeyRef.current = resolvedTarget.nextAutoOpenedRouteKey
    void openDetail(resolvedTarget.target)
  }, [config, openDetail, records, rawSearchStr, routeParams.shouldOpenDetail])
}
