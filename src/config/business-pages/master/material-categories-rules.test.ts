import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import { buildMaterialCategoryOverview } from './material-categories-rules'

describe('material-categories-rules', () => {
  it('空行集合返回零计数', () => {
    const overview = buildMaterialCategoryOverview([])
    expect(overview).toHaveLength(3)
    expect(overview.every((item) => item.value === '0')).toBe(true)
  })

  it('统计分类总数、启用数与过磅要求数', () => {
    const rows = [
      { status: '正常', purchaseWeighRequired: true },
      { status: '正常', purchaseWeighRequired: false },
      { status: '禁用', purchaseWeighRequired: true },
      {},
    ] as unknown as ModuleRecord[]
    const overview = buildMaterialCategoryOverview(rows)
    expect(overview[0].value).toBe('4')
    expect(overview[1].value).toBe('2')
    expect(overview[2].value).toBe('2')
  })
})
