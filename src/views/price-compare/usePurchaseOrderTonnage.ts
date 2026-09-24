import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  fetchPurchaseOrderTonnages,
  type PurchaseOrderTonnageRecord,
} from '@/api/market/quote-sheets'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_REALTIME } from '@/constants/query-policies'
import type { PriceSheet } from './types'

export interface PurchaseOrderTonnageState {
  /** 采购订单明细行 id → 订货/已开/剩余吨位(按规格)。 */
  tonnageByItemId: Map<string, PurchaseOrderTonnageRecord>
  /** 供下拉选择的采购订单明细行选项(按订单倒序、行号升序)。 */
  options: PurchaseOrderTonnageRecord[]
  loading: boolean
  /** 选项加载失败: 供 UI 提示"吨位不可用"而非静默为空。 */
  isError: boolean
}

/**
 * 采购订单明细行吨位汇总: 供比价吨位列按规格关联并展示"已开/剩余"。
 * <p>列表用于下拉选择(排除当前单据自身已保存吨位, 叠加本地未保存吨位后在前端判断超额)。
 * 吨位随他人报单高频变化, 故用实时短缓存; 订单号快照保证订单删除后仍能回显。</p>
 */
export function usePurchaseOrderTonnage(
  active: PriceSheet | undefined,
  isAuthenticated: boolean,
): PurchaseOrderTonnageState {
  // 新建未保存的批次使用本地临时 id(非雪花 ID): 传给后端会触发参数格式 400,
  // 故仅在已持久化(纯数字雪花 id)时才传 excludeSheetId。
  const rawSheetId = active?.id
  const excludeSheetId =
    rawSheetId && /^[1-9]\d*$/.test(rawSheetId) ? rawSheetId : undefined
  const optionsQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.priceCompare.purchaseOrderTonnages,
      excludeSheetId ?? '',
    ],
    queryFn: ({ signal }) =>
      fetchPurchaseOrderTonnages(
        excludeSheetId ? { excludeSheetId } : {},
        signal,
      ),
    enabled: isAuthenticated,
    staleTime: STALE_REALTIME,
    retry: 1,
  })

  const linkedItemIds = useMemo(() => {
    const ids = new Set<string>()
    for (const row of active?.rows ?? []) {
      if (row.rowType === 'SEPARATOR') continue
      if (row.purchaseOrderItemId) ids.add(row.purchaseOrderItemId)
    }
    return [...ids]
  }, [active?.rows])

  // 已关联但不在选项列表中的明细行(如订单已完成/被筛掉): 按 id 回查, 保证仍可展示与回显。
  const missingItemIds = useMemo(() => {
    const known = new Set(
      (optionsQuery.data ?? []).map((record) => record.purchaseOrderItemId),
    )
    return linkedItemIds.filter((id) => !known.has(id))
  }, [linkedItemIds, optionsQuery.data])

  const missingQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.priceCompare.purchaseOrderTonnages,
      'linked',
      ...missingItemIds,
    ],
    queryFn: ({ signal }) =>
      fetchPurchaseOrderTonnages(
        {
          purchaseOrderItemIds: missingItemIds,
          ...(excludeSheetId ? { excludeSheetId } : {}),
        },
        signal,
      ),
    enabled: isAuthenticated && missingItemIds.length > 0,
    staleTime: STALE_REALTIME,
    retry: 1,
  })

  const options = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data])

  const tonnageByItemId = useMemo(() => {
    const map = new Map<string, PurchaseOrderTonnageRecord>()
    for (const record of options) {
      map.set(record.purchaseOrderItemId, record)
    }
    for (const record of missingQuery.data ?? []) {
      if (!map.has(record.purchaseOrderItemId)) {
        map.set(record.purchaseOrderItemId, record)
      }
    }
    return map
  }, [options, missingQuery.data])

  return {
    tonnageByItemId,
    options,
    loading: optionsQuery.isFetching || missingQuery.isFetching,
    // 选项加载失败优先暴露; 回显失败时已关联行走快照兜底, 不算整体错误。
    isError: optionsQuery.isError,
  }
}
