import type { TableProps } from 'antd'
import { Button, Segmented, Space, Table, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  MaterialImportPreviewOutcome,
  MaterialImportPreviewResponse,
  MaterialImportPreviewRow,
} from '@/api/master/materials'
import '@/styles/material-import-overlay.css'
import { MaterialFieldChanges } from './MaterialFieldChanges'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  preview: MaterialImportPreviewResponse | null
  fileName?: string
  importing: boolean
  onCancel: () => void
  onConfirm: () => void
}

const OUTCOME_TAG_COLOR: Record<MaterialImportPreviewOutcome, string> = {
  CREATED: 'success',
  UPDATED: 'processing',
  SKIPPED: 'default',
  FAILED: 'error',
}

type OutcomeFilter = 'ALL' | MaterialImportPreviewOutcome

const OUTCOME_FILTERS: readonly OutcomeFilter[] = [
  'ALL',
  'CREATED',
  'UPDATED',
  'SKIPPED',
  'FAILED',
]

/**
 * 导入前差异预览：展示每行新建/更新/跳过/失败与字段差异，确认后再执行正式导入。
 *
 * <p>用 {@link WorkspaceOverlay} 的「主数据对话框」尺寸（宽 `min(1040px, 100% - 24px)`、
 * 高 `max-height: min(900px, 100% - 24px)`）呈现，而非 antd Modal：Modal 挂在 body 上、
 * 遮罩与容器按视口定位，弹层高度只能跟内容长（实测 35 行预览长到 3845px，标题与
 * 「取消 / 确认导入」被顶到覆盖层外，右侧还透出底层列表页表格）。WorkspaceOverlay 的
 * 尺寸按覆盖层容器算，超出部分由面板内部滚动。组件名沿用 Modal 以保持既有引用不变。</p>
 */
export function MaterialImportPreviewModal({
  open,
  preview,
  fileName,
  importing,
  onCancel,
  onConfirm,
}: Props) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<OutcomeFilter>('ALL')

  const rows = useMemo(() => preview?.rows ?? [], [preview])
  const filteredRows = useMemo(
    () =>
      filter === 'ALL' ? rows : rows.filter((row) => row.outcome === filter),
    [rows, filter],
  )

  const outcomeLabel = (outcome: MaterialImportPreviewOutcome) => {
    switch (outcome) {
      case 'CREATED':
        return t('modules.pages.material.importOutcomeCreated')
      case 'UPDATED':
        return t('modules.pages.material.importOutcomeUpdated')
      case 'SKIPPED':
        return t('modules.pages.material.importOutcomeSkipped')
      case 'FAILED':
        return t('modules.pages.material.importOutcomeFailed')
    }
  }

  const filterOptions = OUTCOME_FILTERS.map((value) => ({
    label:
      value === 'ALL'
        ? `${t('modules.pages.material.importFilterAll')} (${rows.length})`
        : `${outcomeLabel(value)} (${rows.filter((row) => row.outcome === value).length})`,
    value,
  }))

  const columns: TableProps<MaterialImportPreviewRow>['columns'] = [
    {
      title: t('modules.pages.material.importColumnRowNumber'),
      dataIndex: 'rowNumber',
      width: 56,
    },
    {
      title: t('modules.pages.material.materialCode'),
      dataIndex: 'materialCode',
      // 176 = 18 位雪花编码(约 151px) + 单元格内边距，固定布局下也不会被折成两行
      width: 176,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: t('modules.pages.material.brand'),
      dataIndex: 'brand',
      width: 90,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: t('modules.pages.material.material'),
      dataIndex: 'material',
      width: 90,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: t('modules.pages.material.importColumnOutcome'),
      dataIndex: 'outcome',
      width: 76,
      render: (outcome: MaterialImportPreviewOutcome) => (
        <Tag color={OUTCOME_TAG_COLOR[outcome]}>{outcomeLabel(outcome)}</Tag>
      ),
    },
    {
      title: t('modules.pages.material.importPreviewColumnChanges'),
      dataIndex: 'changes',
      // 列宽交给剩余空间，文本在单元格内换行（见 material-import-overlay.css）
      render: (_: unknown, row: MaterialImportPreviewRow) =>
        row.changes.length ? (
          <MaterialFieldChanges changes={row.changes} />
        ) : (
          <Typography.Text type="secondary">
            {row.reason ?? t('modules.pages.material.importPreviewNoChange')}
          </Typography.Text>
        ),
    },
  ]

  const handleClose = () => {
    // 正式导入进行中不允许关闭：遮罩点击、Esc 与关闭按钮共用这条出口
    if (importing) {
      return
    }
    setFilter('ALL')
    onCancel()
  }

  return (
    <WorkspaceOverlay
      open={open}
      title={
        fileName
          ? `${t('modules.pages.material.importPreviewTitle')} · ${fileName}`
          : t('modules.pages.material.importPreviewTitle')
      }
      className="workspace-overlay-panel--form-dialog workspace-overlay-panel--import-preview"
      onClose={handleClose}
      footer={
        <Space>
          <Button disabled={importing} onClick={handleClose}>
            {t('common.cancel')}
          </Button>
          <Button
            type="primary"
            loading={importing}
            disabled={!rows.length}
            onClick={onConfirm}
          >
            {t('modules.pages.material.importPreviewConfirm')}
          </Button>
        </Space>
      }
    >
      {preview ? (
        <div className="material-import-overlay-body">
          <Typography.Paragraph
            type={preview.failedCount > 0 ? 'warning' : undefined}
          >
            {t('modules.pages.material.importPreviewSummary', {
              totalRows: preview.totalRows,
              createdCount: preview.createdCount,
              updatedCount: preview.updatedCount,
              skippedCount: preview.skippedCount,
              failedCount: preview.failedCount,
            })}
          </Typography.Paragraph>
          <Segmented
            aria-label={t('modules.pages.material.importPreviewTitle')}
            value={filter}
            options={filterOptions}
            onChange={(value) => setFilter(String(value) as OutcomeFilter)}
          />
          <Table<MaterialImportPreviewRow>
            className="material-import-rows-table"
            rowKey="rowNumber"
            size="small"
            tableLayout="fixed"
            columns={columns}
            dataSource={filteredRows}
            locale={{
              emptyText: t('modules.pages.material.importPreviewEmpty'),
            }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </div>
      ) : null}
    </WorkspaceOverlay>
  )
}
