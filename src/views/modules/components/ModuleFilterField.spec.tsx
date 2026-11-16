// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import i18n from 'i18next'
import type { ModuleFilterDefinition } from '@/types/module-page'
import { ModuleFilterField } from './ModuleFilterField'
import {
  normalizeAllOptionValue,
  SEGMENTED_ALL_VALUE,
} from './module-filter-utils'

const SELECT_FIELD: ModuleFilterDefinition = {
  key: 'customerId',
  label: '客户名称',
  type: 'select',
  options: [
    { label: '浙江申源建设有限公司', value: 'c1' },
    { label: 'E2E-FIXTURE客户', value: 'c2' },
  ],
}

let container: HTMLDivElement | null = null
let root: Root | null = null

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

async function renderField(
  props: Partial<Parameters<typeof ModuleFilterField>[0]> = {},
): Promise<{ onCommitFilter: ReturnType<typeof vi.fn> }> {
  const onCommitFilter = vi.fn()
  await act(async () => {
    root = createRoot(container as HTMLDivElement)
    root.render(
      createElement(ModuleFilterField, {
        field: SELECT_FIELD,
        filters: {},
        submittedFilters: {},
        datePresets: [],
        onUpdateFilter: vi.fn(),
        onCommitFilter,
        onCommitTextFilter: vi.fn(),
        projectOptions: [],
        ...props,
      }),
    )
    await flush()
  })
  return { onCommitFilter }
}

describe('ModuleFilterField —— 下拉筛选只有一层', () => {
  beforeEach(() => {
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
  })

  afterEach(() => {
    act(() => {
      root?.unmount()
    })
    container?.remove()
    container = null
    root = null
  })

  it('控件本身就是 Select：不再套 chip 按钮与弹层', async () => {
    await renderField()

    // 一个 combobox 就是全部：这条断言挡住「chip → Popover → Select」的套中套回归
    expect(container?.querySelectorAll('[role="combobox"]').length).toBe(1)
    expect(container?.querySelector('.module-filter-chip')).toBeNull()
    expect(container?.querySelector('.mock-popover')).toBeNull()
  })

  it('未选时显示「全部」，已选时显示对应标签', async () => {
    await renderField()
    expect(container?.textContent).toContain(i18n.t('modules.filter.all'))

    // 卸载是同步的：同步 act 返回 void，不能 await
    act(() => {
      root?.unmount()
    })
    container?.remove()
    container = document.createElement('div')
    document.body.appendChild(container)
    await renderField({ filters: { customerId: 'c2' } })
    expect(container?.textContent).toContain('E2E-FIXTURE客户')
  })

  it('「全部」哨兵值提交时归一成 undefined（唯一转换口）', () => {
    // 点击选项在 jsdom 里受 rc-virtual-list 尺寸限制，这里直接锁转换口 + 上面的渲染断言
    expect(normalizeAllOptionValue(SEGMENTED_ALL_VALUE)).toBeUndefined()
    expect(normalizeAllOptionValue('c2')).toBe('c2')
  })
})
