import { lazy } from 'react'

/**
 * 主 Router 与多标签页子 Router 共享的 options。
 * 抽取自 router/index.ts，避免两份配置漂移。
 */
export function buildSharedRouterOptions() {
  return {
    defaultPreload: 'intent' as const,
    defaultPendingMs: 100,
    defaultPendingComponent: lazy(() =>
      import('@/views/modules/components/BusinessGridPageSkeleton').then(
        (m) => ({
          default: m.BusinessGridPageSkeleton,
        }),
      ),
    ),
    defaultErrorComponent: lazy(() =>
      import('@/views/error/ErrorView').then((m) => ({
        default: m.ErrorView,
      })),
    ),
    defaultNotFoundComponent: lazy(() =>
      import('@/views/error/NotFoundView').then((m) => ({
        default: m.NotFoundView,
      })),
    ),
  }
}
