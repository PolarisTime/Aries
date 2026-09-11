import { lazy, Suspense } from 'react'
import { RouteLoadingFallback } from '@/components/RouteLoadingFallback'
import { LoginSkeleton } from '@/views/auth/LoginSkeleton'

const LoginViewContent = lazy(() =>
  import('@/views/auth/LoginView').then((m) => ({
    default: m.LoginView,
  })),
)

export function LazyLoginView() {
  return (
    <Suspense fallback={<RouteLoadingFallback skeleton={<LoginSkeleton />} />}>
      <LoginViewContent />
    </Suspense>
  )
}
