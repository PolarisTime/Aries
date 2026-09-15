// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { LockableField } from './LockableField'

function setNativeInputValue(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(
    HTMLInputElement.prototype,
    'value',
  )?.set?.bind(input)
  setter?.(value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

function pressEnter(input: HTMLInputElement) {
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
  })
  Object.defineProperty(event, 'keyCode', { get: () => 13 })
  Object.defineProperty(event, 'which', { get: () => 13 })
  input.dispatchEvent(event)
}

function blurInput(input: HTMLInputElement) {
  // React 的 onBlur 映射到原生 focusout。
  input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  input.blur()
}

describe('LockableField 锁定交互', () => {
  let container: HTMLDivElement
  let root: Root

  beforeEach(async () => {
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
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    act(() => root.unmount())
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 25)
      })
    })
    container.remove()
  })

  const getInputs = () => [
    ...container.querySelectorAll<HTMLInputElement>('input'),
  ]
  const getButton = (text: string) =>
    [...container.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent === text,
    )

  function renderTwo(confirmed: string[]) {
    act(() => {
      root.render(
        createElement(
          'div',
          null,
          createElement(LockableField, {
            label: '品牌限定',
            value: '',
            onConfirm: (value: string) => confirmed.push(value),
          }),
          createElement(LockableField, {
            label: '备注信息',
            value: '',
            onConfirm: (value: string) => confirmed.push(value),
          }),
        ),
      )
    })
  }

  it('回车确认后只读, 解锁后可再次编辑', () => {
    const confirmed: string[] = []
    renderTwo(confirmed)
    const [first] = getInputs()

    act(() => {
      setNativeInputValue(first, '仅中天')
      pressEnter(first)
    })

    expect(confirmed).toEqual(['仅中天'])
    expect(first.readOnly).toBe(true)

    act(() => {
      getButton('解锁')?.click()
    })
    expect(first.readOnly).toBe(false)
  })

  it('失焦确认后只读', () => {
    const confirmed: string[] = []
    renderTwo(confirmed)
    const [first] = getInputs()

    act(() => {
      first.focus()
      setNativeInputValue(first, '含运费')
    })
    act(() => {
      blurInput(first)
    })

    expect(confirmed).toEqual(['含运费'])
    expect(first.readOnly).toBe(true)
  })

  it('两个输入框各自独立锁定', () => {
    const confirmed: string[] = []
    renderTwo(confirmed)
    const [first, second] = getInputs()

    act(() => {
      setNativeInputValue(first, '仅中天')
      pressEnter(first)
    })

    expect(first.readOnly).toBe(true)
    expect(second.readOnly).toBe(false)
  })

  it('清除后恢复可编辑并回写空值', () => {
    const confirmed: string[] = []
    renderTwo(confirmed)
    const [first] = getInputs()

    act(() => {
      setNativeInputValue(first, '旧值')
      pressEnter(first)
    })
    act(() => {
      getButton('清除')?.click()
    })

    expect(confirmed).toEqual(['旧值', ''])
    expect(first.readOnly).toBe(false)
    expect(first.value).toBe('')
  })

  it('已有项目值时初始为只读', () => {
    act(() => {
      root.render(
        createElement(LockableField, {
          label: '品牌限定',
          value: '仅中天',
          onConfirm: () => {},
        }),
      )
    })
    expect(getInputs()[0].readOnly).toBe(true)
  })
})
