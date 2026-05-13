import {
  ArrowLeftOutlined,
  ClockCircleOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Input from 'antd/es/input'
import Space from 'antd/es/space'
import { buildFormControlId } from '@/utils/form-control-id'

type Props = {
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
  const totpInputId = buildFormControlId('login-totp', 'code')

  return (
    <div>
      <div className="login-step-tag is-totp">
        <SafetyCertificateOutlined />
        二次验证
      </div>
      <h2 className="login-form-title">验证身份</h2>
      <p className="login-form-desc">
        请输入 {activeLoginName} 的 Authenticator 动态验证码完成登录。
      </p>

      <div className="login-totp-timer">
        <div
          className={`login-totp-timer-ring${isExpiring ? ' is-expiring' : ''}`}
        >
          {countdownText}
        </div>
        <ClockCircleOutlined
          style={{
            fontSize: 20,
            color: isExpiring ? '#ef4444' : '#64748b',
          }}
        />
      </div>

      {isExpired && (
        <Alert
          type="error"
          showIcon
          title="验证会话已过期，请返回密码登录重新发起认证。"
          style={{ marginBottom: 20 }}
        />
      )}

      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Input
          id={totpInputId}
          name="login-totp-code"
          aria-label="输入 6 位动态验证码"
          size="large"
          prefix={<SafetyCertificateOutlined />}
          placeholder="请输入 6 位验证码"
          maxLength={6}
          value={totpCode}
          onChange={(event) => onTotpCodeChange(event.target.value)}
          onPressEnter={onVerify}
          autoFocus
          inputMode="numeric"
          autoComplete="one-time-code"
          style={{ textAlign: 'center', letterSpacing: 4, fontSize: 18 }}
        />

        <Button
          type="primary"
          loading={totpLoading}
          onClick={onVerify}
          disabled={isExpired || totpCode.length < 6}
          block
          className="login-submit-btn"
        >
          验证并登录
        </Button>

        <Button
          onClick={onBackToPassword}
          block
          icon={<ArrowLeftOutlined />}
          style={{ height: 48, fontWeight: 500, borderRadius: 10 }}
        >
          返回密码登录
        </Button>
      </Space>
    </div>
  )
}
