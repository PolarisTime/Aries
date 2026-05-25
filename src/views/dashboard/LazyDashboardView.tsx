import { lazy, Suspense } from 'react'
import { trackLazyLoad } from '@/utils/lazy-load-progress'
import { DashboardSkeleton } from '@/views/dashboard/DashboardSkeleton'

const DashboardViewContent = lazy(() =>
  trackLazyLoad('工作台页面', () =>
    import('@/views/dashboard/DashboardView').then((m) => ({
      default: m.DashboardView,
    })),
  ),
)

export function LazyDashboardView() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardViewContent />
    </Suspense>
  )
}
