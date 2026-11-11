// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { getDocumentFlow } from '@/api/system/document-flow'
import { DocumentFlowModal } from '@/components/DocumentFlowModal'
import type { DocumentFlowView } from '@/components/document-flow/DocumentFlowToolbar'

vi.mock('@/api/system/document-flow', () => ({
  getDocumentFlow: vi.fn(),
}))

const mockedGetDocumentFlow = vi.mocked(getDocumentFlow)

const flow = {
  documentNo: 'PO-1',
  nodes: [
    {
      type: 'purchase-order',
      id: '1',
      no: 'PO-1',
      status: '已审核',
      amount: '1000.00',
      weight: '10.00000000',
      date: '2026-09-01',
    },
    {
      type: 'purchase-inbound',
      id: '2',
      no: 'IN-1',
      status: '已审核',
      amount: null,
      weight: null,
      date: '2026-09-02',
    },
  ],
  links: [
    {
      fromType: 'purchase-order',
      fromId: '1',
      toType: 'purchase-inbound',
      toId: '2',
      linkType: '入库',
    },
  ],
}

describe('DocumentFlowModal', () => {
  let container: HTMLDivElement
  let root: Root
  let queryClient: QueryClient

  beforeEach(async () => {
    await i18n.changeLanguage('zh-CN')
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    /*
     * 列表视图用 antd `Table`：它按容器尺寸做列宽测量（ResizeObserver）与响应式断点
     * （matchMedia），jsdom 都没有实现，不打桩会直接抛 TypeError。
     */
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
    if (!window.matchMedia) {
      window.matchMedia = (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false,
      })
    }
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    mockedGetDocumentFlow.mockReset()
  })

  afterEach(async () => {
    act(() => root.unmount())
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 25)
      })
    })
    container.remove()
    document.body.innerHTML = ''
  })

  async function renderModal(
    onOpenNode?: (node: unknown) => void,
    initialView?: DocumentFlowView,
  ) {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(DocumentFlowModal, {
            open: true,
            documentNo: 'PO-1',
            onClose: () => {},
            initialView,
            onOpenNode: onOpenNode as never,
          }),
        ),
      )
    })
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 25)
      })
    })
  }

  it('渲染分层节点、单号与列头摘要', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()

    expect(mockedGetDocumentFlow).toHaveBeenCalledWith(
      'PO-1',
      expect.anything(),
    )
    expect(document.body.textContent).toContain('PO-1')
    expect(document.body.textContent).toContain('IN-1')
    expect(document.body.querySelectorAll('.document-flow-node')).toHaveLength(
      2,
    )
  })

  it('点击节点回调对应单据', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    const onOpenNode = vi.fn()
    await renderModal(onOpenNode)

    const nodes = document.body.querySelectorAll<HTMLButtonElement>(
      '.document-flow-node',
    )
    act(() => {
      nodes[1]?.click()
    })

    expect(onOpenNode).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'purchase-inbound', no: 'IN-1' }),
    )
  })

  it('加载失败展示错误提示', async () => {
    mockedGetDocumentFlow.mockRejectedValue(new Error('网络异常'))
    await renderModal()

    expect(document.body.textContent).toContain('网络异常')
  })

  it('高亮当前查询单据节点并标记 aria-current', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()

    const current = document.body.querySelector('.document-flow-node-current')
    expect(current).not.toBeNull()
    expect(current?.getAttribute('aria-current')).toBe('true')
    expect(current?.textContent).toContain('PO-1')
    expect(
      document.body.querySelectorAll('.document-flow-node-current'),
    ).toHaveLength(1)
  })

  it('「当前单据」徽标渲染在卡片内部的类型行, 不再绝对定位压边', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()

    const current = document.body.querySelector('.document-flow-node-current')
    // 徽标必须是节点按钮的后代, 且与类型同一行（.document-flow-node-head）
    const badge = current?.querySelector(
      '.document-flow-node-head .document-flow-node-badge',
    )
    expect(badge).not.toBeNull()
    expect(badge?.textContent).toContain('当前单据')
    // 类型行内只有类型 + 徽标两段, 顺序固定「类型 → 徽标」
    const head = current?.querySelector('.document-flow-node-head')
    expect(head?.children).toHaveLength(2)
    expect(head?.firstElementChild?.className).toContain(
      'document-flow-node-type',
    )
    expect(head?.lastElementChild?.className).toContain(
      'document-flow-node-badge',
    )
  })

  it('列头按类型汇总张数, 连线不再重复类型文字', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()

    const headers = Array.from(
      document.body.querySelectorAll('.document-flow-column-header'),
    ).map((item) => item.textContent)
    expect(headers).toEqual(['采购单 · 1 张', '采购入库单 · 1 张'])

    // 连线上不再有类型文字, 但 <title> 仍保留（读屏/悬浮）
    expect(document.body.querySelector('.document-flow-edge-label')).toBeNull()
    const edgeTitle = document.body.querySelector('.document-flow-edge title')
    expect(edgeTitle?.textContent).toBe('入库')
  })

  it('节点内直接展示金额与重量(仅在存在时, 按全站格式)', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()

    const nodes = document.body.querySelectorAll('.document-flow-node')
    const orderNode = nodes[0]
    const inboundNode = nodes[1]

    expect(orderNode.textContent).toContain('金额')
    // 金额走 formatAmount：2 位小数、不带千分位（数字要能直接复制进 Excel）
    expect(orderNode.textContent).toContain('1000.00')
    expect(orderNode.textContent).toContain('重量')
    // 重量走 formatWeight：3 位小数，与表格列同一口径
    expect(orderNode.textContent).toContain('10.000')

    expect(inboundNode.querySelector('.document-flow-node-metrics')).toBeNull()
  })

  it('展示上游 → 下游方向图例', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()

    const legend = document.body.querySelector('.document-flow-legend')
    expect(legend).not.toBeNull()
    expect(legend?.textContent).toContain('上游')
    expect(legend?.textContent).toContain('下游')
  })

  it('同一类型固定一列：混排类型拆成多条泳道，每列只写自己的类型', async () => {
    mockedGetDocumentFlow.mockResolvedValue({
      ...flow,
      nodes: [
        flow.nodes[0],
        flow.nodes[1],
        {
          type: 'freight-bill',
          id: '3',
          no: 'FB-1',
          status: '草稿',
          amount: null,
          weight: null,
          date: '2026-09-03',
        },
      ],
      links: [
        ...flow.links,
        {
          fromType: 'purchase-order',
          fromId: '1',
          toType: 'freight-bill',
          toId: '3',
          linkType: '物流',
        },
      ],
    })
    await renderModal()

    const headers = Array.from(
      document.body.querySelectorAll('.document-flow-column-header'),
    ).map((item) => item.textContent ?? '')
    // 按单据类型固定分列：采购单 / 采购入库单 / 物流单 各占一列，不再混在同一列
    expect(headers).toHaveLength(3)
    expect(headers[1]).toContain('采购入库单 · 1 张')
    expect(headers[2]).toContain('物流单 · 1 张')
    expect(headers[1]).not.toContain('物流单')
  })

  it('未截断时不显示截断提示', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()

    expect(document.body.querySelector('.document-flow-truncated')).toBeNull()
  })

  it('服务端截断时显示明确提示', async () => {
    mockedGetDocumentFlow.mockResolvedValue({ ...flow, truncated: true })
    await renderModal()

    const alert = document.body.querySelector('.document-flow-truncated')
    expect(alert).not.toBeNull()
    expect(alert?.textContent).toContain('截断')
  })

  it('关系边缺失 quantity/weight 时完全不渲染数量', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()

    expect(document.body.querySelector('.document-flow-edge-metric')).toBeNull()
  })

  it('关系边带 quantity/weight 时在连线上显示数量（件/吨）', async () => {
    mockedGetDocumentFlow.mockResolvedValue({
      ...flow,
      links: [{ ...flow.links[0], quantity: '10', weight: '12.5' }],
    })
    await renderModal()

    const metrics = Array.from(
      document.body.querySelectorAll('.document-flow-edge-metric'),
    ).map((item) => item.textContent)
    expect(metrics).toEqual(['10 件 · 12.500 吨'])
    // 类型与数量都进 <title>：读屏与悬浮仍能拿到完整语义
    expect(
      document.body.querySelector('.document-flow-edge title')?.textContent,
    ).toBe('入库 · 10 件 · 12.500 吨')
  })

  it('关系边只带 quantity 时不拼接空的重量段', async () => {
    mockedGetDocumentFlow.mockResolvedValue({
      ...flow,
      links: [{ ...flow.links[0], quantity: 8, weight: null }],
    })
    await renderModal()

    const metrics = Array.from(
      document.body.querySelectorAll('.document-flow-edge-metric'),
    ).map((item) => item.textContent)
    expect(metrics).toEqual(['8 件'])
  })

  /** 点 Segmented 的选项（antd 渲染成 label + 隐藏 radio，点 radio 最稳）。 */
  function clickViewSwitch(label: string) {
    const item = Array.from(
      document.body.querySelectorAll<HTMLElement>('.ant-segmented-item'),
    ).find((element) => element.textContent?.includes(label))
    expect(item, `未找到视图切换项：${label}`).toBeTruthy()
    const input = item?.querySelector('input')
    act(() => {
      input?.click()
    })
  }

  it('默认图视图；切到列表后图 DOM 消失、切回恢复', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()

    // 默认图：画布在、列表不在
    expect(
      document.body.querySelector('.document-flow-viewport'),
    ).not.toBeNull()
    expect(document.body.querySelector('.document-flow-list')).toBeNull()

    clickViewSwitch('列表')

    expect(document.body.querySelector('.document-flow-list')).not.toBeNull()
    expect(document.body.querySelector('.document-flow-viewport')).toBeNull()
    expect(document.body.querySelector('.document-flow-canvas')).toBeNull()

    clickViewSwitch('图')

    expect(
      document.body.querySelector('.document-flow-viewport'),
    ).not.toBeNull()
    expect(document.body.querySelector('.document-flow-list')).toBeNull()
  })

  it('列表视图用表格呈现：类型/单号/状态/日期/金额/重量按列对齐', async () => {
    mockedGetDocumentFlow.mockResolvedValue({
      ...flow,
      nodes: [
        flow.nodes[0],
        flow.nodes[1],
        {
          type: 'purchase-inbound',
          id: '3',
          no: 'IN-2',
          status: '已审核',
          amount: null,
          weight: null,
          date: '2026-09-03',
        },
      ],
      links: [
        ...flow.links,
        {
          fromType: 'purchase-order',
          fromId: '1',
          toType: 'purchase-inbound',
          toId: '3',
          linkType: '入库',
        },
      ],
    })
    await renderModal()
    clickViewSwitch('列表')

    // 表头来自 i18n（Type/No./Status/Date/Amount/Weight 六列）
    const headers = Array.from(
      document.body.querySelectorAll('.document-flow-list-doc-table thead th'),
    ).map((th) => th.textContent)
    expect(headers).toEqual(['类型', '单号', '状态', '日期', '金额', '重量'])

    // 三类共三条单据，类型列用 Tag 标出（不再靠分组标题）
    const rows = Array.from(
      document.body.querySelectorAll<HTMLTableRowElement>(
        '.document-flow-list-doc-table tbody tr.ant-table-row',
      ),
    )
    expect(rows).toHaveLength(3)
    expect(rows[0]?.textContent).toContain('采购单')
    expect(rows[0]?.textContent).toContain('PO-1')
    expect(rows[0]?.textContent).toContain('已审核')
    // 与节点卡片同一口径：formatAmount（2 位小数、无千分位）
    expect(rows[0]?.textContent).toContain('1000.00')
    // 当前单据行有标记（整行高亮由 CSS 按这个类名命中）
    expect(
      document.body.querySelector('.document-flow-list-row-current'),
    ).not.toBeNull()
  })

  it('列表视图的关系行：上游 → 下游 + 关系类型，数量缺失不渲染', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()
    clickViewSwitch('列表')

    const [relation] = Array.from(
      document.body.querySelectorAll<HTMLTableRowElement>(
        '.document-flow-list-relation-table tbody tr.ant-table-row',
      ),
    )
    expect(relation?.textContent).toContain('PO-1')
    expect(relation?.textContent).toContain('IN-1')
    expect(relation?.textContent).toContain('入库')
    // flow.links 没有 quantity/weight → 整段不渲染
    expect(document.body.querySelector('.document-flow-list-metric')).toBeNull()
  })

  it('列表视图关系行带数量时展示「N 件 · N 吨」', async () => {
    mockedGetDocumentFlow.mockResolvedValue({
      ...flow,
      links: [{ ...flow.links[0], quantity: '10', weight: '12.5' }],
    })
    await renderModal()
    clickViewSwitch('列表')

    expect(
      document.body.querySelector('.document-flow-list-metric')?.textContent,
    ).toBe('10 件 · 12.500 吨')
  })

  it('视图切换有可访问名（radiogroup + 业务 aria-label）', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()

    const group = document.body.querySelector('[role="radiogroup"]')
    expect(group).not.toBeNull()
    // antd Segmented 默认 aria-label 是 "segmented control"，必须被业务名覆盖
    expect(group?.getAttribute('aria-label')).toBe('单据流向视图')
  })

  it('列表视图无关系时给出空态文案', async () => {
    mockedGetDocumentFlow.mockResolvedValue({ ...flow, links: [] })
    await renderModal()
    clickViewSwitch('列表')

    expect(
      document.body.querySelector('.document-flow-list-relations'),
    ).toBeNull()
    expect(document.body.textContent).toContain('暂无单据关系')
  })

  /** 时间线容器是带可访问名的有序列表（不依赖实现 class）。 */
  function queryTimeline() {
    return document.body.querySelector<HTMLOListElement>(
      'ol[aria-label="时间线"]',
    )
  }

  it('initialView="timeline" 时默认渲染时间线：日期升序、无日期排最后、当前单据 aria-current', async () => {
    // 故意乱序给出，并把当前单据放在中间，验证按日期升序而不是按接口顺序
    mockedGetDocumentFlow.mockResolvedValue({
      ...flow,
      nodes: [
        {
          type: 'purchase-inbound',
          id: '2',
          no: 'IN-1',
          status: '已审核',
          amount: null,
          weight: null,
          date: '2026-11-09',
        },
        {
          type: 'purchase-order',
          id: '1',
          no: 'PO-1',
          status: '已审核',
          amount: '1000.00',
          weight: '10.00000000',
          date: '2026-11-08',
        },
        {
          type: 'freight-bill',
          id: '3',
          no: 'FB-1',
          status: '草稿',
          amount: null,
          weight: null,
          date: null,
        },
      ],
      links: [...flow.links],
    })
    await renderModal(undefined, 'timeline')

    const timeline = queryTimeline()
    expect(timeline).not.toBeNull()
    // 默认不再渲染图 / 列表
    expect(document.body.querySelector('.document-flow-viewport')).toBeNull()
    expect(document.body.querySelector('.document-flow-list')).toBeNull()

    const rows = Array.from(timeline?.querySelectorAll('li') ?? [])
    expect(rows).toHaveLength(3)
    // 日期升序：2026-11-08 → 2026-11-09 → 无日期（—）排最后
    expect(rows[0]?.textContent).toContain('2026-11-08')
    expect(rows[1]?.textContent).toContain('2026-11-09')
    expect(rows[2]?.textContent).toContain('—')

    // 行内信息：类型 + 单号 + 金额 / 重量（走全站格式化出口，缺失不渲染）
    expect(rows[0]?.textContent).toContain('采购单')
    expect(rows[0]?.textContent).toContain('PO-1')
    expect(rows[0]?.textContent).toContain('1000.00')
    expect(rows[0]?.textContent).toContain('10.000')
    expect(rows[1]?.textContent).not.toContain('金额')

    // 当前单据（documentNo=PO-1）有 aria-current，且只有一行
    const currentRows = rows.filter(
      (row) => row.getAttribute('aria-current') === 'true',
    )
    expect(currentRows).toHaveLength(1)
    expect(currentRows[0]?.textContent).toContain('PO-1')
  })

  it('时间线 → 图 → 时间线：切换后 DOM 互换且可恢复', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal(undefined, 'timeline')

    expect(queryTimeline()).not.toBeNull()

    clickViewSwitch('图')

    expect(queryTimeline()).toBeNull()
    expect(document.body.querySelector('.document-flow-canvas')).not.toBeNull()
    expect(
      document.body.querySelector('.document-flow-viewport'),
    ).not.toBeNull()

    clickViewSwitch('时间线')

    expect(queryTimeline()).not.toBeNull()
    expect(document.body.querySelector('.document-flow-canvas')).toBeNull()
  })

  it('时间线视图下工具栏仍有可访问名（radiogroup）且三项齐全', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal(undefined, 'timeline')

    const group = document.body.querySelector('[role="radiogroup"]')
    expect(group).not.toBeNull()
    expect(group?.getAttribute('aria-label')).toBe('单据流向视图')
    expect(group?.querySelectorAll('input[type="radio"]')).toHaveLength(3)
    expect(group?.textContent).toContain('图')
    expect(group?.textContent).toContain('列表')
    expect(group?.textContent).toContain('时间线')
  })
})
