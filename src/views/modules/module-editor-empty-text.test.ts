import i18n from 'i18next'
import { beforeAll, describe, expect, it } from 'vitest'
import '@/i18n'
import { resolveItemsEmptyText } from './module-editor-empty-text'

const t = (key: string, options?: Record<string, unknown>) =>
  i18n.t(key, options)

describe('明细表空态文案', () => {
  beforeAll(async () => {
    await i18n.changeLanguage('zh-CN')
  })

  it('允许手工新增行的模块交给 antd 默认空态', () => {
    expect(
      resolveItemsEmptyText({
        canAddManualItems: true,
        importActionLabel: '导入采购订单明细',
        t,
      }),
    ).toBeUndefined()
  })

  it('只允许导入的模块指出唯一入口，并带上该模块自己的按钮名', () => {
    const text = resolveItemsEmptyText({
      canAddManualItems: false,
      importActionLabel: '导入采购订单明细',
      t,
    })
    expect(text).toContain('暂无明细')
    expect(text).toContain('导入采购订单明细')
  })

  it('既不能手工新增又没有导入入口时只说明没有明细', () => {
    const text = resolveItemsEmptyText({ canAddManualItems: false, t })
    expect(text).toBe('暂无明细')
  })
})
