import { describe, expect, it } from 'vitest'
import { padLabel } from '@/utils/label-utils'

describe('padLabel', () => {
  it('无 CJK 字符时原样返回', () => {
    expect(padLabel('ABC')).toBe('ABC')
    expect(padLabel('123')).toBe('123')
  })

  it('空串原样返回', () => {
    expect(padLabel('')).toBe('')
  })

  it('CJK 数量达到目标时原样返回', () => {
    expect(padLabel('客户名称')).toBe('客户名称')
    expect(padLabel('项目名称')).toBe('项目名称')
  })

  it('CJK 不足时前缀全角空格补齐', () => {
    expect(padLabel('客户')).toBe('　　' + '客户')
    expect(padLabel('客')).toBe('　　' + '　客')
  })

  it('自定义目标长度', () => {
    expect(padLabel('客户', 2)).toBe('客户')
    expect(padLabel('客', 2)).toBe('　' + '客')
  })

  it('混合中英文按 CJK 数量计数', () => {
    expect(padLabel('客A', 4)).toBe('　　' + '　客A')
  })

  it('CJK 超过目标时原样返回', () => {
    expect(padLabel('客户名称很长的', 4)).toBe('客户名称很长的')
  })
})
