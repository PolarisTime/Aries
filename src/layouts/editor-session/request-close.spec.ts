// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * 「关闭确认框打开期间，后续关闭请求必须排队而不是被丢弃」的契约。
 *
 * <p>原实现用单标志 `confirming` 互斥，两个分支都直接 `return` —— 请求被静默吞掉。
 * 用户连点三个脏标签的 ×，只有第一个会弹框，后两个既不入队也不提示，表现就是
 * 「点了 × 没反应」。多弹一个框至少能继续操作；丢弃请求则完全没有反馈。</p>
 */

type ConfirmOptions = {
  onOk?: () => void
  afterClose?: () => void
}

const confirmCalls: ConfirmOptions[] = []
const infoCalls: ConfirmOptions[] = []

vi.mock('@/utils/antd-app', () => ({
  modal: {
    confirm: (options: ConfirmOptions) => {
      confirmCalls.push(options)
      return { destroy: () => {}, update: () => {} }
    },
    info: (options: ConfirmOptions) => {
      infoCalls.push(options)
      return { destroy: () => {}, update: () => {} }
    },
  },
}))

const sessions = new Map<string, { status: string }>()

vi.mock('@/layouts/editor-session/editor-session-store', () => ({
  editorSessionStore: {
    getSession: (tabId: string) => sessions.get(tabId) ?? null,
    endSession: (tabId: string) => sessions.delete(tabId),
    requiresConfirmation: (tabId: string) => {
      const status = sessions.get(tabId)?.status
      return status === 'dirty' || status === 'submitting'
    },
  },
}))

const t = ((key: string) => key) as unknown as Parameters<
  typeof import('@/layouts/editor-session/request-close').requestEditorSessionClose
>[0]

describe('requestEditorSessionClose / confirmBatchTabClose 排队契约', () => {
  beforeEach(() => {
    confirmCalls.length = 0
    infoCalls.length = 0
    sessions.clear()
  })

  it('确认框打开期间的第二个关闭请求会排队, 关闭后自动继续', async () => {
    const { requestEditorSessionClose } = await import(
      '@/layouts/editor-session/request-close'
    )
    sessions.set('tab-a', { status: 'dirty' })
    sessions.set('tab-b', { status: 'dirty' })

    const closed: string[] = []
    requestEditorSessionClose(t, 'tab-a', () => closed.push('tab-a'))
    // 第一个请求已弹框
    expect(confirmCalls).toHaveLength(1)
    expect(closed).toEqual([])

    // 确认框仍打开时又来一个请求：不能静默丢弃，也不能叠加第二个框
    requestEditorSessionClose(t, 'tab-b', () => closed.push('tab-b'))
    expect(confirmCalls).toHaveLength(1)
    expect(closed).toEqual([])

    // 用户点「放弃修改」→ 关掉 tab-a，随后框关闭触发放行
    confirmCalls[0].onOk?.()
    expect(closed).toEqual(['tab-a'])
    // afterClose 放行积压的 tab-b，弹出它的确认框
    confirmCalls[0].afterClose?.()
    expect(confirmCalls).toHaveLength(2)

    // 再确认 tab-b
    confirmCalls[1].onOk?.()
    confirmCalls[1].afterClose?.()
    expect(closed).toEqual(['tab-a', 'tab-b'])
  })

  it('积压请求重放时标签已变干净则直接关闭, 队列继续前进不卡住', async () => {
    const { requestEditorSessionClose } = await import(
      '@/layouts/editor-session/request-close'
    )
    sessions.set('tab-a', { status: 'dirty' })
    sessions.set('tab-b', { status: 'dirty' })

    const closed: string[] = []
    requestEditorSessionClose(t, 'tab-a', () => closed.push('tab-a'))
    requestEditorSessionClose(t, 'tab-b', () => closed.push('tab-b'))
    expect(confirmCalls).toHaveLength(1)

    // tab-b 在排队期间被别处保存/关闭 → 重放时应直接关闭、不弹框
    sessions.delete('tab-b')

    confirmCalls[0].onOk?.()
    confirmCalls[0].afterClose?.()

    expect(closed).toEqual(['tab-a', 'tab-b'])
    // 没有为 tab-b 再弹框
    expect(confirmCalls).toHaveLength(1)
  })

  it('批量关闭在确认框打开期间也排队, 不丢弃', async () => {
    const { confirmBatchTabClose, requestEditorSessionClose } = await import(
      '@/layouts/editor-session/request-close'
    )
    sessions.set('tab-a', { status: 'dirty' })
    sessions.set('tab-b', { status: 'dirty' })

    requestEditorSessionClose(t, 'tab-a', () => {})
    expect(confirmCalls).toHaveLength(1)

    let batchClosed = false
    const returned = confirmBatchTabClose(t, ['tab-b'], () => {
      batchClosed = true
    })
    // 返回 true 表示"已受理（排队中）"，而不是"已执行"
    expect(returned).toBe(true)
    expect(batchClosed).toBe(false)
    expect(confirmCalls).toHaveLength(1)

    confirmCalls[0].onOk?.()
    confirmCalls[0].afterClose?.()

    // 放行后排队的批量关闭自己满足"有脏数据"判据 → 弹它自己的确认框
    expect(confirmCalls).toHaveLength(2)
    confirmCalls[1].onOk?.()
    expect(batchClosed).toBe(true)
  })
})
