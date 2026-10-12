import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'
import { applyModuleDefaultEditorDraft } from '@/module-system/editor/module-editor-access'
import type { ModuleRecordInput } from '@/types/module-page'

/**
 * 报单日期（orderDate）的新建默认值走仓库既有的 defaultDraftValues 机制：
 * 只在草稿缺该键时填充，因此编辑既有单据时后端回传值始终优先。
 */
describe('销售订单新建草稿的报单日期默认值', () => {
  it('新建时默认当天，与交货日期同一口径', () => {
    const draft: ModuleRecordInput = {}

    applyModuleDefaultEditorDraft('sales-order', draft, '销售员')

    expect(dayjs.isDayjs(draft.orderDate)).toBe(true)
    expect((draft.orderDate as dayjs.Dayjs).isSame(dayjs(), 'day')).toBe(true)
    expect((draft.deliveryDate as dayjs.Dayjs).isSame(dayjs(), 'day')).toBe(
      true,
    )
    expect(draft.salesName).toBe('销售员')
  })

  it('编辑既有单据时后端回传的报单日期优先，不被当天默认值覆盖', () => {
    const draft: ModuleRecordInput = {
      orderDate: dayjs('2026-01-05'),
      deliveryDate: dayjs('2026-02-06'),
    }

    applyModuleDefaultEditorDraft('sales-order', draft, '销售员')

    expect((draft.orderDate as dayjs.Dayjs).format('YYYY-MM-DD')).toBe(
      '2026-01-05',
    )
    expect((draft.deliveryDate as dayjs.Dayjs).format('YYYY-MM-DD')).toBe(
      '2026-02-06',
    )
  })
})
