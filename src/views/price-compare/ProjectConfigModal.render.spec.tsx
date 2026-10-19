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

/**
 * 切到「品牌与品种」页签。
 *
 * <p>品牌区在 antd Tabs 的非默认页签里，未切换时 DOM 上根本没有候选品牌节点，
 * 直接断言会得到空字符串而不是失败原因，容易误判成「过滤没生效」。</p>
 */
async function activateBrandsTab() {
  const tab = Array.from(document.querySelectorAll('[role="tab"]')).find(
    (node) =>
      (node.textContent ?? '').includes(
        i18n.t('priceCompare.config.tabs.brands'),
      ),
  )
  if (!tab) throw new Error('未找到「品牌与品种」页签')
  await act(async () => {
    ;(tab as HTMLElement).click()
    await Promise.resolve()
  })
}

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
      projectAllowedBrands: [],
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

  /**
   * 「参与品牌」的候选范围以项目资料的允许品牌为上限。
   *
   * <p>合并前比价页自己维护一份品牌清单，可以与项目资料互相矛盾
   * （项目允许 A/B，比价却在用 C）。现在品牌范围的唯一配置入口是项目资料，
   * 比价页只能在其中挑选，并提示来源。</p>
   */
  it('项目配置了允许品牌时，候选只包含这些品牌并显示来源提示', async () => {
    act(() => {
      root.render(
        createElement(ProjectConfigModal, {
          open: true,
          brandOptions: BRAND_OPTIONS,
          projectAllowedBrands: ['中天', '沙钢'],
          varieties: [],
          config: EMPTY_CONFIG,
          onClose: () => {},
          onSave: () => {},
        }),
      )
    })
    await act(async () => {
      await Promise.resolve()
    })
    await activateBrandsTab()

    // antd Modal 渲染到 body 下的 portal，不在 container 内
    const text = document.body.textContent ?? ''
    // 候选 = 商品品牌全集 ∩ 项目允许品牌；「永钢」不在允许范围，不应出现
    expect(text).toContain('中天')
    expect(text).toContain('沙钢')
    expect(text).not.toContain('永钢')
    // 来源提示说明这批品牌来自项目资料
    expect(text).toContain('允许的品牌')
  })

  it('项目未配置允许品牌时不限制，候选为商品品牌全集且不显示来源提示', async () => {
    act(() => {
      root.render(
        createElement(ProjectConfigModal, {
          open: true,
          brandOptions: BRAND_OPTIONS,
          projectAllowedBrands: [],
          varieties: [],
          config: EMPTY_CONFIG,
          onClose: () => {},
          onSave: () => {},
        }),
      )
    })
    await act(async () => {
      await Promise.resolve()
    })
    await activateBrandsTab()

    const text = document.body.textContent ?? ''
    expect(text).toContain('中天')
    expect(text).toContain('沙钢')
    expect(text).toContain('永钢')
    expect(text).not.toContain('来自项目资料的「允许的品牌」')
  })
})
