import {
  LockOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Button, Form, Image, Input, Space, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { InitialSetupTotpResult } from '@/types/setup'
import { toDataImageUrl } from '@/utils/data-url'

interface Props {
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
  const { t } = useTranslation()

  return (
    <>
      <Form.Item
        name="adminLoginName"
        label={t('auth.initialsetup.admin.loginNameLabel')}
        rules={[
          {
            required: true,
            message: t('auth.initialsetup.admin.loginNameRequired'),
          },
        ]}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder={t('auth.initialsetup.admin.loginNamePlaceholder')}
          autoFocus
        />
      </Form.Item>
      <Form.Item
        name="adminPassword"
        label={t('auth.initialsetup.admin.passwordLabel')}
        rules={[
          {
            required: true,
            min: 8,
            message: t('auth.initialsetup.admin.passwordRequired'),
          },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t('auth.initialsetup.admin.passwordPlaceholder')}
        />
      </Form.Item>
      <Form.Item
        name="adminConfirmPassword"
        label={t('auth.initialsetup.admin.confirmPasswordLabel')}
        rules={[
          {
            required: true,
            message: t('auth.initialsetup.admin.confirmPasswordRequired'),
          },
        ]}
      >
        <Input.Password
          prefix={<LockOutlined />}
          placeholder={t('auth.initialsetup.admin.confirmPasswordPlaceholder')}
        />
      </Form.Item>
      <Form.Item
        name="adminUserName"
        label={t('auth.initialsetup.admin.userNameLabel')}
      >
        <Input
          prefix={<UserOutlined />}
          placeholder={t('auth.initialsetup.admin.userNamePlaceholder')}
        />
      </Form.Item>
      <div className="mb-4">
        <Button
          icon={<SafetyCertificateOutlined />}
          loading={loadingTotp}
          onClick={onGenerateTotp}
          block
        >
          {totpSetup
            ? t('auth.initialsetup.admin.regenerateTotp')
            : t('auth.initialsetup.admin.generateTotp')}
        </Button>
      </div>
      {totpSetup && (
        <Space
          orientation="vertical"
          size="small"
          align="center"
          className="mb-4 w-full"
        >
          <Image
            preview={false}
            src={toDataImageUrl(totpSetup.qrCodeBase64)}
            alt="TOTP QR Code"
            width={160}
          />
          <Typography.Text copyable={{ text: totpSetup.secret }}>
            {t('auth.initialsetup.admin.secretLabel')}: {totpSetup.secret}
          </Typography.Text>
        </Space>
      )}
      <Form.Item
        name="totpCode"
        label={t('auth.initialsetup.admin.totpCodeLabel')}
        rules={[
          {
            required: true,
            pattern: /^\d{6}$/,
            message: t('auth.initialsetup.admin.totpCodeRequired'),
          },
        ]}
      >
        <Input
          placeholder={t('auth.initialsetup.admin.totpCodePlaceholder')}
          maxLength={6}
        />
      </Form.Item>
      <Button
        type="primary"
        loading={loadingAdmin}
        onClick={onSubmitAdmin}
        block
        size="large"
      >
        {t('auth.initialsetup.admin.submit')}
      </Button>
    </>
  )
}
