import type { LoginUser } from '@/types/auth'
import { apiBaseUrl } from '@/utils/env'

const TOTP_SESSION_KEY = 'aries-totp-session'

export const loginHeroStats = [
  { label: '业务域', value: '采购 / 销售 / 财务' },
  { label: '安全策略', value: '密码 + 2FA' },
  { label: '部署方式', value: '本地自托管' },
] as const

export interface SavedTotpSession {
  token: string
  deadline: number
  loginName: string
}

let healthCache: { online: boolean; checkedAt: number } = {
  online: false,
  checkedAt: 0,
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(`${apiBaseUrl}/auth/ping`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timer)
    const body = (await res.json()) as { code?: number }
    const online = body?.code === 0
    healthCache = { online, checkedAt: Date.now() }
    return online
  } catch {
    healthCache = { online: false, checkedAt: Date.now() }
    return false
  }
}

export function getCachedHealth() {
  return healthCache
}

export function saveTotpSession(
  token: string,
  deadline: number,
  loginName: string,
) {
  sessionStorage.setItem(
    TOTP_SESSION_KEY,
    JSON.stringify({ token, deadline, loginName }),
  )
}

export function clearTotpSession() {
  sessionStorage.removeItem(TOTP_SESSION_KEY)
}

export function restoreTotpSession(): SavedTotpSession | null {
  try {
    const raw = sessionStorage.getItem(TOTP_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed.token === 'string' &&
      typeof parsed.deadline === 'number' &&
      typeof parsed.loginName === 'string' &&
      Date.now() < parsed.deadline
    ) {
      return {
        token: parsed.token,
        deadline: parsed.deadline,
        loginName: parsed.loginName,
      }
    }
  } catch {
    // ignore malformed session data
  }
  sessionStorage.removeItem(TOTP_SESSION_KEY)
  return null
}

export function sanitizeRedirectPath(candidate: string) {
  if (!candidate.startsWith('/') || /^https?:\/\//i.test(candidate)) {
    return '/dashboard'
  }
  return candidate
}

export function getRedirectTarget() {
  if (typeof window === 'undefined') {
    return '/dashboard'
  }
  const params = new URLSearchParams(window.location.search)
  return sanitizeRedirectPath(params.get('redirect') || '/dashboard')
}

export function requiresForcedTotpSetup(user: LoginUser | null | undefined) {
  return Boolean(user?.forceTotpSetup && user?.totpEnabled !== true)
}

export function buildPostLoginTarget(user: LoginUser | null | undefined) {
  const redirect = getRedirectTarget()
  if (requiresForcedTotpSetup(user)) {
    return `/setup-2fa?redirect=${encodeURIComponent(redirect)}`
  }
  return redirect
}

export function buildTotpCountdown(now: number, stepDeadline: number) {
  if (!stepDeadline || now >= stepDeadline) {
    return '00:00'
  }
  const remainingSeconds = Math.max(Math.ceil((stepDeadline - now) / 1000), 0)
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
