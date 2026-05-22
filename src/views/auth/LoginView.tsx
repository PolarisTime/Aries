import { useNavigate } from '@tanstack/react-router'
import BorderBeam from 'antd/es/border-beam'
import Card from 'antd/es/card'
import Form from 'antd/es/form'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchCaptcha } from '@/api/auth'
import { getInitialSetupStatus } from '@/api/setup'
import { useRequestError } from '@/hooks/useRequestError'
import { getFormString } from '@/lib/antd-form'
import { useAuthStore } from '@/stores/authStore'
import type { CaptchaData, LoginPayload } from '@/types/auth'
import type { InitialSetupStatus } from '@/types/setup'
import { message } from '@/utils/antd-app'
import { toDataImageUrl } from '@/utils/data-url'
import { appTitle } from '@/utils/env'
import { AuthPageShell } from './AuthPageShell'
import { LoginPasswordForm } from './LoginPasswordForm'
import { LoginTotpPanel } from './LoginTotpPanel'
import {
  buildPostLoginTarget,
  checkBackendHealth,
  clearTotpSession,
  getCachedHealth,
  requiresForcedTotpSetup,
} from './login-view-utils'
import { useLoginTotpSession } from './useLoginTotpSession'

function useClientClock(): { now: number; timeText: string; dateText: string } {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const timeText = useMemo(() => {
    const d = new Date(now)
    return d.toLocaleTimeString('zh-CN', { hour12: false })
  }, [now])
  const dateText = useMemo(() => {
    const d = new Date(now)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    })
  }, [now])
  return { now, timeText, dateText }
}
export function LoginView() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const verify2fa = useAuthStore((s) => s.verify2fa)
  const { showError } = useRequestError()
  const {
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
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null)
  const [form] = Form.useForm()
  const [flipped, setFlipped] = useState(!!savedSession)
  const [backendOnline, setBackendOnline] = useState(
    () => getCachedHealth().online,
  )
  const [setupStatus, setSetupStatus] = useState<InitialSetupStatus | null>(
    null,
  )
  const { timeText, dateText } = useClientClock()
  const healthTimerRef = useRef<ReturnType<typeof setInterval>>(null)
  useEffect(() => {
    void checkBackendHealth().then(setBackendOnline)
    healthTimerRef.current = setInterval(() => {
      void checkBackendHealth().then(setBackendOnline)
    }, 30000)
    return () => {
      if (healthTimerRef.current) clearInterval(healthTimerRef.current)
    }
  }, [])
  useEffect(() => {
    getInitialSetupStatus()
      .then((res) => {
        if (res.code === 0) setSetupStatus(res.data)
      })
      .catch(() => {
        // non-critical
      })
  }, [])
  const loadCaptcha = useCallback(async () => {
    try {
      const response = await fetchCaptcha()
      if (response.code === 0) {
        setCaptcha(response.data)
      }
    } catch {
      // captcha is optional
    }
  }, [])
  useEffect(() => {
    void loadCaptcha()
  }, [loadCaptcha])
  const handleLogin = useCallback(
    async (values: LoginPayload) => {
      setLoading(true)
      try {
        const result = await signIn({
          ...values,
          captchaId: captcha?.captchaId,
        })
        if (result.requires2fa) {
          start2faStep(result.tempToken, values.loginName)
          setFlipped(true)
          return
        }
        clearTotpSession()
        message.success(
          requiresForcedTotpSetup(result.user)
            ? t('auth.loginview.forceTotpSetupSuccess')
            : t('auth.loginSuccess'),
        )
        await navigate({ to: buildPostLoginTarget(result.user) as '/' })
      } catch (err) {
        showError(err, t('auth.loginFailed'))
        void loadCaptcha()
      } finally {
        setLoading(false)
      }
    },
    [captcha, loadCaptcha, navigate, showError, signIn, start2faStep, t],
  )
  const handleTotpVerify = useCallback(async () => {
    if (!/^\d{6}$/.test(totpCode.trim())) {
      message.error(t('auth.loginview.codeInvalid'))
      return
    }
    if (!tempToken) {
      reset2faStep(true)
      setFlipped(false)
      return
    }
    if (stepDeadline > 0 && Date.now() >= stepDeadline) {
      reset2faStep(true)
      setFlipped(false)
      return
    }
    setTotpLoading(true)
    try {
      const result = await verify2fa({
        tempToken,
        totpCode: totpCode.trim(),
        remember: Boolean(form.getFieldValue('remember')),
      })
      clearTotpSession()
      message.success(t('auth.loginSuccess'))
      await navigate({ to: buildPostLoginTarget(result.user) as '/' })
    } catch (err) {
      showError(err, t('auth.twofactormodal.verifyFailed'))
    } finally {
      setTotpLoading(false)
    }
  }, [
    form,
    navigate,
    reset2faStep,
    showError,
    stepDeadline,
    t,
    tempToken,
    totpCode,
    verify2fa,
  ])
  const handleBackToPassword = useCallback(() => {
    reset2faStep(false)
    setFlipped(false)
  }, [reset2faStep])
  const isExpired = stepDeadline > 0 && totpNow >= stepDeadline
  useEffect(() => {
    if (isExpired && flipped) {
      const timer = setTimeout(() => {
        reset2faStep(true)
        setFlipped(false)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [isExpired, flipped, reset2faStep])
  const isExpiring =
    !isExpired && stepDeadline > 0 && stepDeadline - totpNow < 60000
  const activeLoginName =
    String(
      getFormString(form, 'loginName') || savedSession?.loginName || '',
    ).trim() || t('auth.setup2fa.currentUserFallback')
  const countdownText = useMemo(() => {
    if (stepDeadline > 0) {
      const remaining = Math.max(0, Math.ceil((stepDeadline - totpNow) / 1000))
      const m = Math.floor(remaining / 60)
      const s = remaining % 60
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    return '00:00'
  }, [stepDeadline, totpNow])
  const captchaImageSrc = useMemo(
    () => toDataImageUrl(captcha?.captchaImage),
    [captcha?.captchaImage],
  )
  const shouldShowCaptcha = Boolean(captcha?.required)
  const setupReady = !setupStatus?.setupRequired
  const hero = (
    <div className="login-hero-content">
      <div className="login-hero-logo">L</div>
      <h1 className="login-hero-title">{appTitle}</h1>
      <p className="login-hero-subtitle">{t('auth.loginview.heroSubtitle')}</p>
      <div className="login-hero-meta">
        <div className="login-hero-meta-item">
          <span
            className={`login-hero-meta-dot${backendOnline ? ' is-up' : ' is-down'}`}
          />
          {backendOnline
            ? t('auth.loginview.backendOnline')
            : t('auth.loginview.backendOffline')}
        </div>
        <div className="login-hero-meta-item">
          <span className="login-hero-meta-dot is-up" />
          {setupReady
            ? t('auth.loginview.setupReady')
            : t('auth.loginview.setupPending')}
        </div>
      </div>
      <div className="mt-10">
        <div className="login-hero-clock">{timeText}</div>
        <div className="login-hero-date">{dateText}</div>
      </div>
    </div>
  )
  return (
    <AuthPageShell hero={hero}>
      <div className="login-scene">
        <div className={`login-card-inner${flipped ? ' is-flipped' : ''}`}>
          <div className="login-card-face">
            <BorderBeam>
              <Card className="login-form-card">
                <LoginPasswordForm
                  captchaImageSrc={captchaImageSrc}
                  loading={loading}
                  onLoadCaptcha={() => {
                    void loadCaptcha()
                  }}
                  onSubmit={(values) => {
                    void handleLogin(values)
                  }}
                  shouldShowCaptcha={shouldShowCaptcha}
                  savedLoginName={savedSession?.loginName || ''}
                  form={form}
                />
              </Card>
            </BorderBeam>
          </div>
          <div className="login-card-face is-back">
            <BorderBeam>
              <Card className="login-form-card">
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
            </Card>
            </BorderBeam>
          </div>
        </div>
      </div>
    </AuthPageShell>
  )
}
