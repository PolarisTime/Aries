import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGetMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/client', () => ({
  http: { get: httpGetMock },
}))

import { fetchMaterialGrades, reloadMaterialGrades } from './material-grades'

describe('material-grades', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches and maps grade options', async () => {
    httpGetMock.mockResolvedValue({
      code: 0,
      data: ['HRB400', 'HRB500', 'HRB600'],
    })

    const result = await fetchMaterialGrades()

    expect(result).toEqual([
      { value: 'HRB400', label: 'HRB400' },
      { value: 'HRB500', label: 'HRB500' },
      { value: 'HRB600', label: 'HRB600' },
    ])
  })

  it('returns cached results on second call', async () => {
    httpGetMock.mockResolvedValue({ code: 0, data: ['HRB400'] })

    const first = await fetchMaterialGrades()
    const second = await fetchMaterialGrades()

    expect(httpGetMock).toHaveBeenCalledTimes(0)
    expect(first).toEqual(second)
  })

  it('reloads cached results', async () => {
    vi.resetModules()
    const { fetchMaterialGrades: fetchFresh, reloadMaterialGrades: reloadFresh } =
      await import('./material-grades')
    httpGetMock
      .mockResolvedValueOnce({ code: 0, data: ['HRB400'] })
      .mockResolvedValueOnce({ code: 0, data: ['HRB600'] })

    await expect(fetchFresh()).resolves.toEqual([
      { value: 'HRB400', label: 'HRB400' },
    ])
    await expect(reloadFresh()).resolves.toEqual([
      { value: 'HRB600', label: 'HRB600' },
    ])
  })

  it('returns empty array on error', async () => {
    // Reload module to reset cache
    vi.resetModules()
    const { fetchMaterialGrades: fetchEmpty } = await import(
      './material-grades'
    )
    httpGetMock.mockRejectedValue(new Error('Network error'))

    const result = await fetchEmpty()

    expect(result).toEqual([])
  })

  it('handles empty data response', async () => {
    vi.resetModules()
    const { fetchMaterialGrades: fetchEmpty } = await import(
      './material-grades'
    )
    httpGetMock.mockResolvedValue({ code: 0, data: [] })

    const result = await fetchEmpty()

    expect(result).toEqual([])
  })
})
