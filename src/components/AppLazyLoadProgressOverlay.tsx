import Progress from 'antd/es/progress'
import { useAuthStore } from '@/stores/authStore'
import { useLazyLoadProgress } from '@/utils/lazy-load-progress'

export function AppLazyLoadProgressOverlay() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const progress = useLazyLoadProgress()

  if (!isAuthenticated || !progress.visible || progress.totalCount === 0) {
    return null
  }

  const status = progress.failedCount > 0 ? 'exception' : 'active'

  return (
    <div className="app-lazy-load-overlay" role="status" aria-live="polite">
      <div className="app-lazy-load-panel">
        <div className="app-lazy-load-title">正在加载系统组件</div>
        <div className="app-lazy-load-label">
          {progress.currentLabel}
          <span>
            {progress.finishedCount}/{progress.totalCount}
          </span>
        </div>
        <Progress
          percent={progress.percent}
          status={status}
          strokeColor={{ from: '#1677ff', to: '#69b1ff' }}
          trailColor="rgba(22, 119, 255, 0.12)"
        />
      </div>
    </div>
  )
}
