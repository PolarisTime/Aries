import { preloadLazyLoad } from '@/utils/lazy-load-progress'

type IdleCallbackHandle = number
type IdleDeadlineLike = {
  didTimeout: boolean
  timeRemaining: () => number
}

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (
      callback: (deadline: IdleDeadlineLike) => void,
      options?: { timeout?: number },
    ) => IdleCallbackHandle
    cancelIdleCallback?: (handle: IdleCallbackHandle) => void
  }

let preloaded = false

function runWhenIdle(task: () => void) {
  if (typeof window === 'undefined') {
    task()
    return
  }

  const idleWindow: IdleWindow = window
  if (typeof idleWindow.requestIdleCallback === 'function') {
    idleWindow.requestIdleCallback(() => task(), { timeout: 1800 })
    return
  }

  window.setTimeout(task, 500)
}

export function preloadPostLoginShell() {
  if (preloaded) return
  preloaded = true

  runWhenIdle(() => {
    void Promise.allSettled([
      preloadLazyLoad('系统工作台框架', () =>
        import('@/layouts/AppLayout').then((m) => ({ default: m.AppLayout })),
      ),
      preloadLazyLoad('工作台页面', () =>
        import('@/views/dashboard/DashboardView').then((m) => ({
          default: m.DashboardView,
        })),
      ),
      preloadLazyLoad('全局搜索组件', () =>
        import('@/layouts/AppHeaderSearch').then((m) => ({
          default: m.AppHeaderSearch,
        })),
      ),
      preloadLazyLoad('工作台流程卡片', () =>
        import('@/views/dashboard/DashboardFlowCard').then((m) => ({
          default: m.DashboardFlowCard,
        })),
      ),
    ])
  })
}
