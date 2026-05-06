import { Card, Col, Layout, Row, Space, Tag, Typography } from 'antd'
import type { ReactNode } from 'react'

interface Props {
  eyebrow: string
  title: string
  subtitle: string
  description: string
  leftAside?: ReactNode
  rightSpan?: number
  children: ReactNode
}

const authBackground =
  'radial-gradient(circle at top left, rgba(22,119,255,0.2), transparent 24%), ' +
  'radial-gradient(circle at bottom right, rgba(14,165,233,0.16), transparent 24%), ' +
  'linear-gradient(180deg, #f3f8ff 0%, #eef3f8 45%, #f8fbff 100%)'

export function AuthPageShell({
  eyebrow,
  title,
  subtitle,
  description,
  leftAside,
  rightSpan = 10,
  children,
}: Props) {
  return (
    <Layout style={{ minHeight: '100vh', background: authBackground }}>
      <Row
        align="middle"
        gutter={[24, 24]}
        style={{
          width: '100%',
          maxWidth: 1180,
          margin: '0 auto',
          padding: '24px 16px',
        }}
      >
        <Col xs={24} lg={24 - rightSpan}>
          <Space orientation="vertical" size="large" style={{ width: '100%' }}>
            <Space orientation="vertical" size={8}>
              <Tag
                color="blue"
                variant="filled"
                style={{ width: 'fit-content', paddingInline: 12, borderRadius: 999 }}
              >
                {eyebrow}
              </Tag>
              <Typography.Title level={1} style={{ margin: 0 }}>
                {title}
              </Typography.Title>
              <Typography.Title level={4} style={{ margin: 0 }} type="secondary">
                {subtitle}
              </Typography.Title>
              <Typography.Paragraph
                type="secondary"
                style={{ marginBottom: 0, fontSize: 15, lineHeight: 1.8, maxWidth: 620 }}
              >
                {description}
              </Typography.Paragraph>
            </Space>

            {leftAside}
          </Space>
        </Col>

        <Col xs={24} lg={rightSpan}>
          <Card
            variant="borderless"
            style={{
              borderRadius: 24,
              boxShadow: '0 24px 64px rgba(15,23,42,0.12)',
              background: 'rgba(255,255,255,0.92)',
            }}
          >
            {children}
          </Card>
        </Col>
      </Row>
    </Layout>
  )
}
