const APP_REDIRECT_QUERY_KEY = '__redirect'

export function getCurrentAppRoute() {
  if (typeof window === 'undefined') {
    return '/dashboard'
  }

  return `${window.location.pathname}${window.location.search}${window.location.hash}` || '/dashboard'
}

export function getRequestPath(url: string) {
  if (!url) {
    return ''
  }

  try {
    return new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost').pathname
  } catch {
    return url.split('#')[0]?.split('?')[0] || url
  }
}

export function isExactAuthEndpoint(url: string, endpoint: string) {
  return getRequestPath(url) === endpoint
}

export function restoreRedirectedHistoryRoute() {
  if (typeof window === 'undefined') {
    return
  }

  const currentUrl = new URL(window.location.href)
  const redirect = currentUrl.searchParams.get(APP_REDIRECT_QUERY_KEY)
  if (!redirect || !redirect.startsWith('/') || /^https?:\/\//i.test(redirect)) {
    return
  }

  currentUrl.searchParams.delete(APP_REDIRECT_QUERY_KEY)
  window.history.replaceState(
    null,
    '',
    `${redirect}${currentUrl.searchParams.toString() ? `?${currentUrl.searchParams.toString()}` : ''}${currentUrl.hash}`,
  )
}
