// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { BATCH_NAME_MAX_LENGTH, RenameBatchModal } from './RenameBatchModal'

/**
 * 「重命名批次」弹层的校验契约。
 *
 * <p>校验口径与后端 `QuoteSheetRequest.name` 对齐：`@NotBlank` → trim 后不可为空；
 * `@Size(max = 64)` → 长度上限。前端先拦是为了即时反馈，避免用户敲完才收到 422。</p>
 */

let container: HTMLDivElement
let root: Root
const onSubmit = vi.fn()
const onCancel = vi.fn()

beforeEach(() => {
  /*
   * 整文件用假计时器。antd 弹层内部的 useDelayState 会在打开/关闭后挂一个延时器；
   * 该计时器若在 jsdom 环境销毁之后才触发，就会抛 `ReferenceError: window is not defined`
   * —— vitest 记为 uncaught exception，即使全部用例通过也会让 CI job 失败
   * （本地曾因时序差异未复现，CI 稳定复现）。
   * 用假计时器把计时器收进可控范围，teardown 时统一清空，结果与机器快慢无关。
   */
  vi.useFakeTimers()
  // antd Modal 在 jsdom 下会读 matchMedia（响应式断点），本文件单独渲染弹层需要补桩
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
  onSubmit.mockClear()
  onCancel.mockClear()
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  ;(
    globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true
})

afterEach(() => {
  act(() => root.unmount())
  container.remove()
  document.body.innerHTML = ''
  // 卸载后再清一次：卸载过程可能补挂计时器，必须在环境销毁前收干净
  act(() => {
    vi.runOnlyPendingTimers()
  })
  vi.clearAllTimers()
  vi.useRealTimers()
})

const renderModal = (open: boolean, currentName: string) => {
  act(() => {
    root.render(
      createElement(RenameBatchModal, {
        open,
        currentName,
        onCancel,
        onSubmit,
      }),
    )
  })
}

/** antd Modal 渲染在 body 上的 portal 里，从 document 查。 */
const nameInput = () =>
  document.querySelector<HTMLInputElement>('#price-compare-batch-name')

const okButton = () =>
  Array.from(
    document.querySelectorAll<HTMLButtonElement>('.ant-modal-footer button'),
  ).find((button) => button.classList.contains('ant-btn-primary'))

const typeName = (value: string) => {
  const input = nameInput()
  expect(input, '未找到批次名称输入框').toBeTruthy()
  if (!input) return
  const descriptor = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )
  act(() => {
    /* React 受控输入需要走原生 setter + input 事件：直接赋值会被 React 的 value 追踪吞掉。
       与仓库内其它 spec 同一写法（PickupSplitModal / PurchaseOrderPickerModal）。 */
    // eslint-disable-next-line @typescript-eslint/unbound-method -- 原生 value setter 必须以输入元素为 receiver 调用
    const setter = descriptor?.set
    if (setter) {
      setter.call(input, value)
    } else {
      input.value = value
    }
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('RenameBatchModal', () => {
  it('打开时以当前名称作为初始值', () => {
    renderModal(true, '批次 2')
    expect(nameInput()?.value).toBe('批次 2')
  })

  it('名称为空白时禁用保存，并给出可读原因', () => {
    renderModal(true, '批次 2')
    typeName('   ')

    expect(okButton()?.disabled).toBe(true)
    expect(document.body.textContent).toContain('批次名称不能为空')
  })

  it('超长时禁用保存并提示（maxLength 只挡键入，粘贴/程序化赋值仍可能超限）', () => {
    renderModal(true, '批次 2')
    typeName('x'.repeat(BATCH_NAME_MAX_LENGTH + 1))

    expect(okButton()?.disabled).toBe(true)
    expect(document.body.textContent).toContain('批次名称最多')
  })

  it('名称未变化时禁用保存（避免白跑一次保存请求）', () => {
    renderModal(true, '批次 2')
    expect(okButton()?.disabled).toBe(true)

    typeName('批次 3')
    expect(okButton()?.disabled).toBe(false)
  })

  it('提交时给出已 trim 的名称', () => {
    renderModal(true, '批次 2')
    typeName('  新批次名  ')

    act(() => {
      okButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onSubmit).toHaveBeenCalledWith('新批次名')
  })

  it('校验不通过时不提交', () => {
    renderModal(true, '批次 2')
    typeName('   ')

    act(() => {
      okButton()?.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })

    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('限定输入框长度上限与后端 @Size 一致', () => {
    renderModal(true, '批次 2')
    expect(nameInput()?.getAttribute('maxlength')).toBe(
      String(BATCH_NAME_MAX_LENGTH),
    )
    expect(BATCH_NAME_MAX_LENGTH).toBe(64)
  })
})
