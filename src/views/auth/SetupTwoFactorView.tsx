import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Image,
  Input,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import {
  CheckCircleOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  ScanOutlined,
} from '@ant-design/icons'
import { appTitle } from '@/utils/env'
import { useAuthStore } from '@/stores/authStore'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'
import { message } from '@/utils/antd-app'
import { setStoredUser } from '@/utils/storage'
import { toDataImageUrl } from '@/utils/data-url'
import { AuthPageShell } from './AuthPageShell'

interface TotpSetupData {
  qrCodeBase64: string
  secret: string
}

const setupSecurityHighlights = [
  {
    title: '扫码绑定',
    description:
      '使用 Microsoft Authenticator、Google Authenticator 或兼容应用扫描二维码。',
  },
  {
    title: '密钥备份',
    description: '二维码无法识别时，可直接录入密钥完成绑定。',
  },
  {
    title: '绑定即生效',
    description: '提交 6 位动态码后，当前账户会立即启用强制二次验证。',
  },
]

export function SetupTwoFactorView() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [totpData, setTotpData] = useState<TotpSetupData | null>(null)
  const [form] = Form.useForm()

  const resolveRedirectTarget = useCallback(() => {
    if (typeof window === 'undefined') {
      return '/dashboard'
    }

    const redirect =
      new URLSearchParams(window.location.search).get('redirect') ||
      '/dashboard'
    if (!redirect.startsWith('/') || /^https?:\/\//i.test(redirect)) {
      return '/dashboard'
    }
    return redirect
  }, [])

  const syncCurrentUserSecurity = useCallback(() => {
    useAuthStore.setState((state) => {
      if (!state.user) {
        return state
      }

      const nextUser = {
        ...state.user,
        totpEnabled: true,
        forceTotpSetup: false,
      }
      setStoredUser(nextUser)
      return { ...state, user: nextUser }
    })
  }, [])

  const fetchTotpSetup = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.post<ApiResponse<TotpSetupData>>(
        ENDPOINTS.ACCOUNT_2FA_SETUP,
        {},
      )
      setTotpData(res.data)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '获取2FA设置失败')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTotpSetup()
  }, [fetchTotpSetup])

  const handleEnable = async (values: { totpCode: string }) => {
    try {
      setEnabling(true)
      await http.post(ENDPOINTS.ACCOUNT_2FA_ENABLE, {
        totpCode: values.totpCode,
      })
      syncCurrentUserSecurity()
      message.success('二次验证已启用')
      setTimeout(() => {
        navigate({ to: resolveRedirectTarget() as '/' })
      }, 300)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '启用2FA失败')
    } finally {
      setEnabling(false)
    }
  }

  const currentUserName = user?.userName || user?.loginName || '当前账户'

  return (
    <AuthPageShell
      eyebrow="Account Security"
      title={appTitle}
      subtitle="为账户启用二次验证"
      description="当前账户登录后仍需补齐安全绑定。认证入口统一改成 Ant Design 组件结构，用更标准的卡片、列表和表单完成 2FA 接入。"
      rightSpan={11}
      leftAside={
        <Flex vertical gap={12}>
          {setupSecurityHighlights.map((item, index) => (
            <Card key={item.title} size="small">
              <Space align="start">
                <Tag color="blue" variant="filled">
                  {index + 1}
                </Tag>
                <Space orientation="vertical" size={2}>
                  <Typography.Text strong>{item.title}</Typography.Text>
                  <Typography.Text type="secondary">
                    {item.description}
                  </Typography.Text>
                </Space>
              </Space>
            </Card>
          ))}
        </Flex>
      }
    >
      <Spin spinning={loading}>
        <Space orientation="vertical" size="large" style={{ width: '100%' }}>
          <Space orientation="vertical" size={4}>
            <Tag color="blue" variant="filled" style={{ width: 'fit-content' }}>
              TOTP Setup
            </Tag>
            <Typography.Title level={3} style={{ margin: 0 }}>
              设置二次验证
            </Typography.Title>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              {currentUserName}，请按下面步骤完成 Authenticator 绑定并启用动态验证码登录。
            </Typography.Paragraph>
          </Space>

          {totpData ? (
            <>
              <Row gutter={[16, 16]}>
                <Col xs={24} md={10}>
                  <Card size="small">
                    <Space
                      orientation="vertical"
                      size="middle"
                      align="center"
                      style={{ width: '100%' }}
                    >
                      <Image
                        preview={false}
                        src={toDataImageUrl(totpData.qrCodeBase64)}
                        alt="TOTP QR Code"
                        width={224}
                      />
                      <Button
                        icon={<ReloadOutlined />}
                        onClick={() => void fetchTotpSetup()}
                        loading={loading}
                      >
                        重新生成二维码
                      </Button>
                    </Space>
                  </Card>
                </Col>
                <Col xs={24} md={14}>
                  <Flex vertical gap={12}>
                    {[
                      {
                        key: 'scan',
                        icon: <ScanOutlined />,
                        title: '步骤 1',
                        description: '打开手机上的 Authenticator 应用，扫描左侧二维码。',
                      },
                      {
                        key: 'secret',
                        icon: <LockOutlined />,
                        title: '步骤 2',
                        description: '如果无法扫码，可使用下方密钥手动添加账户并生成验证码。',
                      },
                      {
                        key: 'verify',
                        icon: <CheckCircleOutlined />,
                        title: '步骤 3',
                        description: '输入当前 6 位动态码，验证成功后本账户立即启用 2FA。',
                      },
                    ].map((item) => (
                      <Card key={item.key} size="small">
                        <Space align="start">
                          {item.icon}
                          <Space orientation="vertical" size={2}>
                            <Typography.Text strong>{item.title}</Typography.Text>
                            <Typography.Text type="secondary">
                              {item.description}
                            </Typography.Text>
                          </Space>
                        </Space>
                      </Card>
                    ))}
                  </Flex>
                </Col>
              </Row>

              <Card size="small">
                <Space
                  align="center"
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Typography.Text type="secondary">绑定密钥</Typography.Text>
                  <Typography.Text copyable={{ text: totpData.secret }} strong>
                    {totpData.secret}
                  </Typography.Text>
                </Space>
              </Card>

              <Alert
                type="info"
                showIcon
                icon={<SafetyCertificateOutlined />}
                message="建议先保存密钥，再提交验证码。更换手机时可用该密钥重新恢复账户。"
              />

              <Form
                form={form}
                onFinish={handleEnable}
                layout="vertical"
                size="large"
              >
                <Form.Item
                  name="totpCode"
                  label="动态验证码"
                  rules={[
                    {
                      required: true,
                      pattern: /^\d{6}$/,
                      message: '请输入6位验证码',
                    },
                  ]}
                  style={{ marginBottom: 16 }}
                >
                  <Input
                    prefix={<SafetyCertificateOutlined />}
                    placeholder="请输入 6 位 TOTP 验证码"
                    maxLength={6}
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                </Form.Item>

                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={enabling}
                    block
                    size="large"
                    icon={<CheckCircleOutlined />}
                    style={{ height: 46, fontWeight: 600 }}
                  >
                    验证并启用
                  </Button>
                </Form.Item>
              </Form>
            </>
          ) : (
            <Space orientation="vertical" size="middle">
              <Alert
                type="warning"
                showIcon
                message="二维码生成失败，请重新获取后再继续绑定。"
              />
              <Button icon={<ReloadOutlined />} onClick={() => void fetchTotpSetup()}>
                重新获取二维码
              </Button>
            </Space>
          )}
        </Space>
      </Spin>
    </AuthPageShell>
  )
}
