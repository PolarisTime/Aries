// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { getDocumentFlow } from '@/api/system/document-flow'
import { DocumentFlowModal } from '@/components/DocumentFlowModal'

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

  async function renderModal(onOpenNode?: (node: unknown) => void) {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          { client: queryClient },
          createElement(DocumentFlowModal, {
            open: true,
            documentNo: 'PO-1',
            onClose: () => {},
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

  it('节点内直接展示金额与重量(仅在存在时, 金额千分位)', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()

    const nodes = document.body.querySelectorAll('.document-flow-node')
    const orderNode = nodes[0]
    const inboundNode = nodes[1]

    expect(orderNode.textContent).toContain('金额')
    // 1000.00 → 1,000（千分位后仍最多 2 位小数）
    expect(orderNode.textContent).toContain('1,000')
    expect(orderNode.textContent).toContain('重量')
    expect(orderNode.textContent).toContain('10')

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

  it('同层混排时列头按类型分组拼接', async () => {
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
    expect(headers).toHaveLength(2)
    // 第 2 列混排（采购入库单 + 物流单），按类型分组逐项给出张数
    expect(headers[1]).toContain('采购入库单 · 1 张')
    expect(headers[1]).toContain('物流单 · 1 张')
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
    expect(metrics).toEqual(['10 件 · 12.5 吨'])
    // 类型与数量都进 <title>：读屏与悬浮仍能拿到完整语义
    expect(
      document.body.querySelector('.document-flow-edge title')?.textContent,
    ).toBe('入库 · 10 件 · 12.5 吨')
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
})
