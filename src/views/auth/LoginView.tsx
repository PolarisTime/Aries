import { useNavigate } from '@tanstack/react-router'
import BorderBeam from 'antd/es/border-beam'
import Card from 'antd/es/card'
import Form from 'antd/es/form'
import Typography from 'antd/es/typography'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SliderCaptcha } from '@/components/SliderCaptcha'
import { useRequestError } from '@/hooks/useRequestError'
import { getFormString } from '@/lib/antd-form'
import { useAuthStore } from '@/stores/authStore'
import type { LoginPayload } from '@/types/auth'
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

const SLIDER_THRESHOLD = 3

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
  const [loginAttempts, setLoginAttempts] = useState(0)
  const [sliderVerified, setSliderVerified] = useState(false)
  const [form] = Form.useForm()
  const [flipped, setFlipped] = useState(!!savedSession)
  const needSlider = loginAttempts >= SLIDER_THRESHOLD
  // 当 2FA 密码阶段被重置时，同步翻转到登录表单
  useEffect(() => {
    if (loginStep === 'password' && flipped) {
      setFlipped(false)
    }
  }, [loginStep, flipped])
  const handleLogin = useCallback(
    async (values: LoginPayload) => {
      if (needSlider && !sliderVerified) return
      setLoading(true)
      try {
        const result = await signIn(values)
        if (result.requires2fa) {
          start2faStep(result.tempToken, values.loginName)
          setFlipped(true)
          setLoginAttempts(0)
          setSliderVerified(false)
          return
        }
        clearTotpSession()
        message.success(
          requiresForcedTotpSetup(result.user)
            ? t('auth.loginview.forceTotpSetupSuccess')
            : t('auth.loginSuccess'),
        )
        await navigate({ to: buildPostLoginTarget(result.user) as '/' })
        setLoginAttempts(0)
        setSliderVerified(false)
      } catch (err) {
        setLoginAttempts((p) => p + 1)
        setSliderVerified(false)
        showError(err, t('auth.loginFailed'))
      } finally {
        setLoading(false)
      }
    },
    [navigate, needSlider, showError, signIn, sliderVerified, start2faStep, t],
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
      setLoginAttempts(0)
      setSliderVerified(false)
    } catch (err) {
      setLoginAttempts((p) => p + 1)
      setSliderVerified(false)
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
      reset2faStep(true)
      setFlipped(false)
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
  return (
    <AuthPageShell>
      <BorderBeam>
        <Card className="login-form-card">
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
          {!flipped && needSlider ? (
            <SliderCaptcha onVerify={() => setSliderVerified(true)} />
          ) : null}
          {!flipped && !needSlider && loginAttempts > 0 ? (
            <Typography.Text type="secondary" className="text-xs">
              失败 {loginAttempts}/{SLIDER_THRESHOLD} 次后需滑动验证
            </Typography.Text>
          ) : null}
        </Card>
      </BorderBeam>
    </AuthPageShell>
  )
}
