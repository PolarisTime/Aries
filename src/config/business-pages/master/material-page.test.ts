import { describe, expect, it } from 'vitest'
import { getMaterialCategoryOptions } from '@/module-system/core/module-option-resolvers'
import type { ModuleFormFieldDefinition } from '@/types/module-page-fields'
import { materialsPageConfig } from './material-page'

/**
 * 商品资料表单字段口径的**唯一**断言处。
 *
 * <p>这些用例原先锁的是已删除的旧实现
 * （`src/views/master-data/MaterialPage.tsx` + `material-page-fields.ts`），
 * 而真实渲染走的是本目录的 `material-page.ts`：修在死实现上对线上零效果。
 * 现在直接对权威配置断言，改可见性/必填规则时只可能改到这里。</p>
 */
function fieldByKey(key: string): ModuleFormFieldDefinition {
  const field = (materialsPageConfig.formFields ?? []).find(
    (candidate) => candidate.key === key,
  )
  if (!field) throw new Error(`商品资料表单缺少字段: ${key}`)
  return field
}

const EXPENSE = { materialType: '附加费用' }
const PHYSICAL = { materialType: '实体商品' }

describe('materialsPageConfig.formFields 可见性', () => {
  it('附加费用保留名称、单位与单价必填，隐藏类别与物理属性', () => {
    // 名称/单位/单价在两种类型下都可见且必填
    for (const key of ['material', 'unit', 'unitPrice']) {
      const field = fieldByKey(key)
      expect(field.visibleWhen, `${key} 不应有可见性条件`).toBeUndefined()
      expect(field.required, `${key} 应必填`).toBe(true)
    }

    // 类别与物理属性在附加费用下隐藏
    for (const key of [
      'category',
      'brand',
      'spec',
      'length',
      'quantityUnit',
      'pieceWeightTon',
      'piecesPerBundle',
    ]) {
      expect(
        fieldByKey(key).visibleWhen?.(EXPENSE),
        `${key} 应在附加费用下隐藏`,
      ).toBe(false)
    }
  })

  it('实体商品显示类别与物理属性，未选类型时默认按实体展示', () => {
    for (const key of ['category', 'brand']) {
      expect(fieldByKey(key).visibleWhen?.(PHYSICAL), `${key} 应可见`).toBe(
        true,
      )
      // 未选类型（新建表单默认值尚未写入）时按实体展示，避免整块物理属性闪没
      expect(fieldByKey(key).visibleWhen?.({}), `${key} 应默认可见`).toBe(true)
    }
  })

  it('类别下拉是 resolver 函数引用，不在构建配置时立即读缓存', () => {
    /*
     * 回归锁：写 `options: getMaterialCategoryOptions()`（立即调用）会在模块加载时把
     * 当时（通常为空）的 React Query 缓存快照化，下拉恒为空；函数引用则在渲染时读取，
     * 主数据加载完成后自然刷新。2026-10-30 的同名 bug 正是修在了已删除的旧实现上。
     */
    expect(fieldByKey('category').options).toBe(getMaterialCategoryOptions)
    expect(typeof fieldByKey('category').options).toBe('function')
  })
})
