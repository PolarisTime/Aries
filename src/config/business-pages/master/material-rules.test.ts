import { describe, expect, it } from 'vitest'
import type { ModuleRecord } from '@/types/module-page'
import {
  buildMaterialOverview,
  isPhysicalMaterialFieldVisible,
} from './material-rules'

describe('material-rules', () => {
  describe('isPhysicalMaterialFieldVisible', () => {
    it('未选类型时可见', () => {
      expect(isPhysicalMaterialFieldVisible()).toBe(true)
      expect(isPhysicalMaterialFieldVisible({})).toBe(true)
    })

    it('实体商品可见，附加费用不可见', () => {
      expect(isPhysicalMaterialFieldVisible({ materialType: '实体商品' })).toBe(
        true,
      )
      expect(isPhysicalMaterialFieldVisible({ materialType: '附加费用' })).toBe(
        false,
      )
    })
  })

  describe('buildMaterialOverview', () => {
    it('空行集合返回三个零计数', () => {
      const overview = buildMaterialOverview([])
      expect(overview).toHaveLength(3)
      expect(overview.every((item) => item.value === '0')).toBe(true)
    })

    it('按螺纹钢分类统计理算与过磅数量', () => {
      const rows = [
        { category: '螺纹钢' },
        { category: '螺纹钢' },
        { category: '其它' },
        {},
      ] as unknown as ModuleRecord[]
      const overview = buildMaterialOverview(rows)
      expect(overview[0].value).toBe('4')
      expect(overview[1].value).toBe('2')
      expect(overview[2].value).toBe('2')
    })
  })
})
