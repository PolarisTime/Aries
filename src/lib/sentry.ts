/**
 * Sentry 前端错误监控配置
 *
 * 使用方式：
 *   1. pnpm add @sentry/react
 *   2. 在 .env.local 中设置 VITE_SENTRY_DSN
 *   3. 重启 dev server
 *
 * 未配置 DSN 时 Sentry 不会初始化，对应用零影响。
 */
const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined

export function initSentry(): boolean {
  if (!SENTRY_DSN) {
    return false
  }

  // 动态 import，未安装 @sentry/react 时不会执行到这里
  import('@sentry/react').then((Sentry) => {
    const options = {
      dsn: SENTRY_DSN,
      environment: import.meta.env.MODE || 'development',
      release: import.meta.env.VITE_APP_VERSION || '0.0.0',

      // 只上报可以处理的错误，减少噪音
      beforeSend(event) {
        // 忽略网络请求失败（通常是用户网络问题）
        if (
          event.exception?.values?.[0]?.type === 'TypeError' &&
          event.exception.values[0].value?.includes('NetworkError')
        ) {
          return null
        }
        // 忽略 ResizeObserver 无害错误
        if (
          event.exception?.values?.[0]?.type === 'ResizeObserverLoopError'
        ) {
          return null
        }
        return event
      },

      // 采样率：生产环境 100%，开发环境 0%（本地不报）
      tracesSampleRate:
        import.meta.env.MODE === 'production' ? 1.0 : 0.0,
      replaysSessionSampleRate:
        import.meta.env.MODE === 'production' ? 0.1 : 0.0,
      replaysOnErrorSampleRate:
        import.meta.env.MODE === 'production' ? 1.0 : 0.0,
    }

    Sentry.init(options)
  })

  return true
}
