import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import {
  fetchLengthPremiumOptions,
  type LengthPremiumOption,
} from '@/api/master/length-premiums'
import { QUERY_KEYS } from '@/constants/query-keys'
import { STALE_MASTER_OPTIONS } from '@/constants/query-policies'

/** 稳定的空数组/空对象引用：未加载时返回新对象会让调用方 `useMemo` 每次失效。 */
const EMPTY_OPTIONS: LengthPremiumOption[] = []
const EMPTY_LOOKUP: Readonly<Record<string, number>> = {}

/**
 * 定尺主数据的**组件侧读取入口**（材料录入下拉、比价加价/排序/互切共用）。
 *
 * <p>为什么不每行/每格各查一次：定尺是页面级参考数据，一个页面只该有一个
 * `useQuery`；本 hook 就是这个唯一入口，返回的 `premiumByLength` / `sortOrderByLength`
 * 是**派生值**（由同一份选项算一次），调用方不再各自 `Object.fromEntries` 一遍，
 * 避免同一口径多份实现。</p>
 *
 * <p>缓存键与 `useMasterOptions` 的 `lengthPremiums` 需求、`queries/master/
 * length-premium-options` 的缓存访问器完全一致（{@link QUERY_KEYS.masterOptions.lengthPremiums}）：
 * 同一份数据全站只请求一次。</p>
 */
export function useLengthPremiumOptions(enabled = true): {
  options: LengthPremiumOption[]
  /** 定尺名称 → 每吨加价（元）。主数据为空时是空对象，调用方据此走迁移兜底。 */
  premiumByLength: Readonly<Record<string, number>>
  /** 定尺名称 → 排序号（升序展示）。缺失的定尺由调用方按名称兜底排序。 */
  sortOrderByLength: Readonly<Record<string, number>>
  isLoading: boolean
} {
  const { data, isLoading } = useQuery({
    queryKey: QUERY_KEYS.masterOptions.lengthPremiums,
    queryFn: ({ signal }) => fetchLengthPremiumOptions(signal),
    enabled,
    staleTime: STALE_MASTER_OPTIONS,
  })

  const options = data ?? EMPTY_OPTIONS
  const derived = useMemo(() => {
    if (options.length === 0) {
      return { premiumByLength: EMPTY_LOOKUP, sortOrderByLength: EMPTY_LOOKUP }
    }
    const premiumByLength: Record<string, number> = {}
    const sortOrderByLength: Record<string, number> = {}
    for (const option of options) {
      premiumByLength[option.value] = option.premium
      sortOrderByLength[option.value] = option.sortOrder
    }
    return { premiumByLength, sortOrderByLength }
  }, [options])

  return { options, ...derived, isLoading }
}
