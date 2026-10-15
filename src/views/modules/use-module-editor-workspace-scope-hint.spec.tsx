// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, createElement, useEffect, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModuleKey } from '@/module-system/core/module-key'
import type { ModuleLineItem, ModulePageConfig } from '@/types/module-page'

/**
 * 接线测试：验证「明细改写」这一个写入点真的会触发项目允许范围即时提示。
 *
 * <p>只 mock 与本主题无关的协作者（保存控制器、父单导入控制器、结算主体默认值），
 * 明细写入、项目范围判定与提示都跑真实实现。</p>
 */

const antdAppMock = vi.hoisted(() => ({
  message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
  modal: { confirm: vi.fn() },
}))

vi.mock('@/utils/antd-app', () => ({
  message: antdAppMock.message,
  modal: antdAppMock.modal,
}))

vi.mock(
  '@/module-system/core/module-option-resolvers',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('@/module-system/core/module-option-resolvers')
      >()
    return { ...actual, findProjectOption: vi.fn() }
  },
)

vi.mock('@/views/modules/use-editor-submission-controller', () => ({
  useEditorSubmissionController: () => ({
    clearSaveResult: vi.fn(),
    handleSave: vi.fn(),
    reloadAfterConflict: vi.fn(),
    saveResult: null,
    saving: false,
  }),
}))

vi.mock('@/views/modules/use-parent-import-controller', () => ({
  useParentImportController: () => ({
    closeParentSelector: vi.fn(),
    handleImportParentRecord: vi.fn(),
    openParentSelector: vi.fn(),
    parentImporting: false,
    parentSelectorDisplayFieldKey: 'orderNo',
    parentSelectorFilters: {},
    parentSelectorModuleKey: 'purchase-order',
    parentSelectorOpen: false,
  }),
}))

vi.mock('@/api/system/company-settings', () => ({
  getCompanySettingProfile: vi.fn(() => Promise.resolve(null)),
  fetchSettlementCompanyOptions: vi.fn(() => Promise.resolve([])),
}))

import { findProjectOption } from '@/module-system/core/module-option-resolvers'
import { useModuleEditorWorkspace } from '@/views/modules/use-module-editor-workspace'

const findProjectOptionMock = vi.mocked(findProjectOption)

function projectOption(
  allowedBrands: string[],
  allowedMaterials: string[],
  severity: 'WARN' | 'BLOCK' = 'WARN',
) {
  return {
    id: '9001',
    value: '9001',
    label: '项目甲',
    customerId: '1001',
    projectCode: 'XM001',
    projectName: '项目甲',
    allowedBrands,
    allowedMaterials,
    allowedBrandSeverity: severity,
    allowedMaterialSeverity: severity,
  }
}

function buildConfig(moduleKey: string): ModulePageConfig {
  return {
    key: moduleKey,
    title: '',
    kicker: '',
    description: '',
    filters: [],
    columns: [],
    detailFields: [],
    data: [],
    buildOverview: () => [],
    formFields: [],
    itemColumns: [{ title: '品牌', dataIndex: 'brand' }],
  } as unknown as ModulePageConfig
}

/** 当前单据上的项目范围来源：与父单导入路径同源的表单值。 */
const FORM_VALUES = { id: '8001', customerId: '1001', projectId: '9001' }

interface HarnessApi {
  setItems: (updater: (items: ModuleLineItem[]) => ModuleLineItem[]) => void
  addItem: () => void
  /** 模拟表单把项目字段改成另一个项目(触发 handleFormValuesChange 的重判分支) */
  changeProject: (projectId: string) => void
  items: () => ModuleLineItem[]
}

interface ProbeProps {
  moduleKey: string
  config: ModulePageConfig
  initialItems: ModuleLineItem[]
  apiRef: { current: HarnessApi | null }
}

/** 项目乙：同样不允许宝钢，但 id/名称不同，确保判定上下文真的换了。 */
function otherProjectOption() {
  return {
    ...projectOption(['沙钢'], []),
    id: '9002',
    value: '9002',
    label: '项目乙',
    projectName: '项目乙',
  }
}

function Probe({ moduleKey, config, initialItems, apiRef }: ProbeProps) {
  const [record] = useState({
    id: '8001',
    customerId: '1001',
    projectId: '9001',
    items: initialItems,
  })
  /*
   * 表单桩要能改 projectId：真实 antd 表单在 onValuesChange 触发时新值已经生效，
   * resolveCurrentRecord 读到的就是新项目，否则重判用的还是旧项目。
   */
  const [formState] = useState(() => ({
    values: { ...FORM_VALUES },
  }))
  const [form] = useState(() => ({
    validateFields: () => Promise.resolve({ ...formState.values }),
    getFieldsValue: () => formState.values,
    setFieldsValue: () => undefined,
    resetFields: () => undefined,
    focusField: () => undefined,
  }))
  const workspace = useModuleEditorWorkspace({
    open: true,
    config,
    record,
    initialParentImportSource: null,
    moduleKey: moduleKey as ModuleKey,
    editorAuditActionKind: null,
    editorAuditTarget: null,
    form,
    onClose: () => undefined,
    onDirty: () => undefined,
    onSaved: () => undefined,
    autoInsertBlankItemOnCreate: false,
  })
  const { addItem, handleFormValuesChange, items, setItems } = workspace
  const changeProject = (projectId: string) => {
    formState.values.projectId = projectId
    handleFormValuesChange({ projectId })
  }
  useEffect(() => {
    apiRef.current = {
      addItem,
      changeProject,
      items: () => items,
      setItems: (updater) => setItems(updater),
    }
  })
  return null
}

describe('useModuleEditorWorkspace 项目允许范围即时提示接线', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient
  let apiRef: { current: HarnessApi | null }

  beforeEach(() => {
    antdAppMock.message.warning.mockClear()
    findProjectOptionMock.mockReset()
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    apiRef = { current: null }
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
    queryClient.clear()
  })

  function render(moduleKey: string, initialItems: ModuleLineItem[]) {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(Probe, {
            moduleKey,
            config: buildConfig(moduleKey),
            initialItems,
            apiRef,
          }),
        ),
      )
    })
  }

  function currentItems(): ModuleLineItem[] {
    return apiRef.current?.items() ?? []
  }

  it('明细写入越界品牌时弹提示且保留写入结果', () => {
    findProjectOptionMock.mockReturnValue(projectOption(['沙钢'], []))
    render('sales-order', [{ id: '1', brand: '沙钢' }])

    act(() => {
      apiRef.current?.setItems((items) =>
        items.map((item) =>
          item.id === '1' ? { ...item, brand: '宝钢' } : item,
        ),
      )
    })

    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)
    expect(String(antdAppMock.message.warning.mock.calls[0]?.[0])).toContain(
      '宝钢',
    )
    expect(currentItems()[0]?.brand).toBe('宝钢')
  })

  it('复制本行(新增行带出越界品牌)时弹提示', () => {
    findProjectOptionMock.mockReturnValue(projectOption(['沙钢'], []))
    render('sales-order', [{ id: '1', brand: '宝钢' }])

    act(() => {
      apiRef.current?.setItems((items) => [...items, { ...items[0], id: '2' }])
    })

    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)
    expect(currentItems()).toHaveLength(2)
  })

  it('BLOCK 档提示「保存时会被拦截」但仍不阻断编辑', () => {
    findProjectOptionMock.mockReturnValue(projectOption(['沙钢'], [], 'BLOCK'))
    render('sales-order', [{ id: '1' }])

    act(() => {
      apiRef.current?.setItems((items) =>
        items.map((item) => ({ ...item, brand: '宝钢' })),
      )
    })

    expect(String(antdAppMock.message.warning.mock.calls[0]?.[0])).toContain(
      '保存时会被拦截',
    )
    expect(currentItems()[0]?.brand).toBe('宝钢')
  })

  it('新增空白行本身不提示(品牌/材质为空, 规则不判定)', () => {
    findProjectOptionMock.mockReturnValue(projectOption(['沙钢'], []))
    render('sales-order', [])

    act(() => {
      apiRef.current?.addItem()
    })

    expect(antdAppMock.message.warning).not.toHaveBeenCalled()
    expect(currentItems()).toHaveLength(1)
  })

  it('非 sales-order 模块的明细写入不弹提示', () => {
    findProjectOptionMock.mockReturnValue(projectOption(['沙钢'], []))
    render('purchase-order', [{ id: '1' }])

    act(() => {
      apiRef.current?.setItems((items) =>
        items.map((item) => ({ ...item, brand: '宝钢' })),
      )
    })

    expect(antdAppMock.message.warning).not.toHaveBeenCalled()
    expect(findProjectOptionMock).not.toHaveBeenCalled()
  })

  it('项目字段变更时按新项目重判既有明细(不依赖明细再次改写)', () => {
    findProjectOptionMock.mockImplementation((projectId) =>
      projectId === '9001' ? projectOption(['沙钢'], []) : otherProjectOption(),
    )
    render('sales-order', [{ id: '1', brand: '宝钢' }])

    // 项目甲下存量明细是初始化带进来的, 本回合没有改写 → 不做判定
    expect(antdAppMock.message.warning).not.toHaveBeenCalled()

    act(() => {
      apiRef.current?.changeProject('9002')
    })

    // 项目乙同样不允许宝钢: 换项目后 handleFormValuesChange 必须触发全明细重判
    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)
    expect(String(antdAppMock.message.warning.mock.calls[0]?.[0])).toContain(
      '宝钢',
    )
    expect(currentItems()[0]?.brand).toBe('宝钢')
  })
})
