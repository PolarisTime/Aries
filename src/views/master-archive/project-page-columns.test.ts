import { describe, expect, it } from 'vitest'
import { toAllowedSpecValues } from './project-page-columns'

describe('toAllowedSpecValues', () => {
  it('非数组按未配置处理', () => {
    expect(toAllowedSpecValues(null)).toEqual([])
    expect(toAllowedSpecValues(undefined)).toEqual([])
    expect(toAllowedSpecValues('沙钢')).toEqual([])
    expect(toAllowedSpecValues({ 0: '沙钢' })).toEqual([])
  })

  it('去空白、去重并保留首次出现顺序', () => {
    expect(toAllowedSpecValues([' 沙钢 ', '沙钢', '', '   ', '永钢'])).toEqual([
      '沙钢',
      '永钢',
    ])
  })

  it('数字与布尔按字面量转换，null 与非标量对象忽略', () => {
    expect(toAllowedSpecValues([1, null, 'HRB400', {}, true])).toEqual([
      '1',
      'HRB400',
      'true',
    ])
  })

  it('空数组返回空数组', () => {
    expect(toAllowedSpecValues([])).toEqual([])
  })
})
