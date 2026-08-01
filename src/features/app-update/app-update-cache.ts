import { logger } from '@/utils/logger'

const CACHE_RESET_PATH = '/_app/cache'

async function requestHttpCacheReset(): Promise<void> {
  const response = await fetch(CACHE_RESET_PATH, {
    cache: 'no-store',
    credentials: 'same-origin',
  })

  if (!response.ok) {
    throw new Error(`Cache reset request failed with status ${response.status}`)
  }
}

async function clearCacheStorage(): Promise<void> {
  if (!('caches' in window)) return

  const cacheNames = await window.caches.keys()
  await Promise.all(
    cacheNames.map((cacheName) => window.caches.delete(cacheName)),
  )
}

async function unregisterServiceWorkers(): Promise<void> {
  if (!('serviceWorker' in navigator)) return

  const registrations = await navigator.serviceWorker.getRegistrations()
  await Promise.all(
    registrations.map((registration) => registration.unregister()),
  )
}

export async function clearApplicationCacheAndReload(): Promise<void> {
  const results = await Promise.allSettled([
    requestHttpCacheReset(),
    clearCacheStorage(),
    unregisterServiceWorkers(),
  ])
  const failures = results.filter((result) => result.status === 'rejected')

  if (failures.length > 0) {
    logger.warn('Some frontend caches could not be cleared', failures)
  }

  window.location.reload()
}
