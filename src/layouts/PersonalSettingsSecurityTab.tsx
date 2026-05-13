import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Descriptions from 'antd/es/descriptions'
import Divider from 'antd/es/divider'
import Flex from 'antd/es/flex'
import Form from 'antd/es/form'
import type { FormInstance } from 'antd'
import Image from 'antd/es/image'
import Input from 'antd/es/input'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import type { LoginUser } from '@/types/auth'
import { toDataImageUrl } from '@/utils/data-url'
import { buildFormControlId } from '@/utils/form-control-id'

interface PasswordFormValues {
  oldPassword: string
  newPassword: string
}

type Props = {
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
  const totpInputId = buildFormControlId('personal-settings', 'totp-code')

  return (
    <Flex vertical gap={16}>
      <Alert
        showIcon
        type="info"
        title={`当前账号：${user?.userName || user?.loginName || '--'}（${user?.loginName || '--'}）`}
        description={
          user?.totpEnabled
            ? '已启用 2FA，高风险操作会要求二次验证。'
            : '未启用 2FA，建议立即绑定认证器。'
        }
      />

      <Descriptions bordered column={1} size="small">
        <Descriptions.Item label="登录账号">
          <Typography.Text strong>{user?.loginName || '--'}</Typography.Text>
        </Descriptions.Item>
        <Descriptions.Item label="当前状态">
          {user?.totpEnabled ? (
            <Tag color="green">已启用</Tag>
          ) : (
            <Tag>未启用</Tag>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="两步验证">
          {user?.totpEnabled ? (
            <Typography.Text type="secondary">
              当前账号已启用两步验证。
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
                  aria-label="输入 6 位验证码启用两步验证"
                  size="small"
                  placeholder="输入 6 位验证码"
                  maxLength={6}
                  value={totpCode}
                  onChange={(event) => onSetTotpCode(event.target.value)}
                  style={{ width: 132 }}
                />
                <Button
                  size="small"
                  type="primary"
                  loading={totpEnabling}
                  onClick={onEnableTotp}
                >
                  验证启用
                </Button>
              </Flex>
            </Flex>
          ) : (
            <Button size="small" loading={totpLoading} onClick={onSetupTotp}>
              生成绑定二维码
            </Button>
          )}
        </Descriptions.Item>
      </Descriptions>

      <Divider />

      <Form form={pwForm} onFinish={onChangePassword} layout="vertical">
        <Form.Item
          name="oldPassword"
          label="当前密码"
          rules={[{ required: true, message: '请输入当前密码' }]}
        >
          <Input.Password />
        </Form.Item>
        <Form.Item
          name="newPassword"
          label="新密码"
          rules={[{ required: true, min: 6, message: '至少 6 位' }]}
        >
          <Input.Password />
        </Form.Item>
        <Flex justify="space-between" align="center" gap={12} wrap="wrap">
          <Typography.Text type="secondary">
            修改密码后，下次登录将使用新密码。
          </Typography.Text>
          <Button type="primary" htmlType="submit" loading={pwSaving}>
            更新密码
          </Button>
        </Flex>
      </Form>
    </Flex>
  )
}
