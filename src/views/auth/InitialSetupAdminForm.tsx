import {
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Form from 'antd/es/form'
import Image from 'antd/es/image'
import Input from 'antd/es/input'
import Space from 'antd/es/space'
import Typography from 'antd/es/typography'
import type { InitialSetupTotpResult } from '@/types/setup'
import { toDataImageUrl } from '@/utils/data-url'

type Props = {
  totpSetup: InitialSetupTotpResult | null
  loadingTotp: boolean
  loadingAdmin: boolean
  onGenerateTotp: () => void
  onSubmitAdmin: () => void
}

export function InitialSetupAdminForm({
  totpSetup,
  loadingTotp,
  loadingAdmin,
  onGenerateTotp,
  onSubmitAdmin,
}: Props) {
  return (
    <>
      <Form.Item
        name="adminLoginName"
        label="管理员登录名"
        rules={[{ required: true, message: '请输入登录名' }]}
      >
        <Input prefix={<UserOutlined />} placeholder="管理员登录名" autoFocus />
      </Form.Item>
      <Form.Item
        name="adminPassword"
        label="密码"
        rules={[{ required: true, min: 6, message: '密码至少6位' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="至少6位" />
      </Form.Item>
      <Form.Item
        name="adminConfirmPassword"
        label="确认密码"
        rules={[{ required: true, message: '请确认密码' }]}
      >
        <Input.Password prefix={<LockOutlined />} placeholder="再次输入密码" />
      </Form.Item>
      <Form.Item name="adminUserName" label="管理员姓名">
        <Input prefix={<UserOutlined />} placeholder="系统管理员" />
      </Form.Item>
      <div className="mb-4">
        <Button
          icon={<SafetyCertificateOutlined />}
          loading={loadingTotp}
          onClick={onGenerateTotp}
          block
        >
          {totpSetup ? '重新生成 TOTP 密钥' : '生成 TOTP 密钥'}
        </Button>
      </div>
      {totpSetup && (
        <Space
          orientation="vertical"
          size="small"
          align="center"
          style={{ width: '100%', marginBottom: 16 }}
        >
          <Image
            preview={false}
            src={toDataImageUrl(totpSetup.qrCodeBase64)}
            alt="TOTP QR Code"
            width={160}
          />
          <Typography.Text copyable={{ text: totpSetup.secret }}>
            密钥: {totpSetup.secret}
          </Typography.Text>
        </Space>
      )}
      <Form.Item
        name="totpCode"
        label="TOTP验证码"
        rules={[
          {
            required: true,
            pattern: /^\d{6}$/,
            message: '请输入6位验证码',
          },
        ]}
      >
        <Input placeholder="6位TOTP验证码" maxLength={6} />
      </Form.Item>
      <Button
        type="primary"
        loading={loadingAdmin}
        onClick={onSubmitAdmin}
        block
        size="large"
      >
        创建管理员并继续
      </Button>
    </>
  )
}
