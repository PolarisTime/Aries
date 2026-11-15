import { describe, expect, it } from 'vitest'
import { resolveModuleRecordCapabilities } from './module-record-capabilities'

describe('resolveModuleRecordCapabilities', () => {
  it('交付核定销售订单属于部分可编辑，允许打开编辑器', () => {
    const capabilities = resolveModuleRecordCapabilities(
      { status: 'DELIVERY_VERIFICATION' },
      'sales-order',
    )

    expect(capabilities.canEdit).toBe(true)
  })

  it('草稿销售订单可编辑', () => {
    expect(
      resolveModuleRecordCapabilities({ status: 'DRAFT' }, 'sales-order')
        .canEdit,
    ).toBe(true)
  })

  it('终态销售订单禁止编辑', () => {
    for (const status of ['AUDITED', 'SALES_COMPLETED']) {
      expect(
        resolveModuleRecordCapabilities({ status }, 'sales-order').canEdit,
        status,
      ).toBe(false)
    }
  })

  it('已删除记录禁止编辑', () => {
    expect(
      resolveModuleRecordCapabilities(
        { status: 'DRAFT', deletedFlag: true },
        'sales-order',
      ).canEdit,
    ).toBe(false)
  })
})
