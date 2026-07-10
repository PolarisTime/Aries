import { useEffect, useReducer } from 'react'
import { useTranslation } from 'react-i18next'
import { message } from '@/utils/antd-app'
import {
  clearTotpSession,
  restoreTotpSession,
  type SavedTotpSession,
  saveTotpSession,
} from '@/views/auth/login-view-utils'

interface LoginTotpState {
  loginStep: 'password' | 'totp'
  tempToken: string
  totpCode: string
  stepDeadline: number
  now: number
}

type LoginTotpAction =
  | { type: 'reset'; now: number }
  | { type: 'set-code'; code: string }
  | { type: 'set-now'; now: number }
  | { type: 'start'; token: string; deadline: number; now: number }

function createInitialTotpState(
  savedSession: SavedTotpSession | null,
): LoginTotpState {
  return {
    loginStep: savedSession ? 'totp' : 'password',
    tempToken: savedSession?.token || '',
    totpCode: '',
    stepDeadline: savedSession?.deadline || 0,
    now: Date.now(),
  }
}

function loginTotpReducer(
  state: LoginTotpState,
  action: LoginTotpAction,
): LoginTotpState {
  switch (action.type) {
    case 'reset':
      return {
        loginStep: 'password',
        tempToken: '',
        totpCode: '',
        stepDeadline: 0,
        now: action.now,
      }
    case 'set-code':
      return {
        ...state,
        totpCode: action.code,
      }
    case 'set-now':
      return {
        ...state,
        now: action.now,
      }
    case 'start':
      return {
        loginStep: 'totp',
        tempToken: action.token,
        totpCode: '',
        stepDeadline: action.deadline,
        now: action.now,
      }
  }
}

export function useLoginTotpSession() {
  const { t } = useTranslation()
  const savedSession = restoreTotpSession()
  const [totpState, dispatchTotpState] = useReducer(
    loginTotpReducer,
    savedSession,
    createInitialTotpState,
  )
  const { loginStep, now, stepDeadline, tempToken, totpCode } = totpState

  const reset2faStep = (showMessage = false) => {
    clearTotpSession()
    dispatchTotpState({ type: 'reset', now: Date.now() })
    if (showMessage) {
      message.warning(t('auth.totppanel.expired'))
    }
  }

  useEffect(() => {
    if (loginStep !== 'totp' || !stepDeadline) {
      return
    }

    const resetExpiredStep = () => {
      clearTotpSession()
      dispatchTotpState({ type: 'reset', now: Date.now() })
      message.warning(t('auth.totppanel.expired'))
    }

    const timer = window.setInterval(() => {
      const nextNow = Date.now()
      dispatchTotpState({ type: 'set-now', now: nextNow })
      if (nextNow >= stepDeadline) {
        window.clearInterval(timer)
        resetExpiredStep()
      }
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [loginStep, stepDeadline, t])

  const start2faStep = (token: string, loginName: string, remember = true) => {
    const deadline = Date.now() + 5 * 60 * 1000
    dispatchTotpState({ type: 'start', token, deadline, now: Date.now() })
    saveTotpSession(token, deadline, loginName, remember)
  }

  return {
    loginStep,
    now,
    reset2faStep,
    savedSession,
    setTotpCode: (code: string) =>
      dispatchTotpState({ type: 'set-code', code }),
    start2faStep,
    stepDeadline,
    tempToken,
    totpCode,
  }
}
