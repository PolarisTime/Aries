import { describe, expect, it, vi } from 'vitest'
import {
  deriveSaveStatus,
  runSerializedTask,
  SHEET_SAVE_KEY_PREFIX,
  sheetIdOfSaveKey,
} from './sheet-save-queue'

/** 可外部 resolve 的 Promise, 用于精确控制"在途"窗口。 */
function deferred<T = void>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolveFn, rejectFn) => {
    resolve = resolveFn
    reject = rejectFn
  })
  return { promise, resolve, reject }
}

describe('串行保存队列(sheet-save-queue)', () => {
  it('同一资源的任务严格串行, 补跑复用同一任务闭包(读最新状态)且不并发', async () => {
    const inflight = new Set<string>()
    const pending = new Set<string>()
    const order: string[] = []
    const gate = deferred()
    const task = async () => {
      order.push('start')
      await gate.promise
      order.push('end')
    }
    const first = runSerializedTask(inflight, pending, 'sheet:a', task)
    const second = runSerializedTask(inflight, pending, 'sheet:a', task)
    // 第二次调用在首次在途时只登记排队, 立即返回
    await expect(second).resolves.toBeUndefined()
    expect(order).toEqual(['start'])
    gate.resolve()
    await first
    // 队列收敛后补跑一次: 不并发, 也不会因为多次入队而放大写压力
    await vi.waitFor(() =>
      expect(order).toEqual(['start', 'end', 'start', 'end']),
    )
    expect(inflight.size).toBe(0)
    expect(pending.size).toBe(0)
  })

  it('在途期间的多次请求只排队一次(合并为一次补跑)', async () => {
    const inflight = new Set<string>()
    const pending = new Set<string>()
    const gate = deferred()
    const task = vi.fn(async () => {
      await gate.promise
    })
    const first = runSerializedTask(inflight, pending, 'sheet:a', task)
    await Promise.all([
      runSerializedTask(inflight, pending, 'sheet:a', task),
      runSerializedTask(inflight, pending, 'sheet:a', task),
      runSerializedTask(inflight, pending, 'sheet:a', task),
    ])
    expect(task).toHaveBeenCalledTimes(1)
    gate.resolve()
    await first
    await vi.waitFor(() => expect(task).toHaveBeenCalledTimes(2))
  })

  it('不同资源键互不阻塞', async () => {
    const inflight = new Set<string>()
    const pending = new Set<string>()
    const gate = deferred()
    const slow = runSerializedTask(inflight, pending, 'sheet:a', async () => {
      await gate.promise
    })
    const fast = runSerializedTask(inflight, pending, 'sheet:b', async () => {})
    await expect(fast).resolves.toBeUndefined()
    gate.resolve()
    await slow
  })

  it('任务抛错时仍清理在途标记(不把手滑的失败留成永久在途)', async () => {
    const inflight = new Set<string>()
    const pending = new Set<string>()
    const failed = runSerializedTask(inflight, pending, 'sheet:a', () =>
      Promise.reject(new Error('boom')),
    )
    await expect(failed).rejects.toThrow('boom')
    expect(inflight.has('sheet:a')).toBe(false)
    expect(pending.has('sheet:a')).toBe(false)
    // 清理后同一资源仍可重新入队执行
    const recovered = vi.fn(() => Promise.resolve())
    await runSerializedTask(inflight, pending, 'sheet:a', recovered)
    expect(recovered).toHaveBeenCalledTimes(1)
  })

  it('从队列键解析单据 id, 非单据键返回 null', () => {
    expect(sheetIdOfSaveKey(`${SHEET_SAVE_KEY_PREFIX}abc`)).toBe('abc')
    expect(sheetIdOfSaveKey('config:project-1')).toBeNull()
    expect(sheetIdOfSaveKey('')).toBeNull()
  })
})

describe('保存状态推导(deriveSaveStatus)', () => {
  const unsaved = new Set(['sheet-1'])

  it('优先级: 在途 > 冲突 > 失败 > 未落库改动 > 已保存 > 无变化', () => {
    expect(deriveSaveStatus('saving', unsaved, 'sheet-1')).toBe('saving')
    expect(deriveSaveStatus('conflict', unsaved, 'sheet-1')).toBe('conflict')
    expect(deriveSaveStatus('error', unsaved, 'sheet-1')).toBe('error')
    // 未保存集合覆盖防抖窗口内的瞬时编辑: 即使上一次结论是 saved 也显示未保存
    expect(deriveSaveStatus('saved', unsaved, 'sheet-1')).toBe('dirty')
    expect(deriveSaveStatus(undefined, unsaved, 'sheet-1')).toBe('dirty')
    expect(deriveSaveStatus('saved', new Set(), 'sheet-1')).toBe('saved')
    expect(deriveSaveStatus(undefined, new Set(), 'sheet-1')).toBe('idle')
  })

  it('只看当前激活单据的未保存标记', () => {
    expect(deriveSaveStatus(undefined, unsaved, 'sheet-2')).toBe('idle')
    expect(deriveSaveStatus('saved', unsaved, 'sheet-2')).toBe('saved')
  })
})
