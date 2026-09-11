import { lazy, Suspense } from 'react'
import { RouteLoadingFallback } from '@/components/RouteLoadingFallback'
import { DashboardSkeleton } from '@/views/dashboard/DashboardSkeleton'

const DashboardViewContent = lazy(() =>
  import('@/views/dashboard/DashboardView').then((m) => ({
    default: m.DashboardView,
  })),
)

export function LazyDashboardView() {
  return (
    <Suspense
      fallback={<RouteLoadingFallback skeleton={<DashboardSkeleton />} />}
    >
      <DashboardViewContent />
    </Suspense>
  )
}
