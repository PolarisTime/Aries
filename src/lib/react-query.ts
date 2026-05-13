/**
 * React Query 类型安全包装器。
 *
 * 规范：
 * - useQuery 必须传入完整泛型 TData, TError
 * - useMutation 必须传入 TData, TError, TVariables
 */
import {
  useQuery as rawUseQuery,
  useMutation as rawUseMutation,
  type UseQueryOptions,
  type UseMutationOptions,
} from '@tanstack/react-query'

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
