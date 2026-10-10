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

import { useParentImportController } from './use-parent-import-controller'

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
})
