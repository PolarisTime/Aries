import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'
import { logger } from '@/utils/logger'

/**
 * 统一错误出口（可观测）。
 * 提示策略：查询（GET）错误在页面内呈现，写操作错误由请求层全局提示；
 * 这里只做统一日志/上报，避免与提示重复。
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      logger.warn(
        `[query] 查询失败: ${JSON.stringify(query.queryKey)}`,
        error instanceof Error ? error.message : String(error),
      )
    },
  }),
  mutationCache: new MutationCache({
    onError: (error, _variables, _context, mutation) => {
      const key = mutation.options.mutationKey
      logger.warn(
        `[mutation] 变更失败${key ? `: ${JSON.stringify(key)}` : ''}`,
        error instanceof Error ? error.message : String(error),
      )
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})
