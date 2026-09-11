import { Col, Flex, Form, Modal, message, Row, theme } from 'antd'
import dayjs from 'dayjs'
import { type Key, useEffect, useMemo, useState } from 'react'
import { ReceiptDetailDrawer } from './receipt-reconcile-detail-drawer'
import {
  ReceiptAmountField,
  ReceiptBasicInfoFields,
  ReceiptVoucherFields,
} from './receipt-reconcile-form-sections'
import {
  ReceiptReconcileFooter,
  ReceiptReconcileHeader,
} from './receipt-reconcile-header'
import {
  BANK_ACCOUNTS,
  BIZ_TYPES,
  type FormValues,
  fmtMoney,
  MOCK_CUSTOMERS,
  PAY_METHODS,
  type ReceiptMode,
  SETTLEMENT_ENTITIES,
  type StatementItem,
} from './receipt-reconcile-model'
import {
  ReceiptAttachmentNotice,
  ReceiptCustomerOverviewCard,
  ReceiptModeNotice,
  ReceiptSettlementPreviewCard,
} from './receipt-reconcile-side-panels'
import { ReceiptStatementSection } from './receipt-reconcile-statement-section'

interface ReceiptReconcileModalProps {
  open: boolean
  onClose: () => void
}

export default function ReceiptReconcileModal({
  open,
  onClose,
}: ReceiptReconcileModalProps) {
  const { token } = theme.useToken()
  const [form] = Form.useForm<FormValues>()
  const [mode, setMode] = useState<ReceiptMode>('reconcile')
  const [selectedKeys, setSelectedKeys] = useState<Key[]>([])
  const [allocations, setAllocations] = useState<Record<string, number>>({})
  const [drawerStatement, setDrawerStatement] = useState<StatementItem | null>(
    null,
  )
  const [attachments, setAttachments] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [messageApi, contextHolder] = message.useMessage()

  const amount = Form.useWatch('amount', form) ?? 0
  const customerId = Form.useWatch('customerId', form)

  const customer = useMemo(
    () => MOCK_CUSTOMERS.find((c) => c.id === customerId) ?? MOCK_CUSTOMERS[0],
    [customerId],
  )
  const statements = customer.statements

  const [openedOnce, setOpenedOnce] = useState(false)
  if (open && !openedOnce) {
    setOpenedOnce(true)
    setMode('reconcile')
    setDrawerStatement(null)
    setAttachments([])
    setAllocations({})
    setSelectedKeys(MOCK_CUSTOMERS[0].statements.map((s) => s.id))
    form.setFieldsValue({
      receiptDate: dayjs(),
      settlementEntity: SETTLEMENT_ENTITIES[0],
      bizType: BIZ_TYPES[0],
      customerId: MOCK_CUSTOMERS[0].id,
      receiptMethod: PAY_METHODS[0],
      bankAccount: BANK_ACCOUNTS[0],
      amount: 50000,
    })
  }
  if (!open && openedOnce) {
    setOpenedOnce(false)
  }

  const [renderedCustomerId, setRenderedCustomerId] = useState<string | null>(
    null,
  )
  if (open && renderedCustomerId !== customer.id) {
    setRenderedCustomerId(customer.id)
    setAllocations({})
    setSelectedKeys(statements.map((s) => s.id))
  }

  const selectedKeySet = useMemo(() => new Set(selectedKeys), [selectedKeys])

  const fifoAllocate = (total: number) => {
    const sorted = [...statements]
      .filter((s) => selectedKeySet.has(s.id))
      .sort((a, b) => dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf())
    let remaining = Math.max(0, total)
    const next: Record<string, number> = {}
    for (const s of sorted) {
      if (remaining <= 0) break
      const alloc = Math.min(s.outstandingAmount, remaining)
      next[s.id] = Number(alloc.toFixed(2))
      remaining = Number((remaining - alloc).toFixed(2))
    }
    setAllocations(next)
  }

  const totalAllocated = useMemo(
    () =>
      Number(
        Object.entries(allocations)
          .filter(([id]) => selectedKeySet.has(id))
          .reduce((sum, [, v]) => sum + (v ?? 0), 0)
          .toFixed(2),
      ),
    [allocations, selectedKeySet],
  )
  const toPrepaid = Math.max(
    0,
    Number(((amount ?? 0) - totalAllocated).toFixed(2)),
  )
  const remainingDebt = Math.max(
    0,
    Number((customer.totalOutstanding - totalAllocated).toFixed(2)),
  )

  const handleAmountChange = (value: number | null) => {
    if (mode === 'reconcile') fifoAllocate(value ?? 0)
  }

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        void form.submit()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, form])

  const handleSubmit = (draft: boolean) => {
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      messageApi.success(
        draft
          ? `收款单草稿已保存：${fmtMoney(amount)} 元`
          : `确认收款 ${fmtMoney(amount)} 元，核销对账单 ${fmtMoney(totalAllocated)} 元${toPrepaid > 0 ? `，转预收 ${fmtMoney(toPrepaid)} 元` : ''}`,
      )
      onClose()
    }, 600)
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      destroyOnHidden
      centered
      width={1180}
      title={<ReceiptReconcileHeader mode={mode} onModeChange={setMode} />}
      styles={{ body: { paddingTop: token.paddingSM } }}
      footer={
        <ReceiptReconcileFooter
          submitting={submitting}
          onSaveDraft={() => handleSubmit(true)}
          onSubmit={() => form.submit()}
        />
      }
    >
      {contextHolder}
      <Form<FormValues>
        form={form}
        layout="vertical"
        requiredMark={false}
        onFinish={() => handleSubmit(false)}
      >
        <Row gutter={24}>
          <Col span={16}>
            <ReceiptAmountField
              amount={amount ?? 0}
              onAmountChange={handleAmountChange}
            />

            <ReceiptBasicInfoFields />

            {mode === 'reconcile' ? (
              <ReceiptStatementSection
                amount={amount ?? 0}
                allocations={allocations}
                customerName={customer.name}
                onAllocationsChange={setAllocations}
                onClearAllocations={() => setAllocations({})}
                onFifoAllocate={() => fifoAllocate(amount ?? 0)}
                onOpenStatement={setDrawerStatement}
                onSelectedKeysChange={setSelectedKeys}
                selectedKeys={selectedKeys}
                selectedKeySet={selectedKeySet}
                statements={statements}
                totalAllocated={totalAllocated}
              />
            ) : (
              <ReceiptModeNotice
                mode={mode}
                amount={amount ?? 0}
                customerName={customer.name}
              />
            )}

            <ReceiptVoucherFields onAttachmentsChange={setAttachments} />
          </Col>

          <Col span={8}>
            <Flex vertical gap={12}>
              <ReceiptCustomerOverviewCard customer={customer} />
              <ReceiptSettlementPreviewCard
                amount={amount ?? 0}
                totalAllocated={totalAllocated}
                toPrepaid={toPrepaid}
                remainingDebt={remainingDebt}
              />
              <ReceiptAttachmentNotice attachmentCount={attachments.length} />
            </Flex>
          </Col>
        </Row>
      </Form>

      <ReceiptDetailDrawer
        statement={drawerStatement}
        onClose={() => setDrawerStatement(null)}
      />
    </Modal>
  )
}
