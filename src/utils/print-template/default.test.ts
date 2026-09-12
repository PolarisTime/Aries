import { describe, expect, it } from 'vitest'
import type { PrintTemplateRecord } from '@/shared/schemas'
import { pickDefaultPrintTemplate } from './default'

function createTemplate(
  id: string,
  overrides: Partial<PrintTemplateRecord> = {},
): PrintTemplateRecord {
  return {
    id,
    templateName: `模板 ${id}`,
    templateHtml: '',
    ...overrides,
  }
}

describe('pickDefaultPrintTemplate', () => {
  it('优先返回 isDefault 为 true 的模板', () => {
    const templates = [
      createTemplate('1'),
      createTemplate('2', { isDefault: true }),
      createTemplate('3'),
    ]

    expect(pickDefaultPrintTemplate(templates)?.id).toBe('2')
  })

  it('存在多个默认标记时返回第一个', () => {
    const templates = [
      createTemplate('1'),
      createTemplate('2', { isDefault: true }),
      createTemplate('3', { isDefault: true }),
    ]

    expect(pickDefaultPrintTemplate(templates)?.id).toBe('2')
  })

  it('没有默认模板时回退到第一项', () => {
    const templates = [
      createTemplate('1', { isDefault: false }),
      createTemplate('2', { isDefault: null }),
      createTemplate('3'),
    ]

    expect(pickDefaultPrintTemplate(templates)?.id).toBe('1')
  })

  it('空数组返回 undefined', () => {
    expect(pickDefaultPrintTemplate([])).toBeUndefined()
  })

  it('不修改原数组顺序', () => {
    const templates = [
      createTemplate('1'),
      createTemplate('2', { isDefault: true }),
    ]

    pickDefaultPrintTemplate(templates)

    expect(templates.map((template) => template.id)).toEqual(['1', '2'])
  })
})
