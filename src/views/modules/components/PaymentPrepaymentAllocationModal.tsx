import type { TableProps } from 'antd'
import { Button, Form, InputNumber, Modal, Select, Table } from 'antd'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchPaymentPrepaymentAllocationContext,
  listPaymentSupplierStatementCandidates,
  type PaymentPrepaymentAllocation,
  type PaymentPrepaymentAllocationInput,
  replacePaymentPrepaymentAllocations,
} from '@/api/payment-prepayment-allocations'
import type { ModuleRecord } from '@/types/module-page'
import { message } from '@/utils/antd-app'
import { formatAmount } from '@/utils/formatters'
import { asNumber, asString } from '@/utils/type-narrowing'
import {
  buildPrepaymentStatementOptions,
  type PrepaymentAllocationValidationMessages,
  summarizePrepaymentAllocations,
  validatePrepaymentAllocations,
} from './payment-prepayment-allocation-utils'

interface Props {
  open: boolean
  payment: ModuleRecord | null
  onClose: () => void
  onSaved: () => Promise<void> | void
}

interface AllocationRow extends PaymentPrepaymentAllocationInput {
  rowKey: string
}

interface PrepaymentLoadState {
  loading: boolean
  context: ModuleRecord | null
  candidates: ModuleRecord[]
  currentAllocations: PaymentPrepaymentAllocation[]
}

const EMPTY_LOAD_STATE: PrepaymentLoadState = {
  loading: false,
  context: null,
  candidates: [],
  currentAllocations: [],
}

export function PaymentPrepaymentAllocationModal({
  open,
  payment,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation()
  const nextRowKey = useRef(0)
  const [loadState, setLoadState] = useState(EMPTY_LOAD_STATE)
  const { loading, context, candidates, currentAllocations } = loadState
  const [saving, setSaving] = useState(false)
  const [rows, setRows] = useState<AllocationRow[]>([])
  const [validationError, setValidationError] = useState('')
  const paymentId = asString(payment?.id).trim()
  const allocationLoadFailedMessage = t(
    'modules.pages.payment.allocationLoadFailed',
  )

  useEffect(() => {
    if (!open || !paymentId) return
    let cancelled = false

    const load = async () => {
      setLoadState({ ...EMPTY_LOAD_STATE, loading: true })
      setValidationError('')
      setRows([])
      try {
        const detail = await fetchPaymentPrepaymentAllocationContext(paymentId)
        if (cancelled) return
        const allocations = normalizeCurrentAllocations(detail)
        setRows(
          allocations.map((allocation, index) => ({
            rowKey: allocation.id || `current-${index}`,
            ...(allocation.id ? { id: allocation.id } : {}),
            sourceStatementId: allocation.sourceStatementId,
            allocatedAmount: allocation.allocatedAmount,
          })),
        )

        const statementCandidates =
          await listPaymentSupplierStatementCandidates({
            supplierCode: asString(detail.supplierCode).trim(),
            settlementCompanyId: asString(detail.settlementCompanyId).trim(),
          })
        if (cancelled) return
        setLoadState({
          loading: false,
          context: detail,
          candidates: statementCandidates,
          currentAllocations: allocations,
        })
      } catch (error) {
        if (!cancelled) {
          setLoadState(EMPTY_LOAD_STATE)
          message.error(
            error instanceof Error
              ? error.message
              : allocationLoadFailedMessage,
          )
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [allocationLoadFailedMessage, open, paymentId])

  const statementOptions = useMemo(
    () =>
      buildPrepaymentStatementOptions(
        candidates,
        currentAllocations,
        (statementNo, availableAmount) =>
          t('modules.pages.payment.statementAvailableOption', {
            statementNo,
            amount: formatAmount(availableAmount),
          }),
      ),
    [candidates, currentAllocations, t],
  )
  const availableAmountByStatementId = useMemo(
    () =>
      new Map(
        statementOptions.map((option) => [
          option.value,
          option.availableAmount,
        ]),
      ),
    [statementOptions],
  )
  const summary = summarizePrepaymentAllocations(
    context?.amount ?? payment?.amount,
    rows,
  )

  const updateRow = (
    rowKey: string,
    values: Partial<PaymentPrepaymentAllocationInput>,
  ) => {
    setRows((current) =>
      current.map((row) =>
        row.rowKey === rowKey ? { ...row, ...values } : row,
      ),
    )
    setValidationError('')
  }

  const columns: TableProps<AllocationRow>['columns'] = [
    {
      title: t('modules.pages.payment.supplierStatement'),
      key: 'sourceStatementId',
      render: (_, row) => {
        const selectedByOtherRows = new Set<string>()
        for (const candidate of rows) {
          if (candidate.rowKey !== row.rowKey) {
            selectedByOtherRows.add(candidate.sourceStatementId)
          }
        }
        return (
          <Select
            value={row.sourceStatementId || undefined}
            options={statementOptions.map((option) => ({
              ...option,
              disabled: selectedByOtherRows.has(option.value),
            }))}
            placeholder={t('modules.pages.payment.supplierStatement')}
            showSearch={{ optionFilterProp: 'label' }}
            onChange={(value) => {
              updateRow(row.rowKey, { sourceStatementId: value })
            }}
            className="w-full"
          />
        )
      },
    },
    {
      title: t('modules.pages.payment.allocationAmount'),
      key: 'allocatedAmount',
      width: 180,
      render: (_, row) => {
        const availableAmount = availableAmountByStatementId.get(
          row.sourceStatementId,
        )
        return (
          <InputNumber
            value={asNumber(row.allocatedAmount)}
            min={0.01}
            max={availableAmount}
            precision={2}
            step={0.01}
            onChange={(value) => {
              updateRow(row.rowKey, { allocatedAmount: value ?? 0 })
            }}
            className="w-full"
          />
        )
      },
    },
    {
      title: '',
      key: 'action',
      width: 88,
      align: 'center',
      render: (_, row) => (
        <Button
          type="link"
          danger
          onClick={() => {
            setRows((current) =>
              current.filter((candidate) => candidate.rowKey !== row.rowKey),
            )
            setValidationError('')
          }}
        >
          {t('common.delete')}
        </Button>
      ),
    },
  ]

  const handleSave = async () => {
    if (!paymentId) return
    const payload = rows.map(({ id, sourceStatementId, allocatedAmount }) => ({
      ...(id ? { id } : {}),
      sourceStatementId,
      allocatedAmount,
    }))
    const validationMessages: PrepaymentAllocationValidationMessages = {
      statementRequired: (lineNumber) =>
        t('modules.pages.payment.statementSelectionRequired', { lineNumber }),
      positiveAmountRequired: (lineNumber) =>
        t('modules.pages.payment.positiveAllocationRequired', { lineNumber }),
      statementAmountExceeded: (lineNumber) =>
        t('modules.pages.payment.statementAllocationExceeded', { lineNumber }),
      duplicateStatement: t(
        'modules.pages.payment.duplicateStatementAllocation',
      ),
      paymentAmountExceeded: t(
        'modules.pages.payment.paymentAllocationExceeded',
      ),
    }
    const error = validatePrepaymentAllocations(
      context?.amount ?? payment?.amount,
      payload,
      availableAmountByStatementId,
      validationMessages,
    )
    if (error) {
      setValidationError(error)
      return
    }

    try {
      setSaving(true)
      await replacePaymentPrepaymentAllocations(paymentId, payload)
    } catch (saveError) {
      setSaving(false)
      message.error(
        saveError instanceof Error
          ? saveError.message
          : t('modules.pages.payment.allocationSaveFailed'),
      )
      return
    }

    setSaving(false)
    message.success(t('modules.pages.payment.allocationSaved'))
    onClose()
    try {
      await onSaved()
    } catch {
      // 父列表刷新不改变已成功的保存结果。
    }
  }

  return (
    <Modal
      title={`${t('modules.pages.payment.allocatePrepayment')} · ${asString(
        context?.paymentNo ?? payment?.paymentNo,
      )}`}
      open={open}
      loading={loading}
      confirmLoading={saving}
      okButtonProps={{ disabled: loading || !context }}
      okText={t('common.save')}
      cancelText={t('common.cancel')}
      width={820}
      destroyOnHidden
      mask={{ closable: false }}
      onOk={() => {
        void handleSave()
      }}
      onCancel={() => {
        if (!saving) onClose()
      }}
      cancelButtonProps={{ disabled: saving }}
    >
      <Form layout="vertical">
        <PaymentPrepaymentAllocationSummary summary={summary} />

        <Table<AllocationRow>
          rowKey="rowKey"
          columns={columns}
          dataSource={rows}
          pagination={false}
          size="small"
          locale={{ emptyText: t('modules.pages.payment.noAllocations') }}
        />

        <Button
          type="dashed"
          className="mt-3"
          onClick={() => {
            nextRowKey.current += 1
            setRows((current) => [
              ...current,
              {
                rowKey: `new-${nextRowKey.current}`,
                sourceStatementId: '',
                allocatedAmount: 0,
              },
            ])
            setValidationError('')
          }}
        >
          {t('modules.pages.payment.addAllocation')}
        </Button>
        {validationError ? (
          <div className="mt-2 text-red-600" role="alert">
            {validationError}
          </div>
        ) : null}
      </Form>
    </Modal>
  )
}

function PaymentPrepaymentAllocationSummary({
  summary,
}: {
  summary: ReturnType<typeof summarizePrepaymentAllocations>
}) {
  const { t } = useTranslation()
  return (
    <div className="mb-4 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3">
      <span>
        {t('modules.pages.payment.paymentAmount')}：
        {formatAmount(summary.paymentAmount)}
      </span>
      <span>
        {t('modules.pages.payment.allocatedAmount')}：
        {formatAmount(summary.allocatedAmount)}
      </span>
      <span>
        {t('modules.pages.payment.remainingAmount')}：
        {formatAmount(summary.remainingAmount)}
      </span>
    </div>
  )
}

function normalizeCurrentAllocations(
  payment: ModuleRecord,
): PaymentPrepaymentAllocation[] {
  return (payment.items || []).flatMap((item, index) => {
    const sourceStatementId = asString(item.sourceStatementId).trim()
    if (!sourceStatementId) return []
    const id = asString(item.id).trim()
    return [
      {
        ...(id ? { id } : {}),
        lineNo: asNumber(item.lineNo) || index + 1,
        sourceStatementId,
        statementNo: asString(item.statementNo).trim(),
        statementBalanceAmount: asNumber(item.statementBalanceAmount),
        allocatedAmount: asNumber(item.allocatedAmount),
      },
    ]
  })
}
