import { ReloadOutlined, SaveOutlined } from '@ant-design/icons'
import { Button, Card, Descriptions, Space, Typography } from 'antd'
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
    <Card
      className="mb-16"
      title={
        <div className="flex flex-wrap items-start justify-between gap-12 py-4">
          <div className="min-w-0 flex-1">
            <Typography.Title level={4} className="m-0">
              {t('system.companyHeader.title')}
            </Typography.Title>
            <Typography.Text type="secondary">
              {t('system.companyHeader.description')}
            </Typography.Text>
          </div>
          <Space wrap>
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
      }
    >
      <Descriptions size="small" column={{ xs: 1, sm: 3 }}>
        {overviewItems.map((item) => (
          <Descriptions.Item key={item.label} label={item.label}>
            {item.value}
          </Descriptions.Item>
        ))}
      </Descriptions>
    </Card>
  )
}
