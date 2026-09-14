import type { TableProps } from 'antd'
import { Button, Modal, Segmented, Space, Table, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  MaterialImportPreviewOutcome,
  MaterialImportPreviewResponse,
  MaterialImportPreviewRow,
} from '@/api/master/materials'
import { MaterialFieldChanges } from './MaterialFieldChanges'

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

/** 导入前差异预览：展示每行新建/更新/跳过/失败与字段差异，确认后再执行正式导入。 */
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
      width: 150,
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
    setFilter('ALL')
    onCancel()
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      maskClosable={false}
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
      title={
        fileName
          ? `${t('modules.pages.material.importPreviewTitle')} · ${fileName}`
          : t('modules.pages.material.importPreviewTitle')
      }
      width={920}
      destroyOnHidden
    >
      {preview ? (
        <div className="flex flex-col gap-3">
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
            rowKey="rowNumber"
            size="small"
            columns={columns}
            dataSource={filteredRows}
            locale={{
              emptyText: t('modules.pages.material.importPreviewEmpty'),
            }}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </div>
      ) : null}
    </Modal>
  )
}
