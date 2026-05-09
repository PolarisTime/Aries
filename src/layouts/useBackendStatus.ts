import { useCallback, useEffect, useRef, useState } from 'react'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import { apiBaseUrl } from '@/utils/env'
import { logger } from '@/utils/logger'

const HEALTH_CHECK_INTERVAL_MS = 30_000
const HEALTH_CHECK_TIMEOUT_MS = 5_000
const HEALTH_CHECK_MAX_RETRIES = 5
const HEALTH_CHECK_MAX_BACKOFF_MS = 30_000

export function useBackendStatus(token: string) {
  const [companyName, setCompanyName] = useState('')
  const [backendOnline, setBackendOnline] = useState(false)
  const healthTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const healthRetriesRef = useRef(0)

  useEffect(() => {
    if (!token) {
      setCompanyName('')
      return
    }

    http
      .get<{ data: { companyName?: string } }>(
        ENDPOINTS.COMPANY_SETTINGS_CURRENT,
      )
      .then((res) => setCompanyName(res.data?.companyName || ''))
      .catch((err) => {
        logger.warn('Failed to fetch company settings', err)
      })
  }, [token])

  const checkBackendHealth = useCallback(async () => {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(
        () => controller.abort(),
        HEALTH_CHECK_TIMEOUT_MS,
      )
      const response = await fetch(`${apiBaseUrl}${ENDPOINTS.HEALTH}`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      })
      clearTimeout(timeout)

      if (response.ok) {
        const body = (await response.json()) as { status?: string }
        setBackendOnline(body.status === 'UP')
        healthRetriesRef.current = 0
      } else {
        setBackendOnline(false)
      }
    } catch {
      setBackendOnline(false)
      healthRetriesRef.current += 1
      if (healthRetriesRef.current <= HEALTH_CHECK_MAX_RETRIES) {
        const delay = Math.min(
          1000 * 2 ** healthRetriesRef.current,
          HEALTH_CHECK_MAX_BACKOFF_MS,
        )
        window.setTimeout(checkBackendHealth, delay)
      }
    }
  }, [])

  useEffect(() => {
    if (!token) {
      setBackendOnline(false)
      return
    }

    void checkBackendHealth()
    healthTimerRef.current = setInterval(() => {
      if (healthRetriesRef.current === 0) {
        void checkBackendHealth()
      }
    }, HEALTH_CHECK_INTERVAL_MS)

    return () => {
      if (healthTimerRef.current) {
        clearInterval(healthTimerRef.current)
      }
    }
  }, [checkBackendHealth, token])

  return {
    backendOnline,
    companyName,
  }
}
