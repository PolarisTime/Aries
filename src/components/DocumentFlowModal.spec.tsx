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

  it('渲染分层节点、单号与连线标签', async () => {
    mockedGetDocumentFlow.mockResolvedValue(flow)
    await renderModal()

    expect(mockedGetDocumentFlow).toHaveBeenCalledWith(
      'PO-1',
      expect.anything(),
    )
    expect(document.body.textContent).toContain('PO-1')
    expect(document.body.textContent).toContain('IN-1')
    expect(document.body.textContent).toContain('采购单')
    expect(document.body.textContent).toContain('采购入库单')
    expect(document.body.textContent).toContain('入库')
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
})
