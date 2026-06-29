import type { FormInstance } from 'antd'
import {
  Alert,
  Button,
  Descriptions,
  Divider,
  Flex,
  Form,
  Image,
  Input,
  Tag,
  Typography,
} from 'antd'
import { useTranslation } from 'react-i18next'
import type { LoginUser } from '@/shared/schemas'
import { toDataImageUrl } from '@/utils/data-url'
import { buildFormControlId } from '@/utils/form-control-id'

interface PasswordFormValues {
  oldPassword: string
  newPassword: string
}

interface Props {
  user: LoginUser | null
  pwForm: FormInstance<PasswordFormValues>
  pwSaving: boolean
  totpLoading: boolean
  totpSetup: { qrCodeBase64: string; secret: string } | null
  totpCode: string
  totpEnabling: boolean
  onChangePassword: (values: PasswordFormValues) => void
  onSetupTotp: () => void
  onSetTotpCode: (value: string) => void
  onEnableTotp: () => void
}

export function PersonalSettingsSecurityTab({
  user,
  pwForm,
  pwSaving,
  totpLoading,
  totpSetup,
  totpCode,
  totpEnabling,
  onChangePassword,
  onSetupTotp,
  onSetTotpCode,
  onEnableTotp,
}: Props) {
  const { t } = useTranslation()
  const totpInputId = buildFormControlId('personal-settings', 'totp-code')
  const displayName = user?.userName || user?.loginName || '--'
  const loginName = user?.loginName || '--'

  return (
    <Flex vertical gap={16}>
      <Alert
        showIcon
        type="info"
        title={t('auth.personalsecurity.accountTitle', {
          displayName,
          loginName,
        })}
        description={
          user?.totpEnabled
            ? t('auth.personalsecurity.enabledDescription')
            : t('auth.personalsecurity.disabledDescription')
        }
      />

      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label={t('auth.personalsecurity.loginName')}>
          <Typography.Text strong>{loginName}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label={t('auth.personalsecurity.currentStatus')}>
          {user?.totpEnabled ? (
            <Tag color="green">{t('auth.personalsecurity.enabled')}</Tag>
          ) : (
            <Tag>{t('auth.personalsecurity.disabled')}</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label={t('auth.personalsecurity.twoFactor')}>
          {user?.totpEnabled ? (
            <Typography.Text type="secondary">
              {t('auth.personalsecurity.alreadyEnabled')}
            </Typography.Text>
          ) : totpSetup ? (
            <Flex vertical gap={12}>
              <Image
                src={toDataImageUrl(totpSetup.qrCodeBase64)}
                alt="TOTP QR"
                width={128}
                height={128}
                preview={false}
                className="two-factor-qr-image"
              />
              <Typography.Text code>{totpSetup.secret}</Typography.Text>
              <Flex align="center" gap={8} wrap="wrap">
                <Input
                  id={totpInputId}
                  name="personal-settings-totp-code"
                  aria-label={t('auth.personalsecurity.codeAria')}
                  size="small"
                  placeholder={t('auth.personalsecurity.codePlaceholder')}
                  maxLength={6}
                  value={totpCode}
                  onChange={(event) => onSetTotpCode(event.target.value)}
                  className="w-[132px]"
                />
                <Button
                  size="small"
                  type="primary"
                  loading={totpEnabling}
                  onClick={onEnableTotp}
                >
                  {t('auth.personalsecurity.enable')}
                </Button>
              </Flex>
            </Flex>
          ) : (
            <Button size="small" loading={totpLoading} onClick={onSetupTotp}>
              {t('auth.personalsecurity.generate')}
            </Button>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <Form form={pwForm} onFinish={onChangePassword} layout="vertical">
        <Form.Item
          name="oldPassword"
          label={t('auth.personalsecurity.currentPassword')}
          rules={[
            {
              required: true,
              message: t('auth.personalsecurity.currentPasswordRequired'),
            },
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label={t('auth.personalsecurity.newPassword')}
          rules={[
            {
              required: true,
              min: 6,
              message: t('auth.personalsecurity.newPasswordRequired'),
            },
          ]}
        >
          <Input.Password />
        </Form.Item>
        <Flex justify="space-between" align="center" gap={12} wrap="wrap">
          <Typography.Text type="secondary">
            {t('auth.personalsecurity.passwordHint')}
          </Typography.Text>
          <Button type="primary" htmlType="submit" loading={pwSaving}>
            {t('auth.personalsecurity.updatePassword')}
          </Button>
        </Flex>
      </Form>
    </Flex>
  )
}
