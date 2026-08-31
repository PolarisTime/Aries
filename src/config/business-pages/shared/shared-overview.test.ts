import { describe, expect, it, vi } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'

vi.mock('i18next', () => ({
  default: {
    t: (key: string) =>
      ({
        'modules.units.documentSheet': '张',
        'modules.units.ton': '吨',
        'modules.units.yuan': '元',
      })[key] ?? key,
  },
}))

import { buildAmountWeightOverview } from '@/config/business-pages/shared/shared-overview'

describe('业务列表汇总单位', () => {
  it('在单据数量、重量和金额后显示对应单位', () => {
    const rows = [
      {
        id: '1',
        totalWeight: 55.833,
        totalAmount: 174732.78,
      } as ModuleRecord,
    ]

    expect(buildAmountWeightOverview(rows, 'totalAmount')).toEqual([
      { label: 'modules.overview.documentCount', value: '1 张' },
      { label: 'modules.overview.totalWeight', value: '55.833 吨' },
      { label: 'modules.overview.totalAmount', value: '174,732.78 元' },
    ])
  })
})
