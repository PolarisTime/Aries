import { lazy, Suspense } from 'react'
import type { AppHeaderSearchProps } from '@/layouts/AppHeaderSearch'
import { trackLazyLoad } from '@/utils/lazy-load-progress'

const AppHeaderSearch = lazy(() =>
  trackLazyLoad('全局搜索组件', () =>
    import('@/layouts/AppHeaderSearch').then((m) => ({
      default: m.AppHeaderSearch,
    })),
  ),
)

export type LazyAppHeaderSearchProps = AppHeaderSearchProps

export function LazyAppHeaderSearch(props: LazyAppHeaderSearchProps) {
  return (
    <Suspense fallback={<div className={props.className} />}>
      <AppHeaderSearch {...props} />
    </Suspense>
  )
}
