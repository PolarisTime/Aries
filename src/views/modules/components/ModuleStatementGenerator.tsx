import Button from 'antd/es/button'
import Modal from 'antd/es/modal'
import Space from 'antd/es/space'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AppResultModal } from '@/components/AppResultModal'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

const TYPE_LABEL_KEYS: Record<string, string> = {
  supplier: 'modules.statement.supplier',
  customer: 'modules.statement.customer',
  freight: 'modules.statement.freight',
}

const DATE_FIELD: Record<string, keyof ModuleRecord> = {
  supplier: 'inboundDate',
  customer: 'deliveryDate',
  freight: 'billTime',
}

const NAME_FIELD: Record<string, keyof ModuleRecord> = {
  supplier: 'supplierName',
  customer: 'customerName',
  freight: 'carrierName',
}

function extractCounterparty(rows: ModuleRecord[], type: string, t: (key: string) => string): string {
  const nameField = NAME_FIELD[type]
  const names = new Set(
    rows.flatMap((r) => {
      const v = asString(r[nameField])
      return v ? [v] : []
    }),
  )
  if (names.size === 0) throw new Error(t('modules.statement.counterpartyNotFound'))
  if (names.size > 1)
    throw new Error(t('modules.statement.multipleCounterparties'))
  return [...names][0]
}

function extractDateRange(
  rows: ModuleRecord[],
  type: string,
  t: (key: string) => string,
): { start: string; end: string } {
  const dateField = DATE_FIELD[type]
  const dates = rows
    .flatMap((r) => {
      const v = asString(r[dateField])
      return v ? [v] : []
    })
    .sort()
  if (dates.length === 0) throw new Error(t('modules.statement.dateMissing'))
  return { start: dates[0], end: dates[dates.length - 1] }
}

interface Props {
  open: boolean
  statementType: 'customer' | 'supplier' | 'freight'
  selectedRows: ModuleRecord[]
  onClose: () => void
  onGenerate: (
    counterpartyName: string,
    startDate: string,
    endDate: string,
  ) => Promise<void>
}

export function ModuleStatementGenerator({
  open,
  statementType,
  selectedRows,
  onClose,
  onGenerate,
}: Props) {
  const { t } = useTranslation()
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{
    status: 'success' | 'error'
    message: string
  } | null>(null)

  const summary = (() => {
    if (!selectedRows.length) return null
    try {
      const counterparty = extractCounterparty(selectedRows, statementType, t)
      const { start, end } = extractDateRange(selectedRows, statementType, t)
      return { counterparty, start, end }
    } catch {
      return null
    }
  })()

  const handleGenerate = async () => {
    if (!summary) return
    try {
      setGenerating(true)
      await onGenerate(summary.counterparty, summary.start, summary.end)
      setResult({ status: 'success', message: t('modules.statement.generated') })
      setGenerating(false)
    } catch (err) {
      setResult({
        status: 'error',
        message: err instanceof Error ? err.message : t('modules.statement.generateFailed'),
      })
      setGenerating(false)
    }
  }

  const typeLabel = t(TYPE_LABEL_KEYS[statementType] || '')

  return (
    <>
      <Modal
        title={t('modules.statement.generateTitle', { type: typeLabel })}
        open={open}
        onCancel={onClose}
        footer={
          <Space>
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              type="primary"
              loading={generating}
              disabled={!summary}
              onClick={() => {
                void handleGenerate()
              }}
            >
              {t('modules.statement.generateButton')}
            </Button>
          </Space>
        }
        width={520}
        destroyOnHidden
      >
        {selectedRows.length === 0 ? (
          <Typography.Text type="secondary">
            {t('modules.statement.selectHint')}
          </Typography.Text>
        ) : !summary ? (
          <Typography.Text type="danger">
            {t('modules.statement.extractError')}
          </Typography.Text>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{t('modules.statement.counterpartyUnit')}</span>
              <Tag color="blue">{summary.counterparty}</Tag>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{t('modules.statement.period')}</span>
              <span className="font-medium">
                {summary.start} ~ {summary.end}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">{t('modules.statement.documentCount')}</span>
              <span className="font-medium">{selectedRows.length} {t('modules.statement.documentCountUnit')}</span>
            </div>
          </div>
        )}
      </Modal>

      <AppResultModal
        open={!!result}
        status={result?.status ?? 'success'}
        subTitle={result?.message}
        footer={
          <Button
            type="primary"
            onClick={() => {
              setResult(null)
              if (result?.status === 'success') onClose()
            }}
          >
            {t('modules.statement.gotIt')}
          </Button>
        }
        onClose={() => {
          setResult(null)
          if (result?.status === 'success') onClose()
        }}
      />
    </>
  )
}
