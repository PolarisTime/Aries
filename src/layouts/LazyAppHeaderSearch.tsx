import { lazy, Suspense } from 'react'
import type { AppHeaderSearchProps } from '@/layouts/AppHeaderSearch'

const AppHeaderSearch = lazy(() =>
  import('@/layouts/AppHeaderSearch').then((m) => ({
    default: m.AppHeaderSearch,
  })),
)

export type LazyAppHeaderSearchProps = AppHeaderSearchProps

export function LazyAppHeaderSearch(props: LazyAppHeaderSearchProps) {
  return (
    <Suspense fallback={<div className={props.className} />}>
      <AppHeaderSearch {...props} />
    </Suspense>
  )
}
