import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from '@/utils/antd-app'
import {
  clearTotpSession,
  restoreTotpSession,
  saveTotpSession,
} from '@/views/auth/login-view-utils'

export function useLoginTotpSession() {
  const { t } = useTranslation()
  const savedSession = restoreTotpSession()
  const [loginStep, setLoginStep] = useState<'password' | 'totp'>(
    savedSession ? 'totp' : 'password',
  )
  const [tempToken, setTempToken] = useState(savedSession?.token || '')
  const [totpCode, setTotpCode] = useState('')
  const [stepDeadline, setStepDeadline] = useState(savedSession?.deadline || 0)
  const [now, setNow] = useState(() => Date.now())

  const reset2faStep = useCallback(
    (showMessage = false) => {
      clearTotpSession()
      setLoginStep('password')
      setTempToken('')
      setTotpCode('')
      setStepDeadline(0)
      setNow(Date.now())
      if (showMessage) {
        message.warning(t('auth.totppanel.expired'))
      }
    },
    [t],
  )

  useEffect(() => {
    if (loginStep !== 'totp' || !stepDeadline) {
      return
    }

    const timer = window.setInterval(() => {
      const nextNow = Date.now()
      setNow(nextNow)
      if (nextNow >= stepDeadline) {
        window.clearInterval(timer)
        reset2faStep(true)
      }
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [loginStep, reset2faStep, stepDeadline])

  const start2faStep = useCallback((token: string, loginName: string) => {
    const deadline = Date.now() + 5 * 60 * 1000
    setTempToken(token)
    setLoginStep('totp')
    setStepDeadline(deadline)
    setNow(Date.now())
    saveTotpSession(token, deadline, loginName)
  }, [])

  return {
    loginStep,
    now,
    reset2faStep,
    savedSession,
    setTotpCode,
    start2faStep,
    stepDeadline,
    tempToken,
    totpCode,
  }
}
