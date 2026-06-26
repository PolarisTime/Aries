import { describe, expect, it } from 'vitest'
import { expandEachBlocks, expandIfBlocks, renderPlaceholders } from './syntax'

describe('renderPlaceholders', () => {
  it('replaces placeholders with data values', () => {
    const result = renderPlaceholders(
      'Hello {{name}}, your total is {{total}}',
      {
        name: 'Alice',
        total: '1000',
      },
    )
    expect(result).toBe('Hello Alice, your total is 1000')
  })

  it('leaves unmatched placeholders empty', () => {
    const result = renderPlaceholders('Hello {{name}}', {})
    expect(result).toBe('Hello ')
  })

  it('handles empty source string', () => {
    expect(renderPlaceholders('', {})).toBe('')
  })

  it('escapes values in placeholders', () => {
    const result = renderPlaceholders('{{value}}', {
      value: 'test"quote',
    })
    expect(result).toBe('test\\"quote')
  })
})

describe('expandEachBlocks', () => {
  it('expands each block with item data', () => {
    const template = '{{#each items}}<li>{{name}}</li>{{/each}}'
    const items = [{ name: 'Item1' }, { name: 'Item2' }]
    const result = expandEachBlocks(template, items)
    expect(result).toBe('<li>Item1</li><li>Item2</li>')
  })

  it('handles empty items array', () => {
    const template = '{{#each items}}<li>{{name}}</li>{{/each}}'
    const result = expandEachBlocks(template, [])
    expect(result).toBe('')
  })

  it('handles nested if blocks inside each', () => {
    const template =
      '{{#each items}}{{#if active}}<span>{{name}}</span>{{else}}<del>{{name}}</del>{{/if}}{{/each}}'
    const items = [
      { name: 'A', active: 'true' },
      { name: 'B', active: '' },
    ]
    const result = expandEachBlocks(template, items)
    expect(result).toBe('<span>A</span><del>B</del>')
  })

  it('no match returns source unchanged', () => {
    const result = expandEachBlocks('hello world', [])
    expect(result).toBe('hello world')
  })

  it('expands each block with multiple items and placeholders', () => {
    const template =
      '{{#each rows}}<tr><td>{{code}}</td><td>{{value}}</td></tr>{{/each}}'
    const items = [
      { code: 'A001', value: '100' },
      { code: 'A002', value: '200' },
      { code: 'A003', value: '300' },
    ]
    const result = expandEachBlocks(template, items)
    expect(result).toBe(
      '<tr><td>A001</td><td>100</td></tr>' +
        '<tr><td>A002</td><td>200</td></tr>' +
        '<tr><td>A003</td><td>300</td></tr>',
    )
  })

  it('escapes special characters in each block values', () => {
    const template = '{{#each items}}<li>{{name}}</li>{{/each}}'
    const items = [{ name: 'test"value' }]
    const result = expandEachBlocks(template, items)
    expect(result).toBe('<li>test\\"value</li>')
  })

  it('handles missing keys in items gracefully', () => {
    const template = '{{#each items}}<li>{{name}}-{{missing}}</li>{{/each}}'
    const items = [{ name: 'A' }]
    const result = expandEachBlocks(template, items)
    expect(result).toBe('<li>A-</li>')
  })

  it('handles each block with if/else inside for truthy and falsy items', () => {
    const template =
      '{{#each items}}{{#if ok}}<b>{{val}}</b>{{else}}<i>{{val}}</i>{{/if}}{{/each}}'
    const items = [
      { val: 'yes', ok: 'true' },
      { val: 'no', ok: '' },
      { val: 'maybe', ok: '1' },
    ]
    const result = expandEachBlocks(template, items)
    expect(result).toBe('<b>yes</b><i>no</i><b>maybe</b>')
  })

  it('allows each blocks to read parent data while item fields take priority', () => {
    const template =
      '{{#each items}}{{#if needsNewPage}}P{{projectNameTop}}:{{customerName}}/{{brand}};{{/if}}{{/each}}'
    const result = expandEachBlocks(
      template,
      [
        { brand: '亚新' },
        { needsNewPage: 'true', brand: '中杭' },
      ],
      { customerName: '客户A', projectNameTop: '83', brand: '默认品牌' },
    )

    expect(result).toBe('P83:客户A/中杭;')
  })
})

describe('expandIfBlocks', () => {
  it('renders truthy branch', () => {
    const template = '{{#if active}}visible{{else}}hidden{{/if}}'
    const result = expandIfBlocks(template, { active: 'true' })
    expect(result).toBe('visible')
  })

  it('renders falsy branch', () => {
    const result = expandIfBlocks('{{#if active}}yes{{else}}no{{/if}}', {
      active: '',
    })
    expect(result).toBe('no')
  })

  it('handles if without else', () => {
    const result = expandIfBlocks('{{#if active}}shown{{/if}}', {
      active: 'true',
    })
    expect(result).toBe('shown')
  })

  it('renders falsy for false string', () => {
    const result = expandIfBlocks('{{#if active}}yes{{else}}no{{/if}}', {
      active: 'false',
    })
    expect(result).toBe('no')
  })

  it('renders falsy for 0 string', () => {
    const result = expandIfBlocks('{{#if active}}yes{{else}}no{{/if}}', {
      active: '0',
    })
    expect(result).toBe('no')
  })

  it('no match returns source unchanged', () => {
    const result = expandIfBlocks('hello world', {})
    expect(result).toBe('hello world')
  })

  it('handles undefined field value as falsy', () => {
    const result = expandIfBlocks('{{#if active}}yes{{else}}no{{/if}}', {})
    expect(result).toBe('no')
  })

  it('handles "0" string as falsy', () => {
    const result = expandIfBlocks('{{#if count}}yes{{else}}no{{/if}}', {
      count: '0',
    })
    expect(result).toBe('no')
  })

  it('handles "false" string as falsy', () => {
    const result = expandIfBlocks('{{#if enabled}}yes{{else}}no{{/if}}', {
      enabled: 'false',
    })
    expect(result).toBe('no')
  })

  it('treats non-empty non-false string as truthy', () => {
    const result = expandIfBlocks('{{#if name}}yes{{else}}no{{/if}}', {
      name: 'hello',
    })
    expect(result).toBe('yes')
  })

  it('renders empty string when if is falsy and no else block', () => {
    const result = expandIfBlocks('{{#if active}}shown{{/if}}', {
      active: '',
    })
    expect(result).toBe('')
  })

  it('handles multiple if blocks in same source', () => {
    const template = '{{#if a}}A{{/if}} {{#if b}}B{{/if}}'
    const result = expandIfBlocks(template, { a: 'true', b: '' })
    expect(result).toBe('A ')
  })
})
