import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchContext: vi.fn(),
  listCandidates: vi.fn(),
  messageError: vi.fn(),
  messageSuccess: vi.fn(),
  replaceAllocations: vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === 'modules.pages.payment.statementAvailableOption') {
        return `${String(options?.statementNo)}（可分配 ${String(options?.amount)}）`
      }
      return (
        {
          'common.cancel': '取消',
          'common.delete': '删除',
          'common.save': '保存',
          'modules.pages.payment.addAllocation': '新增分配',
          'modules.pages.payment.allocatePrepayment': '分配预付款',
          'modules.pages.payment.allocatedAmount': '已分配',
          'modules.pages.payment.allocationAmount': '分配金额',
          'modules.pages.payment.allocationLoadFailed': '加载预付款分配失败',
          'modules.pages.payment.allocationSaveFailed': '保存预付款分配失败',
          'modules.pages.payment.allocationSaved': '预付款分配已保存',
          'modules.pages.payment.noAllocations': '暂无分配明细',
          'modules.pages.payment.paymentAmount': '付款金额',
          'modules.pages.payment.remainingAmount': '未分配',
          'modules.pages.payment.supplierStatement': '供应商对账单',
        }[key] || key
      )
    },
  }),
}))

vi.mock('@/api/payment-prepayment-allocations', () => ({
  fetchPaymentPrepaymentAllocationContext: mocks.fetchContext,
  listPaymentSupplierStatementCandidates: mocks.listCandidates,
  replacePaymentPrepaymentAllocations: mocks.replaceAllocations,
}))

vi.mock('@/utils/antd-app', () => ({
  message: {
    error: mocks.messageError,
    success: mocks.messageSuccess,
  },
}))

import { PaymentPrepaymentAllocationModal } from './PaymentPrepaymentAllocationModal'

describe('PaymentPrepaymentAllocationModal', () => {
  const payment = {
    id: '901',
    paymentNo: 'FK-001',
    paymentPurpose: 'PURCHASE_PREPAYMENT',
    status: '已付款',
  }
  const detail = {
    ...payment,
    amount: 1000,
    supplierCode: 'SUP-001',
    supplierName: '供应商甲',
    settlementCompanyId: '301',
    settlementCompanyName: '结算主体甲',
    items: [
      {
        id: '801',
        lineNo: 1,
        sourceStatementId: '701',
        statementNo: 'GYDZ-001',
        statementBalanceAmount: 300,
        allocatedAmount: 200,
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mocks.fetchContext.mockResolvedValue(detail)
    mocks.listCandidates.mockResolvedValue([
      {
        id: '701',
        statementNo: 'GYDZ-001',
        supplierCode: 'SUP-001',
        supplierName: '供应商甲',
        settlementCompanyId: '301',
        status: '已确认',
        closingAmount: 300,
      },
    ])
    mocks.replaceAllocations.mockResolvedValue(detail.items)
  })

  it('loads detail and matching statement candidates and shows the allocation summary', async () => {
    render(
      <PaymentPrepaymentAllocationModal
        open={true}
        payment={payment}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    expect(await screen.findByText('付款金额：1000.00')).toBeInTheDocument()
    expect(screen.getByText('已分配：200.00')).toBeInTheDocument()
    expect(screen.getByText('未分配：800.00')).toBeInTheDocument()
    expect(screen.getByText(/GYDZ-001/)).toBeInTheDocument()
    expect(mocks.fetchContext).toHaveBeenCalledWith('901')
    expect(mocks.listCandidates).toHaveBeenCalledWith({
      supplierCode: 'SUP-001',
      settlementCompanyId: '301',
    })
    expect(screen.getByRole('spinbutton')).toHaveAttribute(
      'aria-valuemax',
      '500',
    )
  })

  it('saves current allocations and refreshes the parent list', async () => {
    const onClose = vi.fn()
    const onSaved = vi.fn().mockResolvedValue(undefined)
    render(
      <PaymentPrepaymentAllocationModal
        open={true}
        payment={payment}
        onClose={onClose}
        onSaved={onSaved}
      />,
    )
    await screen.findByText('已分配：200.00')

    fireEvent.click(screen.getByText(/保\s*存/))

    await waitFor(() => {
      expect(mocks.replaceAllocations).toHaveBeenCalledWith('901', [
        {
          id: '801',
          sourceStatementId: '701',
          allocatedAmount: 200,
        },
      ])
    })
    expect(onSaved).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(mocks.messageSuccess).toHaveBeenCalledWith('预付款分配已保存')
  })

  it('allows removing all rows and saving an empty allocation list', async () => {
    render(
      <PaymentPrepaymentAllocationModal
        open={true}
        payment={payment}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )
    await screen.findByText('已分配：200.00')

    fireEvent.click(screen.getByText('删除'))
    expect(screen.getByText('已分配：0.00')).toBeInTheDocument()
    fireEvent.click(screen.getByText(/保\s*存/))

    await waitFor(() => {
      expect(mocks.replaceAllocations).toHaveBeenCalledWith('901', [])
    })
  })

  it('closes after a successful save when refreshing the parent list fails', async () => {
    const onClose = vi.fn()
    const onSaved = vi.fn().mockRejectedValue(new Error('列表刷新失败'))
    render(
      <PaymentPrepaymentAllocationModal
        open={true}
        payment={payment}
        onClose={onClose}
        onSaved={onSaved}
      />,
    )
    await screen.findByText('已分配：200.00')

    fireEvent.click(screen.getByText(/保\s*存/))

    await waitFor(() => {
      expect(mocks.replaceAllocations).toHaveBeenCalledTimes(1)
      expect(onSaved).toHaveBeenCalledTimes(1)
    })
    expect(mocks.messageSuccess).toHaveBeenCalledWith('预付款分配已保存')
    expect(mocks.messageError).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('reports loading failures without opening the generic editor', async () => {
    mocks.fetchContext.mockRejectedValue(new Error('详情加载失败'))
    render(
      <PaymentPrepaymentAllocationModal
        open={true}
        payment={payment}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(mocks.messageError).toHaveBeenCalledWith('详情加载失败')
    })
    expect(mocks.listCandidates).not.toHaveBeenCalled()
  })

  it('keeps saving disabled when the authoritative payment detail fails to load', async () => {
    mocks.fetchContext.mockRejectedValue(new Error('详情加载失败'))
    render(
      <PaymentPrepaymentAllocationModal
        open={true}
        payment={payment}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(mocks.messageError).toHaveBeenCalledWith('详情加载失败')
    })
    const saveButton = await screen.findByRole('button', { name: /保\s*存/ })
    expect(saveButton).toBeDisabled()
    fireEvent.click(saveButton)
    expect(mocks.replaceAllocations).not.toHaveBeenCalled()
  })
})
