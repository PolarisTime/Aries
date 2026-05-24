export function getCurrentAppRoute() {
  if (typeof window === 'undefined') {
    return '/dashboard'
  }

  return (
    `${window.location.pathname}${window.location.search}${window.location.hash}` ||
    '/dashboard'
  )
}

export function getRequestPath(url: string) {
  if (!url) {
    return ''
  }

  try {
    return new URL(
      url,
      typeof window !== 'undefined'
        ? window.location.origin
        : 'http://localhost',
    ).pathname
  } catch {
    return url.split('#')[0]?.split('?')[0] || url
  }
}

export function isExactAuthEndpoint(url: string, endpoint: string) {
  return getRequestPath(url) === endpoint
}
