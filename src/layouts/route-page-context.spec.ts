import { describe, expect, it } from 'vitest'
import { resolveRoutePageContext } from '@/layouts/route-page-context'

describe('resolveRoutePageContext', () => {
  it('resolves normal page definitions', () => {
    expect(resolveRoutePageContext('/material')).toEqual({
      activeMenuKey: '/material',
      openPageKey: '/material',
      title: '商品资料',
    })
  })

  it('reuses api key list tab for detail pages', () => {
    expect(resolveRoutePageContext('/api-key/123')).toEqual({
      activeMenuKey: '/api-key',
      openPageKey: '/api-key',
      title: 'API Key 详情',
    })
  })
})
