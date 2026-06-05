import { describe, expect, it } from 'vitest'

import type {
  AttachmentBindingRecord,
  AttachmentRecord,
  LeoPageData,
  NumberRuleGenerateRecord,
  UploadRulePayload,
  UploadRuleRecord,
} from './business-types'

describe('business-types', () => {
  it('UploadRulePayload type is usable', () => {
    const payload: UploadRulePayload = {
      renamePattern: '{date}_{no}',
      status: '启用',
      remark: 'test',
    }
    expect(payload.renamePattern).toBe('{date}_{no}')
    expect(payload.status).toBe('启用')
  })

  it('UploadRuleRecord type is usable', () => {
    const record: UploadRuleRecord = {
      id: '1',
      moduleKey: 'purchase-order',
      moduleName: '采购订单',
      ruleCode: 'R001',
      ruleName: '采购编号',
      renamePattern: '{date}_{no}',
      status: '启用',
    }
    expect(record.id).toBe('1')
  })

  it('AttachmentRecord type is usable', () => {
    const record: AttachmentRecord = {
      id: '1',
      name: 'file',
      fileName: 'file.pdf',
      contentType: 'application/pdf',
      fileSize: 1024,
    }
    expect(record.fileName).toBe('file.pdf')
  })

  it('AttachmentBindingRecord type is usable', () => {
    const record: AttachmentBindingRecord = {
      moduleKey: 'purchase-order',
      recordId: '1',
      attachments: [],
    }
    expect(record.attachments).toEqual([])
  })

  it('LeoPageData type is usable', () => {
    const pageData: LeoPageData<{ id: string }> = {
      content: [{ id: '1' }],
      totalElements: 1,
      totalPages: 1,
    }
    expect(pageData.content).toHaveLength(1)
    expect(pageData.totalElements).toBe(1)
  })

  it('NumberRuleGenerateRecord type is usable', () => {
    const record: NumberRuleGenerateRecord = {
      moduleKey: 'purchase-order',
      generatedNo: 'PO20260001',
    }
    expect(record.generatedNo).toBe('PO20260001')
  })
})
