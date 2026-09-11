import { describe, expect, it } from 'vitest'
import { appPageDefinitions } from '@/config/page-registry'
import { viewLoaders } from '@/router/view-loaders'

describe('viewLoaders 与页面注册表一致性', () => {
  it('每个页面的 view（除 dashboard）都应有对应加载器，且无多余键', () => {
    const usedViews = new Set(
      appPageDefinitions
        .map((def) => def.view)
        .filter((view) => view !== 'dashboard'),
    )
    const loaderKeys = new Set(Object.keys(viewLoaders))

    expect(usedViews).toEqual(loaderKeys)
  })
})
