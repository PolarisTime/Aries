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
import {
  Button,
  Card,
  Descriptions,
  Dropdown,
  Empty,
  Input,
  Select,
  Space,
  Spin,
  Tag,
  Tooltip,
  Typography,
  Upload,
} from 'antd'
import type { RcFile } from 'antd/es/upload/interface'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusTag } from '@/components/StatusTag'
import { printTemplateTargetOptions } from '@/config/print-template-targets'
import type { PrintTemplateRecord } from '@/shared/schemas'
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

function settlementCompanyLabel(
  record: PrintTemplateRecord,
  unassignedLabel: string,
) {
  return record.settlementCompanyName?.trim() || unassignedLabel
}

interface PrintTemplateStatusTagProps {
  record: PrintTemplateRecord
  statusMap: Parameters<typeof StatusTag>[0]['statusMap']
}

function PrintTemplateStatusTag({
  record,
  statusMap,
}: PrintTemplateStatusTagProps) {
  const status = record.status === 'DISABLED' ? 'disabled' : 'active'
  return <StatusTag status={status} statusMap={statusMap} />
}

interface PrintTemplateSyncTagProps {
  record: PrintTemplateRecord
  fileLabel: string
  manualLabel: string
}

function PrintTemplateSyncTag({
  record,
  fileLabel,
  manualLabel,
}: PrintTemplateSyncTagProps) {
  return record.syncMode === 'FILE' ? (
    <Tag color="blue" title={record.sourceRef || undefined}>
      {fileLabel}
    </Tag>
  ) : (
    <Tag>{manualLabel}</Tag>
  )
}

interface PrintTemplateActionsProps {
  record: PrintTemplateRecord
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
  uploadPending: boolean
  labels: {
    copy: string
    delete: string
    edit: string
    editHint: string
    preview: string
    uploadJson: string
  }
  onCopy: (record: PrintTemplateRecord) => void
  onDelete: (record: PrintTemplateRecord) => void
  onEdit: (record: PrintTemplateRecord) => void
  onPreview: (record: PrintTemplateRecord) => void
  onUploadJson: (record: PrintTemplateRecord, file: File) => void
}

function PrintTemplateActions({
  record,
  canCreate,
  canEdit,
  canDelete,
  uploadPending,
  labels,
  onCopy,
  onDelete,
  onEdit,
  onPreview,
  onUploadJson,
}: PrintTemplateActionsProps) {
  const canUploadJson = canEdit && record.templateType === 'PDF_FORM'
  const canEditRecord = canEdit && record.syncMode !== 'FILE'

  return (
    <Space size={4}>
      <Tooltip title={labels.preview}>
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
        <Tooltip title={canEditRecord ? labels.edit : labels.editHint}>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            disabled={!canEditRecord}
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
                  label: labels.copy,
                  onClick: () => onCopy(record),
                }
              : null,
            canUploadJson
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
                        {labels.uploadJson}
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
                  label: labels.delete,
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
  const filteredTemplates = (() => {
    const normalizedKeyword = keyword.trim().toLowerCase()
    if (!normalizedKeyword) return templates
    return templates.filter((template) =>
      [
        template.templateName,
        template.templateCode,
        template.templateType,
        template.engine,
        template.sourceRef,
        template.settlementCompanyName,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(normalizedKeyword),
        ),
    )
  })()

  const canEditRecord = (record: PrintTemplateRecord) =>
    canEdit && record.syncMode !== 'FILE'
  const statusMap = {
    active: {
      color: 'green',
      label: t('system.printTemplate.statusActive'),
    },
    disabled: {
      color: 'default',
      label: t('system.printTemplate.statusDisabled'),
    },
  }
  const actionLabels = {
    copy: t('system.printTemplate.copy'),
    delete: t('common.delete'),
    edit: t('common.edit'),
    editHint: t('system.printTemplate.fileManagedEditHint'),
    preview: t('system.printTemplate.preview'),
    uploadJson: t('system.printTemplate.uploadJson'),
  }
  const syncLabels = {
    file: t('system.printTemplate.syncModeFile'),
    manual: t('system.printTemplate.syncModeManual'),
  }
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
              id="print-template-search"
              name="print-template-search"
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
                      >
                        <button
                          type="button"
                          className="print-template-list-main"
                          aria-pressed={active}
                          onClick={() => onActiveChange(record.id)}
                        >
                          <div className="flex items-center gap-8">
                            <Typography.Text strong className="truncate">
                              {record.templateName}
                            </Typography.Text>
                          </div>
                          <div className="mt-8 flex flex-wrap gap-4">
                            <Tag color="processing">
                              {templateTypeLabel(record)}
                            </Tag>
                            <PrintTemplateStatusTag
                              record={record}
                              statusMap={statusMap}
                            />
                            <PrintTemplateSyncTag
                              record={record}
                              fileLabel={syncLabels.file}
                              manualLabel={syncLabels.manual}
                            />
                            <Tag>
                              {settlementCompanyLabel(
                                record,
                                t('system.printTemplate.unassignedCompany'),
                              )}
                            </Tag>
                          </div>
                          <Typography.Text
                            type="secondary"
                            className="mt-8 block truncate"
                          >
                            {record.templateCode || t('common.noData')}
                          </Typography.Text>
                        </button>
                        <PrintTemplateActions
                          record={record}
                          canCreate={canCreate}
                          canEdit={canEdit}
                          canDelete={canDelete}
                          uploadPending={uploadPending}
                          labels={actionLabels}
                          onCopy={onCopy}
                          onDelete={onDelete}
                          onEdit={onEdit}
                          onPreview={onPreview}
                          onUploadJson={onUploadJson}
                        />
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
                      <PrintTemplateStatusTag
                        record={activeTemplate}
                        statusMap={statusMap}
                      />
                    </Descriptions.Item>
                    <Descriptions.Item
                      label={t('system.printTemplate.syncMode')}
                    >
                      <PrintTemplateSyncTag
                        record={activeTemplate}
                        fileLabel={syncLabels.file}
                        manualLabel={syncLabels.manual}
                      />
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
                    <Descriptions.Item
                      label={t('system.printTemplate.settlementCompany')}
                    >
                      {settlementCompanyLabel(
                        activeTemplate,
                        t('system.printTemplate.unassignedCompany'),
                      )}
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
