import i18n from 'i18next'
import { beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { resolveBreadcrumbItems } from './breadcrumb'

describe('resolveBreadcrumbItems 面包屑层级', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
  })

  const t = ((key: string) => {
    if (key === 'layouts.sideNav.root') return '业务中心'
    return key
  }) as unknown as Parameters<typeof resolveBreadcrumbItems>[1]

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
    expect(items[1].title).toBeTruthy()
    expect(items[1].path).toBeUndefined()
    expect(items[2].current).toBe(true)
    expect(items[2].path).toBeUndefined()
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
