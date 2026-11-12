// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { moveFocusBy, moveFocusTon } from './sheet-focus-navigation'
import type { PriceRow } from './types'

/**
 * 表格键盘焦点移动。
 *
 * <p>现货价改为只读后不再有"现货列内 Tab 移动"，因此这里只剩吨位列（仍可输入）与
 * 通用 `moveFocusBy` 的边界语义。</p>
 */

function row(id: string): PriceRow {
  return {
    id,
    category: '螺纹钢',
    material: 'HRB400',
    spec: 20,
    length: '9米',
  }
}

/** r2 视为隔断行: 默认不渲染输入框, 用于验证"跳过不可聚焦行"。 */
const rows = [row('r1'), row('r2'), row('r3')]

function renderInputs(ids: string[] = ['r1', 'r3']) {
  document.body.insertAdjacentHTML(
    'beforeend',
    ids.map((id) => `<input data-ton="${id}" value="${id}-value" />`).join(''),
  )
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('表格焦点移动(sheet-focus-navigation)', () => {
  it('吨位列向下移动焦点并选中文本, 跳过没有输入框的隔断行', () => {
    renderInputs()
    const move = moveFocusTon(rows)
    expect(move('r1', 1)).toBe(true)
    const target = document.querySelector<HTMLInputElement>(
      'input[data-ton="r3"]',
    )
    expect(document.activeElement).toBe(target)
    expect(target?.selectionEnd).toBe(target?.value.length)
  })

  it('向上移动同样跳过中间不可聚焦行', () => {
    renderInputs()
    const move = moveFocusTon(rows)
    expect(move('r3', -1)).toBe(true)
    expect(document.activeElement).toBe(
      document.querySelector('input[data-ton="r1"]'),
    )
  })

  it('列首/列尾返回 false, 焦点原地不动(放行浏览器默认 Tab)', () => {
    renderInputs()
    const first = document.querySelector<HTMLInputElement>(
      'input[data-ton="r1"]',
    )
    first?.focus()
    const move = moveFocusTon(rows)
    expect(move('r1', -1)).toBe(false)
    expect(move('r3', 1)).toBe(false)
    expect(document.activeElement).toBe(first)
  })

  it('delta 为 0 或行不存在时不移动焦点', () => {
    renderInputs()
    const move = moveFocusTon(rows)
    expect(move('r1', 0)).toBe(false)
    expect(move('missing', 1)).toBe(false)
    expect(document.activeElement).toBe(document.body)
  })

  it('只有可聚焦行参与移动: 从末行向上越过隔断落到首行', () => {
    renderInputs(['r1', 'r3'])
    expect(
      moveFocusBy(rows, 'r3', 1, (item) => `input[data-ton="${item.id}"]`),
    ).toBe(false)
    expect(
      moveFocusBy(rows, 'r3', -1, (item) => `input[data-ton="${item.id}"]`),
    ).toBe(true)
    expect(document.activeElement).toBe(
      document.querySelector('input[data-ton="r1"]'),
    )
  })
})
