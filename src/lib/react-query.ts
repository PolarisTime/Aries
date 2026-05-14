/**
 * React Query 类型安全包装器 + 缓存策略。
 *
 * 规范：
 * - useQuery 必须传入完整泛型 TData, TError
 * - useMutation 必须传入 TData, TError, TVariables
 * - 不同实体类型使用对应的 staleTime 常量
 */
import {
  useMutation as rawUseMutation,
  useQuery as rawUseQuery,
  type UseMutationOptions,
  type UseQueryOptions,
} from '@tanstack/react-query'

export const STALE_TIME = {
  /** 实体列表 — 30 秒，平衡时效与缓存 */
  LIST: 30 * 1000,
  /** 实体详情 — 5 分钟，详情变更频率低 */
  DETAIL: 5 * 60 * 1000,
  /** 枚举/字典/配置 — 永不过期，仅手动 invalidate */
  STATIC: Infinity,
} as const

/** 类型安全的 useQuery — 强制传入返回类型 */
export function useQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError, TData>,
) {
  return rawUseQuery<TData, TError, TData>(options)
}

/** 类型安全的 useMutation */
export function useMutation<TData, TVariables, TError = Error>(
  options: UseMutationOptions<TData, TError, TVariables>,
) {
  return rawUseMutation<TData, TError, TVariables>(options)
}

export { useQueryClient } from '@tanstack/react-query'
