// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchAttachmentCountsMock = vi.hoisted(() => vi.fn())
const refreshModuleQueriesMock = vi.hoisted(() => vi.fn())
const exportModuleRowsMock = vi.hoisted(() => vi.fn())
const retryListMock = vi.hoisted(() => vi.fn())

const listQueryArgs: Array<{
  moduleKey: string
  filters: Record<string, unknown>
  currentPage: number
  pageSize: number
}> = []

let configFixture: ModulePageConfig = {
  key: 'material',
  title: '物料',
  kicker: '',
  description: '',
  filters: [],
  columns: [],
  detailFields: [],
  data: [],
  buildOverview: () => [],
}
let recordsFixture: Array<{ id: string }> = []

vi.mock('@/hooks/useModulePageConfig', () => ({
  useModulePageConfig: () => ({
    config: configFixture,
    showSnowflakeId: false,
    isLoading: false,
  }),
}))

vi.mock('@/hooks/useDefaultPageSize', () => ({
  useDefaultPageSize: () => 30,
}))

vi.mock('@/hooks/useInfiniteBusinessItems', () => ({
  useInfiniteBusinessItems: (props: {
    moduleKey: string
    filters: Record<string, unknown>
    currentPage: number
    pageSize: number
  }) => {
    listQueryArgs.push(props)
    return {
      records: recordsFixture,
      total: recordsFixture.length,
      responseCode: 0,
      errorMessage: '',
      hasError: false,
      isLoading: false,
      isFetching: false,
      retry: retryListMock,
    }
  },
}))

vi.mock('@/hooks/useModuleQueryRefresh', () => ({
  useModuleQueryRefresh: () => ({
    refreshModuleQueries: refreshModuleQueriesMock,
  }),
}))

vi.mock('@/hooks/useExcelExport', () => ({
  useExcelExport: () => ({
    exporting: false,
    handleExport: exportModuleRowsMock,
  }),
}))

vi.mock('@/api/business/business-attachments', () => ({
  fetchAttachmentCounts: fetchAttachmentCountsMock,
}))

import type { AppPageDefinition } from '@/config/page-registry'
import { useBusinessGridData } from '@/hooks/useBusinessGridData'
import type { ModulePageConfig } from '@/types/module-page'

describe('useBusinessGridData', () => {
  let root: Root
  let container: HTMLDivElement
  let latest: ReturnType<typeof useBusinessGridData>
  let pageDefFixture = { menuParent: 'master' } as AppPageDefinition

  function Probe() {
    latest = useBusinessGridData({
      moduleKey: 'material',
      pageDef: pageDefFixture,
    })
    return null
  }

  function renderOnce() {
    act(() => {
      root.render(createElement(Probe))
    })
  }

  beforeEach(() => {
    listQueryArgs.length = 0
    recordsFixture = []
    pageDefFixture = { menuParent: 'master' } as AppPageDefinition
    configFixture = {
      key: 'material',
      title: '物料',
      kicker: '',
      description: '',
      filters: [],
      columns: [],
      detailFields: [],
      data: [],
      buildOverview: () => [],
    }
    fetchAttachmentCountsMock.mockReset()
    refreshModuleQueriesMock.mockReset()
    exportModuleRowsMock.mockReset()
    exportModuleRowsMock.mockResolvedValue(undefined)
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    renderOnce()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  it('applyGridFilters clears selection and queries from page 1', () => {
    act(() => {
      latest.setSelectedRowKeys(['1'])
      latest.setSelectedRowMap({ '1': { id: '1' } })
    })
    expect(latest.selectedRowKeys).toEqual(['1'])

    act(() => {
      latest.applyGridFilters({ keyword: 'x' })
    })

    expect(latest.selectedRowKeys).toEqual([])
    expect(latest.selectedRecords).toEqual([])
    const lastQuery = listQueryArgs.at(-1)
    expect(lastQuery).toMatchObject({
      currentPage: 1,
      filters: { keyword: 'x' },
    })
  })

  it('searchGrid submits edited filters and clears selection', () => {
    act(() => {
      latest.setSelectedRowKeys(['2'])
    })
    act(() => {
      latest.updateFilter('keyword', 'steel')
    })
    act(() => {
      latest.searchGrid()
    })

    expect(latest.selectedRowKeys).toEqual([])
    expect(latest.submittedFilters).toEqual({ keyword: 'steel' })
    expect(listQueryArgs.at(-1)).toMatchObject({
      currentPage: 1,
      filters: { keyword: 'steel' },
    })
  })

  it('resetGridFilters restores defaults and clears selection', () => {
    act(() => {
      latest.applyGridFilters({ keyword: 'x' })
    })
    expect(latest.filters).toEqual({ keyword: 'x' })

    act(() => {
      latest.resetGridFilters()
    })

    expect(latest.filters).toEqual({})
    expect(latest.submittedFilters).toEqual({})
    expect(latest.selectedRowKeys).toEqual([])
    expect(listQueryArgs.at(-1)).toMatchObject({ currentPage: 1 })
  })

  it('gates list export behind master menu parent', async () => {
    await act(async () => {
      await latest.handleExport()
    })
    expect(exportModuleRowsMock).toHaveBeenCalledWith({})

    exportModuleRowsMock.mockClear()
    pageDefFixture = { menuParent: 'sales' } as AppPageDefinition
    renderOnce()
    await act(async () => {
      await latest.handleExport()
    })
    expect(exportModuleRowsMock).not.toHaveBeenCalled()
  })

  it('resets attachment counts when records are empty', async () => {
    await act(async () => {})

    expect(fetchAttachmentCountsMock).not.toHaveBeenCalled()
    expect(latest.attachmentCounts).toEqual({})
  })

  it('fetches attachment counts for listed records', async () => {
    recordsFixture = [{ id: '1' }, { id: '2' }]
    fetchAttachmentCountsMock.mockResolvedValue({ counts: { '1': 3 } })

    renderOnce()
    await act(async () => {})

    expect(fetchAttachmentCountsMock).toHaveBeenCalledWith('material', [
      '1',
      '2',
    ])
    expect(latest.attachmentCounts).toEqual({ '1': 3 })
  })

  it('clears attachment counts when fetching fails', async () => {
    recordsFixture = [{ id: '9' }]
    fetchAttachmentCountsMock.mockRejectedValue(new Error('boom'))

    renderOnce()
    await act(async () => {})

    expect(latest.attachmentCounts).toEqual({})
  })

  it('skips attachment fetching for read-only modules', async () => {
    recordsFixture = [{ id: '1' }]
    configFixture = { ...configFixture, readOnly: true }

    renderOnce()
    await act(async () => {})

    expect(fetchAttachmentCountsMock).not.toHaveBeenCalled()
    expect(latest.attachmentCounts).toEqual({})
  })
})
