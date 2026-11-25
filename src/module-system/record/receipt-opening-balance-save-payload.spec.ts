import { describe, expect, it } from 'vitest'
import '@/module-system/behavior/module-behavior-registry'
import { toSaveRequest } from './module-save-payload'

describe('收款单核销项目期初欠款保存载荷', () => {
  it('支持客户收款单混合核销项目期初欠款与客户对账单', async () => {
    const payload = (await toSaveRequest('receipt', {
      receiptNo: 'RC-100',
      counterpartyType: '客户',
      counterpartyId: '1001',
      customerId: '1001',
      customerName: '测试客户',
      projectId: '2001',
      projectName: '测试项目',
      settlementCompanyId: '3001',
      settlementCompanyName: '测试主体',
      receiptDate: '2026-09-01',
      payType: '银行转账',
      amount: 9000,
      accountId: '4001',
      status: 'DRAFT',
      operatorName: '经办人',
      receiptAllocations: [
        {
          key: 'a1',
          sourceType: 'OPENING_BALANCE',
          sourceOpeningBalanceId: '9007199254740993',
          allocatedAmount: 6000,
        },
        {
          key: 'a2',
          sourceType: 'STATEMENT',
          sourceCustomerStatementId: '9007199254740994',
          allocatedAmount: 3000,
        },
      ],
    } as never)) as Record<string, unknown>

    expect(payload.items).toEqual([
      {
        sourceOpeningBalanceId: '9007199254740993',
        allocatedAmount: 6000,
      },
      {
        sourceCustomerStatementId: '9007199254740994',
        allocatedAmount: 3000,
      },
    ])
  })

  it('同一核销行同时填对账单和期初欠款时拒绝序列化', async () => {
    await expect(
      toSaveRequest('receipt', {
        counterpartyType: '客户',
        amount: 1000,
        receiptAllocations: [
          {
            key: 'bad',
            sourceType: 'OPENING_BALANCE',
            sourceOpeningBalanceId: '9007199254740993',
            sourceCustomerStatementId: '9007199254740994',
            allocatedAmount: 1000,
          },
        ],
      } as never),
    ).rejects.toThrow('不能同时关联客户对账单和项目期初欠款')
  })

  it('供应商收款单自动清空核销明细', async () => {
    const payload = (await toSaveRequest('receipt', {
      counterpartyType: '供应商',
      receiptPurpose: 'SUPPLIER_PREPAYMENT_REFUND',
      amount: 1000,
      receiptAllocations: [
        {
          key: 'a1',
          sourceType: 'OPENING_BALANCE',
          sourceOpeningBalanceId: '9007199254740993',
          allocatedAmount: 1000,
        },
      ],
    } as never)) as Record<string, unknown>

    expect(payload.items).toEqual([])
  })
})
