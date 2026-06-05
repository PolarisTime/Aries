import { AuthPageShell } from '@/views/auth/AuthPageShell'

const loginSkeletonHero = (
  <div className="login-hero-content login-skeleton-hero">
    <div className="login-skeleton-block login-skeleton-logo" />
    <div className="login-skeleton-block login-skeleton-title" />
    <div className="login-skeleton-block login-skeleton-subtitle" />

    <div className="login-skeleton-meta">
      <div className="login-skeleton-block login-skeleton-chip" />
      <div className="login-skeleton-block login-skeleton-chip" />
    </div>

    <div className="login-skeleton-clock-wrap">
      <div className="login-skeleton-block login-skeleton-clock" />
      <div className="login-skeleton-block login-skeleton-date" />
    </div>
  </div>
)

export function LoginSkeleton() {
  return (
    <AuthPageShell hero={loginSkeletonHero}>
      <div className="login-scene">
        <div className="login-form-card login-skeleton-card">
          <div className="login-skeleton-form">
            <div className="login-skeleton-block login-skeleton-form-title" />
            <div className="login-skeleton-block login-skeleton-form-line" />
            <div className="login-skeleton-block login-skeleton-form-line" />
            <div className="login-skeleton-block login-skeleton-form-line" />
            <div className="login-skeleton-block login-skeleton-form-button" />
          </div>
        </div>
      </div>
    </AuthPageShell>
  )
}
