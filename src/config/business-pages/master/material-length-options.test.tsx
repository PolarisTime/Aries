// @vitest-environment jsdom
import { QueryClientProvider } from '@tanstack/react-query'
import { Form } from 'antd'
import { act, createElement, useEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { LengthPremiumOption } from '@/api/master/length-premiums'
import { loadBusinessPageConfig } from '@/config/business-page-loader'
import { QUERY_KEYS } from '@/constants/query-keys'
import {
  resolveMasterOptionRequirements,
  useMasterOptions,
} from '@/hooks/useMasterOptions'
import { queryClient } from '@/lib/query-client'
import { readMasterOptionRequirements } from '@/module-system/core/master-option-requirement-tag'
import { getLengthOptions } from '@/module-system/core/module-option-resolvers'
import { useAuthStore } from '@/stores/authStore'
import type { ModulePageConfig } from '@/types/module-page'
import { FormFieldRenderer } from '@/views/modules/components/FormFieldRenderer'

/**
 * 接线回归测试：商品资料（`/material`）的「长度」下拉必须**真的**读定尺主数据。
 *
 * <p>覆盖的真实故障模式（本仓库已发生过同类问题）：页面配置把 resolver 直接当
 * `options` 引用、但需求键没有声明/没有打标记 ⇒ 接口一次都不请求，resolver 读的缓存永远为空，
 * 下拉空白且前后端都不报错。因此这里跑的是**真实链路**：</p>
 *
 * <pre>loadBusinessPageConfig('material') → materialsPageConfig.formFields
 *   → resolveMasterOptionRequirements → useMasterOptions（真实 useQuery）
 *   → 定尺主数据接口（仅 mock fetch）→ getLengthOptions 读缓存</pre>
 */
const api = vi.hoisted(() => ({
  fetchLengthPremiumOptions: vi.fn<() => Promise<unknown[]>>(),
}))

vi.mock('@/api/master/length-premiums', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/master/length-premiums')>()),
  fetchLengthPremiumOptions: api.fetchLengthPremiumOptions,
}))

const LENGTH_OPTIONS: LengthPremiumOption[] = [
  { label: '9米', value: '9米', premium: 0, sortOrder: 1 },
  { label: '12米', value: '12米', premium: 30, sortOrder: 2 },
]

type MasterOptionsResult = ReturnType<typeof useMasterOptions>
type Config = ModulePageConfig

/** 与后端 `MaterialRequest` 的 `@Size` / DB 列宽一一对应（改这里必须同步后端）。 */
const EXPECTED_MAX_LENGTHS: Record<string, number> = {
  materialCode: 64,
  brand: 64,
  material: 16,
  spec: 64,
  unit: 8,
  quantityUnit: 8,
  remark: 255,
}

let captured: MasterOptionsResult | undefined

function Harness({
  config,
  onState,
}: {
  config: Config
  onState: (options: MasterOptionsResult) => void
}) {
  const requirements = resolveMasterOptionRequirements(config.formFields)
  const options = useMasterOptions(requirements, true)
  // 用 effect 回传状态，避免在渲染期写外部变量（hooks 纯函数约束）。
  useEffect(() => {
    onState(options)
  }, [onState, options])
  const field = config.formFields?.find((item) => item.key === 'length')
  // FormFieldRenderer 内部用 Form.Item / useWatch，必须包在 Form 里（与真实编辑器一致）。
  return createElement(
    Form,
    null,
    field ? createElement(FormFieldRenderer, { field }) : null,
  )
}

describe('商品资料 长度下拉 → 定尺主数据接线', () => {
  let container: HTMLDivElement
  let root: Root
  let config: Config

  beforeEach(async () => {
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    const globalWithResizeObserver = globalThis as unknown as {
      ResizeObserver?: unknown
    }
    globalWithResizeObserver.ResizeObserver =
      globalWithResizeObserver.ResizeObserver ??
      class {
        observe() {}
        unobserve() {}
        disconnect() {}
      }
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      }),
    })

    useAuthStore.setState({ token: 'test-token', isAuthenticated: true })
    api.fetchLengthPremiumOptions.mockResolvedValue(LENGTH_OPTIONS)
    queryClient.clear()
    captured = undefined
    config = await loadBusinessPageConfig('material')

    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(() => {
    act(() => root.unmount())
    container.remove()
    queryClient.clear()
    vi.clearAllMocks()
  })

  /** 等 React Query 把请求结果写进状态（真实 useQuery，不用假定时器）。 */
  async function flushQueries() {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 40))
    })
  }

  it('配置里 length 是 select，选项解析器带 lengthPremiums 需求标记', () => {
    const field = config.formFields?.find((item) => item.key === 'length')
    expect(field, 'material 页应有 length 字段').toBeTruthy()
    expect(field?.type).toBe('select')
    expect(typeof field?.options).toBe('function')
    // 没有需求标记 → 编辑弹层不会请求定尺接口 → resolver 永远读空缓存（下拉空白、无报错）。
    expect(readMasterOptionRequirements(field?.options)).toEqual([
      'lengthPremiums',
    ])
    expect(
      resolveMasterOptionRequirements(config.formFields).lengthPremiums,
    ).toBe(true)
  })

  it('文本字段的 maxLength 与后端 MaterialRequest 的 @Size 一致', () => {
    for (const [key, maxLength] of Object.entries(EXPECTED_MAX_LENGTHS)) {
      const field = config.formFields?.find((item) => item.key === key)
      expect(field?.maxLength, `${key} 的 maxLength`).toBe(maxLength)
    }
  })

  it('打开编辑弹层会请求定尺接口，下拉解析出 9米/12米 与「无定尺（卷材）」', async () => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          {
            client: queryClient,
          },
          createElement(Harness, {
            config,
            onState: (options) => {
              captured = options
            },
          }),
        ),
      )
    })
    await flushQueries()

    expect(api.fetchLengthPremiumOptions).toHaveBeenCalledTimes(1)
    expect(captured?.lengthPremiums.map((item) => item.value)).toEqual([
      '9米',
      '12米',
    ])

    // resolver 读同一份缓存：主数据顺序 + 末尾固定的「无定尺（卷材）」= '-'
    const options = getLengthOptions()
    expect(options.map((item) => item.value)).toEqual(['9米', '12米', '-'])
    expect(options.at(-1)?.label).toBe('无定尺（卷材）')
    // 真实渲染的是 antd Select（类型为 select），不是自由文本输入框。
    expect(container.querySelector('.ant-select')).not.toBeNull()
  })

  it('主数据为空时下拉不含写死的 9米/12米，只保留「无定尺（卷材）」', async () => {
    api.fetchLengthPremiumOptions.mockResolvedValue([])
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          {
            client: queryClient,
          },
          createElement(Harness, {
            config,
            onState: (options) => {
              captured = options
            },
          }),
        ),
      )
    })
    await flushQueries()

    expect(getLengthOptions().map((item) => item.value)).toEqual(['-'])
  })

  it('定尺选项进入统一主数据缓存键（维护页保存后同一 key 失效即可刷新）', async () => {
    act(() => {
      root.render(
        createElement(
          QueryClientProvider,
          {
            client: queryClient,
          },
          createElement(Harness, {
            config,
            onState: (options) => {
              captured = options
            },
          }),
        ),
      )
    })
    await flushQueries()

    expect(
      queryClient.getQueryData(QUERY_KEYS.masterOptions.lengthPremiums),
    ).toEqual(LENGTH_OPTIONS)
  })
})
