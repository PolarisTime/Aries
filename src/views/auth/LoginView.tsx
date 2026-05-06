import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Form,
  Input,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  LockOutlined,
  QrcodeOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { fetchCaptcha } from '@/api/auth'
import { appTitle } from '@/utils/env'
import { message } from '@/utils/antd-app'
import { toDataImageUrl } from '@/utils/data-url'
import { AuthPageShell } from './AuthPageShell'
import type { LoginPayload, CaptchaData, LoginUser } from '@/types/auth'

const TOTP_SESSION_KEY = 'aries-totp-session'

interface SavedTotpSession {
  token: string
  deadline: number
  loginName: string
}

const loginHeroStats = [
  { label: 'Access', value: '24/7' },
  { label: 'Security', value: '2-Step' },
  { label: 'Workspace', value: 'ERP' },
]

function saveTotpSession(token: string, deadline: number, loginName: string) {
  sessionStorage.setItem(
    TOTP_SESSION_KEY,
    JSON.stringify({ token, deadline, loginName }),
  )
}

function clearTotpSession() {
  sessionStorage.removeItem(TOTP_SESSION_KEY)
}

function restoreTotpSession(): SavedTotpSession | null {
  try {
    const raw = sessionStorage.getItem(TOTP_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as SavedTotpSession
    if (parsed.token && parsed.deadline && Date.now() < parsed.deadline) {
      return parsed
    }
  } catch {
    // ignore malformed session data
  }
  sessionStorage.removeItem(TOTP_SESSION_KEY)
  return null
}

function sanitizeRedirectPath(candidate: string) {
  if (!candidate.startsWith('/') || /^https?:\/\//i.test(candidate)) {
    return '/dashboard'
  }
  return candidate
}

function getRedirectTarget() {
  if (typeof window === 'undefined') {
    return '/dashboard'
  }
  const params = new URLSearchParams(window.location.search)
  return sanitizeRedirectPath(params.get('redirect') || '/dashboard')
}

function requiresForcedTotpSetup(user: LoginUser | null | undefined) {
  return Boolean(user?.forceTotpSetup && user?.totpEnabled !== true)
}

function buildPostLoginTarget(user: LoginUser | null | undefined) {
  const redirect = getRedirectTarget()
  if (requiresForcedTotpSetup(user)) {
    return `/setup-2fa?redirect=${encodeURIComponent(redirect)}`
  }
  return redirect
}

export function LoginView() {
  const navigate = useNavigate()
  const signIn = useAuthStore((s) => s.signIn)
  const verify2fa = useAuthStore((s) => s.verify2fa)

  const savedSession = restoreTotpSession()
  const [loginStep, setLoginStep] = useState<'password' | 'totp'>(
    savedSession ? 'totp' : 'password',
  )
  const [tempToken, setTempToken] = useState(savedSession?.token || '')
  const [totpCode, setTotpCode] = useState('')
  const [stepDeadline, setStepDeadline] = useState(savedSession?.deadline || 0)
  const [now, setNow] = useState(Date.now())
  const [loading, setLoading] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null)
  const [form] = Form.useForm()

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

  const reset2faStep = useCallback((showMessage = false) => {
    clearTotpSession()
    setLoginStep('password')
    setTempToken('')
    setTotpCode('')
    setStepDeadline(0)
    setNow(Date.now())
    if (showMessage) {
      message.warning('二次验证已超时，请重新输入账号密码')
    }
  }, [])

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

  const handleLogin = useCallback(
    async (values: LoginPayload) => {
      setLoading(true)
      try {
        const result = await signIn({
          ...values,
          captchaId: captcha?.captchaId,
        })
        if (result.requires2fa) {
          const deadline = Date.now() + 5 * 60 * 1000
          setTempToken(result.tempToken)
          setLoginStep('totp')
          setStepDeadline(deadline)
          setNow(Date.now())
          saveTotpSession(result.tempToken, deadline, values.loginName)
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
        const msg = err instanceof Error ? err.message : '登录失败'
        message.error(msg)
        void loadCaptcha()
      } finally {
        setLoading(false)
      }
    },
    [captcha?.captchaId, loadCaptcha, navigate, signIn],
  )

  const handleTotpVerify = useCallback(async () => {
    if (!/^\d{6}$/.test(totpCode.trim())) {
      message.error('请输入6位验证码')
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
        remember: form.getFieldValue('remember') !== false,
      })
      clearTotpSession()
      message.success('登录成功')
      await navigate({ to: buildPostLoginTarget(result.user) as '/' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '二次验证失败'
      message.error(msg)
    } finally {
      setTotpLoading(false)
    }
  }, [
    form,
    navigate,
    reset2faStep,
    stepDeadline,
    tempToken,
    totpCode,
    verify2fa,
  ])

  const handleBackToPassword = useCallback(() => {
    reset2faStep(false)
  }, [reset2faStep])

  const isExpired = stepDeadline > 0 && now >= stepDeadline
  const activeLoginName =
    String(
      form.getFieldValue('loginName') || savedSession?.loginName || '',
    ).trim() || '当前账户'
  const countdownText = useMemo(() => {
    if (!stepDeadline || isExpired) {
      return '00:00'
    }
    const remainingSeconds = Math.max(Math.ceil((stepDeadline - now) / 1000), 0)
    const minutes = Math.floor(remainingSeconds / 60)
    const seconds = remainingSeconds % 60
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }, [isExpired, now, stepDeadline])
  const captchaImageSrc = useMemo(
    () => toDataImageUrl(captcha?.captchaImage),
    [captcha?.captchaImage],
  )
  const shouldShowCaptcha = Boolean(
    captcha && (captcha.required || captchaImageSrc || captcha.captchaId),
  )

  return (
    <AuthPageShell
      eyebrow="Ant Design Workspace"
      title={appTitle}
      subtitle="本地自托管 ERP 工作区"
      description="统一采购、销售、库存、财务的一体化业务入口，整体界面切换到 Ant Design 组件体系，保持交互一致并减少自定义样式依赖。"
      leftAside={
        <Row gutter={[16, 16]}>
          {loginHeroStats.map((item) => (
            <Col xs={24} sm={8} key={item.label}>
              <Card size="small">
                <Statistic title={item.label} value={item.value} />
              </Card>
            </Col>
          ))}
        </Row>
      }
    >
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <Space orientation="vertical" size={4}>
          <Tag color="blue" variant="filled" style={{ width: 'fit-content' }}>
            {loginStep === 'password' ? 'Secure Login' : 'Two-Factor Check'}
          </Tag>
          <Typography.Title level={3} style={{ margin: 0 }}>
            {loginStep === 'password' ? '账号登录' : '二次验证'}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {loginStep === 'password'
              ? '输入账号密码后进入系统；如账户启用了二次验证，将自动进入下一步校验。'
              : `请输入 ${activeLoginName} 的 Authenticator 动态验证码完成登录。`}
          </Typography.Paragraph>
        </Space>

        {loginStep === 'password' ? (
          <>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <Card size="small">
                  <Space>
                    <UserOutlined />
                    <Typography.Text>账号密码验证</Typography.Text>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card size="small">
                  <Space>
                    <QrcodeOutlined />
                    <Typography.Text>按需触发 2FA</Typography.Text>
                  </Space>
                </Card>
              </Col>
            </Row>

            <Form
              form={form}
              onFinish={handleLogin}
              initialValues={{
                loginName: savedSession?.loginName || '',
                remember: true,
              }}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="loginName"
                label="登录名"
                rules={[{ required: true, message: '请输入用户名' }]}
                style={{ marginBottom: 16 }}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入用户名"
                  autoComplete="username"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="登录密码"
                rules={[{ required: true, message: '请输入密码' }]}
                style={{ marginBottom: 16 }}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入密码"
                  autoComplete="current-password"
                />
              </Form.Item>

              {shouldShowCaptcha && (
                <Row gutter={12} align="bottom">
                  <Col flex="auto">
                    <Form.Item
                      name="captchaCode"
                      label="图形验证码"
                      rules={[{ required: true, message: '请输入验证码' }]}
                      style={{ marginBottom: 16 }}
                    >
                      <Input
                        prefix={<SafetyCertificateOutlined />}
                        placeholder="请输入验证码"
                      />
                    </Form.Item>
                  </Col>
                  <Col>
                    <Button
                      style={{ height: 52, width: 140 }}
                      onClick={() => void loadCaptcha()}
                    >
                      {captchaImageSrc ? (
                        <img
                          src={captchaImageSrc}
                          alt="验证码"
                          style={{ display: 'block', width: '100%', height: 36, objectFit: 'contain' }}
                        />
                      ) : (
                        '刷新验证码'
                      )}
                    </Button>
                  </Col>
                </Row>
              )}

              <Form.Item
                name="remember"
                valuePropName="checked"
                style={{ marginBottom: 16 }}
              >
                <Checkbox>记住登录状态</Checkbox>
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                  icon={<CheckCircleOutlined />}
                  style={{ height: 46, fontWeight: 600 }}
                >
                  登录系统
                </Button>
              </Form.Item>
            </Form>
          </>
        ) : (
          <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
            <Card size="small">
              <Space
                align="center"
                style={{ width: '100%', justifyContent: 'space-between' }}
              >
                <Statistic title="验证剩余时间" value={countdownText} />
                <ClockCircleOutlined style={{ fontSize: 20, color: '#1677ff' }} />
              </Space>
            </Card>

            <Alert
              type={isExpired ? 'error' : 'info'}
              showIcon
              message={
                isExpired
                  ? '验证会话已过期，请返回密码登录重新发起认证。'
                  : '请打开 Authenticator 并输入当前 6 位动态码。'
              }
            />

            <Space orientation="vertical" size="small" style={{ width: '100%' }}>
              <Typography.Text strong>TOTP 验证码</Typography.Text>
              <Input
                size="large"
                prefix={<SafetyCertificateOutlined />}
                placeholder="请输入 6 位验证码"
                maxLength={6}
                value={totpCode}
                onChange={(event) => setTotpCode(event.target.value)}
                onPressEnter={handleTotpVerify}
                autoFocus
                inputMode="numeric"
                autoComplete="one-time-code"
              />
            </Space>

            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <Button
                  type="primary"
                  loading={totpLoading}
                  onClick={handleTotpVerify}
                  disabled={isExpired}
                  size="large"
                  icon={<CheckCircleOutlined />}
                  block
                  style={{ height: 46, fontWeight: 600 }}
                >
                  验证并登录
                </Button>
              </Col>
              <Col xs={24} sm={12}>
                <Button
                  onClick={handleBackToPassword}
                  size="large"
                  icon={<ArrowLeftOutlined />}
                  block
                  style={{ height: 46, fontWeight: 600 }}
                >
                  返回密码登录
                </Button>
              </Col>
            </Row>
          </Space>
        )}

        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          首次登录如被要求绑定 2FA，系统会在验证通过后自动跳转到安全设置页面。
        </Typography.Paragraph>
      </Space>
    </AuthPageShell>
  )
}
