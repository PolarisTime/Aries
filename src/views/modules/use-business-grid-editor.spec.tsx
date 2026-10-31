// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const getBusinessModuleDetailMock = vi.hoisted(() => vi.fn())
const findServerFilteredBusinessModuleRowMock = vi.hoisted(() => vi.fn())
const navigateMock = vi.hoisted(() => vi.fn())
const showErrorMock = vi.hoisted(() => vi.fn())

vi.mock('@/api/business/business-crud', () => ({
  getBusinessModuleDetail: getBusinessModuleDetailMock,
}))

vi.mock('@/api/business/business-listing', () => ({
  findServerFilteredBusinessModuleRow: findServerFilteredBusinessModuleRowMock,
}))

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>()
  return {
    ...actual,
    useNavigate: () => navigateMock,
  }
})

vi.mock('@/hooks/useRequestError', () => ({
  useRequestError: () => ({ showError: showErrorMock }),
}))

import type { ModuleKey } from '@/module-system/core/module-key'
import type { ModulePageConfig } from '@/types/module-page'
import { useBusinessGridEditor } from '@/views/modules/use-business-grid-editor'

function createMaterialConfig(
  overrides: Partial<ModulePageConfig> = {},
): ModulePageConfig {
  return {
    key: 'material',
    title: '物料',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
    itemColumns: [
      {
        title: '物料名称',
        dataIndex: 'materialName',
      },
    ],
    ...overrides,
  }
}

describe('useBusinessGridEditor', () => {
  let root: Root
  let container: HTMLDivElement
  let latest: ReturnType<typeof useBusinessGridEditor>
  let queryClient: QueryClient
  let config: ModulePageConfig
  /** 被测模块：默认 material，财务单据（payment/receipt）用例会临时切换。 */
  let moduleKey: ModuleKey = 'material'

  function Probe() {
    latest = useBusinessGridEditor({
      moduleKey,
      config,
      resolvedConfig: config,
    })
    return null
  }

  function renderOnce() {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Probe),
        ),
      )
    })
  }

  beforeEach(() => {
    moduleKey = 'material'
    config = createMaterialConfig()
    getBusinessModuleDetailMock.mockReset()
    getBusinessModuleDetailMock.mockImplementation(
      (_moduleKey: string, id: string) =>
        Promise.resolve({ id, materialName: `物料-${id}` }),
    )
    findServerFilteredBusinessModuleRowMock.mockReset()
    navigateMock.mockReset()
    showErrorMock.mockReset()
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    renderOnce()
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    queryClient.clear()
  })

  it('opens a manual create editor and closes it cleanly', () => {
    const firstSessionKey = latest.editorSessionKey
    act(() => {
      void latest.openEditor(null)
    })

    expect(latest.editorOpen).toBe(true)
    expect(latest.editorSessionKey).toBe(firstSessionKey + 1)
    expect(latest.editorLockLoading).toBe(false)
    expect(latest.editRecord).toBeNull()

    act(() => {
      latest.closeEditor()
    })
    expect(latest.editorOpen).toBe(false)
    expect(latest.editorSessionKey).toBe(firstSessionKey + 1)
  })

  it('respects allowManualCreate = false for manual create', () => {
    config = createMaterialConfig({ allowManualCreate: false })
    renderOnce()

    act(() => {
      void latest.openEditor(null)
    })

    expect(latest.editorOpen).toBe(false)
  })

  it('loads record detail into the editor draft', async () => {
    const record = { id: '7', materialName: '螺栓' }
    await act(async () => {
      await latest.openEditor(record)
    })

    expect(getBusinessModuleDetailMock).toHaveBeenCalledWith('material', '7')
    expect(latest.editorOpen).toBe(true)
    expect(latest.editorLockLoading).toBe(false)
    expect(latest.editRecord).toMatchObject({
      id: '7',
      materialName: '物料-7',
    })
  })

  it('toggles inline detail rows through toggleInlineDetail', async () => {
    const record = { id: '3', materialName: '螺母' }

    act(() => {
      latest.toggleInlineDetail(record)
    })
    await act(async () => {})
    expect(latest.inlineExpandedRowKeys).toEqual(['3'])
    expect(getBusinessModuleDetailMock).toHaveBeenCalledWith(
      'material',
      '3',
      expect.anything(),
    )

    act(() => {
      latest.toggleInlineDetail(record)
    })
    expect(latest.inlineExpandedRowKeys).toEqual([])
  })

  it('opens inline detail once via handleInlineExpand and closes on collapse', async () => {
    const record = { id: '4', materialName: '垫片' }

    act(() => {
      latest.handleInlineExpand(true, record)
    })
    act(() => {
      latest.handleInlineExpand(true, record)
    })
    await act(async () => {})
    expect(latest.inlineExpandedRowKeys).toEqual(['4'])
    expect(getBusinessModuleDetailMock).toHaveBeenCalledTimes(1)

    act(() => {
      latest.handleInlineExpand(false, record)
    })
    expect(latest.inlineExpandedRowKeys).toEqual([])
  })

  it('treats inline toggle as the grid detail action when item columns exist', () => {
    expect(latest.shouldUseInlineDetail).toBe(true)
    expect(latest.openGridDetail).toBe(latest.toggleInlineDetail)
  })

  it('enables the record detail action when the module opts into detail', () => {
    config = createMaterialConfig({ detailActionLabel: '查看' })
    renderOnce()

    expect(latest.recordDetailAction).toBe(latest.toggleInlineDetail)
  })

  it('falls back to overlay detail when inline detail is unavailable', () => {
    config = {
      ...createMaterialConfig(),
      itemColumns: undefined,
      detailActionLabel: '查看',
    }
    renderOnce()

    expect(latest.shouldUseInlineDetail).toBe(false)
    expect(latest.recordDetailAction).toBeDefined()
    expect(latest.openGridDetail).not.toBe(latest.toggleInlineDetail)
  })

  it('付款单列表行的 version(number) 进入编辑器前归一成十进制字符串', async () => {
    moduleKey = 'payment'
    // 付款单没有明细列 → 编辑态直接用列表行，不请求详情
    config = createMaterialConfig({ key: 'payment', itemColumns: undefined })
    renderOnce()

    const record = { id: '9001', paymentNo: 'PAY-1', version: 7 }
    await act(async () => {
      await latest.openEditor(record)
    })

    expect(getBusinessModuleDetailMock).not.toHaveBeenCalled()
    expect(latest.editorOpen).toBe(true)
    expect(latest.editRecord).toMatchObject({
      id: '9001',
      paymentNo: 'PAY-1',
      version: '7',
    })
  })

  it('收款单缺 version（旧后端）时编辑器记录不写入 version：更新不发版本头', async () => {
    moduleKey = 'receipt'
    config = createMaterialConfig({ key: 'receipt', itemColumns: undefined })
    renderOnce()

    const record = { id: '9002', receiptNo: 'REC-1' }
    await act(async () => {
      await latest.openEditor(record)
    })

    expect(latest.editRecord).toMatchObject({ id: '9002', receiptNo: 'REC-1' })
    expect(latest.editRecord).not.toHaveProperty('version')
  })

  it('非财务模块的记录不做版本归一（不改变既有模块行为）', async () => {
    config = createMaterialConfig({ itemColumns: undefined })
    renderOnce()

    const record = { id: '5', materialName: '垫片', version: 7 }
    await act(async () => {
      await latest.openEditor(record)
    })

    expect(latest.editRecord).toMatchObject({ id: '5', version: 7 })
  })

  it('opens and closes the attachment overlay', () => {
    const record = { id: '11', materialName: '螺丝' }

    act(() => {
      latest.overlays.openAttachment(record)
    })
    expect(latest.overlays.attachOpen).toBe(true)
    expect(latest.overlays.attachRecordId).toBe('11')

    act(() => {
      latest.overlays.closeAttachment()
    })
    expect(latest.overlays.attachOpen).toBe(false)
    expect(latest.overlays.attachRecordId).toBe('')
  })
})
