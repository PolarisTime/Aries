import { describe, expect, it } from 'vitest'
import { resolveModuleRecordCapabilities } from './module-record-capabilities'

describe('resolveModuleRecordCapabilities', () => {
  it('交付核定销售订单属于部分可编辑，允许打开编辑器', () => {
    const capabilities = resolveModuleRecordCapabilities(
      { status: '交付核定' },
      'sales-order',
    )

    expect(capabilities.canEdit).toBe(true)
  })

  it('草稿销售订单可编辑', () => {
    expect(
      resolveModuleRecordCapabilities({ status: '草稿' }, 'sales-order').canEdit,
    ).toBe(true)
  })

  it('终态销售订单禁止编辑', () => {
    for (const status of ['已审核', '完成销售']) {
      expect(
        resolveModuleRecordCapabilities({ status }, 'sales-order').canEdit,
        status,
      ).toBe(false)
    }
  })

  it('已删除记录禁止编辑', () => {
    expect(
      resolveModuleRecordCapabilities(
        { status: '草稿', deletedFlag: true },
        'sales-order',
      ).canEdit,
    ).toBe(false)
  })
})
