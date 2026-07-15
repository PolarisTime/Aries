import { frontendGitCommit, frontendVersion } from '@/utils/env'

type SentrySdk = typeof import('@sentry/react')
type FrontendLogLevel = 'warn' | 'error'

interface ErrorContext {
  componentStack?: string | null
}

const dsn = import.meta.env.VITE_SENTRY_DSN?.trim()
const environment =
  import.meta.env.VITE_SENTRY_ENVIRONMENT?.trim() || import.meta.env.MODE
const release = `aries@${frontendVersion}+${frontendGitCommit}`

let sdkPromise: Promise<SentrySdk | null> | null = null

function parseSampleRate(value: string | undefined): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0
}

function loadSentry(): Promise<SentrySdk | null> {
  if (!dsn) return Promise.resolve(null)
  if (sdkPromise) return sdkPromise

  sdkPromise = import('@sentry/react')
    .then((sdk) => {
      sdk.init({
        dsn,
        environment,
        release,
        sendDefaultPii: false,
        tracesSampleRate: parseSampleRate(
          import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE,
        ),
        beforeSend(event) {
          if (event.request) {
            event.request.cookies = undefined
            event.request.data = undefined
            event.request.headers = undefined
          }
          event.user = event.user?.id ? { id: event.user.id } : undefined
          return event
        },
      })
      return sdk
    })
    .catch((error: unknown) => {
      console.warn('[Sentry] initialization failed', error)
      return null
    })

  return sdkPromise
}

function readTraceId(value: unknown): string | undefined {
  if (!value || typeof value !== 'object' || !('traceId' in value)) {
    return undefined
  }
  const traceId = value.traceId
  return typeof traceId === 'string' && traceId.length > 0 ? traceId : undefined
}

function withTraceId(
  sdk: SentrySdk,
  source: unknown,
  capture: () => void,
): void {
  sdk.withScope((scope) => {
    const traceId = readTraceId(source)
    if (traceId) scope.setTag('backend.trace_id', traceId)
    capture()
  })
}

export function initializeErrorMonitoring(): void {
  void loadSentry()
}

export function captureFrontendException(
  error: unknown,
  context?: ErrorContext,
): void {
  void loadSentry().then((sdk) => {
    if (!sdk) return
    sdk.withScope((scope) => {
      const traceId = readTraceId(error)
      if (traceId) scope.setTag('backend.trace_id', traceId)
      if (context?.componentStack) {
        scope.setContext('react', { componentStack: context.componentStack })
      }
      sdk.captureException(error)
    })
  })
}

export function captureFrontendLog(
  level: FrontendLogLevel,
  message: string,
  details?: unknown,
): void {
  void loadSentry().then((sdk) => {
    if (!sdk) return
    withTraceId(sdk, details, () => {
      if (details instanceof Error) {
        sdk.captureException(details, { extra: { logMessage: message } })
        return
      }
      sdk.captureMessage(message, level === 'warn' ? 'warning' : 'error')
    })
  })
}
