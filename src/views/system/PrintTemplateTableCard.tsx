import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  MoreOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import Button from 'antd/es/button'
import Card from 'antd/es/card'
import Descriptions from 'antd/es/descriptions'
import Dropdown from 'antd/es/dropdown'
import Empty from 'antd/es/empty'
import Input from 'antd/es/input'
import Select from 'antd/es/select'
import Space from 'antd/es/space'
import Spin from 'antd/es/spin'
import Tag from 'antd/es/tag'
import Tooltip from 'antd/es/tooltip'
import Typography from 'antd/es/typography'
import Upload from 'antd/es/upload'
import type { RcFile } from 'antd/es/upload/interface'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusTag } from '@/components/StatusTag'
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
  uploadPending: boolean
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

function templateTypeLabel(record: PrintTemplateRecord) {
  return record.templateType === 'PDF_FORM' ? 'PDF_FORM' : 'COORD'
}

export function PrintTemplateTableCard({
  selectedBillType,
  activeTemplateId,
  templates,
  loading,
  canCreate,
  canEdit,
  canDelete,
  uploadPending,
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
  const [keyword, setKeyword] = useState('')
  const activeTemplate =
    templates.find((template) => template.id === activeTemplateId) ??
    templates[0] ??
    null
  const filteredTemplates = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    if (!normalizedKeyword) return templates
    return templates.filter((template) =>
      [
        template.templateName,
        template.templateCode,
        template.templateType,
        template.engine,
        template.sourceRef,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedKeyword),
        ),
    )
  }, [keyword, templates])

  const canUploadJson = (record: PrintTemplateRecord) =>
    canEdit && record.templateType === 'PDF_FORM'
  const canEditRecord = (record: PrintTemplateRecord) =>
    canEdit && record.syncMode !== 'FILE'

  const renderStatusTag = (record: PrintTemplateRecord) => {
    const status = record.status === 'DISABLED' ? 'disabled' : 'active'
    return (
      <StatusTag
        status={status}
        statusMap={{
          active: {
            color: 'green',
            label: t('system.printTemplate.statusActive'),
          },
          disabled: {
            color: 'default',
            label: t('system.printTemplate.statusDisabled'),
          },
        }}
      />
    )
  }

  const renderSyncTag = (record: PrintTemplateRecord) =>
    record.syncMode === 'FILE' ? (
      <Tag color="blue" title={record.sourceRef || undefined}>
        {t('system.printTemplate.syncModeFile')}
      </Tag>
    ) : (
      <Tag>{t('system.printTemplate.syncModeManual')}</Tag>
    )

  const renderTemplateActions = (record: PrintTemplateRecord) => (
    <Space size={4}>
      <Tooltip title={t('system.printTemplate.preview')}>
        <Button
          type="text"
          size="small"
          icon={<EyeOutlined />}
          onClick={(event) => {
            event.stopPropagation()
            onPreview(record)
          }}
        />
      </Tooltip>
      {canEdit && (
        <Tooltip
          title={
            canEditRecord(record)
              ? t('common.edit')
              : t('system.printTemplate.fileManagedEditHint')
          }
        >
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            disabled={!canEditRecord(record)}
            onClick={(event) => {
              event.stopPropagation()
              onEdit(record)
            }}
          />
        </Tooltip>
      )}
      <Dropdown
        trigger={['click']}
        menu={{
          items: [
            canCreate
              ? {
                  key: 'copy',
                  icon: <CopyOutlined />,
                  label: t('system.printTemplate.copy'),
                  onClick: () => onCopy(record),
                }
              : null,
            canUploadJson(record)
              ? {
                  key: 'upload',
                  label: (
                    <Upload
                      accept=".json,application/json"
                      beforeUpload={(file: RcFile) => {
                        if (uploadPending) return false
                        onUploadJson(record, file)
                        return false
                      }}
                      showUploadList={false}
                    >
                      <span>
                        <UploadOutlined className="mr-8" />
                        {t('system.printTemplate.uploadJson')}
                      </span>
                    </Upload>
                  ),
                  disabled: uploadPending,
                }
              : null,
            canDelete
              ? {
                  key: 'delete',
                  danger: true,
                  icon: <DeleteOutlined />,
                  label: t('common.delete'),
                  onClick: () => onDelete(record),
                }
              : null,
          ].filter(Boolean),
        }}
      >
        <Button
          type="text"
          size="small"
          icon={<MoreOutlined />}
          onClick={(event) => event.stopPropagation()}
        />
      </Dropdown>
    </Space>
  )

  return (
    <div className="print-template-workbench">
      <Card
        title={t('system.printTemplate.title')}
        extra={
          <Space wrap>
            <Select
              value={selectedBillType}
              onChange={onBillTypeChange}
              className="w-240"
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
        <div className="print-template-shell">
          <div className="print-template-list-pane">
            <Input.Search
              allowClear
              value={keyword}
              placeholder={t('system.printTemplate.searchPlaceholder')}
              onChange={(event) => setKeyword(event.target.value)}
              className="mb-12"
            />
            <Spin spinning={loading}>
              <div className="print-template-list">
                {filteredTemplates.length > 0 ? (
                  filteredTemplates.map((record) => {
                    const active = activeTemplate?.id === record.id
                    return (
                      <div
                        key={record.id}
                        className={`print-template-list-item ${
                          active ? 'is-active' : ''
                        }`}
                        onClick={() => onActiveChange(record.id)}
                      >
                        <div className="print-template-list-main">
                          <div className="flex items-center justify-between gap-8">
                            <Typography.Text strong className="truncate">
                              {record.templateName}
                            </Typography.Text>
                            {renderTemplateActions(record)}
                          </div>
                          <div className="mt-8 flex flex-wrap gap-4">
                            <Tag color="processing">
                              {templateTypeLabel(record)}
                            </Tag>
                            {renderStatusTag(record)}
                            {renderSyncTag(record)}
                          </div>
                          <Typography.Text
                            type="secondary"
                            className="mt-8 block truncate"
                          >
                            {record.templateCode || t('common.noData')}
                          </Typography.Text>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <Empty description={t('system.printTemplate.emptyList')} />
                )}
              </div>
            </Spin>
          </div>

          <div className="print-template-detail-pane">
            {activeTemplate ? (
              <Space orientation="vertical" size={16} className="w-full">
                <Card
                  size="small"
                  title={
                    <Space>
                      <FileTextOutlined />
                      <span>{activeTemplate.templateName}</span>
                    </Space>
                  }
                  extra={
                    <Space>
                      <Button
                        icon={<EyeOutlined />}
                        onClick={() => onPreview(activeTemplate)}
                      >
                        {t('system.printTemplate.preview')}
                      </Button>
                      {canEdit && (
                        <Button
                          icon={<EditOutlined />}
                          disabled={!canEditRecord(activeTemplate)}
                          onClick={() => onEdit(activeTemplate)}
                        >
                          {t('common.edit')}
                        </Button>
                      )}
                    </Space>
                  }
                >
                  <Descriptions size="small" column={{ xs: 1, md: 2 }} bordered>
                    <Descriptions.Item
                      label={t('system.printTemplate.billType')}
                    >
                      {getPrintTemplateBillTypeLabel(
                        activeTemplate.billType || selectedBillType,
                      )}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={t('system.printTemplate.templateType')}
                    >
                      <Tag color="processing">
                        {templateTypeLabel(activeTemplate)}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label={t('system.printTemplate.engine')}>
                      {activeTemplate.engine || '--'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('system.printTemplate.status')}>
                      {renderStatusTag(activeTemplate)}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={t('system.printTemplate.syncMode')}
                    >
                      {renderSyncTag(activeTemplate)}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={t('system.printTemplate.sourceRef')}
                    >
                      {activeTemplate.sourceRef || '--'}
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={t('system.printTemplate.assetRef')}
                    >
                      {activeTemplate.assetRef || '--'}
                    </Descriptions.Item>
                    <Descriptions.Item label={t('common.updatedAt')}>
                      {formatDateTime(activeTemplate.updateTime, '--')}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card
                  size="small"
                  title={t('system.printTemplate.templateContent')}
                >
                  <pre className="print-template-preview-code">
                    {activeTemplate.templateHtml ||
                      t('system.printTemplatePreview.emptyTemplate')}
                  </pre>
                </Card>
              </Space>
            ) : (
              <Card className="h-full">
                <Empty description={t('system.printTemplate.emptyList')} />
              </Card>
            )}
          </div>
        </div>
      </Card>
    </div>
  )
}
