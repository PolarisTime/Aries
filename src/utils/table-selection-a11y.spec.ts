import i18n from 'i18next'
import { describe, expect, it, vi } from 'vitest'
import '@/i18n'
import {
  buildSelectionA11yProps,
  describeSelectionRow,
} from './table-selection-a11y'

/**
 * antd v6 把表头 `Select all` 与行内 `Select row N` 硬编码为英文(不随 ConfigProvider locale),
 * 中文界面下读屏播报英文。这里锁定覆盖文案与行业务标识的取用顺序。
 */
describe('describeSelectionRow', () => {
  it('按 名称 -> 编码 -> 单号 -> 订单号 -> 主键 依次取用', () => {
    expect(describeSelectionRow({ name: '螺纹钢', code: 'C1', id: '9' })).toBe(
      '螺纹钢',
    )
    expect(describeSelectionRow({ code: 'C1', no: 'PO-1', id: '9' })).toBe('C1')
    expect(describeSelectionRow({ no: 'PO-1', orderNo: 'SO-1', id: '9' })).toBe(
      'PO-1',
    )
    expect(describeSelectionRow({ orderNo: 'SO-1', id: '9' })).toBe('SO-1')
    expect(describeSelectionRow({ id: '9' })).toBe('9')
  })

  it('空白值与缺失字段不会串位', () => {
    expect(describeSelectionRow({ name: '   ', code: '', id: '9' })).toBe('   ')
    expect(describeSelectionRow({ id: 0 })).toBe('0')
    expect(describeSelectionRow({})).toBe('')
    expect(describeSelectionRow(null)).toBe('')
  })
})

describe('buildSelectionA11yProps', () => {
  it('中文界面: 全选框与行复选框都读中文, 行名带业务标识', async () => {
    await i18n.changeLanguage('zh-CN')
    const t = i18n.getFixedT('zh-CN')
    const props = buildSelectionA11yProps<{ id: string; no?: string }>(t)

    expect(props.getTitleCheckboxProps?.()).toEqual({
      'aria-label': '全选当前页所有行',
    })
    expect(props.getCheckboxProps?.({ id: '1', no: 'PO-1' })).toEqual({
      'aria-label': '选择此行：PO-1',
    })
  })

  it('英文界面: 同一入口输出英文可访问名', async () => {
    await i18n.changeLanguage('en-US')
    const t = i18n.getFixedT('en-US')
    const props = buildSelectionA11yProps<{ id: string; no?: string }>(t)

    expect(props.getTitleCheckboxProps?.()).toEqual({
      'aria-label': 'Select all rows on this page',
    })
    expect(props.getCheckboxProps?.({ id: '1', no: 'PO-1' })).toEqual({
      'aria-label': 'Select this row: PO-1',
    })
  })

  it('行内没有可识别标识时退回通用文案(不出现空冒号)', () => {
    const t = vi.fn(
      (key: string, options?: Record<string, unknown>) =>
        `${key}:${String(options?.label ?? '')}`,
    )
    const props = buildSelectionA11yProps<Record<string, unknown>>(t)
    expect(props.getCheckboxProps?.({})).toEqual({
      'aria-label': 'common.table.selectRow:',
    })
  })

  it('可自定义行名(如项目名)', () => {
    const t = vi.fn(
      (key: string, options?: Record<string, unknown>) =>
        `${key}|${String(options?.label)}`,
    )
    const props = buildSelectionA11yProps<{ title: string }>(t, (record) =>
      record.title.trim(),
    )
    expect(props.getCheckboxProps?.({ title: ' 杭州项目 ' })).toEqual({
      'aria-label': 'common.table.selectRowNamed|杭州项目',
    })
  })
})
