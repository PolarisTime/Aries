import { ReloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Image,
  Input,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import type { FormInstance } from 'antd/es/form'
import { useTranslation } from 'react-i18next'
import { toDataImageUrl } from '@/utils/data-url'
import { buildSetupTwoFactorSteps } from '@/views/auth/setup-two-factor-constants'

interface Props {
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
  const { t } = useTranslation()
  const setupTwoFactorSteps = buildSetupTwoFactorSteps(t)

  return (
    <Spin spinning={loading}>
      <Space orientation="vertical" size="large" className="w-full">
        <Space orientation="vertical" size={4}>
          <Tag color="blue" variant="filled" className="w-fit">
            {t('auth.setup2fa.content.tag')}
          </Tag>
          <Typography.Title level={3} className="m-0">
            {t('auth.setup2fa.content.title')}
          </Typography.Title>
          <Typography.Paragraph type="secondary" className="mb-0">
            {t('auth.setup2fa.content.description', {
              userName: currentUserName,
            })}
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
                      {t('auth.setup2fa.content.regenerate')}
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
              <Space align="center" className="w-full justify-between">
                <Typography.Text type="secondary">
                  {t('auth.setup2fa.content.secretLabel')}
                </Typography.Text>
                <Typography.Text copyable={{ text: totpData.secret }} strong>
                  {totpData.secret}
                </Typography.Text>
              </Space>
            </Card>

            <Alert
              type="info"
              showIcon
              icon={<SafetyCertificateOutlined />}
              title={t('auth.setup2fa.content.backupHint')}
            />

            <Form
              form={form}
              onFinish={onEnable}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="totpCode"
                label={t('auth.setup2fa.content.codeLabel')}
                rules={[
                  {
                    required: true,
                    pattern: /^\d{6}$/,
                    message: t('auth.setup2fa.content.codeRequired'),
                  },
                ]}
                className="mb-4"
              >
                <Input
                  prefix={<SafetyCertificateOutlined />}
                  placeholder={t('auth.setup2fa.content.codePlaceholder')}
                  maxLength={6}
                  autoFocus
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
              </Form.Item>

              <Form.Item className="mb-0">
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={enabling}
                  block
                  size="large"
                  className="h-[46px] font-semibold"
                >
                  {t('auth.setup2fa.content.submit')}
                </Button>
              </Form.Item>
            </Form>
          </>
        ) : (
          <Space orientation="vertical" size="middle">
            <Alert
              type="warning"
              showIcon
              title={t('auth.setup2fa.content.loadFailed')}
            />
            <Button icon={<ReloadOutlined />} onClick={onRefresh}>
              {t('auth.setup2fa.content.retry')}
            </Button>
          </Space>
        )}
      </Space>
    </Spin>
  )
}
