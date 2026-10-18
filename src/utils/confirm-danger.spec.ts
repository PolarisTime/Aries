import { describe, expect, it, vi } from 'vitest'
import { confirmDanger } from './confirm-danger'

/**
 * `confirmDanger` 的契约：破坏性确认的默认焦点必须在**取消**侧。
 *
 * <p>背景：antd 的 `Modal.confirm` 默认把初始焦点放在**确认按钮**上。于是
 * 「删除 / 放弃修改 / 保存并审核」这类不可逆操作变成：弹出确认框 → 用户手还在
 * 回车键上 → 直接执行。审查里实测到两处真实事故（批量删除焦点在「确定」、
 * 放弃修改焦点在「放弃修改」）。</p>
 *
 * <p>本测试锁两件事：`autoFocusButton` 恒为 `'cancel'`，且确认按钮带 `danger`。
 * 它不渲染真实 DOM（antd 的 modal.confirm 是命令式 API），但足以防止回归 ——
 * 只要有人删掉这两行，测试就红。</p>
 */

const confirmSpy = vi.fn()

vi.mock('@/utils/antd-app', () => ({
  modal: {
    confirm: (...args: unknown[]) => confirmSpy(...args),
  },
}))

describe('confirmDanger 破坏性确认契约', () => {
  it('默认焦点落在「取消」而不是确认按钮', () => {
    confirmSpy.mockClear()
    confirmDanger({ title: '删除确认', content: '不可恢复', onOk: vi.fn() })

    expect(confirmSpy).toHaveBeenCalledTimes(1)
    const options = confirmSpy.mock.calls[0][0]
    expect(options.autoFocusButton).toBe('cancel')
  })

  it('确认按钮带 danger 语义', () => {
    confirmSpy.mockClear()
    confirmDanger({ title: '删除确认', onOk: vi.fn() })

    const options = confirmSpy.mock.calls[0][0]
    expect(options.okButtonProps).toEqual({ danger: true })
  })

  it('调用方无法把默认焦点改回确认按钮', () => {
    confirmSpy.mockClear()
    // 即使调用方显式传了 autoFocusButton: 'ok'，也必须被本出口覆盖成 cancel
    confirmDanger({
      title: '删除确认',
      onOk: vi.fn(),
      // @ts-expect-error 类型上已禁止，运行时也要挡住
      autoFocusButton: 'ok',
    })

    const options = confirmSpy.mock.calls[0][0]
    expect(options.autoFocusButton).toBe('cancel')
  })

  it('danger: false 时不加 danger 样式（仅提示类确认）', () => {
    confirmSpy.mockClear()
    confirmDanger({ title: '提示', onOk: vi.fn(), danger: false })

    const options = confirmSpy.mock.calls[0][0]
    expect(options.okButtonProps).toBeUndefined()
    // 但默认焦点仍然安全
    expect(options.autoFocusButton).toBe('cancel')
  })

  it('透传 title / content / okText / cancelText / onOk', () => {
    confirmSpy.mockClear()
    const onOk = vi.fn()
    confirmDanger({
      title: '删除 1 条记录',
      content: '该操作不可恢复',
      okText: '删除',
      cancelText: '取消',
      onOk,
    })

    const options = confirmSpy.mock.calls[0][0]
    expect(options.title).toBe('删除 1 条记录')
    expect(options.content).toBe('该操作不可恢复')
    expect(options.okText).toBe('删除')
    expect(options.cancelText).toBe('取消')
    expect(options.onOk).toBe(onOk)
  })
})
