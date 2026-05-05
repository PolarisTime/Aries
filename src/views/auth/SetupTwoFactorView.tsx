import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Card, Form, Input, Button, message, QRCode } from 'antd'
import { SafetyCertificateOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/authStore'
import { http } from '@/api/client'
import { ENDPOINTS } from '@/constants/endpoints'
import type { ApiResponse } from '@/types/api'

interface TotpSetupData {
  qrCodeBase64: string
  secret: string
}

export function SetupTwoFactorView() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)
  const [enabling, setEnabling] = useState(false)
  const [totpData, setTotpData] = useState<TotpSetupData | null>(null)
  const [form] = Form.useForm()

  const fetchTotpSetup = useCallback(async () => {
    setLoading(true)
    try {
      const res = await http.post<ApiResponse<TotpSetupData>>(`${ENDPOINTS.ACCOUNT_2FA_SETUP}`, {})
      setTotpData(res.data)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '获取2FA设置失败')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchTotpSetup() }, [fetchTotpSetup])

  const handleEnable = async () => {
    try {
      const values = await form.validateFields()
      setEnabling(true)
      await http.post(ENDPOINTS.ACCOUNT_2FA_ENABLE, { totpCode: values.totpCode })
      message.success('二次验证已启用，将跳转到工作台')
      setTimeout(() => navigate({ to: '/dashboard' as '/' }), 1000)
    } catch (err) {
      message.error(err instanceof Error ? err.message : '启用2FA失败')
    } finally { setEnabling(false) }
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="w-[min(100%,480px)]" loading={loading}>
        <div className="text-center mb-6">
          <SafetyCertificateOutlined className="text-4xl text-[var(--theme-primary)]" />
          <h2 className="text-xl font-medium mt-3">设置二次验证</h2>
          <p className="text-gray-500 mt-2">
            {user?.userName || user?.loginName}，请使用 Authenticator App 扫描以下二维码完成 TOTP 设置
          </p>
        </div>

        {totpData && (
          <>
            <div className="text-center mb-4">
              <QRCode value={totpData.qrCodeBase64} size={200} className="mx-auto" />
              <p className="text-xs text-gray-500 mt-3 break-all">
                密钥: <code>{totpData.secret}</code>
              </p>
            </div>
            <Form form={form} onFinish={handleEnable}>
              <Form.Item name="totpCode" rules={[{ required: true, pattern: /^\d{6}$/, message: '请输入6位验证码' }]}>
                <Input
                  prefix={<SafetyCertificateOutlined />}
                  placeholder="请输入6位TOTP验证码"
                  maxLength={6}
                  size="large"
                  autoFocus
                />
              </Form.Item>
              <Button type="primary" htmlType="submit" loading={enabling} block size="large" icon={<CheckCircleOutlined />}>
                验证并启用
              </Button>
            </Form>
          </>
        )}
      </Card>
    </div>
  )
}
