import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Col, Row, Space, Typography } from 'antd'

interface OverviewItem {
  label: string
  value: string
}

interface Props {
  loading: boolean
  canSave: boolean
  saving: boolean
  overviewItems: OverviewItem[]
  onRefresh: () => void
  onSave: () => void
}

export function CompanySettingsHeader({
  loading,
  canSave,
  saving,
  overviewItems,
  onRefresh,
  onSave,
}: Props) {
  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 8,
        padding: 24,
        marginBottom: 16,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <div>
          <Typography.Title level={4} style={{ margin: 0 }}>
            公司信息
          </Typography.Title>
          <Typography.Text type="secondary">
            本系统按单企业模式运行，公司名称和税号由 OOBE
            初始化写入；本页集中维护多个结算银行、状态和补充说明。
          </Typography.Text>
        </div>
        <Space>
          <Button
            size="small"
            loading={loading}
            icon={<ReloadOutlined />}
            onClick={onRefresh}
          >
            刷新
          </Button>
          {canSave && (
            <Button
              type="primary"
              size="small"
              loading={saving}
              icon={<SaveOutlined />}
              onClick={onSave}
            >
              保存
            </Button>
          )}
        </Space>
      </div>
      <Row gutter={16}>
        {overviewItems.map((item) => (
          <Col span={8} key={item.label}>
            <div
              style={{
                border: '1px solid #f0f0f0',
                borderRadius: 12,
                padding: '18px 20px',
                background: 'linear-gradient(180deg, #fafafa 0%, #fff 100%)',
              }}
            >
              <div style={{ fontSize: 13, color: '#8c8c8c' }}>{item.label}</div>
              <div style={{ marginTop: 10, fontSize: 22, fontWeight: 600 }}>
                {item.value}
              </div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  )
}
