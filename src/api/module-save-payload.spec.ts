import { describe, expect, it } from 'vitest'
import { serializeBusinessRecordForSave } from './module-save-payload'

describe('module-save-payload', () => {
  it('keeps receipt amount in save payload', () => {
    const payload = serializeBusinessRecordForSave('receipt', {
      id: '',
      receiptNo: 'RC20260001',
      customerName: '测试客户',
      projectName: '测试项目',
      sourceStatementId: '308251467645452288',
      receiptDate: '2026-05-09',
      payType: '银行转账',
      amount: 123456.78,
      status: '已收款',
      operatorName: 'test9',
      remark: 'ok',
    })

    expect(payload).toMatchObject({
      receiptNo: 'RC20260001',
      customerName: '测试客户',
      projectName: '测试项目',
      sourceStatementId: '308251467645452288',
      receiptDate: '2026-05-09',
      payType: '银行转账',
      amount: 123456.78,
      status: '已收款',
      operatorName: 'test9',
      remark: 'ok',
    })
  })

  it('keeps payment amount in save payload', () => {
    const payload = serializeBusinessRecordForSave('payment', {
      id: '',
      paymentNo: 'FK20260001',
      businessType: '供应商',
      counterpartyName: '测试供应商',
      sourceStatementId: '308251467645452289',
      paymentDate: '2026-05-09',
      payType: '银行转账',
      amount: 654321.12,
      status: '已付款',
      operatorName: 'test9',
      remark: 'ok',
    })

    expect(payload).toMatchObject({
      paymentNo: 'FK20260001',
      businessType: '供应商',
      counterpartyName: '测试供应商',
      sourceStatementId: '308251467645452289',
      paymentDate: '2026-05-09',
      payType: '银行转账',
      amount: 654321.12,
      status: '已付款',
      operatorName: 'test9',
      remark: 'ok',
    })
  })
})
