// @vitest-environment jsdom

import { ConfigProvider } from 'antd'
import i18n from 'i18next'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { SupplierPriceListAdjustModal } from './SupplierPriceListAdjustModal'
import type { PriceDraftRow } from './supplier-price-list-editor-model'

function makeRow(overrides: Partial<PriceDraftRow> = {}): PriceDraftRow {
  return {
    uid: `uid-${overrides.key ?? 'a'}`,
    key: 'k-a',
    category: '螺纹钢',
    material: '抗震钢E',
    spec: 12,
    length: '9米',
    sortOrder: 0,
    itemId: '1900000000000000011',
    price: 3220,
    priceStatus: 'NORMAL',
    remark: null,
    ...overrides,
  }
}

const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30))
  })

function findButton(text: string) {
  return [...document.body.querySelectorAll('button')].find((button) =>
    button.textContent?.includes(text),
  )
}

/** antd Radio.Group optionType="button" 渲染为 label + input，不是 button 元素。 */
function clickRadio(text: string) {
  const label = [...document.body.querySelectorAll('label')].find((node) =>
    node.textContent?.includes(text),
  )
  label?.querySelector('input')?.click()
}

/**
 * 写入 antd InputNumber 的底层 input。
 *
 * <p>React 用 value tracker 记录受控值，直接赋 `value` 不会触发 onChange，
 * 必须走原生 setter 再派发 input 事件。</p>
 */
function setInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value',
  )
  // eslint-disable-next-line @typescript-eslint/unbound-method -- 原生 setter 必须以 input 作为 this
  const valueSetter = descriptor?.set
  valueSetter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function amountInput() {
  return document.body.querySelector<HTMLInputElement>(
    'input.ant-input-number-input',
  )
}

describe('SupplierPriceListAdjustModal 先预览再确认', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    await i18n.changeLanguage('zh-CN')
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
  })

  afterEach(async () => {
    act(() => {
      root.unmount()
    })
    await flush()
    container.remove()
  })

  async function render(rows: PriceDraftRow[], onSubmit = vi.fn()) {
    act(() => {
      root.render(
        <ConfigProvider>
          <SupplierPriceListAdjustModal
            open
            rows={rows}
            saving={false}
            onCancel={() => {}}
            onSubmit={onSubmit}
          />
        </ConfigProvider>,
      )
    })
    await flush()
    return onSubmit
  }

  async function typeAmount(value: string) {
    const input = amountInput()
    expect(input).not.toBeNull()
    act(() => {
      if (input) {
        setInputValue(input, value)
      }
    })
    await flush()
  }

  it('未生成预览前禁止确认执行', async () => {
    const onSubmit = await render([makeRow()])
    const okButton = findButton('确认执行')
    expect(okButton).toBeDefined()
    expect(okButton?.hasAttribute('disabled')).toBe(true)
    expect(document.body.textContent).toContain('请先输入金额并生成预览')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('预览展示影响条目数与前后价，跳过不报价条目', async () => {
    await render([
      makeRow(),
      makeRow({
        uid: 'uid-b',
        key: 'k-b',
        spec: 14,
        itemId: '1900000000000000012',
        price: null,
        priceStatus: 'OUT_OF_STOCK',
      }),
    ])

    // 金额为空时预览按钮不可用
    expect(findButton('生成预览')?.hasAttribute('disabled')).toBe(true)

    await typeAmount('50')

    act(() => {
      findButton('生成预览')?.click()
    })
    await flush()

    expect(document.body.textContent).toContain('影响条目数：1')
    expect(document.body.textContent).toContain('未参与（不报价）：1')
    expect(document.body.textContent).toContain('3270.00')
    expect(document.body.textContent).toContain('单价为空的条目不参与加减')
    expect(findButton('确认执行')?.hasAttribute('disabled')).toBe(false)
  })

  it('减价后为负时阻断确认', async () => {
    await render([makeRow({ key: 'k-low', uid: 'uid-low', price: 30 })])
    await typeAmount('50')

    act(() => {
      clickRadio('减价')
    })
    await flush()
    act(() => {
      findButton('生成预览')?.click()
    })
    await flush()

    expect(document.body.textContent).toContain('存在减价后为负的条目')
    expect(findButton('确认执行')?.hasAttribute('disabled')).toBe(true)
  })
})
