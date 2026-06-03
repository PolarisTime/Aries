import { beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.hoisted(() => vi.fn())
const reloadMock = vi.hoisted(() => vi.fn())
const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/create-cached-options', () => ({
  createCachedOptions: vi.fn(() => ({
    fetch: fetchMock,
    reload: reloadMock,
    get: getMock,
  })),
}))

vi.mock('@/constants/endpoints', () => ({
  ENDPOINTS: {
    MATERIAL_CATEGORIES: '/material-categories',
  },
}))

import {
  fetchMaterialCategories,
  reloadMaterialCategories,
} from './material-categories'

describe('material-categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports fetchMaterialCategories', () => {
    expect(typeof fetchMaterialCategories).toBe('function')
  })

  it('exports reloadMaterialCategories', () => {
    expect(typeof reloadMaterialCategories).toBe('function')
  })

  it('fetchMaterialCategories delegates to cached.fetch', async () => {
    const options = [{ value: 'cat-1', label: '类别1' }]
    fetchMock.mockResolvedValue(options)

    const result = await fetchMaterialCategories()

    expect(fetchMock).toHaveBeenCalled()
    expect(result).toEqual(options)
  })

  it('reloadMaterialCategories delegates to cached.reload', async () => {
    const options = [{ value: 'cat-1', label: '类别1' }]
    reloadMock.mockResolvedValue(options)

    const result = await reloadMaterialCategories()

    expect(reloadMock).toHaveBeenCalled()
    expect(result).toEqual(options)
  })
})
