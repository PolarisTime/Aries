// @vitest-environment jsdom
import i18n from 'i18next'
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import '@/i18n'
import { ProjectConfigModal } from './ProjectConfigModal'
import type { ProjectConfig } from './types'

const EMPTY_CONFIG: ProjectConfig = {
  brands: [],
  lengthPremium: 30,
  hrb400eFallback: false,
}

const BRAND_OPTIONS = ['中天', '沙钢', '永钢']

describe('ProjectConfigModal 草稿稳定性', () => {
  let container: HTMLDivElement
  let root: Root
  let renderCount = 0
  let setOpenRef: ((value: boolean) => void) | null = null
  let setConfigRef: ((value: ProjectConfig) => void) | null = null

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
    if (!globalThis.ResizeObserver) {
      globalThis.ResizeObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    }
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    renderCount = 0
    setOpenRef = null
    setConfigRef = null
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

  /**
   * 模拟父组件未 memo 的行为: 每次 render 都构造新的 brandOptions 数组,
   * 且 config 可在打开期间变化(保存回填/后台刷新)。
   */
  function Harness() {
    renderCount += 1
    const brandOptions = [...BRAND_OPTIONS]
    const [open, setOpen] = useState(false)
    const [config, setConfig] = useState<ProjectConfig>(EMPTY_CONFIG)
    setOpenRef = setOpen
    setConfigRef = setConfig
    return createElement(ProjectConfigModal, {
      open,
      brandOptions,
      varieties: [],
      config,
      onClose: () => {},
      onSave: () => {},
    })
  }

  it('空品牌打开时不出现无限渲染', async () => {
    act(() => {
      root.render(createElement(Harness))
    })
    act(() => {
      setOpenRef?.(true)
    })
    const afterOpen = renderCount
    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(renderCount - afterOpen).toBeLessThanOrEqual(4)
    expect(document.querySelector('.ant-modal')).not.toBeNull()
  })

  it('打开期间 config 变化不重置正在编辑的草稿', async () => {
    act(() => {
      root.render(createElement(Harness))
    })
    act(() => {
      setOpenRef?.(true)
    })
    // 切到品牌页签(默认仅渲染当前页签内容)
    const tabs = document.querySelectorAll('.ant-tabs-tab')
    act(() => {
      ;(tabs[1] as HTMLElement).click()
    })
    expect(document.querySelectorAll('.pc-brand-row')).toHaveLength(3)

    // 打开期间 config 变化(保存回填版本/刷新): 草稿不应被重置
    await act(async () => {
      setConfigRef?.({
        brands: [{ name: '中天', freight: 30 }],
        lengthPremium: 30,
        hrb400eFallback: false,
      })
      await Promise.resolve()
    })

    expect(document.querySelectorAll('.pc-brand-row')).toHaveLength(3)
  })
})
