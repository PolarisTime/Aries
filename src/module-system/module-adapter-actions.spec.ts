import { describe, expect, it } from 'vitest'
import {
  buildEditorAuditTarget,
  buildReverseAuditTarget,
} from './module-adapter-actions'

describe('buildEditorAuditTarget', () => {
  it('does not use sales completion as an audit target when line items are locked', () => {
    expect(
      buildEditorAuditTarget(
        'sales-order',
        ['草稿', '已审核', '完成销售'],
        '已审核',
      ),
    ).toBeNull()
  })
})

describe('buildReverseAuditTarget', () => {
  it('uses module default status even when status field options are unavailable', () => {
    expect(buildReverseAuditTarget('sales-order', [])).toEqual({
      key: 'status',
      value: '草稿',
    })
  })

  it('rejects module default status when explicit options do not include it', () => {
    expect(buildReverseAuditTarget('sales-order', ['待审核', '已审核'])).toBeNull()
  })
})
