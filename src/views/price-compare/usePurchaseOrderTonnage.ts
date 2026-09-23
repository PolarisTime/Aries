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
  /** 采购订单 → 订货/已开/剩余吨位(供吨位列下拉与提示)。 */
  tonnageByOrderId: Map<string, PurchaseOrderTonnageRecord>
  /** 供下拉选择的采购订单选项(按 id 倒序)。 */
  options: PurchaseOrderTonnageRecord[]
  loading: boolean
  /** 选项加载失败: 供 UI 提示"吨位不可用"而非静默为空。 */
  isError: boolean
}

/**
 * 采购订单吨位汇总: 供比价吨位列关联采购订单并展示"已开/剩余"。
 * <p>列表用于下拉选择(排除当前单据自身已保存吨位, 叠加本地未保存吨位后在前端判断超额)。
 * 吨位随他人报单高频变化, 故用实时短缓存而非静态缓存; 订单号快照保证订单删除后仍能回显。</p>
 */
export function usePurchaseOrderTonnage(
  active: PriceSheet | undefined,
  isAuthenticated: boolean,
): PurchaseOrderTonnageState {
  const excludeSheetId = active?.id
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

  const linkedOrderIds = useMemo(() => {
    const ids = new Set<string>()
    for (const row of active?.rows ?? []) {
      if (row.rowType === 'SEPARATOR') continue
      if (row.purchaseOrderId) ids.add(row.purchaseOrderId)
    }
    return [...ids]
  }, [active?.rows])

  // 已关联但不在选项列表中的订单(如订单已完成/被筛掉): 按 id 回查, 保证仍可展示与回显。
  const missingOrderIds = useMemo(() => {
    const known = new Set(
      (optionsQuery.data ?? []).map((record) => record.purchaseOrderId),
    )
    return linkedOrderIds.filter((id) => !known.has(id))
  }, [linkedOrderIds, optionsQuery.data])

  const missingQuery = useQuery({
    queryKey: [
      ...QUERY_KEYS.priceCompare.purchaseOrderTonnages,
      'linked',
      ...missingOrderIds,
    ],
    queryFn: ({ signal }) =>
      fetchPurchaseOrderTonnages(
        {
          purchaseOrderIds: missingOrderIds,
          ...(excludeSheetId ? { excludeSheetId } : {}),
        },
        signal,
      ),
    enabled: isAuthenticated && missingOrderIds.length > 0,
    staleTime: STALE_REALTIME,
    retry: 1,
  })

  const options = useMemo(() => optionsQuery.data ?? [], [optionsQuery.data])

  const tonnageByOrderId = useMemo(() => {
    const map = new Map<string, PurchaseOrderTonnageRecord>()
    for (const record of options) {
      map.set(record.purchaseOrderId, record)
    }
    for (const record of missingQuery.data ?? []) {
      if (!map.has(record.purchaseOrderId)) {
        map.set(record.purchaseOrderId, record)
      }
    }
    return map
  }, [options, missingQuery.data])

  return {
    tonnageByOrderId,
    options,
    loading: optionsQuery.isFetching || missingQuery.isFetching,
    // 选项加载失败优先暴露; 回显失败时已关联订单走快照兜底, 不算整体错误。
    isError: optionsQuery.isError,
  }
}
