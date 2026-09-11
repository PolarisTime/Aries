import { lazy, Suspense } from 'react'
import { RouteLoadingFallback } from '@/components/RouteLoadingFallback'
import type { AppHeaderSearchProps } from '@/layouts/AppHeaderSearch'

const AppHeaderSearch = lazy(() =>
  import('@/layouts/AppHeaderSearch').then((m) => ({
    default: m.AppHeaderSearch,
  })),
)

export type LazyAppHeaderSearchProps = AppHeaderSearchProps

export function LazyAppHeaderSearch(props: LazyAppHeaderSearchProps) {
  return (
    <Suspense
      fallback={
        // 有意静默：搜索框加载极快，仅用 className 维持原有占位尺寸，避免闪烁。
        <RouteLoadingFallback variant="blank" className={props.className} />
      }
    >
      <AppHeaderSearch {...props} />
    </Suspense>
  )
}
