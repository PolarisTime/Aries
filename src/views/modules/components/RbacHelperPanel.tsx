import { Card, Col, Row, Statistic, Typography } from 'antd'

interface Props {
  roleName?: string
  permissionCount?: number
  userCount?: number
}

export function RbacHelperPanel({
  roleName,
  permissionCount,
  userCount,
}: Props) {
  if (!roleName) return null
  return (
    <Card
      size="small"
      style={{ marginBottom: 12 }}
      title={<Typography.Text strong>权限概览 · {roleName}</Typography.Text>}
    >
      <Row gutter={[12, 12]}>
        {permissionCount !== undefined && (
          <Col xs={24} md={12}>
            <Card variant="borderless" styles={{ body: { padding: 16, background: '#f8fafc', borderRadius: 12 } }}>
              <Statistic title="权限数量" value={permissionCount} />
            </Card>
          </Col>
        )}
        {userCount !== undefined && (
          <Col xs={24} md={12}>
            <Card variant="borderless" styles={{ body: { padding: 16, background: '#f8fafc', borderRadius: 12 } }}>
              <Statistic title="关联用户" value={userCount} />
            </Card>
          </Col>
        )}
      </Row>
    </Card>
  )
}
