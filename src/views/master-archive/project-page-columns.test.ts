import { describe, expect, it } from 'vitest'
import {
  toAllowedSpecSeverity,
  toAllowedSpecValues,
} from './project-page-columns'

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

describe('toAllowedSpecSeverity', () => {
  it('清单为空时不生效，返回 null 让表单回落到默认档', () => {
    expect(toAllowedSpecSeverity('BLOCK', [])).toBeNull()
    expect(toAllowedSpecSeverity(undefined, [])).toBeNull()
  })

  it('清单非空但未配置力度时按提醒处理', () => {
    expect(toAllowedSpecSeverity(undefined, ['沙钢'])).toBe('WARN')
    expect(toAllowedSpecSeverity(null, ['沙钢'])).toBe('WARN')
    expect(toAllowedSpecSeverity('   ', ['沙钢'])).toBe('WARN')
  })

  it('识别三个字面量并容忍大小写与未知值', () => {
    expect(toAllowedSpecSeverity('block', ['沙钢'])).toBe('BLOCK')
    expect(toAllowedSpecSeverity('off', ['沙钢'])).toBe('OFF')
    expect(toAllowedSpecSeverity('DISABLED', ['沙钢'])).toBe('WARN')
  })
})
