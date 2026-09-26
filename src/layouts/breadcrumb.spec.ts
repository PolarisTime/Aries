import i18n from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { resolveBreadcrumbItems } from './breadcrumb'

describe('resolveBreadcrumbItems 面包屑层级', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
  })

  /** 用真实 i18n 实例: 页面标题只存 key, 必须验证 key -> 文案确实解析成功。 */
  const t = i18n.t.bind(i18n) as unknown as Parameters<
    typeof resolveBreadcrumbItems
  >[1]

  it('工作台仅显示根节点且不可跳转', () => {
    const items = resolveBreadcrumbItems('/dashboard', t)
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({ title: '业务中心', current: false })
    expect(items[0].path).toBeUndefined()
  })

  it('二级页面显示 根 / 分组 / 页面, 且根可跳转、当前页不可跳转', () => {
    // 采购入库挂在 purchase 分组下
    const items = resolveBreadcrumbItems('/purchase-inbound', t)
    expect(items).toHaveLength(3)
    expect(items[0]).toMatchObject({ title: '业务中心', path: '/dashboard' })
    expect(items[1].title).toBe('采购')
    expect(items[1].path).toBeUndefined()
    expect(items[2].title).toBe('采购入库')
    expect(items[2].current).toBe(true)
    expect(items[2].path).toBeUndefined()
  })

  it('物流单显示 根 / 物流 / 物流单(而非 i18n key 或路径)', () => {
    const items = resolveBreadcrumbItems('/freight-bill', t)
    expect(items.map((item) => item.title)).toEqual([
      '业务中心',
      '物流',
      '物流单',
    ])
  })

  it('切换语言后标题随之变化', async () => {
    await i18n.changeLanguage('en-US')
    try {
      const items = resolveBreadcrumbItems('/freight-bill', t)
      expect(items[1].title).toBe('Freight')
      expect(items[2].title).toBe('Freight Bills')
    } finally {
      await i18n.changeLanguage('zh-CN')
    }
  })

  it('末尾带斜杠也能正确匹配', () => {
    const withSlash = resolveBreadcrumbItems('/purchase-inbound/', t)
    const without = resolveBreadcrumbItems('/purchase-inbound', t)
    expect(withSlash.map((item) => item.title)).toEqual(
      without.map((item) => item.title),
    )
  })

  it('未知路径退化为 根 + pathname 占位', () => {
    const items = resolveBreadcrumbItems('/not-a-real-page', t)
    expect(items).toHaveLength(2)
    expect(items[0].path).toBe('/dashboard')
    expect(items[1]).toMatchObject({
      title: '/not-a-real-page',
      current: true,
    })
  })
})
