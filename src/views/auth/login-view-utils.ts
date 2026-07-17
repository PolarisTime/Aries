function sanitizeRedirectPath(candidate: string): string {
  if (!candidate.startsWith('/') || /^https?:\/\//i.test(candidate)) {
    return '/dashboard'
  }
  return candidate
}

function getRedirectTarget(): string {
  if (typeof window === 'undefined') {
    return '/dashboard'
  }
  const params = new URLSearchParams(window.location.search)
  return sanitizeRedirectPath(params.get('redirect') || '/dashboard')
}

export function buildPostLoginTarget(): string {
  return getRedirectTarget()
}
