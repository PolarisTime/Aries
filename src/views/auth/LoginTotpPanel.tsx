import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import { Alert, Button, Input, Space } from 'antd'
import type { KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

const InputOtp = Input.OTP

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
  const handleOtpKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      onVerify()
    }
  }

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

      <Space
        orientation="vertical"
        size="middle"
        className="w-full login-totp-actions"
      >
        <InputOtp
          length={6}
          data-testid="login-totp-code"
          aria-label={t('auth.totppanel.inputAria')}
          size="large"
          value={totpCode}
          onInput={(value) => onTotpCodeChange(value.join(''))}
          onKeyDown={handleOtpKeyDown}
          autoFocus
          type="tel"
          autoComplete="one-time-code"
          className="login-totp-otp"
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
          className="login-secondary-btn"
        >
          {t('auth.totppanel.back')}
        </Button>
      </Space>
    </div>
  )
}
