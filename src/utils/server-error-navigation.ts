export const SERVER_ERROR_ROUTE = '/server-error'
const SERVER_ERROR_RETRY_FALLBACK_ROUTE = '/'

interface ServerErrorSourceLocation {
  pathname?: unknown
  searchStr?: unknown
  hash?: unknown
}

function normalizeSearch(searchStr: unknown): string {
  if (typeof searchStr !== 'string' || searchStr.length === 0) return ''
  return searchStr.startsWith('?') ? searchStr : `?${searchStr}`
}

function normalizeHash(hash: unknown): string {
  if (typeof hash !== 'string' || hash.length === 0) return ''
  return hash.startsWith('#') ? hash : `#${hash}`
}

function getPathname(path: string): string {
  return path.split(/[?#]/, 1)[0]
}

export function isSafeServerErrorRetryPath(path: unknown): path is string {
  if (typeof path !== 'string') return false
  const trimmed = path.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//')) return false
  return getPathname(trimmed) !== SERVER_ERROR_ROUTE
}

export function getServerErrorReturnPath(
  location: ServerErrorSourceLocation,
): string | undefined {
  if (typeof location.pathname !== 'string') return undefined

  const path = `${location.pathname}${normalizeSearch(
    location.searchStr,
  )}${normalizeHash(location.hash)}`

  return isSafeServerErrorRetryPath(path) ? path : undefined
}

export function resolveServerErrorRetryPath(searchStr: unknown): string {
  const search = normalizeSearch(searchStr)
  const from = new URLSearchParams(search).get('from')
  return isSafeServerErrorRetryPath(from)
    ? from.trim()
    : SERVER_ERROR_RETRY_FALLBACK_ROUTE
}
