import { ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import Alert from 'antd/es/alert'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Col from 'antd/es/col'
import Flex from 'antd/es/flex'
import Form from 'antd/es/form'
import type { FormInstance } from 'antd/es/form'
import Image from 'antd/es/image'
import Input from 'antd/es/input'
import Row from 'antd/es/row'
import Space from 'antd/es/space'
import Spin from 'antd/es/spin'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { toDataImageUrl } from '@/utils/data-url'
import { setupTwoFactorSteps } from '@/views/auth/setup-two-factor-constants'

type Props = {
  currentUserName: string
  form: FormInstance<{ totpCode: string }>
  loading: boolean
  enabling: boolean
  totpData: { qrCodeBase64: string; secret: string } | null
  onRefresh: () => void
  onEnable: (values: { totpCode: string }) => void
}

export function SetupTwoFactorContent({
  currentUserName,
  form,
  loading,
  enabling,
  totpData,
  onRefresh,
  onEnable,
}: Props) {
  return (
    <Spin spinning={loading}>
      <Space orientation="vertical" size="large" className="w-full">
        <Space orientation="vertical" size={4}>
          <Tag color="blue" variant="filled" style={{ width: 'fit-content' }}>
            TOTP Setup
          </Tag>
          <Typography.Title level={3} style={{ margin: 0 }}>
            设置二次验证
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {currentUserName}，请按下面步骤完成 Authenticator
            绑定并启用动态验证码登录。
          </Typography.Paragraph>
        </Space>

        {totpData ? (
          <>
            <Row gutter={[16, 16]}>
              <Col xs={24} md={10}>
                <Card size="small">
                  <Space
                    orientation="vertical"
                    size="middle"
                    align="center"
                    className="w-full"
                  >
                    <Image
                      preview={false}
                      src={toDataImageUrl(totpData.qrCodeBase64)}
                      alt="TOTP QR Code"
                      width={224}
                    />
                    <Button
                      icon={<ReloadOutlined />}
                      onClick={onRefresh}
                      loading={loading}
                    >
                      重新生成二维码
                    </Button>
                  </Space>
                </Card>
              </Col>
              <Col xs={24} md={14}>
                <Flex vertical gap={12}>
                  {setupTwoFactorSteps.map((item) => (
                    <Card key={item.key} size="small">
                      <Space align="start">
                        {item.icon}
                        <Space orientation="vertical" size={2}>
                          <Typography.Text strong>{item.title}</Typography.Text>
                          <Typography.Text type="secondary">
                            {item.description}
                          </Typography.Text>
                        </Space>
                      </Space>
                    </Card>
                  ))}
                </Flex>
              </Col>
            </Row>

            <Card size="small">
              <Space
                align="center"
                style={{ width: '100%', justifyContent: 'space-between' }}
              >
                <Typography.Text type="secondary">绑定密钥</Typography.Text>
                <Typography.Text copyable={{ text: totpData.secret }} strong>
                  {totpData.secret}
                </Typography.Text>
              </Space>
            </Card>

            <Alert
              type="info"
              showIcon
              icon={<SafetyCertificateOutlined />}
              title="建议先保存密钥，再提交验证码。更换手机时可用该密钥重新恢复账户。"
            />

            <Form
              form={form}
              onFinish={onEnable}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="totpCode"
                label="动态验证码"
                rules={[
                  {
                    required: true,
                    pattern: /^\d{6}$/,
                    message: '请输入6位验证码',
                  },
                ]}
                className="mb-4"
              >
                <Input
                  prefix={<SafetyCertificateOutlined />}
                  placeholder="请输入 6 位 TOTP 验证码"
                  maxLength={6}
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={enabling}
                  block
                  size="large"
                  style={{ height: 46, fontWeight: 600 }}
                >
                  验证并启用
                </Button>
              </Form.Item>
            </Form>
          </>
        ) : (
          <Space orientation="vertical" size="middle">
            <Alert
              type="warning"
              showIcon
              title="二维码生成失败，请重新获取后再继续绑定。"
            />
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              重新获取二维码
            </Button>
          </Space>
        )}
      </Space>
    </Spin>
  )
}
