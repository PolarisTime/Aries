import { lazy, Suspense } from 'react'
import type { AppHeaderSearchProps } from '@/layouts/AppHeaderSearch'

const AppHeaderSearch = lazy(() =>
  import('@/layouts/AppHeaderSearch').then((m) => ({
    default: m.AppHeaderSearch,
  })),
)

export interface LazyAppHeaderSearchProps extends AppHeaderSearchProps {}

export function LazyAppHeaderSearch(props: LazyAppHeaderSearchProps) {
  return (
    <Suspense fallback={<div className={props.className} />}>
      <AppHeaderSearch {...props} />
    </Suspense>
  )
}
