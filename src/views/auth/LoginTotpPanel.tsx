import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { Alert, Button, Input, Space } from 'antd'
import { useTranslation } from 'react-i18next'
import { buildFormControlId } from '@/utils/form-control-id'

interface Props {
  countdownText: string
  isExpired: boolean
  isExpiring: boolean
  onBackToPassword: () => void
  onTotpCodeChange: (value: string) => void
  onVerify: () => void
  totpCode: string
  totpLoading: boolean
  activeLoginName: string
}

export function LoginTotpPanel({
  countdownText,
  isExpired,
  isExpiring,
  onBackToPassword,
  onTotpCodeChange,
  onVerify,
  totpCode,
  totpLoading,
  activeLoginName,
}: Props) {
  const { t } = useTranslation()
  const totpInputId = buildFormControlId('login-totp', 'code')

  return (
    <div>
      <div className="login-step-tag is-totp">
        <SafetyCertificateOutlined />
        {t('auth.totppanel.step')}
      </div>
      <h2 className="login-form-title">{t('auth.totppanel.title')}</h2>
      <p className="login-form-desc">
        {t('auth.totppanel.description', { loginName: activeLoginName })}
      </p>

      <div className="login-totp-timer">
        <div
          className={`login-totp-timer-ring${isExpiring ? ' is-expiring' : ''}`}
        >
          {countdownText}
        </div>
        <ClockCircleOutlined
          className={
            isExpiring ? 'text-xl text-red-500' : 'text-xl text-slate-500'
          }
        />
      </div>

      {isExpired && (
        <Alert
          type="error"
          showIcon
          title={t('auth.totppanel.expired')}
          className="mb-5"
        />
      )}

      <Space orientation="vertical" size="middle" className="w-full">
        <Input
          id={totpInputId}
          name="login-totp-code"
          aria-label={t('auth.totppanel.inputAria')}
          size="large"
          prefix={<SafetyCertificateOutlined />}
          placeholder={t('auth.totppanel.placeholder')}
          maxLength={6}
          value={totpCode}
          onChange={(event) => onTotpCodeChange(event.target.value)}
          onPressEnter={onVerify}
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          className="text-center text-lg tracking-[4px]"
        />

        <Button
          type="primary"
          loading={totpLoading}
          onClick={onVerify}
          disabled={isExpired || totpCode.length < 6}
          block
          className="login-submit-btn"
        >
          {t('auth.totppanel.submit')}
        </Button>

        <Button
          onClick={onBackToPassword}
          block
          icon={<ArrowLeftOutlined />}
          className="h-12 rounded-[10px] font-medium"
        >
          {t('auth.totppanel.back')}
        </Button>
      </Space>
    </div>
  )
}
