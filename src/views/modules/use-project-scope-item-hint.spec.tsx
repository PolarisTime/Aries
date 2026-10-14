// @vitest-environment jsdom

import { act, createElement, useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModuleLineItem, ModuleRecordInput } from '@/types/module-page'

/** 提示走 antd message: 用假 app api 捕获文案, 并断言「只提示不阻断」。 */
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

import { findProjectOption } from '@/module-system/core/module-option-resolvers'
import {
  collectSpecRewriteItems,
  useProjectScopeItemHint,
} from '@/views/modules/use-project-scope-item-hint'

const findProjectOptionMock = vi.mocked(findProjectOption)

function projectOption(
  allowedBrands: string[],
  allowedMaterials: string[],
  allowedBrandSeverity?: 'OFF' | 'WARN' | 'BLOCK',
  allowedMaterialSeverity?: 'OFF' | 'WARN' | 'BLOCK',
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
    ...(allowedBrandSeverity ? { allowedBrandSeverity } : {}),
    ...(allowedMaterialSeverity ? { allowedMaterialSeverity } : {}),
  }
}

const currentRecord: ModuleRecordInput = {
  id: '8001',
  customerId: '1001',
  projectId: '9001',
}

interface HarnessApi {
  applyItems: (nextItems: ModuleLineItem[]) => void
  /** 等价于 use-module-editor-workspace 里「项目字段变更 → 全明细重判」的分支 */
  changeProject: (projectId: string) => void
  items: () => ModuleLineItem[]
}

interface ProbeProps {
  moduleKey: string
  record: ModuleRecordInput
  initialItems: ModuleLineItem[]
  apiRef: { current: HarnessApi | null }
}

/**
 * 与 use-module-editor-workspace 的接线同构的最小宿主：
 * 明细列的所有手工写入都会带着「改写前后的数组」走 updateItems，提示就在这里发生，
 * 且提示不阻断写入（items 照常落进状态，最终由服务端 422 兜底）。
 */
function Probe({ moduleKey, record, initialItems, apiRef }: ProbeProps) {
  const [items, setItems] = useState(initialItems)
  /*
   * 「当前单据」用 ref 承接：真实接线里 resolveCurrentRecord 读的是表单的**最新**值，
   * 项目切换必须在触发重判之前就已经生效，否则重判用的还是旧项目。
   */
  const recordRef = useRef(record)
  const hintItemScopes = useProjectScopeItemHint({
    moduleKey,
    resolveCurrentRecord: () => recordRef.current,
  })
  const applyItems = (nextItems: ModuleLineItem[]) => {
    hintItemScopes(items, nextItems)
    setItems(nextItems)
  }
  const changeProject = (projectId: string) => {
    recordRef.current = { ...recordRef.current, projectId }
    // 项目允许清单整单级变化：既有明细必须按新项目重判, 不能只等下一次明细改写
    hintItemScopes(items, items, { reevaluateAll: true })
  }
  /*
   * 测试句柄包到 ref 里再回写: 渲染期直接改 props 对象会被 React Compiler 判为
   * immutability 违规, 因此放到 effect 里执行, 每次都刷新为最新渲染的闭包。
   */
  useEffect(() => {
    apiRef.current = { applyItems, changeProject, items: () => items }
  })
  return null
}

describe('useProjectScopeItemHint 明细行项目范围即时提示', () => {
  let container: HTMLDivElement
  let root: Root
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
    apiRef = { current: null }
  })

  afterEach(() => {
    act(() => {
      root.unmount()
    })
    container.remove()
  })

  function render(args: {
    moduleKey: string
    initialItems?: ModuleLineItem[]
    record?: ModuleRecordInput
  }) {
    act(() => {
      root.render(
        createElement(Probe, {
          moduleKey: args.moduleKey,
          record: args.record ?? currentRecord,
          initialItems: args.initialItems ?? [],
          apiRef,
        }),
      )
    })
  }

  /** 按当前明细推出下一版明细，等价于明细列的一次手工写入。 */
  function rewrite(mutate: (items: ModuleLineItem[]) => ModuleLineItem[]) {
    const api = apiRef.current
    if (!api) throw new Error('harness 未就绪')
    act(() => {
      api.applyItems(mutate(api.items()))
    })
  }

  function currentItems(): ModuleLineItem[] {
    return apiRef.current?.items() ?? []
  }

  /** 模拟表单里把项目字段改成另一个项目（触发全明细重判的接线）。 */
  function changeProject(projectId: string) {
    const api = apiRef.current
    if (!api) throw new Error('harness 未就绪')
    act(() => {
      api.changeProject(projectId)
    })
  }

  function writeBrand(itemId: string, brand: string) {
    rewrite((items) =>
      items.map((item) => (item.id === itemId ? { ...item, brand } : item)),
    )
  }

  function writeMaterial(itemId: string, material: string) {
    rewrite((items) =>
      items.map((item) => (item.id === itemId ? { ...item, material } : item)),
    )
  }

  function writeQuantity(itemId: string, quantity: number) {
    rewrite((items) =>
      items.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    )
  }

  it('新增行(复制本行)带出越界品牌时即时提示, 且不阻断写入', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], [], 'WARN', 'WARN'),
    )
    render({ moduleKey: 'sales-order' })

    rewrite((items) => [
      ...items,
      { id: '90001', brand: '宝钢', material: 'HRB400E' },
    ])

    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)
    const warning = String(antdAppMock.message.warning.mock.calls[0]?.[0])
    expect(warning).toContain('项目甲')
    expect(warning).toContain('宝钢')
    // 不阻断: 行与越界值照常进入编辑态
    expect(currentItems()).toHaveLength(1)
    expect(currentItems()[0]?.brand).toBe('宝钢')
  })

  it('改品牌越界时提示(WARN 档不阻断)', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], [], 'WARN', 'WARN'),
    )
    render({ moduleKey: 'sales-order', initialItems: [{ id: '1' }] })

    writeBrand('1', '宝钢')

    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)
    expect(
      String(antdAppMock.message.warning.mock.calls[0]?.[0]),
    ).not.toContain('保存时会被拦截')
    expect(currentItems()[0]?.brand).toBe('宝钢')
  })

  it('BLOCK 档文案额外说明「保存时会被拦截」, 但仍不阻断编辑', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], [], 'BLOCK', 'WARN'),
    )
    render({ moduleKey: 'sales-order', initialItems: [{ id: '1' }] })

    writeBrand('1', '宝钢')

    expect(String(antdAppMock.message.warning.mock.calls[0]?.[0])).toContain(
      '保存时会被拦截',
    )
    expect(currentItems()[0]?.brand).toBe('宝钢')
  })

  it('材质选择控件写入越界材质时同样提示', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption([], ['HRB400'], 'WARN', 'WARN'),
    )
    render({ moduleKey: 'sales-order', initialItems: [{ id: '1' }] })

    writeMaterial('1', 'HRB500')

    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)
    expect(String(antdAppMock.message.warning.mock.calls[0]?.[0])).toContain(
      'HRB500',
    )
  })

  it('同一行 + 同一维度 + 同一越界值只提示一次', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], ['HRB400'], 'WARN', 'WARN'),
    )
    render({ moduleKey: 'sales-order', initialItems: [{ id: '1' }] })

    writeBrand('1', '宝钢')
    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)

    // 同行其它列继续写作: 品牌越界值没有变化, 不应再提示一次
    writeMaterial('1', 'HRB400')
    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)
    writeQuantity('1', 12)
    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)
  })

  it('越界值改成另一个越界值时按新值提示', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], [], 'WARN', 'WARN'),
    )
    render({ moduleKey: 'sales-order', initialItems: [{ id: '1' }] })

    writeBrand('1', '宝钢')
    writeBrand('1', '中天')

    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(2)
    expect(String(antdAppMock.message.warning.mock.calls[1]?.[0])).toContain(
      '中天',
    )
  })

  /** 项目乙：同样不允许宝钢，但 id/名称不同，确保判定上下文真的换了。 */
  function projectOptionB() {
    return {
      ...projectOption(['沙钢'], [], 'WARN', 'WARN'),
      id: '9002',
      value: '9002',
      label: '项目乙',
      projectName: '项目乙',
    }
  }

  it('切换项目后按新项目重判既有明细(不依赖明细再次改写)', () => {
    findProjectOptionMock.mockImplementation((projectId) =>
      projectId === '9001'
        ? projectOption(['沙钢'], [], 'WARN', 'WARN')
        : projectOptionB(),
    )
    render({
      moduleKey: 'sales-order',
      initialItems: [{ id: '1', brand: '宝钢' }],
    })

    // 项目甲下存量明细是初始化带进来的, 本回合没有改写 → 不做判定
    expect(antdAppMock.message.warning).not.toHaveBeenCalled()

    changeProject('9002')

    // 项目乙同样不允许宝钢: 换项目后必须立刻重判既有明细(修复前要等下一次明细改写)
    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)
    expect(String(antdAppMock.message.warning.mock.calls[0]?.[0])).toContain(
      '宝钢',
    )
    expect(currentItems()[0]?.brand).toBe('宝钢')
  })

  it('去重键含 projectId: 换到另一个项目后同一越界值仍会提示', () => {
    findProjectOptionMock.mockImplementation((projectId) =>
      projectId === '9001'
        ? projectOption(['沙钢'], [], 'WARN', 'WARN')
        : projectOptionB(),
    )
    render({
      moduleKey: 'sales-order',
      initialItems: [{ id: '1', brand: '宝钢' }],
    })

    changeProject('9002')
    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)

    // 切回项目甲: 它是独立的一套判定上下文, 不能被项目乙的去重条目吞掉
    changeProject('9001')
    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(2)
  })

  it('同一项目内重复重判不重复提示', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], [], 'WARN', 'WARN'),
    )
    render({
      moduleKey: 'sales-order',
      initialItems: [{ id: '1', brand: '宝钢' }],
    })

    changeProject('9001')
    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)

    changeProject('9001')
    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)
  })

  it('修正到允许范围后再越界可以再次提示', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], [], 'WARN', 'WARN'),
    )
    render({ moduleKey: 'sales-order', initialItems: [{ id: '1' }] })

    writeBrand('1', '宝钢')
    writeBrand('1', '沙钢')
    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)

    writeBrand('1', '宝钢')
    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(2)
  })

  it('行被删除后重置: 同一越界值重新出现时再提示', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], [], 'WARN', 'WARN'),
    )
    render({ moduleKey: 'sales-order', initialItems: [{ id: '1' }] })

    writeBrand('1', '宝钢')
    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(1)

    rewrite((items) => items.filter((item) => item.id !== '1'))
    rewrite((items) => [...items, { id: '1', brand: '宝钢' }])

    expect(antdAppMock.message.warning).toHaveBeenCalledTimes(2)
  })

  it('非 sales-order 模块不弹提示(采购订单/入库/退货零影响)', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], ['HRB400'], 'BLOCK', 'BLOCK'),
    )

    for (const moduleKey of [
      'purchase-order',
      'purchase-inbound',
      'sales-return',
    ]) {
      render({ moduleKey, initialItems: [{ id: '1' }] })
      writeBrand('1', '宝钢')
      writeMaterial('1', 'HRB500')
    }

    expect(antdAppMock.message.warning).not.toHaveBeenCalled()
    expect(findProjectOptionMock).not.toHaveBeenCalled()
  })

  it('项目未选择时不做判定', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], [], 'WARN', 'WARN'),
    )
    render({
      moduleKey: 'sales-order',
      record: { id: '8001', customerId: '1001' },
      initialItems: [{ id: '1' }],
    })

    writeBrand('1', '宝钢')

    expect(antdAppMock.message.warning).not.toHaveBeenCalled()
    expect(findProjectOptionMock).not.toHaveBeenCalled()
  })

  it('项目允许清单为空(不限制)时不提示', () => {
    findProjectOptionMock.mockReturnValue(projectOption([], [], 'WARN', 'WARN'))
    render({ moduleKey: 'sales-order', initialItems: [{ id: '1' }] })

    writeBrand('1', '宝钢')
    writeMaterial('1', 'HRB500')

    expect(antdAppMock.message.warning).not.toHaveBeenCalled()
  })

  it('命中允许范围时不提示', () => {
    findProjectOptionMock.mockReturnValue(
      projectOption(['沙钢'], ['HRB400'], 'WARN', 'WARN'),
    )
    render({ moduleKey: 'sales-order', initialItems: [{ id: '1' }] })

    writeBrand('1', ' 沙钢 ')
    writeMaterial('1', 'HRB400')

    expect(antdAppMock.message.warning).not.toHaveBeenCalled()
  })
})

describe('collectSpecRewriteItems', () => {
  it('品牌/材质没变时整行重建不算改写(价格回填不触发提示)', () => {
    const prev = [{ id: '1', brand: '沙钢', material: 'HRB400', unitPrice: 1 }]
    const next = [{ id: '1', brand: '沙钢', material: 'HRB400', unitPrice: 2 }]

    expect(collectSpecRewriteItems(prev, next)).toEqual([])
  })

  it('新行、品牌改写、材质改写都算改写', () => {
    const prev = [
      { id: '1', brand: '沙钢' },
      { id: '2', brand: '沙钢', material: 'HRB400' },
    ]
    const next = [
      { id: '1', brand: '宝钢' },
      { id: '2', brand: '沙钢', material: 'HRB500' },
      { id: '3', brand: '' },
    ]

    expect(collectSpecRewriteItems(prev, next).map((item) => item.id)).toEqual([
      '1',
      '2',
      '3',
    ])
  })

  it('仅空白差异不算改写', () => {
    expect(
      collectSpecRewriteItems(
        [{ id: '1', brand: '沙钢' }],
        [{ id: '1', brand: ' 沙钢 ' }],
      ),
    ).toEqual([])
  })
})
