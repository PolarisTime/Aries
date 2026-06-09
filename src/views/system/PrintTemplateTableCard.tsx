import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import type { TableProps } from 'antd/es/table'
import Table from 'antd/es/table'
import Tag from 'antd/es/tag'
import Upload from 'antd/es/upload'
import type { RcFile } from 'antd/es/upload/interface'
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
  onUploadJson: (record: PrintTemplateRecord, file: File) => void
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
  onUploadJson,
  onDelete,
  onActiveChange,
}: Props) {
  const { t } = useTranslation()
  const isFileManagedTemplate = (record: PrintTemplateRecord) =>
    record.syncMode === 'FILE'
  const canUploadJson = (record: PrintTemplateRecord) =>
    canEdit && record.templateType === 'PDF_FORM'
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
              disabled={isFileManagedTemplate(record)}
              onClick={() => onEdit(record)}
            >
              {t('common.edit')}
            </Button>
          )}
          {canUploadJson(record) && (
            <Upload
              accept=".json,application/json"
              beforeUpload={(file: RcFile) => {
                onUploadJson(record, file)
                return false
              }}
              showUploadList={false}
            >
              <Button type="link" size="small" icon={<UploadOutlined />}>
                {t('system.printTemplate.uploadJson')}
              </Button>
            </Upload>
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
      dataIndex: 'templateCode',
      title: t('system.printTemplate.templateCode'),
      width: 220,
      render: (value: string | null | undefined) => value || '--',
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
      render: (value: string) => value || 'COORD',
    },
    {
      dataIndex: 'engine',
      title: t('system.printTemplate.engine'),
      width: 140,
      render: (value: string | null | undefined) => value || '--',
    },
    {
      dataIndex: 'assetRef',
      title: t('system.printTemplate.assetRef'),
      width: 240,
      render: (value: string | null | undefined) => value || '--',
    },
    {
      dataIndex: 'status',
      title: t('system.printTemplate.status'),
      width: 120,
      render: (value: string | null | undefined) => (
        <Tag color={value === 'DISABLED' ? 'default' : 'green'}>
          {value === 'DISABLED'
            ? t('system.printTemplate.statusDisabled')
            : t('system.printTemplate.statusActive')}
        </Tag>
      ),
    },
    {
      dataIndex: 'syncMode',
      title: t('system.printTemplate.syncMode'),
      width: 140,
      render: (value: string | null | undefined, record) =>
        value === 'FILE' ? (
          <Tag color="blue" title={record.sourceRef || undefined}>
            {t('system.printTemplate.syncModeFile')}
          </Tag>
        ) : (
          <Tag>{t('system.printTemplate.syncModeManual')}</Tag>
        ),
    },
    {
      dataIndex: 'sourceRef',
      title: t('system.printTemplate.sourceRef'),
      width: 260,
      render: (value: string | null | undefined) => value || '--',
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
