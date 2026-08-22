import type { ParsedLocation } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import type { SearchParams } from '@/types/api-raw'
import { parseOptionalEntityId } from '@/types/entity-id'
import type {
  ModulePageConfig,
  ModuleParentImportSource,
  ModuleRecord,
} from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

interface Props {
  location: ParsedLocation
  config: ModulePageConfig | undefined
  records: ModuleRecord[]
  setPage: (page: number) => void
  clearSelection: () => void
  defaultFilters?: SearchParams
  setFilters?: (filters: SearchParams) => void
  setSubmittedFilters: (filters: SearchParams) => void
  updateFilter: (key: string, value: unknown) => void
  openDetail: (target: string | ModuleRecord) => Promise<void>
  openEditor: (
    record: null,
    options: { parentImportSource: ModuleParentImportSource },
  ) => Promise<void>
}

const EMPTY_FILTERS: SearchParams = {}

/** URL 查询参数解析（导出供单元测试与外部意图消费方复用） */
export function parseRouteParams(searchStr: string) {
  const params = new URLSearchParams(searchStr)
  const docNo = params.get('docNo') || ''
  const trackId = params.get('trackId') || ''
  return {
    docNo,
    sourceModule: params.get('sourceModule') || '',
    sourceRecordId: params.get('sourceRecordId') || '',
    status: params.get('status') || '',
    trackId,
    routeKeyword: docNo || trackId,
    shouldOpenDetail: params.get('openDetail') === '1',
  }
}

function resolveParentImportSource(
  config: ModulePageConfig | undefined,
  sourceModule: string,
  sourceRecordId: string,
): ModuleParentImportSource | null {
  const parentModuleKey = config?.parentImport?.parentModuleKey
  if (!parentModuleKey || sourceModule !== parentModuleKey) {
    return null
  }

  try {
    const parentRecordId = parseOptionalEntityId(
      sourceRecordId,
      'sourceRecordId',
    )
    return parentRecordId ? { parentModuleKey, parentRecordId } : null
  } catch {
    return null
  }
}

function resolveAutoOpenDetailTarget({
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

/** 模块筛选白名单中是否包含指定字段 */
export function supportsFilterField(
  config: ModulePageConfig | undefined,
  filterKey: string,
): boolean {
  return Boolean(config?.filters.some((filter) => filter.key === filterKey))
}

export function useBusinessGridRouteSync({
  location,
  config,
  records,
  setPage,
  clearSelection,
  defaultFilters = EMPTY_FILTERS,
  setFilters,
  setSubmittedFilters,
  updateFilter,
  openDetail,
  openEditor,
}: Props) {
  const autoOpenedRouteKeyRef = useRef('')
  const autoOpenedParentImportKeyRef = useRef('')
  // react-doctor-disable-next-line react-doctor/no-event-handler -- URL 查询串是模块列表的外部入口，变化时需要同步列表过滤条件。
  const rawSearchStr = location.searchStr
  const routeParams = parseRouteParams(rawSearchStr)

  // react-doctor-disable-next-line react-doctor/no-cascading-set-state -- 路由入口变化需要同时重置分页、选中行和过滤条件。
  useEffect(() => {
    setPage(1)
    clearSelection()
    autoOpenedRouteKeyRef.current = ''

    if (!routeParams.routeKeyword) {
      // 过滤状态由父级列表持有，这里只同步路由入口。
      if (setFilters) {
        // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent react-doctor/no-pass-live-state-to-parent -- 同步路由入口过滤条件到父级列表。
        setFilters({
          ...defaultFilters,
          // 待处理筛选意图（如指标卡跳转）：仅当模块筛选白名单包含 status 字段时应用
          ...(routeParams.status && supportsFilterField(config, 'status')
            ? { status: routeParams.status }
            : {}),
        })
      } else {
        // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- 同步路由入口过滤条件到父级列表。
        updateFilter('keyword', '')
      }
      // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent react-doctor/no-pass-live-state-to-parent -- 同步已提交过滤条件，保证详情跳转后的列表立即收敛到目标单据。
      setSubmittedFilters(
        routeParams.status && supportsFilterField(config, 'status')
          ? { ...defaultFilters, status: routeParams.status }
          : { ...defaultFilters },
      )
      return
    }

    const nextRouteFilters = {
      ...defaultFilters,
      keyword: routeParams.routeKeyword,
    }
    if (setFilters) {
      // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent react-doctor/no-pass-live-state-to-parent -- 同步深链关键词到父级列表。
      setFilters(nextRouteFilters)
    } else {
      // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent -- 同步深链关键词到父级列表。
      updateFilter('keyword', routeParams.routeKeyword)
    }
    // react-doctor-disable-next-line react-doctor/no-pass-data-to-parent react-doctor/no-pass-live-state-to-parent -- 同步已提交过滤条件，保证详情跳转后的列表立即收敛到目标单据。
    setSubmittedFilters(nextRouteFilters)
  }, [
    clearSelection,
    config,
    defaultFilters,
    routeParams.routeKeyword,
    routeParams.status,
    setPage,
    setFilters,
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

  useEffect(() => {
    const parentImportSource = resolveParentImportSource(
      config,
      routeParams.sourceModule,
      routeParams.sourceRecordId,
    )
    if (!parentImportSource) {
      autoOpenedParentImportKeyRef.current = ''
      return
    }

    const routeKey = `${parentImportSource.parentModuleKey}:${parentImportSource.parentRecordId}`
    if (autoOpenedParentImportKeyRef.current === routeKey) {
      return
    }

    autoOpenedParentImportKeyRef.current = routeKey
    void openEditor(null, { parentImportSource })
  }, [config, openEditor, routeParams.sourceModule, routeParams.sourceRecordId])
}
