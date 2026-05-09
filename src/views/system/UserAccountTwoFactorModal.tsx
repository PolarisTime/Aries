import { Button, Form, Input, Modal, QRCode, Spin, Tag, Typography } from 'antd'
import type { TotpSetupResponse } from '@/types/auth'
import type { UserAccountRecord } from '@/types/user-account'

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
  return (
    <Modal
      title="2FA 管理"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      mask={{ closable: false }}
    >
      <Spin spinning={loading}>
        {record && (
          <>
            <div style={{ marginBottom: 16 }}>
              <Tag
                color={record.totpEnabled ? 'success' : 'info'}
                style={{ padding: '4px 12px' }}
              >
                {record.totpEnabled
                  ? '当前已启用二次验证'
                  : '当前未启用二次验证'}
              </Tag>
              <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
                用户：{record.loginName}
              </Typography.Text>
            </div>

            {!record.totpEnabled ? (
              <div>
                <Typography.Title level={5}>
                  步骤 1：生成绑定二维码
                </Typography.Title>
                <Typography.Paragraph type="secondary">
                  支持 Google Authenticator、Microsoft Authenticator 等标准 TOTP
                  应用。
                </Typography.Paragraph>
                <Button
                  type="primary"
                  loading={setupLoading}
                  onClick={onGenerate}
                >
                  生成二维码
                </Button>

                {setup && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <QRCode
                        value={setup.qrCodeBase64 || setup.secret}
                        size={200}
                      />
                    </div>
                    <Form layout="vertical">
                      <Form.Item label="手动绑定密钥">
                        <Input value={setup.secret} readOnly />
                      </Form.Item>
                      <Form.Item label="步骤 2：输入 6 位验证码确认启用">
                        <Input
                          maxLength={6}
                          placeholder="请输入动态验证码"
                          value={code}
                          onChange={(event) => onCodeChange(event.target.value)}
                        />
                      </Form.Item>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <Button onClick={onGenerate}>重新生成</Button>
                        <Button
                          type="primary"
                          loading={enableLoading}
                          onClick={onEnable}
                        >
                          确认启用 2FA
                        </Button>
                      </div>
                    </Form>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Typography.Title level={5}>当前状态</Typography.Title>
                <Typography.Paragraph type="secondary">
                  该用户已启用二次验证，登录时需要在账号密码后继续输入动态验证码。
                </Typography.Paragraph>
                <Button danger loading={disableLoading} onClick={onDisable}>
                  关闭 2FA
                </Button>
              </div>
            )}
          </>
        )}
      </Spin>
    </Modal>
  )
}
