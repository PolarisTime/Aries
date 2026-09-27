import { DeleteOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Empty, Space, Tag, Typography } from 'antd'
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
        /*
         * 卡片网格布局: antd List 已废弃, 而官方迁移说明明确"网格布局不建议迁到 Listy,
         * 应改用 Row/Col 或普通标记"。这里主题卡已是自定义卡片, 直接以网格容器渲染,
         * 样式与可访问名称保持不变。
         */
        <div className="company-subject-selector-list">
          {companies.map((item) => {
            const active = item.id === selectedId
            return (
              <div
                key={item.id}
                className={`company-subject-selector-item${active ? ' is-active' : ''}`}
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
                <Button
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
                />
              </div>
            )
          })}
        </div>
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={t('system.company.noSubjects')}
        />
      )}
    </Card>
  )
}
