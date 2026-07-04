import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createQueryCachedOptionsMock, fetchMock, getMock, reloadMock } =
  vi.hoisted(() => {
    const fetchMock = vi.fn()
    const getMock = vi.fn()
    const reloadMock = vi.fn()
    return {
      createQueryCachedOptionsMock: vi.fn(() => ({
        fetch: fetchMock,
        reload: reloadMock,
        get: getMock,
      })),
      fetchMock,
      reloadMock,
      getMock,
    }
  })

vi.mock('@/lib/query-cached-options', () => ({
  createQueryCachedOptions: createQueryCachedOptionsMock,
}))

vi.mock('@/constants/endpoints', () => ({
  ENDPOINTS: {
    MATERIAL_CATEGORIES: '/material-categories',
  },
}))

import { QUERY_KEYS } from '@/constants/query-keys'
import {
  fetchMaterialCategories,
  reloadMaterialCategories,
} from './material-categories'

describe('material-categories', () => {
  beforeEach(() => {
    fetchMock.mockClear()
    getMock.mockClear()
    reloadMock.mockClear()
  })

  it('binds material categories to the TanStack Query master option key', () => {
    expect(createQueryCachedOptionsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        queryKey: QUERY_KEYS.masterOptions.materialCategories,
      }),
    )
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
