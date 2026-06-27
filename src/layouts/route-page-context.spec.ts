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

  it('reuses api key list tab for detail pages', () => {
    expect(resolveRoutePageContext('/api-key/123', mockT)).toEqual({
      activeMenuKey: '/security-center',
      openPageKey: '/security-center',
      title: 'API Key 详情',
    })
  })
})
