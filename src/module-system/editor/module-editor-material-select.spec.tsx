// @vitest-environment jsdom

import i18n from 'i18next'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { MaterialSelectOption } from './module-editor-material-options'
import { ModuleEditorMaterialSelect } from './module-editor-material-select'

const options: MaterialSelectOption[] = [
  {
    label: '泸钢 | 盘螺 | HRB400E | 8 | -',
    value: '347011099205312512',
    code: '347011099205312512',
    brand: '泸钢',
    material: 'HRB400E',
    category: '盘螺',
    spec: '8',
    length: '-',
  },
]

describe('ModuleEditorMaterialSelect', () => {
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
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    )
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn(() => 1),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  const flushAsync = async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0))
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
  }

  const renderSelect = (props: {
    onSearch?: (keyword: string) => void
    onClose?: () => void
    onChange?: (materialId: string) => void
  }) => {
    act(() => {
      root.render(
        createElement(ModuleEditorMaterialSelect, {
          record: { id: 'row-1' },
          options,
          search: {
            searching: false,
            onSearch: props.onSearch ?? (() => {}),
            onClose: props.onClose ?? (() => {}),
          },
          onChange: props.onChange ?? (() => {}),
        }),
      )
    })
  }

  it('输入关键词时回调服务端搜索', async () => {
    const onSearch = vi.fn()
    renderSelect({ onSearch })
    await flushAsync()

    const input = container.querySelector<HTMLInputElement>('input')
    expect(input).toBeTruthy()
    act(() => {
      if (!input) return
      const descriptor = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        'value',
      )
      const setter = Reflect.get(descriptor ?? {}, 'set') as
        | ((this: HTMLInputElement, value: string) => void)
        | undefined
      if (setter) {
        Reflect.apply(setter, input, ['泸钢'])
      }
      input.dispatchEvent(new window.Event('input', { bubbles: true }))
    })

    expect(onSearch).toHaveBeenCalledWith('泸钢')
  })

  it('历史快照不在候选内时回显禁用项标签', async () => {
    act(() => {
      root.render(
        createElement(ModuleEditorMaterialSelect, {
          record: {
            id: 'row-1',
            materialId: '347011099385667584',
            brand: '泸钢',
            category: '盘螺',
            material: 'HRB400E',
            spec: '10',
            length: '-',
          },
          options,
          search: {
            searching: false,
            onSearch: () => {},
            onClose: () => {},
          },
          onChange: () => {},
        }),
      )
    })
    await flushAsync()

    expect(container.textContent).toContain('泸钢 | 盘螺 | HRB400E | 10 | -')
  })
})
