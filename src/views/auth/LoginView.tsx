import { getFormString, validateFormFields } from '@/utils/antd-form-safe'
import { useNavigate } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Card from 'antd/es/card'
import Form from 'antd/es/form'
import { fetchCaptcha } from '@/api/auth'
import { getInitialSetupStatus } from '@/api/setup'
import { useAuthStore } from '@/stores/authStore'
import type { CaptchaData, LoginPayload } from '@/types/auth'
import type { InitialSetupStatus } from '@/types/setup'
import { useRequestError } from '@/hooks/useRequestError'
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

function useClientClock() {
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
  const [backendOnline, setBackendOnline] = useState(() => getCachedHealth().online)
  const [setupStatus, setSetupStatus] = useState<InitialSetupStatus | null>(null)

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
            ? '账号已登录，请先完成 2FA 绑定后再进入系统。'
            : '登录成功',
        )
        await navigate({ to: buildPostLoginTarget(result.user) as '/' })
      } catch (err) {
        showError(err, '登录失败')
        void loadCaptcha()
      } finally {
        setLoading(false)
      }
    },
    [captcha?.captchaId, loadCaptcha, navigate, showError, signIn, start2faStep],
  )

  const handleTotpVerify = useCallback(async () => {
    if (!/^\d{6}$/.test(totpCode.trim())) {
      message.error('请输入6位验证码')
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
        remember: getFormString(form, 'remember') !== false,
      })
      clearTotpSession()
      message.success('登录成功')
      await navigate({ to: buildPostLoginTarget(result.user) as '/' })
    } catch (err) {
      showError(err, '二次验证失败')
    } finally {
      setTotpLoading(false)
    }
  }, [
    form,
    navigate,
    reset2faStep,
    showError,
    stepDeadline,
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

  const isExpiring = !isExpired && stepDeadline > 0 && (stepDeadline - totpNow) < 60000

  const activeLoginName =
    String(
      getFormString(form, 'loginName') || savedSession?.loginName || '',
    ).trim() || '当前账户'

  const countdownText = useMemo(() => {
    if (stepDeadline > 0) {
      const remaining = Math.max(0, Math.ceil((stepDeadline - totpNow) / 1000))
      const m = Math.floor(remaining / 60)
      const s = remaining % 60
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
    }
    return '05:00'
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
      <p className="login-hero-subtitle">
        统一采购、销售、库存、财务的一体化业务中台
      </p>

      <div className="login-hero-meta">
        <div className="login-hero-meta-item">
          <span
            className={`login-hero-meta-dot${backendOnline ? ' is-up' : ' is-down'}`}
          />
          {backendOnline ? '后端服务正常' : '后端服务离线'}
        </div>
        <div className="login-hero-meta-item">
          <span className="login-hero-meta-dot is-up" />
          {setupReady ? '系统已就绪' : '待初始化配置'}
        </div>
      </div>

      <div style={{ marginTop: 40 }}>
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
            <Card className="login-form-card">
              <LoginPasswordForm
                captchaImageSrc={captchaImageSrc}
                loading={loading}
                onLoadCaptcha={() => {
                  void loadCaptcha()
                }}
                oonSubmit={() => { void handleLogin }}
                shouldShowCaptcha={shouldShowCaptcha}
                savedLoginName={savedSession?.loginName || ''}
                form={form}
              />
            </Card>
          </div>

          <div className="login-card-face is-back">
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
          </div>
        </div>
      </div>
    </AuthPageShell>
  )
}
