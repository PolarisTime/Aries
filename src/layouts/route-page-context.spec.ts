import { describe, expect, it } from 'vitest'
import { resolveRoutePageContext } from '@/layouts/route-page-context'

describe('resolveRoutePageContext', () => {
  it('resolves normal page definitions', () => {
    expect(resolveRoutePageContext('/materials')).toEqual({
      activeMenuKey: '/materials',
      openPageKey: '/materials',
      title: '商品资料',
    })
  })

  it('reuses api key list tab for detail pages', () => {
    expect(resolveRoutePageContext('/api-key-management/123')).toEqual({
      activeMenuKey: '/api-key-management',
      openPageKey: '/api-key-management',
      title: 'API Key 详情',
    })
  })
})
