import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Empty, List, Space, Tag, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import type { CompanySettingProfile } from '@/api/system/company-settings'
import { STATUS } from '@/constants/status-constants'

interface CompanySubjectListProps {
  companies: CompanySettingProfile[]
  selectedId: string
  deletingId: string | null
  onCreate: () => void
  onDelete: (id: string) => void
  onSelect: (id: string) => void
}

export function CompanySubjectList({
  companies,
  selectedId,
  deletingId,
  onCreate,
  onDelete,
  onSelect,
}: CompanySubjectListProps) {
  const { t } = useTranslation()
  return (
    <Card
      size="small"
      className="company-subject-selector-card"
      title={t('system.company.subjectList')}
      extra={
        <Button size="small" icon={<PlusOutlined />} onClick={onCreate}>
          {t('system.company.addSubject')}
        </Button>
      }
    >
      {companies.length > 0 ? (
        <List
          className="company-subject-selector-list"
          dataSource={companies}
          rowKey={(item) => item.id}
          split={false}
          renderItem={(item) => {
            const active = item.id === selectedId
            return (
              <List.Item
                className={`company-subject-selector-item${active ? ' is-active' : ''}`}
                key={item.id}
                actions={[
                  <Button
                    key="delete"
                    danger
                    type="text"
                    size="small"
                    loading={deletingId === item.id}
                    icon={<DeleteOutlined />}
                    aria-label={t('system.company.deleteSubject')}
                    onClick={(event) => {
                      event.stopPropagation()
                      onDelete(item.id)
                    }}
                  />,
                ]}
              >
                <button
                  type="button"
                  className="company-subject-selector-main"
                  aria-current={active ? 'true' : undefined}
                  onClick={() => onSelect(item.id)}
                >
                  <Space size={8} wrap>
                    <Typography.Text strong={active}>
                      {item.companyName ||
                        t('system.companySubject.pendingCompany')}
                    </Typography.Text>
                    <Tag
                      color={
                        item.status === STATUS.NORMAL ? 'processing' : 'default'
                      }
                    >
                      {item.status || STATUS.NORMAL}
                    </Tag>
                  </Space>
                  <Typography.Text type="secondary">
                    {item.taxNo || t('system.companySubject.pendingTaxNo')}
                  </Typography.Text>
                </button>
              </List.Item>
            )
          }}
        />
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('system.company.noSubjects')}
        />
      )}
    </Card>
  )
}
