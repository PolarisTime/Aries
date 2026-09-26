import { describe, expect, it } from 'vitest'
import { recordProjectId } from '@/views/modules/components/print-job-modal-format'

describe('recordProjectId', () => {
  it('返回记录的项目 id', () => {
    expect(recordProjectId({ id: '1', projectId: '9001' })).toBe('9001')
  })

  it('无项目或空白返回空串', () => {
    expect(recordProjectId({ id: '1' })).toBe('')
    expect(recordProjectId({ id: '1', projectId: '   ' })).toBe('')
    expect(recordProjectId(undefined)).toBe('')
  })
})
