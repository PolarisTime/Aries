import { checkAuthPing } from '@/api/auth'
import type { LoginUser } from '@/types/auth'

const TOTP_SESSION_KEY = 'aries-totp-session'

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
    const online = await checkAuthPing()
    healthCache = { online, checkedAt: Date.now() }
    return online
  } catch {
    healthCache = { online: false, checkedAt: Date.now() }
    return false
  }
}

export function getCachedHealth(): { online: boolean; checkedAt: number } {
  return healthCache
}

export function saveTotpSession(
  token: string,
  deadline: number,
  loginName: string,
): void {
  sessionStorage.setItem(
    TOTP_SESSION_KEY,
    JSON.stringify({ token, deadline, loginName }),
  )
}

export function clearTotpSession(): void {
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

export function sanitizeRedirectPath(candidate: string): string {
  if (!candidate.startsWith('/') || /^https?:\/\//i.test(candidate)) {
    return '/dashboard'
  }
  return candidate
}

export function getRedirectTarget(): string {
  if (typeof window === 'undefined') {
    return '/dashboard'
  }
  const params = new URLSearchParams(window.location.search)
  return sanitizeRedirectPath(params.get('redirect') || '/dashboard')
}

export function requiresForcedTotpSetup(
  user: LoginUser | null | undefined,
): boolean {
  return Boolean(user?.forceTotpSetup && user?.totpEnabled !== true)
}

export function buildPostLoginTarget(
  user: LoginUser | null | undefined,
): string {
  const redirect = getRedirectTarget()
  if (requiresForcedTotpSetup(user)) {
    return `/setup-2fa?redirect=${encodeURIComponent(redirect)}`
  }
  return redirect
}

export function buildTotpCountdown(now: number, stepDeadline: number): string {
  if (!stepDeadline || now >= stepDeadline) {
    return '00:00'
  }
  const remainingSeconds = Math.max(Math.ceil((stepDeadline - now) / 1000), 0)
  const minutes = Math.floor(remainingSeconds / 60)
  const seconds = remainingSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}
