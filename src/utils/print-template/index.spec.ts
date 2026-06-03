import { describe, expect, it } from 'vitest'

describe('print-template/index', () => {
  it('exports escapeJs function', async () => {
    const module = await import('./index')
    expect(module.escapeJs).toBeInstanceOf(Function)
  })

  it('exports renderPrintTemplate function', async () => {
    const module = await import('./index')
    expect(module.renderPrintTemplate).toBeInstanceOf(Function)
  })

  it('escapeJs escapes JavaScript special characters', async () => {
    const { escapeJs } = await import('./index')
    expect(escapeJs('test')).toBe('test')
    expect(escapeJs('test"quote')).toBe('test\\"quote')
    expect(escapeJs("test'quote")).toBe("test\\'quote")
    expect(escapeJs('test\\backslash')).toBe('test\\\\backslash')
    expect(escapeJs('test\nnewline')).toBe('test\\nnewline')
    expect(escapeJs('test\rcarriage')).toBe('test\\rcarriage')
    expect(escapeJs('test\ttab')).toBe('test\\ttab')
    expect(escapeJs('test<less')).toBe('test\\x3cless')
    expect(escapeJs('test>greater')).toBe('test\\x3egreater')
    expect(escapeJs('')).toBe('')
    expect(escapeJs(null as any)).toBe('')
    expect(escapeJs(undefined as any)).toBe('')
  })

  it('renderPrintTemplate renders HTML template', async () => {
    const { renderPrintTemplate } = await import('./index')
    const template = '<div>{{name}}</div>'
    const data = { name: 'Test' }
    const items = [{}]
    const result = renderPrintTemplate(template, 'HTML', data, items)
    expect(result).toEqual({
      type: 'HTML',
      html: '<div>Test</div>',
    })
  })

  it('renderPrintTemplate renders COORD template', async () => {
    const { renderPrintTemplate } = await import('./index')
    const template = 'LODOP.ADD_PRINT_TEXT(10,10,100,20,"{{name}}");'
    const data = { name: 'Test' }
    const items = [{}]
    const result = renderPrintTemplate(template, 'COORD', data, items)
    expect(result).toEqual({
      type: 'COORD',
      script: 'LODOP.ADD_PRINT_TEXT(10,10,100,20,"Test");',
    })
  })
})
