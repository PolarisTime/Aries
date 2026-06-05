import Button from 'antd/es/button'
import Form from 'antd/es/form'
import Image from 'antd/es/image'
import Input from 'antd/es/input'
import Spin from 'antd/es/spin'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'
import { FormModal } from '@/components/FormModal'
import type { TotpSetupResponse } from '@/types/auth'
import type { UserAccountRecord } from '@/types/user-account'
import { toDataImageUrl } from '@/utils/data-url'
import { buildLabeledFormItemProps } from '@/utils/form-control-a11y'
import { buildFormControlId } from '@/utils/form-control-id'

interface Props {
  open: boolean
  loading: boolean
  record: UserAccountRecord | null
  setup: TotpSetupResponse | null
  code: string
  setupLoading: boolean
  enableLoading: boolean
  disableLoading: boolean
  onCodeChange: (value: string) => void
  onGenerate: () => void
  onEnable: () => void
  onDisable: () => void
  onClose: () => void
}

export function UserAccountTwoFactorModal({
  open,
  loading,
  record,
  setup,
  code,
  setupLoading,
  enableLoading,
  disableLoading,
  onCodeChange,
  onGenerate,
  onEnable,
  onDisable,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const setupSecretId = buildFormControlId('user-account-2fa', 'setup-secret')
  const verifyCodeId = buildFormControlId('user-account-2fa', 'verify-code')

  return (
    <FormModal
      title={t('auth.user2fa.title')}
      open={open}
      onClose={onClose}
      footer={null}
      width={720}
    >
      <Spin spinning={loading}>
        {record && (
          <>
            <div className="mb-4">
              <Tag
                color={record.totpEnabled ? 'success' : 'info'}
                className="px-3 py-1"
              >
                {record.totpEnabled
                  ? t('auth.user2fa.enabledTag')
                  : t('auth.user2fa.disabledTag')}
              </Tag>
              <Typography.Text type="secondary" className="ml-2">
                {t('auth.user2fa.userLabel', { loginName: record.loginName })}
              </Typography.Text>
            </div>

            {!record.totpEnabled ? (
              <div>
                <Typography.Title level={5}>
                  {t('auth.user2fa.setupTitle')}
                </Typography.Title>
                <Typography.Paragraph type="secondary">
                  {t('auth.user2fa.setupDescription')}
                </Typography.Paragraph>
                <Button
                  type="primary"
                  loading={setupLoading}
                  onClick={onGenerate}
                >
                  {t('auth.user2fa.generate')}
                </Button>

                {setup && (
                  <div className="mt-4">
                    <div className="mb-4 text-center">
                      <Image
                        preview={false}
                        src={toDataImageUrl(setup.qrCodeBase64)}
                        alt="TOTP QR Code"
                        width={200}
                      />
                    </div>
                    <Form layout="vertical">
                      <Form.Item
                        {...buildLabeledFormItemProps({
                          label: t('auth.user2fa.secretLabel'),
                          htmlFor: setupSecretId,
                        })}
                      >
                        <Input
                          id={setupSecretId}
                          name="two-factor-secret"
                          value={setup.secret}
                          readOnly
                        />
                      </Form.Item>
                      <Form.Item
                        {...buildLabeledFormItemProps({
                          label: t('auth.user2fa.verifyLabel'),
                          htmlFor: verifyCodeId,
                        })}
                      >
                        <Input
                          id={verifyCodeId}
                          name="two-factor-verify-code"
                          maxLength={6}
                          placeholder={t('auth.user2fa.verifyPlaceholder')}
                          value={code}
                          onChange={(event) => onCodeChange(event.target.value)}
                        />
                      </Form.Item>
                      <div className="flex gap-2">
                        <Button onClick={onGenerate}>
                          {t('auth.user2fa.regenerate')}
                        </Button>
                        <Button
                          type="primary"
                          loading={enableLoading}
                          onClick={onEnable}
                        >
                          {t('auth.user2fa.enable')}
                        </Button>
                      </div>
                    </Form>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Typography.Title level={5}>
                  {t('auth.user2fa.statusTitle')}
                </Typography.Title>
                <Typography.Paragraph type="secondary">
                  {t('auth.user2fa.statusDescription')}
                </Typography.Paragraph>
                <Button danger loading={disableLoading} onClick={onDisable}>
                  {t('auth.user2fa.disable')}
                </Button>
              </div>
            )}
          </>
        )}
      </Spin>
    </FormModal>
  )
}
