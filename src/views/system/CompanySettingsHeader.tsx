import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import Button from 'antd/es/button'
import Col from 'antd/es/col'
import Row from 'antd/es/row'
import Space from 'antd/es/space'
import Typography from 'antd/es/typography'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  return (
    <div className="bg-default rounded p-24 mb-16">
      <div className="flex justify-between mb-20">
        <div>
          <Typography.Title level={4} className="m-0">
            {t('system.companyHeader.title')}
          </Typography.Title>
          <Typography.Text type="secondary">
            {t('system.companyHeader.description')}
          </Typography.Text>
        </div>
        <Space>
          <Button
            size="small"
            loading={loading}
            icon={<ReloadOutlined />}
            onClick={onRefresh}
          >
            {t('system.companyHeader.refresh')}
          </Button>
          {canSave && (
            <Button
              type="primary"
              size="small"
              loading={saving}
              icon={<SaveOutlined />}
              onClick={onSave}
            >
              {t('system.companyHeader.save')}
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
