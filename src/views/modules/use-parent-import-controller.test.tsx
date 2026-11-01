// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type {
  ModuleLineItem,
  ModulePageConfig,
  ModuleParentImportDefinition,
  ModuleRecord,
  ModuleRecordInput,
} from '@/types/module-page'

const { messageMock } = vi.hoisted(() => ({
  messageMock: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('@/utils/antd-app', () => ({ message: messageMock }))
vi.mock('@/api/business/business-crud', () => ({
  getBusinessModuleDetail: vi.fn(),
}))

import { getBusinessModuleDetail } from '@/api/business/business-crud'
import {
  fetchParentDetailWithTimeout,
  PARENT_DETAIL_TIMEOUT_MS,
  useParentImportController,
} from './use-parent-import-controller'

/**
 * 导入父单后的非阻断预警: warnParentImport 返回文案时必须提示, 且导入照常生效。
 * 这里用最小编译期配置 + 假表单直接驱动 controller, 断言提示通道与入参形状。
 */
describe('use-parent-import-controller 导入后预警', () => {
  let container: HTMLDivElement
  let root: Root
  let api: ReturnType<typeof useParentImportController> | null = null
  const values: ModuleRecordInput = {
    id: '8001',
    customerId: '1001',
    projectId: '9001',
    purchaseOrderNo: '',
  }
  const importedItem = {
    id: 'item-1',
    brand: '宝钢',
    material: 'HRB500',
    quantity: 1,
  } as ModuleLineItem
  const parentRecord: ModuleRecord = {
    id: '5001',
    orderNo: 'PO-1',
    items: [],
  }
  const replaceItems = vi.fn()
  const invalidateSubmission = vi.fn()
  const onDirty = vi.fn()

  const buildApi = (
    warnParentImport: ModuleParentImportDefinition['warnParentImport'],
    overrides: Partial<ModuleParentImportDefinition> = {},
  ) => {
    const parentImport: ModuleParentImportDefinition = {
      parentModuleKey: 'purchase-order',
      label: '采购订单',
      parentFieldKey: 'purchaseOrderNo',
      parentDisplayFieldKey: 'orderNo',
      allowMultipleSelection: true,
      useCandidateSnapshot: true,
      transformItems: () => [{ ...importedItem }],
      warnParentImport,
      ...overrides,
    }
    const config = {
      key: 'sales-order',
      parentImport,
      columns: [],
      detailFields: [],
      formFields: [],
      data: [],
    } as unknown as ModulePageConfig
    const form = {
      validateFields: () => Promise.resolve(values),
      getFieldsValue: () => ({ ...values }),
      setFieldsValue: (next: Partial<ModuleRecordInput>) =>
        Object.assign(values, next),
      resetFields: () => {},
      focusField: () => {},
    }
    const workspace = {
      items: [] as ModuleLineItem[],
      replaceItems,
      invalidateSubmission,
      onDirty,
    }
    let captured: ReturnType<typeof useParentImportController> | null = null
    const Harness = () => {
      captured = useParentImportController({
        session: {
          editorSessionKey: 'session-1',
          moduleKey: 'sales-order',
          config,
        },
        form,
        workspace,
      })
      return null
    }
    api = null
    act(() => {
      root.render(createElement(Harness))
    })
    api = captured
  }

  beforeEach(() => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    values.purchaseOrderNo = ''
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.clearAllMocks()
  })

  it('warnParentImport 返回文案时以 warning 提示并保留导入结果', async () => {
    type WarnParentImport = NonNullable<
      ModuleParentImportDefinition['warnParentImport']
    >
    const warnParentImport = vi.fn<WarnParentImport>(() => '不匹配预警')
    buildApi(warnParentImport)

    await act(async () => {
      await api!.handleImportParentRecord([parentRecord])
    })

    expect(warnParentImport).toHaveBeenCalledTimes(1)
    const [warnArgs] = warnParentImport.mock.calls[0]
    expect(warnArgs.currentRecord.projectId).toBe('9001')
    expect(warnArgs.importedItems).toHaveLength(1)
    expect(warnArgs.importedItems[0].brand).toBe('宝钢')
    expect(warnArgs.parentRecords).toEqual([parentRecord])
    expect(messageMock.warning).toHaveBeenCalledWith('不匹配预警')
    expect(messageMock.success).toHaveBeenCalledTimes(1)
    expect(replaceItems).toHaveBeenCalledTimes(1)
  })

  it('未配置 warnParentImport 时不产生 warning', async () => {
    buildApi(vi.fn(() => null))

    await act(async () => {
      await api!.handleImportParentRecord([parentRecord])
    })

    expect(messageMock.warning).not.toHaveBeenCalled()
    expect(messageMock.success).toHaveBeenCalledTimes(1)
  })

  it('导入进行中重复触发被忽略（同一时刻只执行一次导入）', async () => {
    const detail = vi.mocked(getBusinessModuleDetail)
    let resolveDetail!: (value: ModuleRecord) => void
    detail.mockImplementationOnce(
      () =>
        new Promise<ModuleRecord>((resolve) => {
          resolveDetail = resolve
        }) as never,
    )
    buildApi(
      vi.fn(() => null),
      { useCandidateSnapshot: false },
    )

    let first!: Promise<void>
    act(() => {
      first = api!.handleImportParentRecord([parentRecord])
    })
    await act(async () => {
      await Promise.resolve()
    })
    // 连点：第二次落在第一次的 in-flight 窗口内，必须被同一把锁挡掉
    await act(async () => {
      await api!.handleImportParentRecord([parentRecord])
    })
    expect(detail).toHaveBeenCalledTimes(1)

    await act(async () => {
      resolveDetail(parentRecord)
      await first
    })
    expect(replaceItems).toHaveBeenCalledTimes(1)
    expect(messageMock.success).toHaveBeenCalledTimes(1)
  })

  it('父单详情加载失败时提示带单号，便于定位是哪一张单据', async () => {
    const detail = vi.mocked(getBusinessModuleDetail)
    detail.mockRejectedValueOnce(new Error('404 Not Found'))
    buildApi(
      vi.fn(() => null),
      { useCandidateSnapshot: false },
    )

    await act(async () => {
      await api!.handleImportParentRecord([parentRecord])
    })

    expect(replaceItems).not.toHaveBeenCalled()
    const [errorMessage] = messageMock.error.mock.calls[0] ?? []
    expect(String(errorMessage)).toContain('PO-1')
    expect(String(errorMessage)).toContain('加载失败')
  })
})

describe('父单详情请求超时（10s）', () => {
  const t = (key: string, options?: Record<string, unknown>) =>
    `${key}:${String(options?.no ?? '')}`

  /** 把 mock 当宽松函数用：getBusinessModuleDetail 是重载签名，直接 mockImplementationOnce 推不出参数。 */
  const detailMock = () =>
    getBusinessModuleDetail as unknown as {
      mockImplementationOnce: (
        impl: (moduleKey: string, id: string, signal?: AbortSignal) => unknown,
      ) => void
    }

  afterEach(() => {
    vi.useRealTimers()
  })

  it('超过 10s 中断请求，并抛出带单号的超时提示', async () => {
    vi.useFakeTimers()
    let aborted = false
    detailMock().mockImplementationOnce((_moduleKey, _id, signal) => {
      return new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          aborted = true
          reject(new Error('aborted'))
        })
      })
    })

    const pending = fetchParentDetailWithTimeout({
      moduleKey: 'purchase-order',
      recordId: '5001',
      parentNo: 'PO-1',
      t,
    })
    // 先挂上拒绝断言，避免计时器触发的拒绝被判成 unhandled rejection
    const assertion = expect(pending).rejects.toThrow(
      'common.parentDocumentLoadTimeout:PO-1',
    )
    await vi.advanceTimersByTimeAsync(PARENT_DETAIL_TIMEOUT_MS)
    await assertion
    expect(aborted).toBe(true)
  })

  it('未超时就返回详情（不误报超时）', async () => {
    detailMock().mockImplementationOnce(() => ({
      id: '5001',
      orderNo: 'PO-1',
      items: [],
    }))

    const record = await fetchParentDetailWithTimeout({
      moduleKey: 'purchase-order',
      recordId: '5001',
      parentNo: 'PO-1',
      t,
    })

    expect(record.orderNo).toBe('PO-1')
  })

  it('详情失败时抛带单号的加载失败提示（与超时区分）', async () => {
    detailMock().mockImplementationOnce(() => {
      throw new Error('404')
    })

    await expect(
      fetchParentDetailWithTimeout({
        moduleKey: 'purchase-order',
        recordId: '5001',
        parentNo: 'PO-1',
        t,
      }),
    ).rejects.toThrow('common.parentDocumentLoadFailed:PO-1')
  })

  it('详情失败后 in-flight 锁必须释放，可以再次导入', async () => {
    const replaceItems = vi.fn()
    const config = {
      key: 'sales-order',
      parentImport: {
        parentModuleKey: 'purchase-order',
        label: '采购订单',
        parentFieldKey: 'purchaseOrderNo',
        parentDisplayFieldKey: 'orderNo',
        useCandidateSnapshot: false,
        transformItems: () => [{ id: 'item-1', quantity: 1 }],
      },
      columns: [],
      detailFields: [],
      formFields: [],
      data: [],
    } as unknown as ModulePageConfig
    const values: ModuleRecordInput = { id: '8001', purchaseOrderNo: '' }
    let captured: ReturnType<typeof useParentImportController> | null = null
    const container = document.createElement('div')
    document.body.appendChild(container)
    const root = createRoot(container)
    const Harness = () => {
      captured = useParentImportController({
        session: {
          editorSessionKey: 'session-timeout',
          moduleKey: 'sales-order',
          config,
        },
        form: {
          validateFields: () => Promise.resolve(values),
          getFieldsValue: () => ({ ...values }),
          setFieldsValue: (next: Partial<ModuleRecordInput>) =>
            Object.assign(values, next),
          resetFields: () => {},
          focusField: () => {},
        },
        workspace: {
          items: [],
          replaceItems,
          invalidateSubmission: vi.fn(),
          onDirty: vi.fn(),
        },
      })
      return null
    }
    try {
      ;(
        globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
      ).IS_REACT_ACT_ENVIRONMENT = true
      act(() => {
        root.render(createElement(Harness))
      })

      detailMock().mockImplementationOnce(() => {
        throw new Error('boom')
      })
      await act(async () => {
        await captured!.handleImportParentRecord([
          { id: '5001', orderNo: 'PO-1' },
        ])
      })
      expect(replaceItems).not.toHaveBeenCalled()

      detailMock().mockImplementationOnce(() => ({
        id: '5001',
        orderNo: 'PO-1',
        items: [{ id: 'src-1', quantity: 2 }],
      }))
      await act(async () => {
        await captured!.handleImportParentRecord([
          { id: '5001', orderNo: 'PO-1' },
        ])
      })
      // 第二次没有被 in-flight 锁挡住 → finally 已解锁
      expect(replaceItems).toHaveBeenCalledTimes(1)
    } finally {
      act(() => root.unmount())
      container.remove()
    }
  })
})
