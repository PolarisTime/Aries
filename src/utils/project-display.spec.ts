import { describe, expect, it } from 'vitest'
import {
  formatProjectDisplayName,
  renderProjectNameCell,
} from '@/utils/project-display'

describe('formatProjectDisplayName', () => {
  it('简称与全称同时存在时显示「简称（全称）」', () => {
    expect(formatProjectDisplayName('东钢', '广东东钢供应链有限公司')).toBe(
      '东钢（广东东钢供应链有限公司）',
    )
  })

  /**
   * 简称恰好是全称的前缀时仍保留括号。
   *
   * <p>这条用「同值」数据锁住格式本身: 若实现退化成"两个都非空就显示全称"或
   * "简称已经包含全称就不加括号", 上面的用例仍会绿, 这条会红。</p>
   */
  it('简称与全称相同时也保留括号格式', () => {
    expect(formatProjectDisplayName('东钢', '东钢')).toBe('东钢（东钢）')
  })

  it('无简称时只显示全称（后端未返回该字段时同样走这条）', () => {
    for (const abbr of [undefined, null, '', '   ']) {
      expect(formatProjectDisplayName(abbr, '广东东钢供应链有限公司')).toBe(
        '广东东钢供应链有限公司',
      )
    }
  })

  it('无全称时只显示简称', () => {
    for (const name of [undefined, null, '', '   ']) {
      expect(formatProjectDisplayName('东钢', name)).toBe('东钢')
    }
  })

  it('两者都空时返回空串（列表单元格另行回退 -）', () => {
    expect(formatProjectDisplayName(undefined, undefined)).toBe('')
    expect(formatProjectDisplayName(null, null)).toBe('')
    expect(formatProjectDisplayName('  ', '  ')).toBe('')
  })

  it('非文本值不拼成 "undefined" 字样', () => {
    expect(formatProjectDisplayName({}, '广东东钢供应链有限公司')).toBe(
      '广东东钢供应链有限公司',
    )
    expect(formatProjectDisplayName([], '广东东钢供应链有限公司')).toBe(
      '广东东钢供应链有限公司',
    )
  })
})

describe('renderProjectNameCell', () => {
  it('读取行上的 projectNameAbbr 与 projectName 拼成「简称（全称）」', () => {
    expect(
      renderProjectNameCell(undefined, {
        id: '1',
        projectNameAbbr: '东钢',
        projectName: '广东东钢供应链有限公司',
      }),
    ).toBe('东钢（广东东钢供应链有限公司）')
  })

  it('行上没有简称时只显示全称', () => {
    expect(
      renderProjectNameCell(undefined, {
        id: '1',
        projectName: '广东东钢供应链有限公司',
      }),
    ).toBe('广东东钢供应链有限公司')
  })

  it('项目字段全空时回退 -', () => {
    expect(renderProjectNameCell(undefined, { id: '1' })).toBe('-')
    expect(
      renderProjectNameCell(undefined, {
        id: '1',
        projectNameAbbr: '',
        projectName: null,
      }),
    ).toBe('-')
  })
})
