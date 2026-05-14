import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Col from 'antd/es/col'
import Row from 'antd/es/row'
import Space from 'antd/es/space'
import Typography from 'antd/es/typography'

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
    <div className="bg-default rounded p-24 mb-16">
      <div className="flex justify-between mb-20">
        <div>
          <Typography.Title level={4} className="m-0">
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
            <div className="rounded-lg border border-gray-200 px-[20px] py-[18px] bg-gradient-to-b from-gray-50 to-white">
              <div className="text-sm text-secondary">{item.label}</div>
              <div className="mt-10 text-2xl font-semibold">{item.value}</div>
            </div>
          </Col>
        ))}
      </Row>
    </div>
  )
}
