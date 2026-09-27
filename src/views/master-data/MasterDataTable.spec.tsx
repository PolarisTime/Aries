// @vitest-environment jsdom

import { ConfigProvider } from 'antd'
import i18n from 'i18next'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import { ColumnSettingsRequestContext } from '@/components/column-settings-request-context'
import type { LegacyModuleRecord } from '@/types/module-record'
import { MasterDataTable } from './MasterDataTable'
import type { MasterDataPageSpec } from './master-data-types'

const COLUMNS = [
  { key: 'code', title: '物料编码', width: 160 },
  { key: 'name', title: '物料名称', width: 200 },
]

function makeSpec(): MasterDataPageSpec {
  return {
    moduleKey: 'material',
    title: '物料',
    description: '',
    keywordPlaceholder: '',
    filters: [],
    columns: COLUMNS,
    defaultHiddenColumnKeys: [],
    detailFields: [],
    formFields: [],
    buildValues: () => ({}),
    buildRecord: (values) => values,
  }
}

const RECORDS: LegacyModuleRecord[] = [
  { id: '1', code: 'M-1', name: '螺纹钢' },
  { id: '2', code: 'M-2', name: '盘螺' },
]

const flush = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 30))
  })

describe('MasterDataTable 列头右键菜单', () => {
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
    ;(
      globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }
    ).IS_REACT_ACT_ENVIRONMENT = true
    container = document.createElement('div')
    document.body.appendChild(container)
    root = createRoot(container)
  })

  afterEach(async () => {
    await flush()
    act(() => root.unmount())
    container.remove()
    vi.unstubAllGlobals()
    document.querySelectorAll('.ant-dropdown, .ant-popover').forEach((node) => {
      node.remove()
    })
  })

  const render = (options: { withSettings?: boolean } = {}) => {
    const onHideColumn = vi.fn()
    const table = (
      <MasterDataTable
        spec={makeSpec()}
        records={RECORDS}
        selectedRows={[]}
        total={RECORDS.length}
        page={1}
        pageSize={20}
        hiddenColumnKeySet={new Set()}
        onHideColumn={onHideColumn}
        selectedRowKeys={[]}
        expandedRowKeys={[]}
        isLoading={false}
        isFetching={false}
        hasListError={false}
        errorMessage=""
        onSelectionChange={() => {}}
        onExpandedRowKeysChange={() => {}}
        onToggleRecordSelected={() => {}}
        onRecordDoubleClick={() => {}}
        onPageChange={() => {}}
        onRetry={() => {}}
      />
    )
    act(() => {
      root.render(
        <ConfigProvider theme={{ token: { motion: false } }}>
          {options.withSettings ? (
            <ColumnSettingsRequestContext.Provider value={() => {}}>
              {table}
            </ColumnSettingsRequestContext.Provider>
          ) : (
            table
          )}
        </ConfigProvider>,
      )
    })
    return { onHideColumn }
  }

  const visibleItems = () => [
    ...document.querySelectorAll<HTMLElement>(
      '.ant-dropdown:not(.ant-dropdown-hidden) .app-context-menu .ant-dropdown-menu-item',
    ),
  ]

  const openHeaderMenu = async (title: string) => {
    const node = [
      ...container.querySelectorAll<HTMLElement>('.master-data-column-title'),
    ].find((item) => (item.textContent || '').trim() === title)
    expect(node).toBeTruthy()
    act(() => {
      node?.dispatchEvent(
        new MouseEvent('contextmenu', { bubbles: true, cancelable: true }),
      )
    })
    await flush()
  }

  it('右键列头弹出菜单: 可访问名带列名且只提供隐藏能力', async () => {
    render()
    await openHeaderMenu('物料名称')
    const menu = document.querySelector(
      '.ant-dropdown:not(.ant-dropdown-hidden) .app-context-menu [role="menu"]',
    )
    expect(menu?.getAttribute('aria-label')).toBe('「物料名称」列操作菜单')
    expect(
      visibleItems().map((node) => (node.textContent || '').trim()),
    ).toEqual(['隐藏该列'])
    expect(visibleItems()[0]).toBe(document.activeElement)
  })

  it('点击「隐藏该列」把列 key 交给调用方', async () => {
    const handlers = render()
    await openHeaderMenu('物料名称')
    await act(async () => {
      visibleItems()[0]?.dispatchEvent(
        new MouseEvent('click', { bubbles: true }),
      )
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()
    expect(handlers.onHideColumn).toHaveBeenCalledWith('name')
  })

  it('有列设置上下文时额外提供「列设置…」', async () => {
    render({ withSettings: true })
    await openHeaderMenu('物料编码')
    expect(
      visibleItems().map((node) => (node.textContent || '').trim()),
    ).toEqual(['隐藏该列', '列设置…'])
  })
})
