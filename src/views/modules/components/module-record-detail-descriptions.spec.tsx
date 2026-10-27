// @vitest-environment jsdom

import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import '@/i18n'
import type { ModulePageConfig, ModuleRecord } from '@/types/module-page'
import {
  ModuleRecordDetailContent,
  resolveDetailFieldSpan,
} from './ModuleRecordDetailContent'

/** antd 表格在 jsdom 下需要的浏览器 API（与其它用例一致地打桩）。 */
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub)
/*
 * `matches: true`：antd 的响应式 `column` 靠 matchMedia 判定断点；jsdom 里全部 false 时
 * 只会取到 xs=1 列，跨度会被裁切并打出 "Sum of column span ... not match" 警告 ——
 * 那是测试环境假象，真实页面（见 e2e）没有该警告。
 */
vi.stubGlobal('matchMedia', (query: string) => ({
  matches: true,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
}))

/**
 * 详情弹窗的字段网格呈现口径。
 *
 * <p>改造前每个字段是一个带边框的小卡片（`bill-detail-item`），标签还用全角空格右补白，
 * 一屏八九个等重方块、左缘参差像表单。现在统一交给 antd `Descriptions`（bordered /
 * small）：标签列统一右对齐 + 等宽，值在内容列里换行，整屏只剩一套边框。</p>
 *
 * <p>这里锁三件容易回归的事：① 确实用 Descriptions 而不是又退回卡片；② `fullRow` 字段
 * 占满整行（备注这类长文本）；③ 标签不再带全角空格补白。</p>
 */
const buildConfig = (): ModulePageConfig => ({
  key: 'sales-order',
  title: '销售订单',
  kicker: 'Sales',
  description: '',
  filters: [],
  columns: [],
  detailFields: [
    { label: '客户名称', key: 'customerName' },
    { label: '订单编号', key: 'orderNo' },
    { label: '项目名称', key: 'projectName' },
    { label: '备注', key: 'remark', fullRow: true },
  ],
  detailItemColumns: [],
  itemColumns: [],
  data: [],
  statusMap: {},
  buildOverview: () => [],
})

const record = {
  id: 'order-1',
  customerName: '浙江申源建设有限公司',
  orderNo: '370983981992124416',
  projectName: '云潮筝鸣府（海宁市高新区启辉路西侧）',
  remark: '10月17日报单参照10月19日中午价',
} as unknown as ModuleRecord

describe('详情弹窗字段网格（antd Descriptions）', () => {
  let container: HTMLDivElement
  let root: Root
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    /*
     * jsdom 的断点环境与真实浏览器不同，antd 会因跨度与列数不匹配打警告（真实页面实测无此警告，
     * 见 tests/e2e 的详情探针）。这里只静音这条环境噪音，其它 console.error 照常抛出。
     */
    const original = console.error
    consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation((...args: unknown[]) => {
        const first = String(args[0] ?? '')
        if (first.includes('[antd: Descriptions]')) return
        original(...(args as []))
      })
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
    consoleErrorSpy.mockRestore()
  })

  const render = () => {
    act(() => {
      root.render(
        createElement(ModuleRecordDetailContent, {
          config: buildConfig(),
          record,
          loading: false,
          error: null,
          onClose: () => {},
          onRetry: () => {},
        }),
      )
    })
  }

  it('用 Descriptions 的 bordered + small 呈现, 不再是逐字段卡片', () => {
    render()
    const descriptions = container.querySelector(
      '.module-record-detail-descriptions.ant-descriptions',
    )
    expect(descriptions).not.toBeNull()
    expect(descriptions?.className).toContain('ant-descriptions-bordered')
    expect(descriptions?.className).toContain('ant-descriptions-small')
    // 旧的「每字段一个卡片」标记不应再出现
    expect(container.querySelector('.bill-detail-item')).toBeNull()
  })

  it('标签按字段配置渲染, 且不再用全角空格补白', () => {
    render()
    const labels = Array.from(
      container.querySelectorAll('.ant-descriptions-item-label'),
    ).map((el) => (el.textContent || '').trim())
    expect(labels).toContain('客户名称')
    expect(labels).toContain('备注')
    // padLabel 会补前导全角空格（U+3000）
    for (const label of labels) {
      expect(label.startsWith('\u3000')).toBe(false)
    }
  })

  it('跨度口径: fullRow 占满整行, 长文本占两列, 其余一列', () => {
    // 整行字段(备注/地址): 跨满 4 列
    expect(
      resolveDetailFieldSpan({ fullRow: true, textLength: 4, columnCount: 4 }),
    ).toBe(4)
    // 长文本(长项目名): 让出两列
    expect(
      resolveDetailFieldSpan({
        fullRow: false,
        textLength: 30,
        columnCount: 4,
      }),
    ).toBe(2)
    // 普通短值: 一列
    expect(
      resolveDetailFieldSpan({
        fullRow: false,
        textLength: 6,
        columnCount: 4,
      }),
    ).toBe(1)
    // 只有一列时不必跨列
    expect(
      resolveDetailFieldSpan({
        fullRow: false,
        textLength: 30,
        columnCount: 1,
      }),
    ).toBe(1)
  })

  it('每个字段的值都渲染出来（取值口径不变）', () => {
    render()
    const text = container.textContent || ''
    expect(text).toContain('浙江申源建设有限公司')
    expect(text).toContain('370983981992124416')
    expect(text).toContain('10月17日报单参照10月19日中午价')
  })
})
