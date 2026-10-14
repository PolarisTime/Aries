import type { TableProps } from 'antd'
import { Button, Segmented, Space, Table, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  MaterialImportOutcome,
  MaterialImportResponse,
  MaterialImportRowResult,
} from '@/api/master/materials'
import '@/styles/material-import-overlay.css'
import { MaterialBatchRollbackButton } from '@/views/modules/components/MaterialBatchRollbackButton'
import { WorkspaceOverlay } from './WorkspaceOverlay'

interface Props {
  open: boolean
  result: MaterialImportResponse | null
  /** 后端当前批次数只出现在历史记录中；提供时展示批次回滚入口。 */
  importBatchNo?: string | null
  onRollback?: (importBatchNo: string) => Promise<void> | void
  onClose: () => void
}

const OUTCOME_TAG_COLOR: Record<MaterialImportOutcome, string> = {
  CREATED: 'success',
  UPDATED: 'processing',
  SKIPPED: 'default',
  FAILED: 'error',
}

type OutcomeFilter = 'ALL' | MaterialImportOutcome

const OUTCOME_FILTERS: readonly OutcomeFilter[] = [
  'ALL',
  'CREATED',
  'UPDATED',
  'SKIPPED',
  'FAILED',
]

/**
 * 导入结果弹层：逐行列出新建/更新/跳过/失败与原因，并提供批次回滚入口。
 *
 * <p>与 {@link MaterialImportPreviewModal} 同根因同修法：原来是 antd Modal（width=880），
 * 高度跟内容长、`body` 不滚，行数一多标题与「关闭」就跑到覆盖层外；这里统一改用
 * {@link WorkspaceOverlay} 的「主数据对话框」尺寸（宽 `min(1040px, 100% - 24px)`、
 * 高 `max-height: min(900px, 100% - 24px)`），超出部分在面板内部滚动。组件名沿用 Modal
 * 以保持既有引用不变。</p>
 */
export function MaterialImportResultModal({
  open,
  result,
  importBatchNo,
  onRollback,
  onClose,
}: Props) {
  const { t } = useTranslation()
  const [filter, setFilter] = useState<OutcomeFilter>('ALL')
  const rows = useMemo(() => result?.rows ?? [], [result])
  const filteredRows = useMemo(
    () =>
      filter === 'ALL' ? rows : rows.filter((row) => row.outcome === filter),
    [rows, filter],
  )

  const outcomeLabel = (outcome: MaterialImportOutcome) => {
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

  const columns: TableProps<MaterialImportRowResult>['columns'] = [
    {
      title: t('modules.pages.material.importColumnRowNumber'),
      dataIndex: 'rowNumber',
      width: 64,
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
      width: 96,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: t('modules.pages.material.material'),
      dataIndex: 'material',
      width: 96,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: t('modules.pages.material.spec'),
      dataIndex: 'spec',
      width: 72,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: t('modules.pages.material.length'),
      dataIndex: 'length',
      width: 72,
      render: (value: string | null) => value ?? '-',
    },
    {
      title: t('modules.pages.material.importColumnOutcome'),
      dataIndex: 'outcome',
      width: 80,
      render: (outcome: MaterialImportOutcome) => (
        <Tag color={OUTCOME_TAG_COLOR[outcome]}>{outcomeLabel(outcome)}</Tag>
      ),
    },
    {
      title: t('modules.pages.material.importColumnReason'),
      dataIndex: 'reason',
      // 失败原因可能很长，列宽交给剩余空间，文本在单元格内换行（见 material-import-overlay.css）
      render: (reason: string | null) => reason ?? '-',
    },
  ]

  const handleClose = () => {
    setFilter('ALL')
    onClose()
  }

  return (
    <WorkspaceOverlay
      open={open}
      title={t('modules.pages.material.importResultTitle')}
      className="workspace-overlay-panel--form-dialog workspace-overlay-panel--import-result"
      onClose={handleClose}
      footer={
        <Button type="primary" onClick={handleClose}>
          {t('common.close')}
        </Button>
      }
    >
      {result ? (
        <div className="material-import-overlay-body">
          {importBatchNo ? (
            <Space wrap>
              <Typography.Text>
                {t('modules.pages.material.importBatchNo')}: {importBatchNo}
              </Typography.Text>
              <MaterialBatchRollbackButton
                importBatchNo={importBatchNo}
                onRolledBack={
                  onRollback ? () => onRollback(importBatchNo) : undefined
                }
              />
            </Space>
          ) : null}
          <Typography.Paragraph
            type={result.failedCount > 0 ? 'warning' : undefined}
          >
            {t('modules.pages.material.importSuccessSummary', {
              totalRows: result.totalRows,
              successCount: result.successCount,
              createdCount: result.createdCount,
              updatedCount: result.updatedCount,
              skippedCount: result.skippedCount,
              failedCount: result.failedCount,
            })}
          </Typography.Paragraph>
          <Segmented
            aria-label={t('modules.pages.material.importResultTitle')}
            value={filter}
            options={filterOptions}
            onChange={(value) => setFilter(String(value) as OutcomeFilter)}
          />
          <Table<MaterialImportRowResult>
            className="material-import-rows-table"
            rowKey="rowNumber"
            size="small"
            tableLayout="fixed"
            columns={columns}
            dataSource={filteredRows}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </div>
      ) : null}
    </WorkspaceOverlay>
  )
}
