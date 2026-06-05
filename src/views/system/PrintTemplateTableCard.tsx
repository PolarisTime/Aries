import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import type { TableProps } from 'antd/es/table'
import Table from 'antd/es/table'
import { useTranslation } from 'react-i18next'
import { printTemplateTargetOptions } from '@/config/print-template-targets'
import type { PrintTemplateRecord } from '@/types/print-template'
import { formatDateTime } from '@/utils/formatters'
import { getPrintTemplateBillTypeLabel } from '@/views/system/print-template-view-utils'

interface Props {
  selectedBillType: string
  activeTemplateId?: string
  templates: PrintTemplateRecord[]
  loading: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  onBillTypeChange: (value: string) => void
  onRefresh: () => void
  onCreate: () => void
  onPreview: (record: PrintTemplateRecord) => void
  onEdit: (record: PrintTemplateRecord) => void
  onCopy: (record: PrintTemplateRecord) => void
  onDelete: (record: PrintTemplateRecord) => void
  onActiveChange: (id: string) => void
}

export function PrintTemplateTableCard({
  selectedBillType,
  activeTemplateId,
  templates,
  loading,
  canCreate,
  canEdit,
  canDelete,
  onBillTypeChange,
  onRefresh,
  onCreate,
  onPreview,
  onEdit,
  onCopy,
  onDelete,
  onActiveChange,
}: Props) {
  const { t } = useTranslation()
  const columns: TableProps<PrintTemplateRecord>['columns'] = [
    {
      title: t('common.operation'),
      key: 'action',
      width: 280,
      fixed: 'left',
      render: (_value, record) => (
        <Space size={0} onClick={(e) => e.stopPropagation()}>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => onPreview(record)}
          >
            {t('system.printTemplate.preview')}
          </Button>
          {canEdit && (
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => onEdit(record)}
            >
              {t('common.edit')}
            </Button>
          )}
          {canCreate && (
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => onCopy(record)}
            >
              {t('system.printTemplate.copy')}
            </Button>
          )}
          {canDelete && (
            <Button
              type="link"
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => onDelete(record)}
            >
              {t('common.delete')}
            </Button>
          )}
        </Space>
      ),
    },
    {
      dataIndex: 'templateName',
      title: t('system.printTemplate.templateName'),
      width: 200,
    },
    {
      dataIndex: 'billType',
      title: t('system.printTemplate.billType'),
      width: 150,
      render: (value: string) => getPrintTemplateBillTypeLabel(value),
    },
    {
      dataIndex: 'templateType',
      title: t('system.printTemplate.templateType'),
      width: 120,
      render: (value: string) => value || 'HTML',
    },
    {
      dataIndex: 'updateTime',
      title: t('common.updatedAt'),
      width: 180,
      render: (value: unknown) => formatDateTime(value, '--'),
    },
  ]

  return (
    <Card
      title={t('system.printTemplate.title')}
      extra={
        <Space wrap>
          <Select
            value={selectedBillType}
            onChange={onBillTypeChange}
            className="w-200"
            options={printTemplateTargetOptions}
          />
          <Button icon={<ReloadOutlined />} onClick={onRefresh}>
            {t('common.refresh')}
          </Button>
          {canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={onCreate}>
              {t('system.printTemplate.newTemplate')}
            </Button>
          )}
        </Space>
      }
    >
      <Table
        rowKey="id"
        columns={columns}
        dataSource={templates}
        loading={loading}
        size="small"
        scroll={{ x: 900 }}
        onRow={(record) => ({
          onClick: () => onActiveChange(record.id),
          style: {
            cursor: 'pointer',
            background:
              activeTemplateId === record.id
                ? 'var(--theme-highlight-bg)'
                : undefined,
          },
        })}
      />
    </Card>
  )
}
