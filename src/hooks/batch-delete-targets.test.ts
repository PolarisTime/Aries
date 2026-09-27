import { describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import { describeTargetRecords } from './useBusinessGridBatchActions'

const record = (patch: Partial<ModuleRecord>): ModuleRecord =>
  patch as ModuleRecord

describe('describeTargetRecords 批量删除确认框的目标单据号', () => {
  it('列出全部单据号(≤5 条)', () => {
    const t = vi.fn((_key: string, options?: Record<string, unknown>) =>
      String(options?.numbers),
    )
    const text = describeTargetRecords(
      [record({ no: 'PO-1' }), record({ orderNo: 'PO-2' })],
      t,
    )
    expect(t).toHaveBeenCalledWith('hooks.batchActions.targetNumbers', {
      numbers: 'PO-1、PO-2',
    })
    expect(text).toBe('PO-1、PO-2')
  })

  it('超过 5 条时截断并给出剩余数量', () => {
    const t = vi.fn((_key: string) => _key)
    describeTargetRecords(
      Array.from({ length: 7 }, (_, index) =>
        record({ no: `PO-${index + 1}` }),
      ),
      t,
    )
    expect(t).toHaveBeenCalledWith('hooks.batchActions.targetNumbersMore', {
      numbers: 'PO-1、PO-2、PO-3、PO-4、PO-5',
      rest: 2,
    })
  })

  it('没有可识别编号时退回空串(不影响原确认文案)', () => {
    const t = vi.fn()
    expect(describeTargetRecords([], t)).toBe('')
    expect(t).not.toHaveBeenCalled()
  })
})
