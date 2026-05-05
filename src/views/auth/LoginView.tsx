import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Form, Input, Button, Checkbox, Card, message } from 'antd'
import { UserOutlined, LockOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { fetchCaptcha } from '@/api/auth'
import { appTitle } from '@/utils/env'
import type { LoginPayload, CaptchaData } from '@/types/auth'

const TOTP_SESSION_KEY = 'aries-totp-session'

interface SavedTotpSession {
  token: string
  deadline: number
  loginName: string
}

function saveTotpSession(token: string, deadline: number, loginName: string) {
  sessionStorage.setItem(TOTP_SESSION_KEY, JSON.stringify({ token, deadline, loginName }))
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
  } catch { /* ignore */ }
  sessionStorage.removeItem(TOTP_SESSION_KEY)
  return null
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
  const [loading, setLoading] = useState(false)
  const [totpLoading, setTotpLoading] = useState(false)
  const [captcha, setCaptcha] = useState<CaptchaData | null>(null)
  const [form] = Form.useForm()

  useEffect(() => {
    loadCaptcha()
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

  const handleLogin = useCallback(async (values: LoginPayload) => {
    setLoading(true)
    try {
      const result = await signIn(values)
      if (result.requires2fa) {
        setTempToken(result.tempToken)
        setLoginStep('totp')
        setStepDeadline(Date.now() + 5 * 60 * 1000)
        saveTotpSession(result.tempToken, Date.now() + 5 * 60 * 1000, values.loginName)
        return
      }
      clearTotpSession()
      message.success('登录成功')
      await navigate({ to: '/dashboard' as '/' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '登录失败'
      message.error(msg)
      loadCaptcha()
    } finally {
      setLoading(false)
    }
  }, [signIn, navigate, loadCaptcha])

  const handleTotpVerify = useCallback(async () => {
    if (!totpCode || totpCode.length !== 6) {
      message.error('请输入6位验证码')
      return
    }
    setTotpLoading(true)
    try {
      await verify2fa({ tempToken, totpCode })
      clearTotpSession()
      message.success('登录成功')
      await navigate({ to: '/dashboard' as '/' })
    } catch (err) {
      const msg = err instanceof Error ? err.message : '二次验证失败'
      message.error(msg)
    } finally {
      setTotpLoading(false)
    }
  }, [totpCode, tempToken, verify2fa, navigate])

  const handleBackToPassword = useCallback(() => {
    setLoginStep('password')
    setTotpCode('')
    clearTotpSession()
  }, [])

  const isExpired = stepDeadline > 0 && Date.now() > stepDeadline

  return (
    <div className="flex items-center justify-center min-h-screen p-6 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.18),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.14),transparent_24%),linear-gradient(135deg,#eef4fb_0%,#f8fafc_55%,#e8eff8_100%)]">
      <div className="grid grid-cols-[1fr_420px] gap-10 w-[min(1100px,100%)] items-center max-[960px]:grid-cols-1">
        {/* Brand slogan */}
        <div className="max-[960px]:text-center">
          <h1 className="m-0 text-[#0f172a] text-[calc(var(--app-font-size)+30px)] font-semibold">
            {appTitle}
          </h1>
          <p className="mt-2.5 text-[calc(var(--app-font-size)+6px)] text-[#475569] font-normal">
            本地自托管 ERP 工作区
          </p>
          <p className="max-w-[520px] mt-4 text-[calc(var(--app-font-size)+2px)] text-[#64748b] leading-relaxed">
            钢材贸易业务中台 — 采购、销售、库存、财务一站式管理
          </p>
          <p className="mt-6 text-[calc(var(--app-font-size)+1px)] text-[#94a3b8] tracking-widest">
            LEO ERP v2.0
          </p>
        </div>

        {/* Login card */}
        <Card className="border-[#dbe3ee]">
          <div className="flex items-center justify-center flex-col min-h-[520px] max-[960px]:min-h-auto">
            <div className="mb-5 text-center">
              <h2 className="m-0 text-[#262626] text-[calc(var(--app-font-size)+12px)] font-medium">
                {loginStep === 'password' ? '账号登录' : '二次验证'}
              </h2>
              <p className="mt-2 text-[#999]">
                {loginStep === 'password'
                  ? '请使用您的账号密码登录系统'
                  : '请输入您的TOTP验证码'}
              </p>
            </div>

            {loginStep === 'password' ? (
              <Form
                form={form}
                onFinish={handleLogin}
                initialValues={{ remember: true }}
                layout="vertical"
                className="w-full max-w-[360px]"
                size="large"
              >
                <Form.Item
                  name="loginName"
                  rules={[{ required: true, message: '请输入用户名' }]}
                >
                  <Input
                    prefix={<UserOutlined className="text-gray-400" />}
                    placeholder="用户名"
                    autoComplete="username"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  rules={[{ required: true, message: '请输入密码' }]}
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-gray-400" />}
                    placeholder="密码"
                    autoComplete="current-password"
                  />
                </Form.Item>

                {captcha?.required && (
                  <div className="grid grid-cols-[1fr_132px] gap-3">
                    <Form.Item
                      name="captchaCode"
                      rules={[{ required: true, message: '请输入验证码' }]}
                    >
                      <Input
                        prefix={<SafetyCertificateOutlined className="text-gray-400" />}
                        placeholder="验证码"
                      />
                    </Form.Item>
                    <button
                      type="button"
                      className="h-10 p-0 border border-[#d9d9d9] bg-white cursor-pointer overflow-hidden"
                      onClick={loadCaptcha}
                    >
                      {captcha?.captchaImage && (
                        <img
                          src={captcha.captchaImage}
                          alt="验证码"
                          className="block w-full h-full object-cover"
                        />
                      )}
                    </button>
                    <Form.Item name="captchaId" hidden>
                      <Input />
                    </Form.Item>
                  </div>
                )}

                <div className="mb-4">
                  <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>记住登录状态</Checkbox>
                  </Form.Item>
                </div>

                <Form.Item>
                  <Button type="primary" htmlType="submit" loading={loading} block>
                    登 录
                  </Button>
                </Form.Item>
              </Form>
            ) : (
              <div className="w-full max-w-[360px]">
                <div className="mb-4">
                  <Input
                    size="large"
                    prefix={<SafetyCertificateOutlined className="text-gray-400" />}
                    placeholder="6位TOTP验证码"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) => setTotpCode(e.target.value)}
                    onPressEnter={handleTotpVerify}
                    autoFocus
                  />
                </div>
                {isExpired && (
                  <p className="text-red-500 mb-4">验证会话已过期，请重新登录</p>
                )}
                <Button
                  type="primary"
                  loading={totpLoading}
                  onClick={handleTotpVerify}
                  disabled={isExpired}
                  block
                  size="large"
                >
                  验证并登录
                </Button>
                <Button
                  type="link"
                  onClick={handleBackToPassword}
                  block
                  className="mt-2"
                >
                  返回密码登录
                </Button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
