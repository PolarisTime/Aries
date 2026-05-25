import { lazy, Suspense } from 'react'
import { trackLazyLoad } from '@/utils/lazy-load-progress'
import { LoginSkeleton } from '@/views/auth/LoginSkeleton'

const LoginViewContent = lazy(() =>
  trackLazyLoad('登录页', () =>
    import('@/views/auth/LoginView').then((m) => ({
      default: m.LoginView,
    })),
  ),
)

export function LazyLoginView() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginViewContent />
    </Suspense>
  )
}
