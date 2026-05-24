import Button from 'antd/es/button'
import Modal from 'antd/es/modal'
import Space from 'antd/es/space'
import Tag from 'antd/es/tag'
import Typography from 'antd/es/typography'
import { useMemo, useState } from 'react'
import { AppResultModal } from '@/components/AppResultModal'
import type { ModuleRecord } from '@/types/module-page'
import { asString } from '@/utils/type-narrowing'

const TYPE_LABEL: Record<string, string> = {
  supplier: '供应商',
  customer: '客户',
  freight: '物流',
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

function extractCounterparty(rows: ModuleRecord[], type: string): string {
  const nameField = NAME_FIELD[type]
  const names = new Set(
    rows.flatMap((r) => {
      const v = asString(r[nameField])
      return v ? [v] : []
    }),
  )
  if (names.size === 0) throw new Error('未找到对方单位信息')
  if (names.size > 1)
    throw new Error('选中的单据包含多个对方单位，请只勾选同一单位的单据')
  return [...names][0]
}

function extractDateRange(
  rows: ModuleRecord[],
  type: string,
): { start: string; end: string } {
  const dateField = DATE_FIELD[type]
  const dates = rows
    .flatMap((r) => {
      const v = asString(r[dateField])
      return v ? [v] : []
    })
    .sort()
  if (dates.length === 0) throw new Error('选中的单据缺少日期信息')
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
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<{
    status: 'success' | 'error'
    message: string
  } | null>(null)

  const summary = useMemo(() => {
    if (!selectedRows.length) return null
    try {
      const counterparty = extractCounterparty(selectedRows, statementType)
      const { start, end } = extractDateRange(selectedRows, statementType)
      return { counterparty, start, end }
    } catch {
      return null
    }
  }, [selectedRows, statementType])

  const handleGenerate = async () => {
    if (!summary) return
    try {
      setGenerating(true)
      await onGenerate(summary.counterparty, summary.start, summary.end)
      setResult({ status: 'success', message: '对账单已生成' })
    } catch (err) {
      setResult({
        status: 'error',
        message: err instanceof Error ? err.message : '生成失败，请稍后重试',
      })
    } finally {
      setGenerating(false)
    }
  }

  const typeLabel = TYPE_LABEL[statementType] || ''

  return (
    <>
      <Modal
        title={`生成${typeLabel}对账单`}
        open={open}
        onCancel={onClose}
        footer={
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button
              type="primary"
              loading={generating}
              disabled={!summary}
              onClick={() => {
                void handleGenerate()
              }}
            >
              生成对账单
            </Button>
          </Space>
        }
        width={520}
        destroyOnHidden
      >
        {selectedRows.length === 0 ? (
          <Typography.Text type="secondary">
            请先在列表中勾选需要生成对账单的单据
          </Typography.Text>
        ) : !summary ? (
          <Typography.Text type="danger">
            无法从选中的单据中提取对账信息，请检查数据完整性
          </Typography.Text>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-gray-500">对方单位：</span>
              <Tag color="blue">{summary.counterparty}</Tag>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">对账期间：</span>
              <span className="font-medium">
                {summary.start} ~ {summary.end}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">单据数量：</span>
              <span className="font-medium">{selectedRows.length} 笔</span>
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
            知道了
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
