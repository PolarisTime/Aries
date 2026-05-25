import { lazy, Suspense } from 'react'
import { LoginSkeleton } from '@/views/auth/LoginSkeleton'

const LoginViewContent = lazy(() =>
  import('@/views/auth/LoginView').then((m) => ({
    default: m.LoginView,
  })),
)

export function LazyLoginView() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginViewContent />
    </Suspense>
  )
}
