import type { TableProps } from 'antd'
import { Button, Modal, Segmented, Table, Tag, Typography } from 'antd'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type {
  MaterialImportOutcome,
  MaterialImportResponse,
  MaterialImportRowResult,
} from '@/api/master/materials'

interface Props {
  open: boolean
  result: MaterialImportResponse | null
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

export function MaterialImportResultModal({ open, result, onClose }: Props) {
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
      width: 160,
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
      render: (reason: string | null) => reason ?? '-',
    },
  ]

  const handleClose = () => {
    setFilter('ALL')
    onClose()
  }

  return (
    <Modal
      open={open}
      onCancel={handleClose}
      footer={
        <Button type="primary" onClick={handleClose}>
          {t('common.close')}
        </Button>
      }
      title={t('modules.pages.material.importResultTitle')}
      width={880}
      destroyOnHidden
    >
      {result ? (
        <div className="flex flex-col gap-3">
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
            rowKey="rowNumber"
            size="small"
            columns={columns}
            dataSource={filteredRows}
            pagination={{ pageSize: 10, showSizeChanger: false }}
          />
        </div>
      ) : null}
    </Modal>
  )
}
