import {
  ArrowRightOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons'
import { useNavigate } from '@tanstack/react-router'
import { Button, Card, Space, Table, Typography } from 'antd'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppResult } from '@/components/AppResult'
import { ERROR_CODE } from '@/constants/error-codes'
import { useModuleDisplaySupport } from '@/hooks/useModuleDisplaySupport'
import type { ModuleKey } from '@/module-system/core/module-key'
import { readModuleRecordField } from '@/module-system/record/module-record-fields'
import type { ModulePageConfig } from '@/types/module-page'
import type { ModuleLineItem } from '@/types/module-record'
import { buildRouterHref } from '@/utils/router-search'
import type { CustomerStatementItemGroup } from '@/views/modules/customer-statement-item-groups'
import type { FreightStatementProjectGroup } from '@/views/modules/freight-statement-item-groups'
import type { EditorSaveResult } from '@/views/modules/use-editor-submission-controller'
import { CustomerStatementItemGroupHeader } from './CustomerStatementItemGroupHeader'
import {
  FreightStatementItemGroupHeader,
  FreightStatementProjectGroupHeader,
} from './FreightStatementItemGroupHeader'
import { ModuleAttachmentModal } from './ModuleAttachmentModal'
import {
  buildModuleItemGroups,
  resolveModuleItemGroupViewKind,
} from './module-item-groups'
import { WorkspaceOverlay } from './WorkspaceOverlay'

const NEXT_MODULE_PATHS: Record<string, { labelKey: string; path: string }> = {
  'purchase-order': {
    labelKey: 'modules.nextModule.createPurchaseInbound',
    path: '/purchase-inbound',
  },
  'sales-order': {
    labelKey: 'modules.nextModule.createSalesOutbound',
    path: '/sales-outbound',
  },
}

interface SaveResultOverlayProps<Key extends ModuleKey> {
  saveResult: EditorSaveResult<Key>
  config: ModulePageConfig
  moduleKey: Key
  canCreateAnother: boolean
  resolvingConflict: boolean
  onClear: () => void
  onResolveConflict: () => void
  onCreateAnother: () => void
  pendingFiles: readonly File[]
}

/** 编辑器保存后的结果回执弹窗：状态、快捷跳转、回单上传与只读明细。 */
export function SaveResultOverlay<Key extends ModuleKey>({
  saveResult,
  config,
  moduleKey,
  canCreateAnother,
  resolvingConflict,
  onClear,
  onResolveConflict,
  onCreateAnother,
  pendingFiles,
}: SaveResultOverlayProps<Key>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [attachmentOpen, setAttachmentOpen] = useState(false)
  const { formatCellValue } = useModuleDisplaySupport()
  const rawItems = readModuleRecordField(saveResult.record, 'items')
  const items: ModuleLineItem[] = Array.isArray(rawItems)
    ? rawItems.flatMap((item) =>
        item && typeof item === 'object'
          ? [Object.fromEntries(Object.entries(item)) as ModuleLineItem]
          : [],
      )
    : []

  const isSuccess =
    saveResult.status === 'success' || saveResult.status === 'warning'
  const isConflict =
    saveResult.status === 'error' &&
    saveResult.errorCode === ERROR_CODE.CONCURRENT_MODIFICATION

  const NEXT_MODULE: Record<string, { label: string; path: string }> =
    Object.fromEntries(
      Object.entries(NEXT_MODULE_PATHS).map(([key, { labelKey, path }]) => [
        key,
        { label: t(labelKey), path },
      ]),
    )

  const nextModule = isSuccess ? NEXT_MODULE[moduleKey] : null

  const handleCreateNext = (targetModule: { label: string; path: string }) => {
    onClear()
    void navigate({
      to: buildRouterHref(targetModule.path, {
        sourceModule: moduleKey,
        sourceRecordId: String(saveResult.record?.id || ''),
      }),
    } as never)
  }

  const quickActions = nextModule ? (
    <Button
      type="primary"
      icon={<ArrowRightOutlined />}
      onClick={() => handleCreateNext(nextModule)}
    >
      {nextModule.label}
    </Button>
  ) : null

  const resultTitle = isSuccess
    ? t('modules.saveResult.pageSuccess', { title: config.title })
    : isConflict
      ? t('modules.saveResult.conflict')
      : t('modules.saveResult.error')

  const actionBar = (
    <>
      {isSuccess && saveResult.record?.id ? (
        <Button onClick={() => setAttachmentOpen(true)}>上传回单/凭证</Button>
      ) : null}
      {quickActions}
      {isSuccess && canCreateAnother ? (
        <Button icon={<PlusOutlined />} onClick={onCreateAnother}>
          {t('modules.saveResult.createAnother')}
        </Button>
      ) : null}
      <Button
        type="primary"
        icon={isConflict ? <ReloadOutlined /> : undefined}
        loading={isConflict && resolvingConflict}
        onClick={isConflict ? onResolveConflict : onClear}
      >
        {isConflict
          ? t('modules.saveResult.reloadLatest')
          : saveResult.status === 'error'
            ? t('modules.saveResult.backToEdit')
            : t('modules.saveResult.close')}
      </Button>
    </>
  )

  // 保存结果弹窗的只读明细列：由模块配置的保存结果摘要投影提供，
  // 组件不再维护模块字段白名单，与编辑器表格共用 formatCellValue 渲染。
  const itemColumns = (
    config.saveResultItemColumns ??
    config.itemColumns ??
    []
  ).map((column) => ({
    title: column.title,
    dataIndex: column.dataIndex,
    ellipsis: true,
    align: column.align || ('center' as const),
    render: (value: unknown) =>
      value == null || value === '' ? '-' : formatCellValue(value, column.type),
  }))
  const itemGroups = buildModuleItemGroups(moduleKey, items)

  return (
    <WorkspaceOverlay
      open
      title={config.title}
      onClose={isConflict ? onResolveConflict : onClear}
      className="save-result-overlay"
    >
      <AppResult
        className="app-result--workspace"
        status={saveResult.status}
        title={resultTitle}
        subTitle={saveResult.message}
        traceId={saveResult.traceId}
        extra={actionBar}
      />

      {saveResult.record ? (
        <Card size="small" className="mb-16">
          <Space orientation="vertical" size={4}>
            {(config.formFields || []).map((field) => {
              const val = readModuleRecordField(saveResult.record, field.key)
              if (val == null || val === '') return null
              const suffix =
                readModuleRecordField(field, 'type') === 'weight'
                  ? ` ${t('modules.itemColumns.weightTon').replace(/\(.*\)/, '')}`
                  : readModuleRecordField(field, 'type') === 'amount'
                    ? ` ${t('modules.itemColumns.amount')}`
                    : ''
              return (
                <div key={field.key}>
                  <Typography.Text type="secondary">
                    {field.label}：
                  </Typography.Text>
                  <Typography.Text>
                    {String(val)}
                    {suffix}
                  </Typography.Text>
                </div>
              )
            })}
          </Space>
        </Card>
      ) : null}

      {items.length > 0 ? (
        <div className="mt-16 module-items-groups">
          {itemGroups.map((group) => {
            const viewKind = resolveModuleItemGroupViewKind(moduleKey, group)
            return (
              <div className="module-items-group" key={group.key}>
                {viewKind === 'freight-project' ? (
                  <div className="module-items-project-group">
                    <FreightStatementProjectGroupHeader
                      group={
                        group as FreightStatementProjectGroup<ModuleLineItem>
                      }
                    />
                    <Table
                      rowKey={(_, i) => String(i)}
                      dataSource={
                        (group as FreightStatementProjectGroup<ModuleLineItem>)
                          .items
                      }
                      columns={itemColumns}
                      size="small"
                      pagination={false}
                    />
                  </div>
                ) : 'projectGroups' in group ? (
                  <>
                    <FreightStatementItemGroupHeader group={group} />
                    {group.projectGroups.map((projectGroup) => (
                      <div
                        className="module-items-project-group"
                        key={projectGroup.key}
                      >
                        <FreightStatementProjectGroupHeader
                          group={projectGroup}
                          showSubtotal={false}
                        />
                        <Table
                          rowKey={(_, i) => String(i)}
                          dataSource={projectGroup.items}
                          columns={itemColumns}
                          size="small"
                          pagination={false}
                        />
                      </div>
                    ))}
                  </>
                ) : viewKind === 'customer-statement' ? (
                  <>
                    <CustomerStatementItemGroupHeader
                      group={
                        group as CustomerStatementItemGroup<ModuleLineItem>
                      }
                    />
                    <Table
                      rowKey={(_, i) => String(i)}
                      dataSource={group.items}
                      columns={itemColumns}
                      size="small"
                      pagination={false}
                    />
                  </>
                ) : (
                  <Table
                    rowKey={(_, i) => String(i)}
                    dataSource={group.items}
                    columns={itemColumns}
                    size="small"
                    pagination={false}
                  />
                )}
              </div>
            )
          })}
        </div>
      ) : null}
      {isSuccess && saveResult.record?.id ? (
        <ModuleAttachmentModal
          open={attachmentOpen}
          moduleKey={moduleKey}
          recordId={String(saveResult.record.id)}
          initialFiles={pendingFiles}
          onClose={() => setAttachmentOpen(false)}
        />
      ) : null}
    </WorkspaceOverlay>
  )
}
