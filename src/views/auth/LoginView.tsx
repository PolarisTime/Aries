import { useNavigate } from '@tanstack/react-router'
import { Card, Form } from 'antd'
import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRequestError } from '@/hooks/useRequestError'
import type { LoginPayload } from '@/shared/schemas'
import { useAuthStore } from '@/stores/authStore'
import { message } from '@/utils/antd-app'
import { AuthPageShell } from './AuthPageShell'
import { LoginPasswordForm } from './LoginPasswordForm'
import { LoginTotpPanel } from './LoginTotpPanel'
import {
  buildPostLoginTarget,
  clearTotpSession,
  requiresForcedTotpSetup,
} from './login-view-utils'
import { useLoginTotpSession } from './useLoginTotpSession'

export function LoginView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const verify2fa = useAuthStore((s) => s.verify2fa)
  const { showError } = useRequestError()
  const {
    loginStep,
    now: totpNow,
    reset2faStep,
    savedSession,
    setTotpCode,
    start2faStep,
    stepDeadline,
    tempToken,
    totpCode,
  } = useLoginTotpSession()
  const [loading, setLoading] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [form] = Form.useForm()
  const flipped = loginStep === 'totp'
  const [pendingLoginName, setPendingLoginName] = useState(
    savedSession?.loginName || '',
  )
  const pendingRememberRef = useRef(savedSession?.remember ?? true)
  const handleLogin = async (values: LoginPayload) => {
    setLoading(true)
    setPendingLoginName(values.loginName)
    pendingRememberRef.current = values.remember !== false
    try {
      const result = await signIn(values)
      if (result.requires2fa) {
        start2faStep(
          result.tempToken,
          values.loginName,
          pendingRememberRef.current,
        )
        setLoading(false)
        return
      }
      clearTotpSession()
      message.success(
        requiresForcedTotpSetup(result.user)
          ? t('auth.loginview.forceTotpSetupSuccess')
          : t('auth.loginSuccess'),
      )
      await navigate({ to: buildPostLoginTarget(result.user) as '/' })
      setLoading(false)
    } catch (err) {
      showError(err, t('auth.loginFailed'))
      setLoading(false)
    }
  }
  const handleTotpVerify = async () => {
    if (!/^\d{6}$/.test(totpCode.trim())) {
      message.error(t('auth.loginview.codeInvalid'))
      return
    }
    if (!tempToken) {
      reset2faStep(true)
      return
    }
    if (stepDeadline > 0 && Date.now() >= stepDeadline) {
      reset2faStep(true)
      return
    }
    setTotpLoading(true)
    try {
      const result = await verify2fa({
        tempToken,
        totpCode: totpCode.trim(),
        remember: pendingRememberRef.current,
      })
      clearTotpSession()
      message.success(t('auth.loginSuccess'))
      await navigate({ to: buildPostLoginTarget(result.user) as '/' })
      setTotpLoading(false)
    } catch (err) {
      showError(err, t('auth.twofactormodal.verifyFailed'))
      setTotpLoading(false)
    }
  }
  const handleBackToPassword = () => {
    reset2faStep(false)
  }
  const isExpired = stepDeadline > 0 && totpNow >= stepDeadline
  const isExpiring =
    !isExpired && stepDeadline > 0 && stepDeadline - totpNow < 60000
  const activeLoginName =
    String(pendingLoginName || savedSession?.loginName || '').trim() ||
    t('auth.setup2fa.currentUserFallback')
  const countdownText = (() => {
    if (stepDeadline > 0) {
      const remaining = Math.max(0, Math.ceil((stepDeadline - totpNow) / 1000))
      const m = Math.floor(remaining / 60)
      const s = remaining % 60
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    return '00:00'
  })()
  return (
    <AuthPageShell>
      <Card className="login-form-card" variant="outlined">
        {flipped ? (
          <LoginTotpPanel
            countdownText={countdownText}
            isExpired={isExpired}
            isExpiring={isExpiring}
            onBackToPassword={handleBackToPassword}
            onTotpCodeChange={setTotpCode}
            onVerify={() => {
              void handleTotpVerify()
            }}
            totpCode={totpCode}
            totpLoading={totpLoading}
            activeLoginName={activeLoginName}
          />
        ) : (
          <LoginPasswordForm
            loading={loading}
            onSubmit={(values) => {
              void handleLogin(values)
            }}
            savedLoginName={savedSession?.loginName || ''}
            form={form}
          />
        )}
      </Card>
    </AuthPageShell>
  )
}
