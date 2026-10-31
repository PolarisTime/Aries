// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest'
import { moveFocus, moveFocusBy, moveFocusTon } from './sheet-focus-navigation'
import type { PriceRow } from './types'

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

function renderInputs(
  attributes: 'spot' | 'ton',
  ids: string[] = ['r1', 'r3'],
) {
  document.body.insertAdjacentHTML(
    'beforeend',
    ids
      .map((id) => {
        const value = attributes === 'spot' ? `品牌:${id}` : id
        return `<input data-${attributes}="${value}" value="${id}-value" />`
      })
      .join(''),
  )
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('表格焦点移动(sheet-focus-navigation)', () => {
  it('现货列向下移动焦点并选中文本, 跳过没有输入框的隔断行', () => {
    renderInputs('spot')
    const move = moveFocus(rows)
    expect(move('品牌', 'r1', 1)).toBe(true)
    const target = document.querySelector<HTMLInputElement>(
      'input[data-spot="品牌:r3"]',
    )
    expect(document.activeElement).toBe(target)
    expect(target?.selectionEnd).toBe(target?.value.length)
  })

  it('向上移动同样跳过中间不可聚焦行', () => {
    renderInputs('spot')
    const move = moveFocus(rows)
    expect(move('品牌', 'r3', -1)).toBe(true)
    expect(document.activeElement).toBe(
      document.querySelector('input[data-spot="品牌:r1"]'),
    )
  })

  it('吨位列按 data-ton 选择器移动', () => {
    renderInputs('ton')
    const move = moveFocusTon(rows)
    expect(move('r1', 1)).toBe(true)
    expect(document.activeElement).toBe(
      document.querySelector('input[data-ton="r3"]'),
    )
  })

  it('列首/列尾返回 false, 焦点原地不动(放行浏览器默认 Tab)', () => {
    renderInputs('spot')
    const first = document.querySelector<HTMLInputElement>(
      'input[data-spot="品牌:r1"]',
    )
    first?.focus()
    const move = moveFocus(rows)
    expect(move('品牌', 'r1', -1)).toBe(false)
    expect(move('品牌', 'r3', 1)).toBe(false)
    expect(document.activeElement).toBe(first)
  })

  it('delta 为 0 或行不存在时不移动焦点', () => {
    renderInputs('spot')
    const move = moveFocus(rows)
    expect(move('品牌', 'r1', 0)).toBe(false)
    expect(move('品牌', 'missing', 1)).toBe(false)
    expect(document.activeElement).toBe(document.body)
  })

  it('只有可聚焦行参与移动: 从末行向上越过隔断落到首行', () => {
    renderInputs('spot', ['r1', 'r3'])
    expect(
      moveFocusBy(
        rows,
        'r3',
        1,
        (item) => `input[data-spot="品牌:${item.id}"]`,
      ),
    ).toBe(false)
    expect(
      moveFocusBy(
        rows,
        'r3',
        -1,
        (item) => `input[data-spot="品牌:${item.id}"]`,
      ),
    ).toBe(true)
    expect(document.activeElement).toBe(
      document.querySelector('input[data-spot="品牌:r1"]'),
    )
  })
})
