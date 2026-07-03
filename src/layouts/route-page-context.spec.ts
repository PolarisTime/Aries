import { describe, expect, it } from 'vitest'
import { resolveRoutePageContext } from '@/layouts/route-page-context'

const mockT = ((key: string) => {
  const map: Record<string, string> = {
    'layouts.routePage.apiKeyDetail': 'API Key 详情',
  }
  return map[key] ?? key
}) as Parameters<typeof resolveRoutePageContext>[1]

describe('resolveRoutePageContext', () => {
  it('resolves normal page definitions', () => {
    expect(resolveRoutePageContext('/material', mockT)).toEqual({
      activeMenuKey: '/material',
      openPageKey: '/material',
      title: '商品资料',
    })
  })

  it('normalizes trailing slash before matching page definitions', () => {
    expect(resolveRoutePageContext('/material/', mockT)).toEqual({
      activeMenuKey: '/material',
      openPageKey: '/material',
      title: '商品资料',
    })
  })

  it('reuses api key list tab for detail pages', () => {
    expect(resolveRoutePageContext('/api-key/123', mockT)).toEqual({
      activeMenuKey: '/security-center',
      openPageKey: '/security-center',
      title: 'API Key 详情',
    })
  })

  it('falls back to app title and normalized path for unknown routes', () => {
    expect(resolveRoutePageContext('/unknown/', mockT)).toEqual({
      activeMenuKey: '/unknown',
      openPageKey: '/unknown',
      title: 'Leo ERP',
    })
  })

  it('normalizes an empty path to root', () => {
    expect(resolveRoutePageContext('', mockT)).toEqual({
      activeMenuKey: '/',
      openPageKey: '/',
      title: 'Leo ERP',
    })
  })
})
