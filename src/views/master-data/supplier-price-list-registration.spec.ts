import { describe, expect, it } from 'vitest'
import { appPageDefinitions, getPageRoutePath } from '@/config/page-registry'
import { enUS } from '@/locales/en-US'
import { zhCN } from '@/locales/zh-CN'
import { viewLoaders } from '@/router/view-loaders'
import { SupplierPriceListPage } from './SupplierPriceListPage'

/** 权限资源 / 菜单 code / 路由是两端契约固定标识，改名会与 leo 侧权限、菜单迁移脱节。 */
const MENU_CODE = 'supplier-price-lists'
const ROUTE_PATH = 'master-data/supplier-price-lists'
const PERMISSION = 'supplier-price-lists:read'

describe('供应商价格表页面注册', () => {
  const page = appPageDefinitions.find((entry) => entry.key === MENU_CODE)

  it('菜单 code 与权限资源为 supplier-price-lists，路由为 /master-data/supplier-price-lists', () => {
    expect(page).toBeDefined()
    expect(page?.menuKey).toBe(`/${ROUTE_PATH}`)
    expect(page?.requiredPermission).toBe(PERMISSION)
    expect(page?.menuParent).toBe('master')
    expect(page?.hiddenInMenu).not.toBe(true)
    expect(getPageRoutePath(MENU_CODE)).toBe(ROUTE_PATH)
  })

  it('路由懒加载登记到 SupplierPriceListPage', async () => {
    expect(page?.view).toBe('master-supplier-price-list')
    const loader = viewLoaders['master-supplier-price-list']
    expect(loader).toBeTypeOf('function')
    const loaded = await loader()
    expect(loaded.default).toBe(SupplierPriceListPage)
  })

  it('中英文页面标题都已提供', () => {
    const read = (root: unknown, key: string) =>
      key
        .split('.')
        .reduce<unknown>(
          (current, segment) =>
            current && typeof current === 'object'
              ? (current as Record<string, unknown>)[segment]
              : undefined,
          root,
        )
    expect(read(zhCN, 'pages.supplier-price-lists')).toBe('供应商价格表')
    expect(read(enUS, 'pages.supplier-price-lists')).toBe(
      'Supplier Price Lists',
    )
  })
})
